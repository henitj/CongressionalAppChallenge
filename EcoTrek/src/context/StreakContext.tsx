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
import { keyFor, loadJSON, saveJSON } from '../services/storage';
import { api, isBackendConfigured, ROUTES } from '../services/api';

/**
 * Weekly streaks with freeze system.
 *
 * A week counts if the user logged at least one activity during that week.
 * Users get 1 freeze per month (stackable up to 4), which lets them skip
 * a week without breaking their streak.
 */

export type WeekRecord = {
  /** ISO week key like "2026-W34" */
  weekKey: string;
  /** Whether the user was active this week */
  active: boolean;
  /** Number of activities logged */
  activities: number;
  /** Total miles */
  miles: number;
  /** Whether this week used a freeze */
  frozen: boolean;
};

export type StreakFreeze = {
  /** When the freeze was earned */
  earnedAt: number;
  /** When it was used (null if available) */
  usedAt: number | null;
  /** Which week it was used for */
  usedForWeek: string | null;
};

type StreakState = {
  currentStreak: number;
  longestStreak: number;
  weeks: Record<string, WeekRecord>;
  activeThisWeek: boolean;
  totalActiveWeeks: number;
  freezes: StreakFreeze[];
  availableFreezes: number;
  useFreeze: () => Promise<void>;
  recordActivity: (miles: number, trees: number, when?: number) => Promise<void>;
  weekHistory: (n: number) => WeekDisplay[];
  /** Compatibility: day-keyed activity records, synthesized from weeks + activities */
  days: Record<string, { opened: boolean; activities: number; miles: number; trees: number }>;
};

export type WeekDisplay = {
  weekKey: string;
  label: string;
  active: boolean;
  frozen: boolean;
  isCurrent: boolean;
  activities: number;
};

const StreakContext = createContext<StreakState | null>(null);

type Stored = {
  weeks: Record<string, WeekRecord>;
  longestStreak: number;
  freezes: StreakFreeze[];
  lastBonusStreak: number;
};

const EMPTY: Stored = { weeks: {}, longestStreak: 0, freezes: [], lastBonusStreak: 0 };

/** Get ISO week key for a given timestamp */
function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Get a human label for a week key */
function weekLabel(weekKey: string): string {
  const [year, w] = weekKey.split('-W');
  return `Week ${parseInt(w)} (${year})`;
}

/** Get the week key N weeks before the current one */
function weekKeyOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset * 7);
  return getWeekKey(d);
}

/** Count the current streak of active (or frozen) weeks */
function computeStreak(weeks: Record<string, WeekRecord>): number {
  let streak = 0;
  const current = getWeekKey();

  // Check current week first
  const currentWeek = weeks[current];
  if (currentWeek?.active || currentWeek?.frozen) {
    streak = 1;
  } else {
    // Current week isn't done yet — check if last week was active
    // The streak continues if last week was active (current week is still in progress)
    const prevWeek = weeks[weekKeyOffset(1)];
    if (!prevWeek?.active && !prevWeek?.frozen) return 0;
    streak = 0;
  }

  // Walk backwards
  let i = 1;
  while (i < 520) {
    const key = weekKeyOffset(i);
    const week = weeks[key];
    if (week?.active || week?.frozen) {
      streak++;
      i++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Earn a freeze for every 4 consecutive active weeks.
 * Max stackable: 4 freezes.
 */
function earnFreezes(weeks: Record<string, WeekRecord>, existingFreezes: StreakFreeze[]): StreakFreeze[] {
  const freezes = [...existingFreezes];
  const available = freezes.filter((f) => !f.usedAt).length;
  
  if (available >= 4) return freezes;

  // Count consecutive active weeks
  let consecutive = 0;
  let i = 0;
  while (i < 520) {
    const key = weekKeyOffset(i);
    const week = weeks[key];
    if (week?.active) {
      consecutive++;
      i++;
    } else {
      break;
    }
  }

  // Award a freeze for every 4 consecutive weeks
  const earnedFreezes = Math.floor(consecutive / 4);
  const alreadyEarned = freezes.length;
  const newFreezes = Math.max(0, earnedFreezes - alreadyEarned);

  for (let j = 0; j < newFreezes; j++) {
    if (freezes.filter((f) => !f.usedAt).length >= 4) break;
    freezes.push({
      earnedAt: Date.now(),
      usedAt: null,
      usedForWeek: null,
    });
  }

  return freezes;
}

export function StreakProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { award } = useEcoPoints();
  const storeKey = keyFor(user?.id ?? null, 'streak');

  const [state, setState] = useState<Stored>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const busy = useRef(false);

  const stateRef = useRef<Stored>(EMPTY);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const stored = await loadJSON<Stored>(storeKey, EMPTY);
      if (cancelled) return;
      setState({ ...EMPTY, ...stored, weeks: stored.weeks ?? {}, freezes: stored.freezes ?? [] });
      setLoaded(true);

      if (isBackendConfigured()) {
        const res = await api.get<Stored>(ROUTES.streak);
        if (!cancelled && res.ok && res.data?.weeks) {
          setState((prev) => {
            const merged = {
              ...prev,
              ...res.data,
              weeks: { ...prev.weeks, ...res.data.weeks },
              freezes: res.data.freezes ?? prev.freezes,
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
      stateRef.current = next;
      setState(next);
      saveJSON(storeKey, next);
      if (isBackendConfigured()) api.post(ROUTES.streakCheckIn, next);
    },
    [storeKey]
  );

  // On app become active, ensure current week is registered
  useEffect(() => {
    if (!loaded) return;
    const checkCurrentWeek = () => {
      const current = stateRef.current;
      const weekKey = getWeekKey();
      if (!current.weeks[weekKey]) {
        const weeks = {
          ...current.weeks,
          [weekKey]: { weekKey, active: false, activities: 0, miles: 0, frozen: false },
        };
        persist({ ...current, weeks });
      }
    };
    checkCurrentWeek();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkCurrentWeek();
    });
    return () => sub.remove();
  }, [loaded, persist]);

  const recordActivity = useCallback(
    async (miles: number, _trees: number, when = Date.now()) => {
      const current = stateRef.current;
      const wk = getWeekKey(new Date(when));
      const prev = current.weeks[wk] ?? { weekKey: wk, active: false, activities: 0, miles: 0, frozen: false };

      const updatedWeek: WeekRecord = {
        ...prev,
        active: true,
        activities: prev.activities + 1,
        miles: Math.round((prev.miles + miles) * 100) / 100,
      };

      const weeks = { ...current.weeks, [wk]: updatedWeek };

      const streak = computeStreak(weeks);
      const longestStreak = Math.max(current.longestStreak, streak);
      const freezes = earnFreezes(weeks, current.freezes);

      // Award points for weekly activity (first activity of the week only)
      if (prev.activities === 0) {
        await award('daily_login'); // reuse daily login points for weekly activity

        // Streak bonus every 4 weeks
        if (streak > 0 && streak % 4 === 0 && streak !== current.lastBonusStreak) {
          await award('streak_bonus', {
            points: 50 + streak * 10,
            label: `${streak}-week streak bonus`,
          });
          persist({ weeks, longestStreak, freezes, lastBonusStreak: streak });
          return;
        }
      }

      persist({ weeks, longestStreak, freezes, lastBonusStreak: current.lastBonusStreak });
    },
    [award, persist]
  );

  const useFreeze = useCallback(async () => {
    const current = stateRef.current;
    const available = current.freezes.find((f) => !f.usedAt);
    if (!available) return;

    // Apply freeze to the most recent inactive week
    const prevWeek = getWeekKey(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const weeks = { ...current.weeks };

    if (!weeks[prevWeek]?.active) {
      weeks[prevWeek] = {
        ...(weeks[prevWeek] ?? { weekKey: prevWeek, active: false, activities: 0, miles: 0, frozen: false }),
        frozen: true,
      };
    }

    const freezes = current.freezes.map((f) =>
      f === available
        ? { ...f, usedAt: Date.now(), usedForWeek: prevWeek }
        : f
    );

    const streak = computeStreak(weeks);
    const longestStreak = Math.max(current.longestStreak, streak);

    persist({ ...current, weeks, freezes, longestStreak });
  }, [persist]);

  const currentStreak = useMemo(() => computeStreak(state.weeks), [state.weeks]);
  const availableFreezes = useMemo(
    () => state.freezes.filter((f) => !f.usedAt).length,
    [state.freezes]
  );

  const weekHistory = useCallback(
    (n: number): WeekDisplay[] => {
      const out: WeekDisplay[] = [];
      for (let i = n - 1; i >= 0; i--) {
        const key = weekKeyOffset(i);
        const rec = state.weeks[key];
        out.push({
          weekKey: key,
          label: weekLabel(key),
          active: !!rec?.active,
          frozen: !!rec?.frozen,
          isCurrent: key === getWeekKey(),
          activities: rec?.activities ?? 0,
        });
      }
      return out;
    },
    [state.weeks]
  );

  const totalActiveWeeks = useMemo(
    () => Object.values(state.weeks).filter((w) => w.active).length,
    [state.weeks]
  );

  // Compatibility: create day-like records from week records for RecapScreen
  const days = useMemo(() => {
    const result: Record<string, { opened: boolean; activities: number; miles: number; trees: number }> = {};
    for (const [wk, rec] of Object.entries(state.weeks)) {
      // Use the week key as a stand-in for day records
      result[wk] = { opened: rec.active || rec.frozen, activities: rec.activities, miles: rec.miles, trees: 0 };
    }
    return result;
  }, [state.weeks]);

  const value = useMemo<StreakState>(() => ({
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    weeks: state.weeks,
    activeThisWeek: !!state.weeks[getWeekKey()]?.active,
    totalActiveWeeks,
    freezes: state.freezes,
    availableFreezes,
    useFreeze,
    recordActivity,
    weekHistory,
    days,
  }), [currentStreak, state, totalActiveWeeks, availableFreezes, useFreeze, recordActivity, weekHistory, days]);

  if (!loaded) return null;

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export function useStreak() {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error('useStreak must be used inside <StreakProvider />');
  return ctx;
}
