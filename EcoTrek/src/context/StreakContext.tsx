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
import { addDays, dayKey, daysBetween } from '../services/dates';
import { keyFor, loadJSON, saveJSON } from '../services/storage';
import { api, isBackendConfigured, ROUTES } from '../services/api';
import {
  activeDaysInLast,
  bonusForStreak,
  computeStreak,
  DayMap,
  DayRecord,
  daysToNextBonus,
  hasComeback,
  longestRun,
  monthGrid,
  nextMilestone,
  perfectWeeks,
} from '../services/streaks';

/**
 * Daily login streaks.
 *
 * A day counts once the user opens the app. Days where they also logged a hike
 * or ride are stored separately, so the calendar can show the difference
 * between showing up and getting out.
 *
 * All the arithmetic lives in services/streaks.ts and is unit tested; this
 * file only handles state, persistence and awarding points.
 */

export type { DayRecord };

export type CalendarDay = {
  day: string;
  date: Date;
  opened: boolean;
  active: boolean;
  isToday: boolean;
  inStreak: boolean;
};

type StreakState = {
  currentStreak: number;
  longestStreak: number;
  days: DayMap;
  checkedInToday: boolean;
  activeToday: boolean;
  totalActiveDays: number;
  totalCheckIns: number;
  activeDaysLast30: number;
  perfectWeeks: number;
  hadComeback: boolean;
  daysToNextBonus: number;
  nextBonusPoints: number;
  nextMilestone: ReturnType<typeof nextMilestone>;
  calendar: (n: number) => CalendarDay[];
  monthCells: (year: number, month: number) => ReturnType<typeof monthGrid>;
  recordActivity: (miles: number, trees: number, when?: number) => Promise<void>;
  checkIn: () => Promise<void>;
};

const StreakContext = createContext<StreakState | null>(null);

type Stored = {
  days: DayMap;
  longestStreak: number;
  lastBonusStreak: number;
};

const EMPTY: Stored = { days: {}, longestStreak: 0, lastBonusStreak: 0 };

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { award } = useEcoPoints();
  const storeKey = keyFor(user?.id ?? null, 'streak');

  const [state, setState] = useState<Stored>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const busy = useRef(false);

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
            const merged = {
              ...prev,
              ...res.data,
              days: { ...prev.days, ...res.data.days },
            };
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
    if (!loaded || busy.current) return;
    busy.current = true;

    try {
      const today = dayKey();
      const alreadyToday = state.days[today]?.opened;

      const days: DayMap = {
        ...state.days,
        [today]: {
          opened: true,
          activities: state.days[today]?.activities ?? 0,
          miles: state.days[today]?.miles ?? 0,
          trees: state.days[today]?.trees ?? 0,
        },
      };

      const streak = computeStreak(days, today);
      const longestStreak = Math.max(state.longestStreak, streak);
      let lastBonusStreak = state.lastBonusStreak;

      if (!alreadyToday) {
        await award('daily_login');

        // Every seventh day pays a bonus that grows with the streak, once.
        if (streak > 0 && streak % 7 === 0 && streak !== lastBonusStreak) {
          await award('streak_bonus', {
            points: bonusForStreak(streak),
            label: `${streak}-day streak bonus`,
          });
          lastBonusStreak = streak;
        }
      }

      persist({ days, longestStreak, lastBonusStreak });
    } finally {
      busy.current = false;
    }
  }, [loaded, state, award, persist]);

  // Always call the freshest checkIn. Without this ref the AppState listener
  // captures state from mount and can award the daily check-in twice.
  const checkInRef = useRef(checkIn);
  checkInRef.current = checkIn;

  useEffect(() => {
    if (!loaded) return;
    checkInRef.current();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkInRef.current();
    });
    return () => sub.remove();
  }, [loaded]);

  /* ── Record an activity ────────────────────────────────────────────────── */
  const recordActivity = useCallback(
    async (miles: number, trees: number, when = Date.now()) => {
      const key = dayKey(when);
      const prev = state.days[key] ?? { opened: true, activities: 0, miles: 0, trees: 0 };
      const days: DayMap = {
        ...state.days,
        [key]: {
          opened: true,
          activities: prev.activities + 1,
          miles: Math.round((prev.miles + miles) * 100) / 100,
          trees: prev.trees + trees,
        },
      };
      persist({
        days,
        longestStreak: Math.max(state.longestStreak, computeStreak(days)),
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

  const monthCells = useCallback(
    (year: number, month: number) => monthGrid(year, month, state.days),
    [state.days]
  );

  const stats = useMemo(() => {
    const values = Object.values(state.days);
    return {
      totalActiveDays: values.filter((d) => d.activities > 0).length,
      totalCheckIns: values.filter((d) => d.opened).length,
      activeDaysLast30: activeDaysInLast(state.days, 30),
      perfectWeeks: perfectWeeks(state.days),
      hadComeback: hasComeback(state.days),
    };
  }, [state.days]);

  const value = useMemo<StreakState>(() => {
    const longest = Math.max(state.longestStreak, longestRun(state.days), currentStreak);
    return {
      currentStreak,
      longestStreak: longest,
      days: state.days,
      checkedInToday: !!state.days[dayKey()]?.opened,
      activeToday: (state.days[dayKey()]?.activities ?? 0) > 0,
      ...stats,
      daysToNextBonus: daysToNextBonus(currentStreak),
      nextBonusPoints: bonusForStreak(currentStreak + daysToNextBonus(currentStreak)),
      nextMilestone: nextMilestone(currentStreak),
      calendar,
      monthCells,
      recordActivity,
      checkIn,
    };
  }, [currentStreak, state, stats, calendar, monthCells, recordActivity, checkIn]);

  if (!loaded) return null;

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export function useStreak() {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error('useStreak must be used inside <StreakProvider />');
  return ctx;
}
