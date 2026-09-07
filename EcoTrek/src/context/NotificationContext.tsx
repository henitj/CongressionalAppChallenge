import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useStreak } from './StreakContext';
import { useChallenges } from './ChallengeContext';
import { isObject, keyFor, loadJSON, saveJSON } from '../services/storage';
import {
  cancelAll,
  hasPermission,
  notificationsSupported,
  requestPermission,
  scheduleChallengeReminder,
  scheduleStreakReminder,
  scheduleWeeklyRecap,
} from '../services/notifications';

/**
 * Notification preferences.
 *
 * Three switches, all off until the user turns them on. Reminders reschedule
 * themselves whenever the streak or challenge state changes, so the text is
 * always accurate ("your 6-day streak ends at midnight", not a generic nag).
 */

export type NotificationPrefs = {
  enabled: boolean;
  streakReminder: boolean;
  challengeReminder: boolean;
  weeklyRecap: boolean;
  safetyAlerts: boolean;
  reminderHour: number;
};

const DEFAULTS: NotificationPrefs = {
  enabled: false,
  streakReminder: true,
  challengeReminder: true,
  weeklyRecap: true,
  safetyAlerts: true,
  reminderHour: 18,
};

type NotificationState = NotificationPrefs & {
  supported: boolean;
  permissionGranted: boolean;
  /** Turns everything on, asking for OS permission if needed. */
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  setPref: <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => Promise<void>;
};

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { currentStreak, activeThisWeek } = useStreak();
  const { completedCount, totalCount } = useChallenges();

  const storeKey = keyFor(user?.id ?? null, 'notifications');
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const supported = notificationsSupported();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadJSON<NotificationPrefs>(storeKey, DEFAULTS, isObject);
      const granted = await hasPermission();
      if (cancelled) return;
      setPrefs({ ...DEFAULTS, ...stored });
      setPermissionGranted(granted);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  const save = useCallback(
    async (next: NotificationPrefs) => {
      setPrefs(next);
      await saveJSON(storeKey, next);
    },
    [storeKey]
  );

  useEffect(() => {
    if (!loaded || !supported) return;
    const active = prefs.enabled && permissionGranted;

    (async () => {
      if (!active) {
        await cancelAll();
        return;
      }
      if (prefs.streakReminder) {
        await scheduleStreakReminder(currentStreak, prefs.reminderHour, activeThisWeek);
      }
      if (prefs.challengeReminder) {
        await scheduleChallengeReminder(Math.max(0, totalCount - completedCount));
      }
      if (prefs.weeklyRecap) {
        await scheduleWeeklyRecap();
      }
    })();
  }, [
    loaded,
    supported,
    prefs.enabled,
    prefs.streakReminder,
    prefs.challengeReminder,
    prefs.weeklyRecap,
    prefs.reminderHour,
    permissionGranted,
    currentStreak,
    activeThisWeek,
    completedCount,
    totalCount,
  ]);

  const enable = useCallback(async () => {
    const granted = await requestPermission();
    setPermissionGranted(granted);
    if (!granted) return false;
    await save({ ...prefs, enabled: true });
    return true;
  }, [prefs, save]);

  const disable = useCallback(async () => {
    await save({ ...prefs, enabled: false });
    await cancelAll();
  }, [prefs, save]);

  const setPref = useCallback(
    async <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
      await save({ ...prefs, [key]: value });
    },
    [prefs, save]
  );

  const value = useMemo<NotificationState>(
    () => ({
      ...prefs,
      supported,
      permissionGranted,
      enable,
      disable,
      setPref,
    }),
    [prefs, supported, permissionGranted, enable, disable, setPref]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider />');
  return ctx;
}
