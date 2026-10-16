import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { useGems } from './GemsContext';
import { keyFor, loadJSON, saveJSON } from '../services/storage';
import { atCurrentWeek, completeCare, emptyTree, normalizeTreeGrowth, treeStatus, type TreeGrowthStore } from '../services/treeGrowth';
import { CARE_KINDS, CARE_LABEL, WEEKLY_CARE_COST, type CareKind } from '../constants/treeGrowth';
import { weekKey } from '../services/dates';

type TreeGrowthState = ReturnType<typeof treeStatus> & {
  saveError: string | null;
  costFor: (kind: CareKind) => number;
  isCareDone: (kind: CareKind) => boolean;
  addCare: (kind: CareKind) => Promise<boolean>;
  /** A compact permanent ledger, independent of the one-year raw logbook. */
  recordOutdoorWeek: (finishedAt: number) => Promise<boolean>;
  harvestApple: () => Promise<boolean>;
  /** Optional only after 18 months + 78 qualifying weeks. */
  plantNew: () => Promise<boolean>;
  /**
   * Developer/demo only (the UI only shows this in developer mode): grow the
   * tree as if `weeks` fully-cared, outdoors weeks had passed, at whatever
   * pace the demo needs. Normal growth rules are untouched for everyone else.
   */
  developerAdvanceTree: (weeks: number) => Promise<boolean>;
};
const TreeGrowthContext = createContext<TreeGrowthState | null>(null);

export function TreeGrowthProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storeKey = keyFor(user?.id, 'tree-growth');
  const { spend, adjust } = useGems();
  const [store, setStore] = useState<TreeGrowthStore>(() => emptyTree());
  const storeRef = useRef(store);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  const activeKey = useRef(storeKey);
  if (activeKey.current !== storeKey) {
    activeKey.current = storeKey;
    loadedRef.current = false;
  }
  const [now, setNow] = useState(Date.now);
  const [saveError, setSaveError] = useState<string | null>(null);
  const queue = useRef<Promise<boolean>>(Promise.resolve(false));

  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;
    setLoaded(false);
    setSaveError(null);
    (async () => {
      const raw = await loadJSON<unknown>(storeKey, null);
      if (cancelled) return;
      const time = Date.now();
      const normalized = normalizeTreeGrowth(raw, time);
      storeRef.current = normalized;
      setStore(normalized);
      setNow(time);
      loadedRef.current = true;
      setLoaded(true);
      // Persist the real planting date immediately, not at the first purchase.
      try { await saveJSON(storeKey, normalized, { strict: true }); }
      catch { if (!cancelled) setSaveError('Your tree couldn’t be saved. Check free device storage and try again.'); }
    })();
    return () => { cancelled = true; };
  }, [storeKey]);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 60_000);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') update(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);

  const commit = useCallback(async (next: TreeGrowthStore, key: string) => {
    try { await saveJSON(key, next, { strict: true }); }
    catch (error) {
      if (activeKey.current === key) setSaveError('Your tree couldn’t be saved. Check free device storage and try again.');
      throw error;
    }
    if (activeKey.current === key) {
      storeRef.current = next;
      setStore(next);
      setNow(next.lastSeenAt);
      setSaveError(null);
    }
  }, []);

  // Care, activity credit, harvest and replant share one queue. Rapid taps
  // cannot double-spend, duplicate a week, mint apples or archive twice.
  const serialize = useCallback((operation: (current: TreeGrowthStore, time: number, key: string) => Promise<boolean>) => {
    const key = storeKey;
    const run = queue.current.catch(() => false).then(async () => {
      if (!loadedRef.current || activeKey.current !== key) return false;
      const time = Math.max(Date.now(), storeRef.current.lastSeenAt);
      setNow(time);
      return operation(atCurrentWeek(storeRef.current, time), time, key);
    });
    queue.current = run;
    return run;
  }, [storeKey]);

  const addCare = useCallback((kind: CareKind) => serialize(async (current, time, key) => {
    if (!CARE_KINDS.includes(kind) || current.care[kind] === 1) return false;
    if (!await spend(WEEKLY_CARE_COST, `Weekly tree care · ${CARE_LABEL[kind]}`)) return false;
    const care = { ...current.care, [kind]: 1 };
    const careWeeks = CARE_KINDS.every((item) => care[item] === 1)
      ? [...new Set([...current.careWeeks, current.careWeek])].sort() : current.careWeeks;
    try { await commit({ ...current, care, careWeeks, careHistory: { ...current.careHistory, [current.careWeek]: care }, lastSeenAt: time }, key); }
    catch (error) { await adjust(WEEKLY_CARE_COST, 'Tree care not saved · gem returned'); throw error; }
    return true;
  }), [serialize, spend, adjust, commit]);

  const recordOutdoorWeek = useCallback((finishedAt: number) => serialize(async (current, time, key) => {
    if (!Number.isFinite(finishedAt) || finishedAt < current.plantedAt || finishedAt > time) return false;
    const week = weekKey(new Date(finishedAt));
    if (current.outdoorWeeks.includes(week)) return false;
    await commit({ ...current, outdoorWeeks: [...current.outdoorWeeks, week].sort(), lastSeenAt: time }, key);
    return true;
  }), [serialize, commit]);

  const developerAdvanceTree = useCallback((weeks: number) => serialize(async (current, time, key) => {
    const count = Math.max(1, Math.min(260, Math.floor(weeks) || 0));
    if (!count) return false;
    // Backdate the planting by the requested weeks and credit every one of
    // those weeks with full care + an outdoor outing, so both the calendar
    // gates and the effort score move together — the tree genuinely grows.
    const plantedAt = current.plantedAt - count * 7 * 86400000;
    const careWeeks = new Set(current.careWeeks);
    const outdoorWeeks = new Set(current.outdoorWeeks);
    const careHistory = { ...current.careHistory };
    for (let i = 0; i <= count; i++) {
      const week = weekKey(new Date(plantedAt + i * 7 * 86400000));
      careWeeks.add(week);
      outdoorWeeks.add(week);
      careHistory[week] = completeCare();
    }
    const currentWeek = weekKey(new Date(time));
    careWeeks.add(currentWeek);
    outdoorWeeks.add(currentWeek);
    careHistory[currentWeek] = completeCare();
    await commit({
      ...current,
      plantedAt,
      care: completeCare(),
      careWeeks: [...careWeeks].sort(),
      outdoorWeeks: [...outdoorWeeks].sort(),
      careHistory,
      lastSeenAt: time,
    }, key);
    return true;
  }), [serialize, commit]);

  const harvestApple = useCallback(() => serialize(async (current, time, key) => {
    if (!treeStatus(current, time).canHarvest) return false;
    await commit({ ...current, goldenApples: current.goldenApples + 1, harvestedWeeks: [...current.harvestedWeeks, current.careWeek], lastSeenAt: time }, key);
    return true;
  }), [serialize, commit]);

  const plantNew = useCallback(() => serialize(async (current, time, key) => {
    if (!treeStatus(current, time).isSage) return false;
    await commit({ ...emptyTree(time), forest: current.forest + 1, goldenApples: current.goldenApples, harvestedWeeks: current.harvestedWeeks }, key);
    return true;
  }), [serialize, commit]);

  const status = useMemo(() => treeStatus(store, now), [store, now]);
  const isCareDone = useCallback((kind: CareKind) => status.care[kind] === 1, [status.care]);
  const costFor = useCallback((_kind: CareKind) => WEEKLY_CARE_COST, []);
  const value = useMemo<TreeGrowthState>(() => ({ ...status, saveError, costFor, isCareDone, addCare, recordOutdoorWeek, harvestApple, plantNew, developerAdvanceTree }),
    [status, saveError, costFor, isCareDone, addCare, recordOutdoorWeek, harvestApple, plantNew, developerAdvanceTree]);
  if (!loaded) return null;
  return <TreeGrowthContext.Provider value={value}>{children}</TreeGrowthContext.Provider>;
}
export function useOptionalTreeGrowth() { return useContext(TreeGrowthContext); }
export function useTreeGrowth() {
  const context = useOptionalTreeGrowth();
  if (!context) throw new Error('useTreeGrowth must be used inside <TreeGrowthProvider />');
  return context;
}
