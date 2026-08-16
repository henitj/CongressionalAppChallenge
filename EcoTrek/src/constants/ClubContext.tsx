import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../context/AuthContext';
import { loadJSON, saveJSON } from '../services/storage';
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
  members: ClubMember[];
  totalPoints: number;
  totalTrees: number;
  totalMiles: number;
};

export type Contribution = { points: number; trees: number; miles: number };

type ClubState = {
  myClub: Club | null;
  allClubs: Club[];
  loading: boolean;
  syncing: boolean;
  /** True when clubs are device-only because no backend is configured. */
  localOnly: boolean;
  myMember: ClubMember | null;
  myRank: number | null;
  /** Clubs where this user is the top contributor — shown on the profile. */
  clubsLeading: Club[];
  createClub: (input: { name: string; description: string; isLocked: boolean }) => Promise<Club>;
  joinClub: (code: string) => Promise<Club>;
  leaveClub: () => Promise<void>;
  lockClub: (locked: boolean) => Promise<void>;
  deleteClub: () => Promise<void>;
  contribute: (c: Contribution) => Promise<void>;
  refresh: () => Promise<void>;
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

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  /* ── Load ──────────────────────────────────────────────────────────────── */
  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      if (isBackendConfigured()) {
        const res = await api.get<Club[]>(ROUTES.clubs);
        if (res.ok && Array.isArray(res.data)) {
          setClubs(res.data);
          saveJSON(CLUBS_KEY, res.data);
          return;
        }
      }
      const local = await loadJSON<Club[]>(CLUBS_KEY, []);
      setClubs(local);
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

  /* ── Derived ───────────────────────────────────────────────────────────── */
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

  /* ── Mutations ─────────────────────────────────────────────────────────── */

  const createClub = useCallback<ClubState['createClub']>(
    async ({ name, description, isLocked }) => {
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
      if (target.members.length >= 100) throw new Error('That club is full.');

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
      return updated;
    },
    [user, myClub, clubs, persist]
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

  const deleteClub = useCallback(async () => {
    if (!myClub || myClub.ownerId !== userId) return;
    if (isBackendConfigured()) await api.del(ROUTES.club(myClub.id));
    persist(clubs.filter((c) => c.id !== myClub.id));
  }, [myClub, userId, clubs, persist]);

  const contribute = useCallback(
    async (c: Contribution) => {
      if (!myClub || !userId) return;

      if (isBackendConfigured()) {
        api.post(ROUTES.clubContribute(myClub.id), c);
      }

      const updated = recalcTotals({
        ...myClub,
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

  /* ── Keep the member's display name in sync with their profile ─────────── */
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

  const value = useMemo<ClubState>(
    () => ({
      myClub,
      allClubs: [...clubs].sort((a, b) => b.totalPoints - a.totalPoints),
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
      deleteClub,
      contribute,
      refresh,
    }),
    [
      myClub,
      clubs,
      loading,
      syncing,
      myMember,
      myRank,
      clubsLeading,
      createClub,
      joinClub,
      leaveClub,
      lockClub,
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
