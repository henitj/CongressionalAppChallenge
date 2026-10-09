import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useGems } from './GemsContext';
import { isObject, keyFor, loadJSON, saveJSON } from '../services/storage';
import { CARE_KINDS, CareKind, TREE_STAGES, TreeStage, stageIndex } from '../constants/treeGrowth';

type CareProgress = Record<CareKind, number>;

type Stored = {
  stageId: TreeStage['id'];
  care: CareProgress;
  /** Trees fully grown before this one — a small forest. */
  forest: number;
};

const zeroCare = (): CareProgress => ({ water: 0, sun: 0, nutrients: 0 });

const DEFAULT: Stored = { stageId: 'seed', care: zeroCare(), forest: 0 };

function isValidStore(v: unknown): v is Stored {
  if (!isObject(v)) return false;
  const s = v as Partial<Stored>;
  return typeof s.stageId === 'string' && isObject(s.care) && typeof s.forest === 'number';
}

type TreeGrowthState = {
  stage: TreeStage;
  stageNumber: number; // 1-based, out of TREE_STAGES.length
  stageCount: number;
  care: CareProgress;
  forest: number;
  isFullyGrown: boolean;
  /** Gem cost of one more unit of the given care type right now. */
  costFor: (kind: CareKind) => number;
  /** True if the current stage's requirement for this care type is already met. */
  isCareDone: (kind: CareKind) => boolean;
  /** Spend gems to add one unit of care. Resolves false if gems are short or the care is already maxed. */
  addCare: (kind: CareKind) => Promise<boolean>;
  /** Start a brand new seed after the current tree is fully grown. */
  plantNew: () => Promise<void>;
};

const TreeGrowthContext = createContext<TreeGrowthState | null>(null);

export function TreeGrowthProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const storeKey = keyFor(userId, 'tree-growth');
  const { spend } = useGems();

  const [store, setStore] = useState<Stored>(DEFAULT);
  const storeRef = useRef(store);
  storeRef.current = store;
  const [loaded, setLoaded] = useState(false);
  // Serialises care purchases. Without this, two taps fired in the same
  // tick (before either has re-rendered) could both read the same stale
  // care/stage snapshot and both succeed — double-spending gems or
  // double-advancing a stage on one purchase's worth of gems.
  const addCareQueue = useRef<Promise<boolean>>(Promise.resolve(false));

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const s = await loadJSON<Stored>(storeKey, DEFAULT, isValidStore);
      if (cancelled) return;
      storeRef.current = s;
      setStore(s);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  const stage = useMemo(
    () => TREE_STAGES.find((s) => s.id === store.stageId) ?? TREE_STAGES[0],
    [store.stageId]
  );
  const idx = stageIndex(stage.id);
  const isFullyGrown = idx === TREE_STAGES.length - 1 && CARE_KINDS.every((k) => store.care[k] >= stage.unitsPerCare);

  const costFor = useCallback((kind: CareKind) => stage.unitCost, [stage]);
  const isCareDone = useCallback(
    (kind: CareKind) => store.care[kind] >= stage.unitsPerCare,
    [store.care, stage]
  );

  const addCare = useCallback<TreeGrowthState['addCare']>(
    (kind) => {
      // Chain onto whatever purchase is already in flight so two calls
      // never race against the same storeRef snapshot.
      const run = addCareQueue.current.then(async () => {
        const current = storeRef.current;
        const curStage = TREE_STAGES.find((s) => s.id === current.stageId) ?? TREE_STAGES[0];
        const curIdx = stageIndex(curStage.id);
        const alreadyMaxed = curIdx === TREE_STAGES.length - 1 && CARE_KINDS.every((k) => current.care[k] >= curStage.unitsPerCare);
        if (alreadyMaxed) return false;
        if (current.care[kind] >= curStage.unitsPerCare) return false;

        const ok = await spend(curStage.unitCost, `${curStage.name} · ${kind}`);
        if (!ok) return false;

        const nextCare: CareProgress = { ...current.care, [kind]: current.care[kind] + 1 };
        const stageDone = CARE_KINDS.every((k) => nextCare[k] >= curStage.unitsPerCare);
        const atLastStage = curIdx === TREE_STAGES.length - 1;

        let next: Stored;
        if (stageDone && !atLastStage) {
          const nextStage = TREE_STAGES[curIdx + 1];
          next = { ...current, stageId: nextStage.id, care: zeroCare() };
        } else {
          next = { ...current, care: nextCare };
        }
        storeRef.current = next;
        setStore(next);
        await saveJSON(storeKey, next);
        return true;
      });
      addCareQueue.current = run;
      return run;
    },
    [spend, storeKey]
  );

  const plantNew = useCallback(async () => {
    const current = storeRef.current;
    const curStage = TREE_STAGES.find((s) => s.id === current.stageId) ?? TREE_STAGES[0];
    const curIdx = stageIndex(curStage.id);
    const done = curIdx === TREE_STAGES.length - 1 && CARE_KINDS.every((k) => current.care[k] >= curStage.unitsPerCare);
    if (!done) return;
    const next: Stored = { stageId: 'seed', care: zeroCare(), forest: current.forest + 1 };
    storeRef.current = next;
    setStore(next);
    await saveJSON(storeKey, next);
  }, [storeKey]);

  const value = useMemo<TreeGrowthState>(
    () => ({
      stage,
      stageNumber: idx + 1,
      stageCount: TREE_STAGES.length,
      care: store.care,
      forest: store.forest,
      isFullyGrown,
      costFor,
      isCareDone,
      addCare,
      plantNew,
    }),
    [stage, idx, store.care, store.forest, isFullyGrown, costFor, isCareDone, addCare, plantNew]
  );

  if (!loaded) return null;

  return <TreeGrowthContext.Provider value={value}>{children}</TreeGrowthContext.Provider>;
}

export function useTreeGrowth() {
  const ctx = useContext(TreeGrowthContext);
  if (!ctx) throw new Error('useTreeGrowth must be used inside <TreeGrowthProvider />');
  return ctx;
}

