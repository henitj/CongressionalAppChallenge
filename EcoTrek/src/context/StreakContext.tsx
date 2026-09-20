import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { useEcoPoints } from '../context/EcoPointsContext';
import { isObject, keyFor, loadJSON, saveJSON } from '../services/storage';
import { dayKey, weekKey } from '../services/dates';
import { activeMilestones, currentWeeklyStreak, freezeTarget, longestWeeklyStreak, weekOffset, WeekRecord, StreakFreeze } from '../services/weeklyStreaks';
export type { WeekRecord, StreakFreeze } from '../services/weeklyStreaks';
export { weekKey as getWeekKey } from '../services/dates';

type DayRecord = { opened: boolean; activities: number; miles: number; trees: number };
type Stored = {
  weeks: Record<string, WeekRecord>;
  longestStreak: number;
  freezes: StreakFreeze[];
  rewardedWeeks: string[];
  activityIds: string[];
  days: Record<string, DayRecord>;
};
const EMPTY: Stored = { weeks: {}, longestStreak: 0, freezes: [], rewardedWeeks: [], activityIds: [], days: {} };
export type WeekDisplay = { weekKey: string; label: string; active: boolean; frozen: boolean; isCurrent: boolean; activities: number };
type StreakState = {
  currentStreak: number; longestStreak: number; weeks: Stored['weeks']; activeThisWeek: boolean;
  totalActiveWeeks: number; freezes: StreakFreeze[]; availableFreezes: number;
  canUseFreeze: boolean;
  useFreeze: () => Promise<{ week: string } | null>;
  recordActivity: (miles: number, trees: number, when?: number, activityId?: string) => Promise<void>;
  weekHistory: (n: number) => WeekDisplay[];
  days: Stored['days'];
};
const StreakContext = createContext<StreakState | null>(null);

/** Local, per-account ledger. The legacy backend uses a different (daily) schema. */
export function StreakProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { award } = useEcoPoints();
  const storeKey = keyFor(user?.id, 'streak');
  const [state, setState] = useState(EMPTY);
  const stateRef = useRef(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [today, setToday] = useState(dayKey());

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const stored = await loadJSON<Partial<Stored>>(storeKey, {}, isObject);
      const weeks = isObject(stored.weeks) ? stored.weeks! : {};
      const next: Stored = {
        ...EMPTY, ...stored, weeks,
        freezes: Array.isArray(stored.freezes) ? stored.freezes : [],
        // Mark historical milestones as handled when migrating; never pay them twice.
        rewardedWeeks: Array.isArray(stored.rewardedWeeks) ? stored.rewardedWeeks : activeMilestones(weeks),
        activityIds: Array.isArray(stored.activityIds) ? stored.activityIds : [],
        days: isObject(stored.days) ? stored.days! : {},
      };
      if (cancelled) return;
      stateRef.current = next;
      setState(next);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [storeKey]);

  const persist = useCallback((next: Stored) => {
    // Reserve synchronously, before any await or React render.
    stateRef.current = next;
    setState(next);
    return saveJSON(storeKey, next);
  }, [storeKey]);

  useEffect(() => {
    const tick = () => setToday(dayKey());
    const timer = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') tick(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, []);

  const recordActivity = useCallback(async (miles: number, trees: number, when = Date.now(), activityId?: string) => {
    if (!Number.isFinite(miles) || miles < 0 || !Number.isFinite(when)) return;
    const current = stateRef.current;
    if (activityId && current.activityIds.includes(activityId)) return;
    const wk = weekKey(new Date(when));
    const prev = current.weeks[wk];
    const weeks = { ...current.weeks, [wk]: {
      weekKey: wk, active: true, frozen: false,
      activities: (prev?.activities ?? 0) + 1,
      miles: Math.round(((prev?.miles ?? 0) + miles) * 100) / 100,
    } };
    const milestones = activeMilestones(weeks).filter((key) => !current.rewardedWeeks.includes(key));
    const freezes = [...current.freezes];
    for (const _key of milestones) {
      if (freezes.filter((f) => f.usedAt === null).length < 4)
        freezes.push({ earnedAt: Date.now(), usedAt: null, usedForWeek: null });
    }
    const dk = dayKey(when), day = current.days[dk];
    const next = {
      ...current, weeks, freezes,
      longestStreak: Math.max(current.longestStreak || 0, longestWeeklyStreak(weeks)),
      rewardedWeeks: [...current.rewardedWeeks, ...milestones],
      activityIds: activityId ? [...current.activityIds, activityId] : current.activityIds,
      days: { ...current.days, [dk]: { opened: true, activities: (day?.activities ?? 0) + 1, miles: (day?.miles ?? 0) + miles, trees: (day?.trees ?? 0) + trees } },
    };
    const saving = persist(next);
    if (!prev?.active) await award('daily_login', { label: 'First activity this week' });
    for (const key of milestones) await award('streak_bonus', { points: 90, label: `Four active weeks · ${key}` });
    await saving;
  }, [award, persist]);

  const useFreeze = useCallback(async () => {
    const current = stateRef.current;
    const target = freezeTarget(current.weeks);
    const index = current.freezes.findIndex((f) => f.usedAt === null);
    if (!target || index < 0) return null;
    const weeks = { ...current.weeks, [target]: { weekKey: target, active: false, activities: 0, miles: 0, frozen: true } };
    await persist({ ...current, weeks,
      longestStreak: Math.max(current.longestStreak, longestWeeklyStreak(weeks)),
      freezes: current.freezes.map((f, i) => i === index ? { ...f, usedAt: Date.now(), usedForWeek: target } : f),
    });
    return { week: target };
  }, [persist]);

  const value = useMemo<StreakState>(() => {
    const availableFreezes = state.freezes.filter((f) => f.usedAt === null).length;
    return {
      currentStreak: currentWeeklyStreak(state.weeks),
      longestStreak: Math.max(state.longestStreak || 0, longestWeeklyStreak(state.weeks)),
      weeks: state.weeks, activeThisWeek: !!state.weeks[weekKey()]?.active,
      totalActiveWeeks: Object.values(state.weeks).filter((w) => w.active).length,
      freezes: state.freezes, availableFreezes,
      canUseFreeze: availableFreezes > 0 && !!freezeTarget(state.weeks),
      useFreeze, recordActivity, days: state.days,
      weekHistory: (n) => Array.from({ length: n }, (_, i) => {
        const key = weekOffset(n - 1 - i), rec = state.weeks[key];
        return { weekKey: key, label: `Week ${Number(key.split('-W')[1])}`, active: !!rec?.active,
          frozen: !!rec?.frozen, isCurrent: key === weekKey(), activities: rec?.activities ?? 0 };
      }),
    };
  }, [state, today, useFreeze, recordActivity]);
  if (!loaded) return null;
  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}
export function useStreak() {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error('useStreak must be used inside <StreakProvider />');
  return ctx;
}
