import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { addDays, dayKey, daysBetween, keyFor, loadJSON, saveJSON } from '../services/storage';
import { api, isBackendConfigured, ROUTES } from '../services/api';

/**
 * Daily login streaks.
 *
 * A day counts once the user opens the app (a "check-in"). Days where they
 * also logged a hike or ride are marked separately so the calendar can show
 * the difference between showing up and getting out.
 *
 * Streak rules, kept deliberately forgiving:
 *   • Checking in on consecutive calendar days extends the streak.
 *   • Missing one full day resets it to 1 the next time you open the app.
 *   • Every 7 days of streak pays a bonus, scaled to the streak length.
 *   • Everything uses the device's LOCAL calendar day, never UTC, so the
 *     streak flips at the user's midnight.
 */

export type DayRecord = {
  opened: boolean;
  activities: number;
  miles: number;
  trees: number;
};

export type CalendarDay = {
  day: string; // YYYY-MM-DD
  date: Date;
  opened: boolean;
  active: boolean; // logged an activity
  isToday: boolean;
  inStreak: boolean;
};

type StreakState = {
  currentStreak: number;
  longestStreak: number;
  days: Record<string, DayRecord>;
  checkedInToday: boolean;
  activeToday: boolean;
  totalActiveDays: number;
  /** Last N days, oldest first — feeds the calendar strip. */
  calendar: (n: number) => CalendarDay[];
  /** Days until the next 7-day bonus. */
  daysToNextBonus: number;
  recordActivity: (miles: number, trees: number, when?: number) => Promise<void>;
  /** Fired automatically; exposed for pull-to-refresh. */
  checkIn: () => Promise<void>;
};

const StreakContext = createContext<StreakState | null>(null);

type Stored = {
  days: Record<string, DayRecord>;
  longestStreak: number;
  lastBonusStreak: number;
};

const EMPTY: Stored = { days: {}, longestStreak: 0, lastBonusStreak: 0 };

function computeStreak(days: Record<string, DayRecord>): number {
  const today = dayKey();
  // If today isn't checked in yet, allow the streak to still be "alive" from
  // yesterday — it only breaks once a whole day is skipped.
  let cursor = days[today]?.opened ? today : addDays(today, -1);
  if (!days[cursor]?.opened) return 0;

  let streak = 0;
  while (days[cursor]?.opened) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { award } = useEcoPoints();
  const userId = user?.id ?? null;
  const storeKey = keyFor(userId, 'streak');

  const [state, setState] = useState<Stored>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const checkingIn = useRef(false);

  /* ── Load ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const stored = await loadJSON<Stored>(storeKey, EMPTY);
      if (cancelled) return;
      setState({ ...EMPTY, ...stored, days: stored.days ?? {} });
      setLoaded(true);

      if (isBackendConfigured()) {
        const res = await api.get<Stored>(ROUTES.streak);
        if (!cancelled && res.ok && res.data?.days) {
          setState((prev) => {
            const merged = { ...prev, ...res.data, days: { ...prev.days, ...res.data.days } };
            saveJSON(storeKey, merged);
            return merged;
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  const persist = useCallback(
    (next: Stored) => {
      setState(next);
      saveJSON(storeKey, next);
      if (isBackendConfigured()) api.post(ROUTES.streakCheckIn, next);
    },
    [storeKey]
  );

  /* ── Check-in ──────────────────────────────────────────────────────────── */
  const checkIn = useCallback(async () => {
    if (!loaded || checkingIn.current) return;
    checkingIn.current = true;

    try {
      const today = dayKey();
      const already = state.days[today]?.opened;

      const days: Record<string, DayRecord> = {
        ...state.days,
        [today]: {
          opened: true,
          activities: state.days[today]?.activities ?? 0,
          miles: state.days[today]?.miles ?? 0,
          trees: state.days[today]?.trees ?? 0,
        },
      };

      const streak = computeStreak(days);
      const longestStreak = Math.max(state.longestStreak, streak);
      let lastBonusStreak = state.lastBonusStreak;

      // Award the daily check-in exactly once per calendar day.
      if (!already) {
        await award('daily_login');

        // Every 7 days of unbroken streak pays a scaling bonus.
        if (streak > 0 && streak % 7 === 0 && streak !== lastBonusStreak) {
          const weeks = streak / 7;
          await award('streak_bonus', {
            points: 10 * weeks,
            label: `${streak}-day streak bonus`,
          });
          lastBonusStreak = streak;
        }
      }

      persist({ days, longestStreak, lastBonusStreak });
    } finally {
      checkingIn.current = false;
    }
  }, [loaded, state, award, persist]);

  // Always call the freshest checkIn. Without this ref the AppState listener
  // would capture the state from mount, and a second foreground event could
  // award the daily check-in twice.
  const checkInRef = useRef(checkIn);
  checkInRef.current = checkIn;

  // Check in on mount and whenever the app returns to the foreground (which
  // is how a streak rolls over for someone who leaves the app open overnight).
  useEffect(() => {
    if (!loaded) return;
    checkInRef.current();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkInRef.current();
    });
    return () => sub.remove();
  }, [loaded]);

  /* ── Record an activity on a day ───────────────────────────────────────── */
  const recordActivity = useCallback(
    async (miles: number, trees: number, when = Date.now()) => {
      const key = dayKey(when);
      const prev = state.days[key] ?? { opened: true, activities: 0, miles: 0, trees: 0 };
      const days = {
        ...state.days,
        [key]: {
          opened: true,
          activities: prev.activities + 1,
          miles: Math.round((prev.miles + miles) * 100) / 100,
          trees: prev.trees + trees,
        },
      };
      const streak = computeStreak(days);
      persist({
        days,
        longestStreak: Math.max(state.longestStreak, streak),
        lastBonusStreak: state.lastBonusStreak,
      });
    },
    [state, persist]
  );

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const currentStreak = useMemo(() => computeStreak(state.days), [state.days]);

  const calendar = useCallback(
    (n: number): CalendarDay[] => {
      const today = dayKey();
      const out: CalendarDay[] = [];
      for (let i = n - 1; i >= 0; i--) {
        const key = addDays(today, -i);
        const rec = state.days[key];
        const [y, m, d] = key.split('-').map(Number);
        out.push({
          day: key,
          date: new Date(y, m - 1, d),
          opened: !!rec?.opened,
          active: (rec?.activities ?? 0) > 0,
          isToday: key === today,
          inStreak: !!rec?.opened && daysBetween(key, today) < currentStreak,
        });
      }
      return out;
    },
    [state.days, currentStreak]
  );

  const value = useMemo<StreakState>(
    () => ({
      currentStreak,
      longestStreak: Math.max(state.longestStreak, currentStreak),
      days: state.days,
      checkedInToday: !!state.days[dayKey()]?.opened,
      activeToday: (state.days[dayKey()]?.activities ?? 0) > 0,
      totalActiveDays: Object.values(state.days).filter((d) => d.activities > 0).length,
      calendar,
      daysToNextBonus: currentStreak === 0 ? 7 : 7 - (currentStreak % 7 || 7) + (currentStreak % 7 === 0 ? 7 : 0),
      recordActivity,
      checkIn,
    }),
    [currentStreak, state, calendar, recordActivity, checkIn]
  );

  if (!loaded) return null;

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export function useStreak() {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error('useStreak must be used inside <StreakProvider />');
  return ctx;
}
