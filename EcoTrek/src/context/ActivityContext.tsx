import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Coord } from '../services/location';
import { createGrant, computeTrees, TreeGrant } from '../services/trees';
import { evaluateCompletion, validateActivity } from '../services/trailDetection';
import { useAuth } from './AuthContext';
import { useStreak } from './StreakContext';
import { useClub } from '../constants/ClubContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { useProfile, estimateCalories, estimateElevation } from './ProfileContext';
import { useApp } from './AppContext';
import { isArray, keyFor, loadJSON, saveJSON } from '../services/storage';
import { api, isBackendConfigured, ROUTES } from '../services/api';

export type ActivityType = 'hike' | 'bike';

export type Activity = {
  id: string;
  userId: string;
  type: ActivityType;
  startedAt: number;
  endedAt: number;
  miles: number;
  durationSec: number;
  trees: number;
  points: number;
  path: Coord[];
  grant?: TreeGrant;
  trailId?: string;
  trailName?: string;
  trailCompleted?: boolean;
  coveragePercent?: number;
  /** Anti-cheat: false means it doesn't count toward totals. */
  valid: boolean;
  flagReason?: string | null;
  avgMph: number;
  /** Number of speed limit violations during the activity */
  strikeCount: number;
  /** Calories burned estimate */
  calories: number;
  /** Elevation gain in feet */
  elevationGain: number;
  /** Elevation loss in feet */
  elevationLoss: number;
};

export type ActivityResult = {
  activity: Activity;
  pointsAwarded: number;
  treesAwarded: number;
  trailCompleted: boolean;
  trailName: string | null;
  rejected: boolean;
  rejectionReason: string | null;
};

type ContextValue = {
  history: Activity[];
  loading: boolean;
  totalMiles: number;
  totalTrees: number;
  totalActivities: number;
  hikes: number;
  rides: number;
  trailsCompleted: number;
  uniqueTrailsCompleted: number;
  longestMiles: number;
  totalCalories: number;
  addActivity: (
    a: Omit<Activity, 'id' | 'userId' | 'trees' | 'points' | 'grant' | 'valid' | 'avgMph' | 'strikeCount' | 'calories' | 'elevationGain' | 'elevationLoss'>
  ) => Promise<ActivityResult>;
  deleteActivity: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
};

const ActivityContext = createContext<ContextValue | null>(null);

export { computeTrees };

/** Keeps stored paths from bloating AsyncStorage on long rides. */
function thinPath(path: Coord[], maxPoints = 400): Coord[] {
  if (path.length <= maxPoints) return path;
  const step = Math.ceil(path.length / maxPoints);
  const out = path.filter((_, i) => i % step === 0);
  if (out[out.length - 1] !== path[path.length - 1]) out.push(path[path.length - 1]);
  return out;
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { award } = useEcoPoints();
  const { recordActivity } = useStreak();
  const { contribute, myClub } = useClub();
  const { profile } = useProfile();
  const { trails } = useApp();

  const userId = user?.id ?? null;
  const storeKey = keyFor(userId, 'activities');

  const [history, setHistory] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const local = await loadJSON<Activity[]>(storeKey, [], isArray);
      if (cancelled) return;
      setHistory(local);
      setLoading(false);

      if (isBackendConfigured()) {
        const res = await api.get<Activity[]>(ROUTES.activities);
        if (!cancelled && res.ok && Array.isArray(res.data)) {
          const byId = new Map<string, Activity>();
          [...res.data, ...local].forEach((a) => byId.set(a.id, a));
          const merged = [...byId.values()].sort((a, b) => b.startedAt - a.startedAt);
          setHistory(merged);
          saveJSON(storeKey, merged);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  const persist = useCallback(
    (update: (prev: Activity[]) => Activity[]) => {
      setHistory((prev) => {
        const next = update(prev);
        saveJSON(storeKey, next);
        return next;
      });
    },
    [storeKey]
  );

  const addActivity = useCallback<ContextValue['addActivity']>(
    async (input) => {
      const path = thinPath(input.path ?? []);

      // 1. Plausibility check with strike system
      const validation = validateActivity(path, input.miles, input.durationSec, input.type);

      // 2. Trail detection + completion
      const completion = evaluateCompletion(path, input.miles, trails.length ? trails : undefined);

      // 3. Elevation estimate
      const elevation = estimateElevation(path);

      const trees = validation.valid ? computeTrees(input.type, input.miles) : 0;
      const id = `act-${input.startedAt}`;

      const activity: Activity = {
        ...input,
        id,
        userId: userId ?? 'local',
        path,
        trees,
        points: 0,
        valid: validation.valid,
        flagReason: validation.flagReason,
        avgMph: Math.round(validation.avgMph * 10) / 10,
        strikeCount: validation.strikeCount,
        calories: validation.valid
          ? estimateCalories(input.type, input.durationSec, validation.avgMph, profile)
          : 0,
        elevationGain: elevation.gain,
        elevationLoss: elevation.loss,
        trailId: completion.trail?.id,
        trailName: completion.trail?.name,
        trailCompleted: validation.valid && completion.completed,
        coveragePercent: completion.coveragePercent,
        grant: trees > 0 ? createGrant(id, trees, 'activity') : undefined,
      };

      // 4. Award points — only for activities that passed validation
      let pointsAwarded = 0;
      if (validation.valid) {
        const mileAction = input.type === 'hike' ? 'hike_mile' : 'bike_mile';
        const wholeMiles = Math.floor(input.miles);
        if (wholeMiles > 0) {
          pointsAwarded += await award(mileAction, { multiplier: wholeMiles });
        }
        if (trees > 0) {
          pointsAwarded += await award('tree_earned', { multiplier: trees });
        }
        if (activity.trailCompleted && completion.trail) {
          pointsAwarded += await award('trail_completed', {
            points: completion.trail.ecoPoints ?? 25,
            label: `Completed ${completion.trail.name}`,
          });
        }
      }

      activity.points = pointsAwarded;

      // Replace rather than append if this id already exists
      persist((prev) => [activity, ...prev.filter((a) => a.id !== activity.id)].slice(0, 500));

      if (validation.valid) {
        await recordActivity(input.miles, trees, input.startedAt);
        if (myClub) {
          await contribute({ points: pointsAwarded, trees, miles: input.miles, activities: 1 });
        }
      }

      if (isBackendConfigured()) {
        api.post(ROUTES.activities, activity);
      }

      return {
        activity,
        pointsAwarded,
        treesAwarded: trees,
        trailCompleted: !!activity.trailCompleted,
        trailName: completion.trail?.name ?? null,
        rejected: !validation.valid,
        rejectionReason: validation.flagReason,
      };
    },
    [persist, award, recordActivity, contribute, myClub, userId, profile, trails]
  );

  const deleteActivity = useCallback(
    async (id: string) => {
      persist((prev) => prev.filter((a) => a.id !== id));
      if (isBackendConfigured()) api.del(ROUTES.activity(id));
    },
    [persist]
  );

  const clearHistory = useCallback(async () => {
    persist(() => []);
  }, [persist]);

  const stats = useMemo(() => {
    const valid = history.filter((a) => a.valid);
    const completedTrailIds = new Set(
      valid.filter((a) => a.trailCompleted && a.trailId).map((a) => a.trailId!)
    );
    return {
      totalMiles: Math.round(valid.reduce((s, a) => s + a.miles, 0) * 100) / 100,
      totalTrees: valid.reduce((s, a) => s + a.trees, 0),
      totalActivities: valid.length,
      hikes: valid.filter((a) => a.type === 'hike').length,
      rides: valid.filter((a) => a.type === 'bike').length,
      trailsCompleted: valid.filter((a) => a.trailCompleted).length,
      uniqueTrailsCompleted: completedTrailIds.size,
      longestMiles: valid.reduce((m, a) => Math.max(m, a.miles), 0),
      totalCalories: valid.reduce((s, a) => s + (a.calories || 0), 0),
    };
  }, [history]);

  const value = useMemo<ContextValue>(
    () => ({
      history,
      loading,
      ...stats,
      addActivity,
      deleteActivity,
      clearHistory,
    }),
    [history, loading, stats, addActivity, deleteActivity, clearHistory]
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity must be used inside <ActivityProvider />');
  return ctx;
}
