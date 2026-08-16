import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Coord } from '../services/location';
import { TREE_RULES } from '../constants/theme';
import { createGrant, TreeGrant } from '../services/trees';
import { evaluateCompletion, validateActivity } from '../services/trailDetection';
import { useAuth } from './AuthContext';
import { useStreak } from './StreakContext';
import { useClub } from '../constants/ClubContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { keyFor, loadJSON, saveJSON } from '../services/storage';
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
  /** Trail we matched this activity to, if any. */
  trailId?: string;
  trailName?: string;
  trailCompleted?: boolean;
  coveragePercent?: number;
  /** Anti-cheat: false means it doesn't count toward totals. */
  valid: boolean;
  flagReason?: string | null;
  avgMph: number;
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
  addActivity: (
    a: Omit<Activity, 'id' | 'userId' | 'trees' | 'points' | 'grant' | 'valid' | 'avgMph'>
  ) => Promise<ActivityResult>;
  deleteActivity: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
};

const ActivityContext = createContext<ContextValue | null>(null);

export function computeTrees(type: ActivityType, miles: number): number {
  const rule = type === 'bike' ? TREE_RULES.bikeMilesPerTree : TREE_RULES.hikeMilesPerTree;
  return Math.floor(miles / rule);
}

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

  const userId = user?.id ?? null;
  const storeKey = keyFor(userId, 'activities');

  const [history, setHistory] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Load persisted history (this used to be memory-only and vanished on
        every app close) ──────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const local = await loadJSON<Activity[]>(storeKey, []);
      if (cancelled) return;
      setHistory(local);
      setLoading(false);

      if (isBackendConfigured()) {
        const res = await api.get<Activity[]>(ROUTES.activities);
        if (!cancelled && res.ok && Array.isArray(res.data)) {
          // Merge server + local, dedup by id, newest first.
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
    (next: Activity[]) => {
      setHistory(next);
      saveJSON(storeKey, next);
    },
    [storeKey]
  );

  /* ── Record a finished activity ────────────────────────────────────────── */
  const addActivity = useCallback<ContextValue['addActivity']>(
    async (input) => {
      const path = thinPath(input.path ?? []);

      // 1. Plausibility check.
      const validation = validateActivity(path, input.miles, input.durationSec, input.type);

      // 2. Trail detection + completion.
      const completion = evaluateCompletion(path, input.miles);

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
        trailId: completion.trail?.id,
        trailName: completion.trail?.name,
        trailCompleted: validation.valid && completion.completed,
        coveragePercent: completion.coveragePercent,
        grant: trees > 0 ? createGrant(id, trees, 'activity') : undefined,
      };

      // 3. Award points — only for activities that passed validation.
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

      const next = [activity, ...history].slice(0, 500);
      persist(next);

      if (validation.valid) {
        // 4. Streak calendar.
        await recordActivity(input.miles, trees, input.startedAt);

        // 5. Club contribution.
        if (myClub) {
          await contribute({ points: pointsAwarded, trees, miles: input.miles });
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
    [history, persist, award, recordActivity, contribute, myClub, userId]
  );

  const deleteActivity = useCallback(
    async (id: string) => {
      persist(history.filter((a) => a.id !== id));
      if (isBackendConfigured()) api.del(ROUTES.activity(id));
    },
    [history, persist]
  );

  const clearHistory = useCallback(async () => {
    persist([]);
  }, [persist]);

  /* ── Aggregates (invalid activities never count) ───────────────────────── */
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
