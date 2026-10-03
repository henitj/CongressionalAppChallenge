import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthTokenProvider } from '../services/api';

/**
 * There is exactly one kind of account in this build: a local profile.
 *
 * Google sign-in used to sit behind a button here, but the OAuth client IDs it
 * needs belong to a Google Cloud project that is not configured — so all it
 * could ever do was fail with a message about missing configuration. The button
 * is gone rather than left broken; `provider` stays in the stored shape so
 * profiles written by an earlier version still load.
 */
export type User = {
  id: string;
  name: string;
  email: string;
  picture?: string;
  provider: 'guest' | 'google';
  /** Kept for profiles stored by earlier versions that signed in with Google. */
  accessToken?: string;
  idToken?: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInAsGuest: (name?: string) => Promise<void>;
  updateUser: (updates: Partial<Pick<User, 'name' | 'picture'>>) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const STORAGE_KEY = '@ecotrek/auth_user';

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
   * Hands the API client the current token. Local profiles have none, so this
   * publishes `null` — the client then sends no Authorization header, which is
   * exactly right for a deployment that is not configured.
   */
  useEffect(() => {
    setAuthTokenProvider(() => user?.idToken ?? user?.accessToken ?? null);
  }, [user?.idToken, user?.accessToken]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      error,
      signInAsGuest,
      updateUser,
      signOut,
    }),
    [user, loading, error, signInAsGuest, updateUser, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider />');
  return ctx;
}
