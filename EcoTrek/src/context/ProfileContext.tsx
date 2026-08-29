import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { keyFor, loadJSON, saveJSON } from '../services/storage';

/**
 * User profile data collected during onboarding.
 * Height in inches, weight in pounds, step length in inches.
 * Used for calorie calculations and personalization.
 */
export type UserProfile = {
  firstName: string;
  lastName: string;
  age: number;
  heightInches: number;
  weightPounds: number;
  stepLengthInches: number;
  /** Timestamp of profile creation */
  createdAt: number;
  /** Weight history for graphing */
  weightHistory: { date: number; weight: number }[];
  /**
   * Photo the user picked themselves for their profile logo (file URI on
   * native, data URI on web). Falls back to the Google sign-in picture when
   * null, and to initials when that is missing too.
   */
  avatarUri?: string | null;
};

const EMPTY_PROFILE: UserProfile = {
  firstName: '',
  lastName: '',
  age: 0,
  heightInches: 0,
  weightPounds: 0,
  stepLengthInches: 0,
  createdAt: 0,
  weightHistory: [],
  avatarUri: null,
};

type ProfileState = {
  profile: UserProfile;
  hasProfile: boolean;
  loading: boolean;
  setProfile: (p: Partial<UserProfile>) => Promise<void>;
  updateWeight: (weight: number) => Promise<void>;
  /** Set (or clear, with null) the user's own profile photo. */
  setAvatar: (uri: string | null) => Promise<void>;
  clearProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileState | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storeKey = keyFor(user?.id ?? null, 'user_profile');

  const [profile, setProfileState] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const stored = await loadJSON<UserProfile>(storeKey, EMPTY_PROFILE);
      if (!cancelled) {
        // Older builds stored an emergency contact. That feature is gone, so
        // its fields are scrubbed the first time an old profile is read.
        const clean = { ...stored } as UserProfile & { emergencyName?: string; emergencyPhone?: string };
        delete clean.emergencyName;
        delete clean.emergencyPhone;
        setProfileState(clean);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeKey]);

  const setProfile = useCallback(async (updates: Partial<UserProfile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...updates };
      if (!prev.createdAt && updates.firstName) {
        next.createdAt = Date.now();
      }
      saveJSON(storeKey, next);
      return next;
    });
  }, [storeKey]);

  const updateWeight = useCallback(async (weight: number) => {
    setProfileState((prev) => {
      const history = [...prev.weightHistory];
      // Replace today's entry if it exists
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTs = today.getTime();
      const existingIdx = history.findIndex(
        (h) => new Date(h.date).toDateString() === today.toDateString()
      );
      if (existingIdx >= 0) {
        history[existingIdx] = { date: todayTs, weight };
      } else {
        history.push({ date: todayTs, weight });
      }
      const next = { ...prev, weightPounds: weight, weightHistory: history.slice(-90) };
      saveJSON(storeKey, next);
      return next;
    });
  }, [storeKey]);

  const setAvatar = useCallback(
    async (uri: string | null) => {
      setProfileState((prev) => {
        const next = { ...prev, avatarUri: uri };
        saveJSON(storeKey, next);
        return next;
      });
    },
    [storeKey]
  );

  const clearProfile = useCallback(async () => {
    setProfileState(EMPTY_PROFILE);
    saveJSON(storeKey, EMPTY_PROFILE);
  }, [storeKey]);

  const hasProfile = profile.firstName.length > 0;

  const value = useMemo<ProfileState>(() => ({
    profile,
    hasProfile,
    loading,
    setProfile,
    updateWeight,
    setAvatar,
    clearProfile,
  }), [profile, hasProfile, loading, setProfile, updateWeight, setAvatar, clearProfile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider />');
  return ctx;
}

/**
 * Estimate calories burned based on activity type, duration, speed, and user profile.
 * Uses MET (Metabolic Equivalent of Task) values.
 */
export function estimateCalories(
  type: 'hike' | 'bike',
  durationSec: number,
  avgMph: number,
  profile: UserProfile
): number {
  const weightKg = (profile.weightPounds || 155) * 0.453592;
  const hours = durationSec / 3600;
  
  // MET values from the Compendium of Physical Activities
  let met: number;
  if (type === 'hike') {
    if (avgMph < 2.5) met = 3.5;
    else if (avgMph < 3.5) met = 5.3;
    else if (avgMph < 4.5) met = 7.0;
    else met = 8.5;
  } else {
    if (avgMph < 10) met = 4.0;
    else if (avgMph < 12) met = 6.0;
    else if (avgMph < 14) met = 8.0;
    else if (avgMph < 16) met = 10.0;
    else met = 12.0;
  }

  // Calories = MET × weight(kg) × time(hours)
  return Math.round(met * weightKg * hours);
}

/**
 * Estimate elevation gain/loss from GPS path using altitude data when available,
 * or approximate from distance and terrain type.
 */
export function estimateElevation(
  path: { latitude: number; longitude: number; altitude?: number }[]
): { gain: number; loss: number } {
  if (path.length < 2) return { gain: 0, loss: 0 };
  
  let gain = 0;
  let loss = 0;
  
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    if (prev.altitude != null && curr.altitude != null) {
      const diff = (curr.altitude - prev.altitude) * 3.28084; // meters to feet
      if (diff > 1) gain += diff; // filter GPS noise
      else if (diff < -1) loss += Math.abs(diff);
    }
  }
  
  return { gain: Math.round(gain), loss: Math.round(loss) };
}
