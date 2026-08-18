import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GOOGLE_AUTH, isGoogleConfigured } from '../constants/authConfig';
import { setAuthTokenProvider } from '../services/api';

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
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: (name?: string) => Promise<void>;
  updateUser: (updates: Partial<Pick<User, 'name' | 'picture'>>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const STORAGE_KEY = '@ecotrek/auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const googleConfigured = isGoogleConfigured();

  // expo-auth-session Google provider — wires up PKCE + redirect URIs
  // automatically for iOS, Android, web, and Expo Go.
  const [, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_AUTH.expoClientId,
    iosClientId: GOOGLE_AUTH.iosClientId,
    androidClientId: GOOGLE_AUTH.androidClientId,
    webClientId: GOOGLE_AUTH.webClientId,
    // `openid` is what makes Google return an ID token alongside the access
    // token. The API prefers the ID token because it is signed and can be
    // verified offline.
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
    if (!googleConfigured) {
      setError(
        'Google OAuth is not configured. Add your client IDs to src/constants/authConfig.ts.'
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
  }, [promptAsync, googleConfigured]);

  const signInAsGuest = useCallback(async (name = 'Guest Trekker') => {
    const u: User = {
      id: `guest-${Date.now()}`,
      name,
      email: 'guest@ecotrek.local',
      provider: 'guest',
    };
    setUser(u);
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
      signInAsGuest,
      updateUser,
      signOut,
    }),
    [user, loading, error, googleConfigured, signInWithGoogle, signInAsGuest, updateUser, signOut]
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
