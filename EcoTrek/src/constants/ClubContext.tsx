import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isArray, loadJSON, saveJSON } from '../services/storage';
import { weekKey } from '../services/dates';
import { api, isBackendConfigured, ROUTES } from '../services/api';

/**
 * Clubs.
 *
 * Previously this file talked to a public Firebase "playground" database with
 * open read/write rules — anyone on the internet could have wiped every club.
 * That is gone.
 *
 * Now it is local-first:
 *   • With no backend configured, clubs live on the device. Everything works:
 *     create, join by code, contribute points, leaderboards.
 *   • Set EXPO_PUBLIC_API_URL and the exact same calls hit your Neon-backed
 *     API instead, and clubs become shared across phones. No screen changes.
 */

export type ClubRole = 'owner' | 'admin' | 'member';

export type ClubMember = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  points: number;
  trees: number;
  miles: number;
  joinedAt: number;
  role: ClubRole;
};

export type Club = {
  id: string;
  name: string;
  code: string;
  description: string;
  isLocked: boolean;
  isPublic: boolean;
  ownerId: string;
  createdAt: number;
  maxMembers: number;
  goal: ClubGoal | null;
  members: ClubMember[];
  totalPoints: number;
  totalTrees: number;
  totalMiles: number;
};

export type Contribution = {
  points: number;
  trees: number;
  miles: number;
  /** Number of activities this contribution represents. Defaults to 0. */
  activities?: number;
};

export type GoalMetric = 'miles' | 'points' | 'trees' | 'activities';

/**
 * A shared weekly target for the whole club. Progress accumulates from every
 * member's contributions and resets when the ISO week rolls over, so a goal is
 * always about *this* week rather than all time.
 */
export type ClubGoal = {
  metric: GoalMetric;
  target: number;
  /** Week the progress belongs to, e.g. "2026-W34". */
  weekId: string;
  progress: number;
  /** Set once the target is first reached, so it can be celebrated. */
  metAt: number | null;
};

export const GOAL_METRIC_LABEL: Record<GoalMetric, string> = {
  miles: 'miles covered',
  points: 'points earned',
  trees: 'trees earned',
  activities: 'activities logged',
};

export type ClubRanking = {
  rank: number;
  club: Club;
};

type ClubState = {
  myClub: Club | null;
  /** Every club we know about, ranked by points. */
  rankedClubs: ClubRanking[];
  /** The global top ten — all the leaderboard ever shows. */
  topClubs: ClubRanking[];
  /** Your club's true position, even when it sits outside the top ten. */
  myClubRanking: ClubRanking | null;
  totalClubs: number;
  loading: boolean;
  syncing: boolean;
  /** True when clubs are device-only because no backend is configured. */
  localOnly: boolean;
  myMember: ClubMember | null;
  myRank: number | null;
  /** Clubs where this user is the top contributor — shown on the profile. */
  clubsLeading: Club[];
  createClub: (input: {
    name: string;
    description: string;
    isLocked: boolean;
    maxMembers: number;
  }) => Promise<Club>;
  joinClub: (code: string) => Promise<Club>;
  leaveClub: () => Promise<void>;
  lockClub: (locked: boolean) => Promise<void>;
  setMaxMembers: (max: number) => Promise<void>;
  setGoal: (metric: GoalMetric, target: number) => Promise<void>;
  clearGoal: () => Promise<void>;
  /** This week's goal with stale progress zeroed out. */
  activeGoal: ClubGoal | null;
  deleteClub: () => Promise<void>;
  contribute: (c: Contribution) => Promise<void>;
  refresh: () => Promise<void>;
};

/** Options offered when creating a club or changing its cap. */
export const MEMBER_CAP_OPTIONS = [10, 25, 50, 100, 250];
export const MIN_MEMBER_CAP = 2;
export const MAX_MEMBER_CAP = 500;
export const LEADERBOARD_SIZE = 10;

/** Suggested targets when setting a club goal, per metric. */
export const GOAL_PRESETS: Record<GoalMetric, number[]> = {
  miles: [10, 25, 50, 100],
  points: [250, 500, 1000, 2500],
  trees: [5, 10, 25, 50],
  activities: [5, 10, 20, 40],
};

const ClubContext = createContext<ClubState | null>(null);

/** Device-wide so a join code typed by a second account on the same phone works. */
const CLUBS_KEY = '@ecotrek/clubs/v2';

function generateCode(existing: Club[]): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (!existing.some((c) => c.code === code)) return code;
  }
  return `C${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

function clampCap(n: number): number {
  if (!Number.isFinite(n)) return 100;
  return Math.min(MAX_MEMBER_CAP, Math.max(MIN_MEMBER_CAP, Math.round(n)));
}

/** Backfills fields added after a club was first stored. */
function withDefaults(club: Club): Club {
  return { ...club, maxMembers: club.maxMembers ?? 100, goal: club.goal ?? null };
}

/**
 * A goal only counts for the week it was set in. Rather than needing a
 * scheduled reset, stale progress is zeroed on read — the same trick the
 * weekly challenges use.
 */
function currentGoal(club: Club | null): ClubGoal | null {
  if (!club?.goal) return null;
  const week = weekKey();
  if (club.goal.weekId === week) return club.goal;
  return { ...club.goal, weekId: week, progress: 0, metAt: null };
}

function goalAmount(goal: ClubGoal, c: Contribution): number {
  switch (goal.metric) {
    case 'miles':
      return c.miles;
    case 'trees':
      return c.trees;
    case 'activities':
      return c.activities ?? 0;
    default:
      return c.points;
  }
}

function recalcTotals(club: Club): Club {
  return {
    ...club,
    totalPoints: club.members.reduce((s, m) => s + m.points, 0),
    totalTrees: club.members.reduce((s, m) => s + m.trees, 0),
    totalMiles: Math.round(club.members.reduce((s, m) => s + m.miles, 0) * 100) / 100,
  };
}

export function sortedMembers(club: Club): ClubMember[] {
  return [...club.members].sort((a, b) => b.points - a.points || b.miles - a.miles);
}

export function ClubProvider({
  children,
  onJoined,
}: {
  children: React.ReactNode;
  /**
   * Fired after a successful join. Clubs cannot award points directly —
   * EcoPoints sits above this provider — so the app wires the reward in.
   */
  onJoined?: () => void;
}) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  /**
   * Ranking computed by the server. Null in local mode, where there are few
   * enough clubs to rank on the device.
   */
  const [remoteBoard, setRemoteBoard] = useState<{
    total: number;
    top: ClubRanking[];
    me: ClubRanking | null;
  } | null>(null);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      if (isBackendConfigured()) {
        // Two calls: the clubs this user can act on, and the ranked board.
        // Ranking is the server's job — pulling every club down to sort it on
        // the phone stops working past a few hundred clubs.
        const [clubsRes, boardRes] = await Promise.all([
          api.get<Club[]>(ROUTES.clubs),
          api.get<{ total: number; top: ClubRanking[]; me: ClubRanking | null }>(
            `${ROUTES.leaderboardClubs}?limit=${LEADERBOARD_SIZE}`
          ),
        ]);

        if (boardRes.ok && boardRes.data) {
          setRemoteBoard({
            total: boardRes.data.total,
            top: boardRes.data.top.map((r) => ({ rank: r.rank, club: withDefaults(r.club) })),
            me: boardRes.data.me
              ? { rank: boardRes.data.me.rank, club: withDefaults(boardRes.data.me.club) }
              : null,
          });
        }

        if (clubsRes.ok && Array.isArray(clubsRes.data)) {
          const withCaps = clubsRes.data.map(withDefaults);
          setClubs(withCaps);
          saveJSON(CLUBS_KEY, withCaps);
          return;
        }
      }
      const local = await loadJSON<Club[]>(CLUBS_KEY, [], isArray);
      setClubs(local.map(withDefaults));
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback((next: Club[]) => {
    setClubs(next);
    saveJSON(CLUBS_KEY, next);
  }, []);

  const myClub = useMemo(
    () => clubs.find((c) => c.members.some((m) => m.id === userId)) ?? null,
    [clubs, userId]
  );

  const myMember = useMemo(
    () => myClub?.members.find((m) => m.id === userId) ?? null,
    [myClub, userId]
  );

  const myRank = useMemo(() => {
    if (!myClub || !userId) return null;
    const idx = sortedMembers(myClub).findIndex((m) => m.id === userId);
    return idx >= 0 ? idx + 1 : null;
  }, [myClub, userId]);

  const clubsLeading = useMemo(() => {
    if (!userId) return [];
    return clubs.filter((c) => {
      if (c.members.length < 1) return false;
      const top = sortedMembers(c)[0];
      return top?.id === userId && c.members.length > 0;
    });
  }, [clubs, userId]);


  const createClub = useCallback<ClubState['createClub']>(
    async ({ name, description, isLocked, maxMembers }) => {
      if (!user) throw new Error('You need to be signed in to create a club.');
      if (myClub) throw new Error('Leave your current club before creating a new one.');

      const club: Club = recalcTotals({
        id: `club-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        code: generateCode(clubs),
        description: description.trim(),
        isLocked,
        isPublic: true,
        ownerId: user.id,
        createdAt: Date.now(),
        maxMembers: clampCap(maxMembers),
        goal: null,
        members: [
          {
            id: user.id,
            name: user.name ?? 'Trekker',
            avatarUrl: user.picture ?? null,
            points: 0,
            trees: 0,
            miles: 0,
            joinedAt: Date.now(),
            role: 'owner',
          },
        ],
        totalPoints: 0,
        totalTrees: 0,
        totalMiles: 0,
      });

      if (isBackendConfigured()) {
        const res = await api.post<Club>(ROUTES.clubs, {
          name: club.name,
          description: club.description,
          isLocked,
          maxMembers: club.maxMembers,
        });
        if (res.ok && res.data) {
          persist([...clubs.filter((c) => c.id !== res.data.id), res.data]);
          return res.data;
        }
      }

      persist([...clubs, club]);
      return club;
    },
    [user, myClub, clubs, persist]
  );

  const joinClub = useCallback<ClubState['joinClub']>(
    async (rawCode) => {
      if (!user) throw new Error('You need to be signed in to join a club.');
      if (myClub) throw new Error('You are already in a club. Leave it first.');

      const code = rawCode.trim().toUpperCase();
      if (code.length < 4) throw new Error('That code looks too short.');

      if (isBackendConfigured()) {
        const res = await api.post<Club>(ROUTES.clubJoin, { code });
        if (res.ok && res.data) {
          persist([...clubs.filter((c) => c.id !== res.data.id), res.data]);
          return res.data;
        }
        if (!res.ok && res.status === 404) throw new Error('No club found with that code.');
        if (!res.ok && res.status === 403) throw new Error('That club is locked to new members.');
      }

      const target = clubs.find((c) => c.code === code);
      if (!target) throw new Error('No club found with that code.');
      if (target.isLocked) throw new Error('That club is locked to new members.');
      if (target.members.length >= (target.maxMembers ?? 100)) {
        throw new Error(`That club is full (${target.maxMembers} members).`);
      }

      const updated = recalcTotals({
        ...target,
        members: [
          ...target.members,
          {
            id: user.id,
            name: user.name ?? 'Trekker',
            avatarUrl: user.picture ?? null,
            points: 0,
            trees: 0,
            miles: 0,
            joinedAt: Date.now(),
            role: 'member',
          },
        ],
      });

      persist(clubs.map((c) => (c.id === updated.id ? updated : c)));
      onJoined?.();
      return updated;
    },
    [user, myClub, clubs, persist, onJoined]
  );

  const leaveClub = useCallback(async () => {
    if (!myClub || !userId) return;

    if (isBackendConfigured()) {
      await api.post(ROUTES.clubLeave(myClub.id));
    }

    // Owner leaving hands the club to the next-longest-standing member.
    const remaining = myClub.members.filter((m) => m.id !== userId);
    if (remaining.length === 0) {
      persist(clubs.filter((c) => c.id !== myClub.id));
      return;
    }

    let members = remaining;
    if (myClub.ownerId === userId) {
      const heir = [...remaining].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      members = remaining.map((m) => (m.id === heir.id ? { ...m, role: 'owner' as ClubRole } : m));
    }

    const updated = recalcTotals({
      ...myClub,
      ownerId: myClub.ownerId === userId ? members.find((m) => m.role === 'owner')!.id : myClub.ownerId,
      members,
    });
    persist(clubs.map((c) => (c.id === updated.id ? updated : c)));
  }, [myClub, userId, clubs, persist]);

  const lockClub = useCallback(
    async (locked: boolean) => {
      if (!myClub || myClub.ownerId !== userId) return;
      if (isBackendConfigured()) await api.patch(ROUTES.clubLock(myClub.id), { isLocked: locked });
      persist(clubs.map((c) => (c.id === myClub.id ? { ...c, isLocked: locked } : c)));
    },
    [myClub, userId, clubs, persist]
  );

  const setMaxMembers = useCallback(
    async (max: number) => {
      if (!myClub || myClub.ownerId !== userId) return;
      const capped = clampCap(max);
      // Never set a cap below the number of people already in the club.
      const safe = Math.max(capped, myClub.members.length);
      if (isBackendConfigured()) await api.patch(ROUTES.club(myClub.id), { maxMembers: safe });
      persist(clubs.map((c) => (c.id === myClub.id ? { ...c, maxMembers: safe } : c)));
    },
    [myClub, userId, clubs, persist]
  );

  const setGoal = useCallback(
    async (metric: GoalMetric, target: number) => {
      if (!myClub || myClub.ownerId !== userId) return;
      const goal: ClubGoal = {
        metric,
        target: Math.max(1, Math.round(target)),
        weekId: weekKey(),
        progress: 0,
        metAt: null,
      };
      if (isBackendConfigured()) await api.patch(ROUTES.club(myClub.id), { goal });
      persist(clubs.map((c) => (c.id === myClub.id ? { ...c, goal } : c)));
    },
    [myClub, userId, clubs, persist]
  );

  const clearGoal = useCallback(async () => {
    if (!myClub || myClub.ownerId !== userId) return;
    if (isBackendConfigured()) await api.patch(ROUTES.club(myClub.id), { goal: null });
    persist(clubs.map((c) => (c.id === myClub.id ? { ...c, goal: null } : c)));
  }, [myClub, userId, clubs, persist]);

  const deleteClub = useCallback(async () => {
    if (!myClub || myClub.ownerId !== userId) return;
    if (isBackendConfigured()) await api.del(ROUTES.club(myClub.id));
    persist(clubs.filter((c) => c.id !== myClub.id));
  }, [myClub, userId, clubs, persist]);

  const contribute = useCallback(
    async (c: Contribution) => {
      if (!myClub || !userId) return;

      if (isBackendConfigured()) {
        api.post(ROUTES.clubContribute(myClub.id), { ...c, weekId: weekKey() });
      }

      // Roll the weekly goal forward before adding to it, so a contribution
      // landing in a new week starts that week's progress rather than topping
      // up last week's.
      const goal = currentGoal(myClub);
      const nextGoal: ClubGoal | null = goal
        ? (() => {
            const progress = Math.max(0, goal.progress + goalAmount(goal, c));
            return {
              ...goal,
              progress: Math.round(progress * 100) / 100,
              metAt: goal.metAt ?? (progress >= goal.target ? Date.now() : null),
            };
          })()
        : null;

      const updated = recalcTotals({
        ...myClub,
        goal: nextGoal,
        members: myClub.members.map((m) =>
          m.id === userId
            ? {
                ...m,
                points: Math.max(0, m.points + c.points),
                trees: Math.max(0, m.trees + c.trees),
                miles: Math.max(0, Math.round((m.miles + c.miles) * 100) / 100),
              }
            : m
        ),
      });

      persist(clubs.map((x) => (x.id === updated.id ? updated : x)));
    },
    [myClub, userId, clubs, persist]
  );

  useEffect(() => {
    if (!myClub || !user) return;
    const me = myClub.members.find((m) => m.id === user.id);
    if (!me) return;
    if (me.name === user.name && me.avatarUrl === (user.picture ?? null)) return;
    const updated = {
      ...myClub,
      members: myClub.members.map((m) =>
        m.id === user.id ? { ...m, name: user.name ?? m.name, avatarUrl: user.picture ?? null } : m
      ),
    };
    persist(clubs.map((c) => (c.id === updated.id ? updated : c)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name, user?.picture, myClub?.id]);

  const rankedClubs = useMemo<ClubRanking[]>(() => {
    // Rank by points, then trees, then earliest founded — a deterministic
    // order so two clubs on equal points never swap places between renders.
    return [...clubs]
      .sort(
        (a, b) =>
          b.totalPoints - a.totalPoints ||
          b.totalTrees - a.totalTrees ||
          a.createdAt - b.createdAt
      )
      .map((club, i) => ({ rank: i + 1, club }));
  }, [clubs]);

  // The server's ranking wins when we have it: it sees every club, not just
  // the ones cached on this device.
  const topClubs = useMemo(
    () => remoteBoard?.top ?? rankedClubs.slice(0, LEADERBOARD_SIZE),
    [remoteBoard, rankedClubs]
  );

  const myClubRanking = useMemo(() => {
    if (remoteBoard) return remoteBoard.me;
    return rankedClubs.find((r) => r.club.id === myClub?.id) ?? null;
  }, [remoteBoard, rankedClubs, myClub?.id]);

  const value = useMemo<ClubState>(
    () => ({
      myClub,
      rankedClubs,
      topClubs,
      myClubRanking,
      totalClubs: remoteBoard?.total ?? clubs.length,
      loading,
      syncing,
      localOnly: !isBackendConfigured(),
      myMember,
      myRank,
      clubsLeading,
      createClub,
      joinClub,
      leaveClub,
      lockClub,
      setMaxMembers,
      setGoal,
      clearGoal,
      activeGoal: currentGoal(myClub),
      deleteClub,
      contribute,
      refresh,
    }),
    [
      myClub,
      rankedClubs,
      topClubs,
      myClubRanking,
      remoteBoard,
      clubs.length,
      loading,
      syncing,
      myMember,
      myRank,
      clubsLeading,
      createClub,
      joinClub,
      leaveClub,
      lockClub,
      setMaxMembers,
      setGoal,
      clearGoal,
      deleteClub,
      contribute,
      refresh,
    ]
  );

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub must be used inside <ClubProvider />');
  return ctx;
}
