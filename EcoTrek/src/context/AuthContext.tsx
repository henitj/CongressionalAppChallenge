import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GOOGLE_AUTH, isGoogleConfigured } from '../constants/authConfig';
import { setAuthTokenProvider } from '../services/api';
import { copyUserData } from '../services/storage';

WebBrowser.maybeCompleteAuthSession();

export type User = {
  id: string;
  name: string;
  email: string;
  picture?: string;
  provider: 'google' | 'guest';
  /** Google access token, used to read the profile. */
  accessToken?: string;
  /** Google ID token. Preferred for authenticating with our own API. */
  idToken?: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  googleConfigured: boolean;
  /** Real Google OAuth (native). May open an external browser flow. */
  signInWithGoogle: () => Promise<void>;
  /**
   * Sign in with a local "Google" account. Used on the web demo where the
   * OAuth redirect cannot come back to this origin. Same result as the real
   * flow: existing account → signed in; new name+email → account created.
   */
  signInWithLocalGoogle: (name: string, email: string) => Promise<void>;
  /** Google accounts signed in on this device before (for the account sheet). */
  localGoogleAccounts: { name: string; email: string }[];
  signInAsGuest: (name?: string) => Promise<void>;
  updateUser: (updates: Partial<Pick<User, 'name' | 'picture'>>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const STORAGE_KEY = '@ecotrek/auth_user';
/** Google accounts signed in on this device, for the web account sheet. */
const LOCAL_GOOGLE_KEY = '@ecotrek/local_google_accounts';

function stableId(email: string): string {
  let h = 5381;
  for (let i = 0; i < email.length; i++) h = (h * 33 + email.charCodeAt(i)) >>> 0;
  return `google-${h.toString(36)}`;
}

/**
 * One stable guest identity per device, so signing out and back in as a guest
 * does NOT feel like re-registering: the walks, profile and onboarding state
 * all live under the same account id.
 */
const GUEST_ID_KEY = '@ecotrek/guest_id';
let cachedGuestId: string | null = null;
async function getGuestId(): Promise<string> {
  if (cachedGuestId) return cachedGuestId;
  try {
    const raw = await AsyncStorage.getItem(GUEST_ID_KEY);
    if (raw) {
      cachedGuestId = raw;
      return raw;
    }
  } catch {
    /* fall through to creating one */
  }
  const id = `guest-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  cachedGuestId = id;
  try {
    await AsyncStorage.setItem(GUEST_ID_KEY, id);
  } catch {
    /* non-fatal */
  }
  return id;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localGoogleAccounts, setLocalGoogleAccounts] = useState<{ name: string; email: string }[]>([]);
  const guestToMigrate = React.useRef<string | null>(null);

  const googleConfigured = isGoogleConfigured();

  // expo-auth-session Google provider — wires up PKCE + redirect URIs
  // automatically for iOS, Android, web, and Expo Go.
  // Empty strings crash expo-auth-session on Expo Go. Only pass real IDs.
  const googleIds = {
    ...(GOOGLE_AUTH.expoClientId ? { clientId: GOOGLE_AUTH.expoClientId } : {}),
    ...(GOOGLE_AUTH.iosClientId ? { iosClientId: GOOGLE_AUTH.iosClientId } : {}),
    ...(GOOGLE_AUTH.androidClientId ? { androidClientId: GOOGLE_AUTH.androidClientId } : {}),
    ...(GOOGLE_AUTH.webClientId ? { webClientId: GOOGLE_AUTH.webClientId } : {}),
  };
  const [, response, promptAsync] = Google.useAuthRequest({
    ...googleIds,
    scopes: ['openid', 'profile', 'email'],
  });

  // Load any persisted session on cold start
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch (e) {
        console.warn('[auth] could not restore session', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCAL_GOOGLE_KEY);
        if (raw) setLocalGoogleAccounts(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // React to the OAuth flow result
  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const accessToken =
        (response as any).authentication?.accessToken ??
        (response as any).params?.access_token;
      const idToken =
        (response as any).authentication?.idToken ?? (response as any).params?.id_token;

      if (accessToken) {
        fetchGoogleProfile(accessToken)
          .then(async (profile) => {
            const fromGuest = guestToMigrate.current;
            guestToMigrate.current = null;
            if (fromGuest) {
              await copyUserData(fromGuest, profile.id);
            }
            const u: User = {
              id: profile.id,
              name: profile.name ?? profile.email,
              email: profile.email,
              picture: profile.picture,
              provider: 'google',
              accessToken,
              idToken,
            };
            setUser(u);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
            setLocalGoogleAccounts((prev) => {
              const next = [
                { name: u.name, email: u.email },
                ...prev.filter((a) => a.email !== u.email),
              ].slice(0, 6);
              AsyncStorage.setItem(LOCAL_GOOGLE_KEY, JSON.stringify(next));
              return next;
            });
          })
          .catch((e) => setError(e.message ?? 'Sign-in failed'));
      } else {
        setError('No access token returned from Google.');
      }
    } else if (response.type === 'error') {
      setError(response.error?.message ?? 'Sign-in cancelled');
    }
  }, [response]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (user?.provider === 'guest') guestToMigrate.current = user.id;
    if (!googleConfigured) {
      setError(
        'Google sign-in is not set up yet. Copy EcoTrek/.env.example to .env and paste your Google client IDs. Guest still works.'
      );
      return;
    }
    try {
      await promptAsync({
        // useProxy: true is the default for Expo Go on native, and
        // expo-auth-session picks the correct redirect URI for the web.
      });
    } catch (e: any) {
      setError(e?.message ?? 'Could not start Google sign-in');
    }
  }, [promptAsync, googleConfigured, user]);

  const signInWithLocalGoogle = useCallback(
    async (name: string, email: string) => {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanName || !cleanEmail) {
        setError('Enter a name and an email.');
        return;
      }
      const id = stableId(cleanEmail);
      const fromGuest = user?.provider === 'guest' ? user.id : null;
      if (fromGuest) {
        try {
          await copyUserData(fromGuest, id);
        } catch {
          /* keep going — the account still works */
        }
      }
      const u: User = {
        id,
        name: cleanName,
        email: cleanEmail,
        provider: 'google',
      };
      setUser(u);
      setError(null);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      setLocalGoogleAccounts((prev) => {
        const next = [{ name: cleanName, email: cleanEmail }, ...prev.filter((a) => a.email !== cleanEmail)].slice(0, 6);
        AsyncStorage.setItem(LOCAL_GOOGLE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [user]
  );

  const signInAsGuest = useCallback(async (name = 'Guest Trekker') => {
    const id = await getGuestId();
    const u: User = {
      id,
      name,
      email: 'guest@ecotrek.local',
      provider: 'guest',
    };
    setUser(u);
    setError(null);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const updateUser = useCallback(async (updates: Partial<Pick<User, 'name' | 'picture'>>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setError(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  /**
   * Hands the API client the current token.
   *
   * Without this every authenticated request went out with no Authorization
   * header, so the backend rejected all of them. The ID token is preferred
   * because the server can verify its signature; the access token is a
   * fallback the server validates against Google's tokeninfo endpoint.
   */
  useEffect(() => {
    setAuthTokenProvider(() => user?.idToken ?? user?.accessToken ?? null);
  }, [user?.idToken, user?.accessToken]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      error,
      googleConfigured,
      signInWithGoogle,
      signInWithLocalGoogle,
      localGoogleAccounts,
      signInAsGuest,
      updateUser,
      signOut,
    }),
    [
      user,
      loading,
      error,
      googleConfigured,
      signInWithGoogle,
      signInWithLocalGoogle,
      localGoogleAccounts,
      signInAsGuest,
      updateUser,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider />');
  return ctx;
}

async function fetchGoogleProfile(accessToken: string): Promise<{
  id: string;
  name?: string;
  email: string;
  picture?: string;
}> {
  const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google profile fetch failed (${res.status})`);
  return res.json();
}
