import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { useActivity } from './ActivityContext';
import { useStreak } from './StreakContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { useClub } from '../constants/ClubContext';
import {
  challengesForWeek,
  ChallengeTemplate,
  CHALLENGES_PER_WEEK,
} from '../constants/challenges';
import {
  dayKey,
  keyFor,
  loadJSON,
  saveJSON,
  weekEnd,
  weekKey,
  weekStart,
} from '../services/storage';
import { api, isBackendConfigured, ROUTES } from '../services/api';

/**
 * Weekly challenges.
 *
 * Five challenges per week, the same five for everyone (chosen deterministically
 * from the week id, so no server is needed for people to compete on equal
 * footing). They reset every Monday at midnight local time.
 *
 * Completing one:
 *   1. adds its points to your EcoPoints total, and
 *   2. adds the same points to your club's score.
 */

export type ActiveChallenge = ChallengeTemplate & {
  completed: boolean;
  completedAt: number | null;
  /** Auto challenges only: current value and 0-100 progress. */
  progress: number;
  progressPercent: number;
};

type Stored = {
  weekId: string;
  completed: Record<string, number>; // challengeId -> completedAt
  lifetimeCompleted: number;
  lifetimePoints: number;
};

type ChallengeState = {
  weekId: string;
  weekEndsAt: number;
  /** e.g. "3 days left". */
  timeLeftLabel: string;
  challenges: ActiveChallenge[];
  completedCount: number;
  totalCount: number;
  pointsAvailable: number;
  pointsEarnedThisWeek: number;
  lifetimeCompleted: number;
  allDone: boolean;
  completeChallenge: (id: string) => Promise<{ points: number; title: string } | null>;
  undoChallenge: (id: string) => Promise<void>;
};

const ChallengeContext = createContext<ChallengeState | null>(null);

const emptyStored = (weekId: string): Stored => ({
  weekId,
  completed: {},
  lifetimeCompleted: 0,
  lifetimePoints: 0,
});

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { history } = useActivity();
  const { days: streakDays } = useStreak();
  const { award } = useEcoPoints();
  const { contribute, myClub } = useClub();

  const userId = user?.id ?? null;
  const storeKey = keyFor(userId, 'challenges');

  const [weekId, setWeekId] = useState(() => weekKey());
  const [store, setStore] = useState<Stored>(() => emptyStored(weekKey()));
  const [loaded, setLoaded] = useState(false);

  /* ── Load, rolling over if the week changed while the app was closed ────── */
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const current = weekKey();
      const stored = await loadJSON<Stored>(storeKey, emptyStored(current));
      if (cancelled) return;

      const rolled =
        stored.weekId === current
          ? stored
          : { ...stored, weekId: current, completed: {} };

      setWeekId(current);
      setStore(rolled);
      setLoaded(true);
      if (rolled !== stored) saveJSON(storeKey, rolled);

      if (isBackendConfigured()) {
        const res = await api.get<Stored>(`${ROUTES.challenges}?week=${current}`);
        if (!cancelled && res.ok && res.data?.weekId === current) {
          setStore((prev) => {
            const merged = {
              ...prev,
              ...res.data,
              completed: { ...prev.completed, ...res.data.completed },
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

  /* ── Roll over live if the app is open across midnight Sunday ──────────── */
  useEffect(() => {
    const t = setInterval(() => {
      const current = weekKey();
      if (current !== weekId) {
        setWeekId(current);
        setStore((prev) => {
          const next = { ...prev, weekId: current, completed: {} };
          saveJSON(storeKey, next);
          return next;
        });
      }
    }, 60_000);
    return () => clearInterval(t);
  }, [weekId, storeKey]);

  /* ── This week's measured stats (for auto challenges) ──────────────────── */
  const weekStats = useMemo(() => {
    const since = weekStart().getTime();
    let miles = 0;
    let trees = 0;
    let activities = 0;
    for (const a of history) {
      if (a.startedAt >= since) {
        miles += a.miles;
        trees += a.trees;
        activities += 1;
      }
    }

    const start = weekStart();
    let streakDaysThisWeek = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (d.getTime() > Date.now()) break;
      if (streakDays[dayKey(d)]?.opened) streakDaysThisWeek++;
    }

    return { miles, trees, activities, streakDaysThisWeek };
  }, [history, streakDays]);

  const templates = useMemo(() => challengesForWeek(weekId), [weekId]);

  /* ── Build the active list ─────────────────────────────────────────────── */
  const challenges = useMemo<ActiveChallenge[]>(() => {
    return templates.map((t) => {
      let progress = 0;
      if (t.kind === 'auto' && t.metric) {
        progress =
          t.metric === 'miles'
            ? weekStats.miles
            : t.metric === 'trees'
            ? weekStats.trees
            : t.metric === 'activities'
            ? weekStats.activities
            : weekStats.streakDaysThisWeek;
      }
      const target = t.target ?? 1;
      const completedAt = store.completed[t.id] ?? null;
      return {
        ...t,
        progress,
        progressPercent: t.kind === 'auto' ? Math.min(100, (progress / target) * 100) : completedAt ? 100 : 0,
        completed: completedAt != null,
        completedAt,
      };
    });
  }, [templates, weekStats, store.completed]);

  /* ── Award + persist ───────────────────────────────────────────────────── */
  const completeChallenge = useCallback(
    async (id: string) => {
      const t = templates.find((c) => c.id === id);
      if (!t) return null;
      if (store.completed[id]) return null;

      const next: Stored = {
        ...store,
        weekId,
        completed: { ...store.completed, [id]: Date.now() },
        lifetimeCompleted: store.lifetimeCompleted + 1,
        lifetimePoints: store.lifetimePoints + t.points,
      };
      setStore(next);
      saveJSON(storeKey, next);

      // 1. Personal points
      await award('challenge_completed', { points: t.points, label: t.title });

      // 2. Club points — this is how challenges lift your team's score.
      if (myClub) {
        await contribute({ points: t.points, trees: 0, miles: 0 });
      }

      if (isBackendConfigured()) {
        api.post(ROUTES.challengeComplete(id), { weekId, points: t.points });
      }

      return { points: t.points, title: t.title };
    },
    [templates, store, weekId, storeKey, award, contribute, myClub]
  );

  const undoChallenge = useCallback(
    async (id: string) => {
      const t = templates.find((c) => c.id === id);
      if (!t || !store.completed[id]) return;
      const completed = { ...store.completed };
      delete completed[id];
      const next: Stored = {
        ...store,
        completed,
        lifetimeCompleted: Math.max(0, store.lifetimeCompleted - 1),
        lifetimePoints: Math.max(0, store.lifetimePoints - t.points),
      };
      setStore(next);
      saveJSON(storeKey, next);

      await award('challenge_completed', { points: -t.points, label: `Undid: ${t.title}` });
      if (myClub) await contribute({ points: -t.points, trees: 0, miles: 0 });
    },
    [templates, store, storeKey, award, contribute, myClub]
  );

  /* ── Auto-complete measured challenges as soon as they hit target ──────── */
  useEffect(() => {
    if (!loaded) return;
    for (const c of challenges) {
      if (c.kind === 'auto' && !c.completed && c.progress >= (c.target ?? 1)) {
        completeChallenge(c.id);
        break; // one per tick; the effect re-runs after state settles
      }
    }
  }, [loaded, challenges, completeChallenge]);

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const endsAt = useMemo(() => weekEnd().getTime(), [weekId]);

  const timeLeftLabel = useMemo(() => {
    const ms = endsAt - Date.now();
    if (ms <= 0) return 'Resetting';
    const days = Math.floor(ms / 86400000);
    if (days >= 1) return `${days} day${days === 1 ? '' : 's'} left`;
    const hours = Math.max(1, Math.floor(ms / 3600000));
    return `${hours} hour${hours === 1 ? '' : 's'} left`;
  }, [endsAt]);

  const completedCount = challenges.filter((c) => c.completed).length;
  const pointsEarnedThisWeek = challenges.reduce((s, c) => s + (c.completed ? c.points : 0), 0);
  const pointsAvailable = challenges.reduce((s, c) => s + c.points, 0);

  const value = useMemo<ChallengeState>(
    () => ({
      weekId,
      weekEndsAt: endsAt,
      timeLeftLabel,
      challenges,
      completedCount,
      totalCount: CHALLENGES_PER_WEEK,
      pointsAvailable,
      pointsEarnedThisWeek,
      lifetimeCompleted: store.lifetimeCompleted,
      allDone: completedCount === challenges.length && challenges.length > 0,
      completeChallenge,
      undoChallenge,
    }),
    [
      weekId,
      endsAt,
      timeLeftLabel,
      challenges,
      completedCount,
      pointsAvailable,
      pointsEarnedThisWeek,
      store.lifetimeCompleted,
      completeChallenge,
      undoChallenge,
    ]
  );

  if (!loaded) return null;

  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>;
}

export function useChallenges() {
  const ctx = useContext(ChallengeContext);
  if (!ctx) throw new Error('useChallenges must be used inside <ChallengeProvider />');
  return ctx;
}
