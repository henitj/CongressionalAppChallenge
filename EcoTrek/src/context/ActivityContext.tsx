import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Coord } from '../services/location';
import { TREE_RULES } from '../constants/theme';
import { commitPlanting, PlantingReceipt } from '../services/veritree';

export type ActivityType = 'hike' | 'bike';

export type Activity = {
  id: string;
  type: ActivityType;
  startedAt: number;
  endedAt: number;
  miles: number;
  durationSec: number;
  trees: number;
  path: Coord[];
  receipt?: PlantingReceipt;
};

type ContextValue = {
  history: Activity[];
  totalMiles: number;
  totalTrees: number;
  addActivity: (
    a: Omit<Activity, 'id' | 'trees' | 'receipt'>
  ) => Promise<Activity>;
};

const ActivityContext = createContext<ContextValue | null>(null);

export function computeTrees(type: ActivityType, miles: number): number {
  const rule =
    type === 'bike'
      ? TREE_RULES.bikeMilesPerTree
      : TREE_RULES.hikeMilesPerTree;
  return Math.floor(miles / rule);
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<Activity[]>([]);

  const addActivity = useCallback<ContextValue['addActivity']>(
    async (a) => {
      const trees = computeTrees(a.type, a.miles);
      let receipt: PlantingReceipt | undefined;
      if (trees > 0) {
        receipt = await commitPlanting({
          userId: 'demo-user',
          activityId: `act-${a.startedAt}`,
          trees,
          miles: a.miles,
          activityType: a.type,
          location: 'Austin, TX',
        });
      }
      const activity: Activity = {
        ...a,
        id: `act-${a.startedAt}`,
        trees,
        receipt,
      };
      setHistory((h) => [activity, ...h]);
      return activity;
    },
    []
  );

  const totals = useMemo(() => {
    return history.reduce(
      (acc, a) => {
        acc.totalMiles += a.miles;
        acc.totalTrees += a.trees;
        return acc;
      },
      { totalMiles: 0, totalTrees: 0 }
    );
  }, [history]);

  const value: ContextValue = {
    history,
    addActivity,
    ...totals,
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx)
    throw new Error('useActivity must be used inside <ActivityProvider />');
  return ctx;
}
