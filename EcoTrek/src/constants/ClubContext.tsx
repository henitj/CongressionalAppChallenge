import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ClubMember = {
  id: string;
  name: string;
  points: number;
  trees: number;
  miles: number;
  joinedAt: number;
  isOwner?: boolean;
};

export type Club = {
  id: string;
  name: string;
  code: string;
  description: string;
  isLocked: boolean;
  ownerId: string;
  members: ClubMember[];
  createdAt: number;
  totalPoints: number;
  totalTrees: number;
};

type ClubState = {
  myClub: Club | null;
  joinedClubs: Club[];
  createClub: (name: string, description: string, isLocked: boolean, ownerName: string, ownerId: string) => Promise<Club>;
  joinClub: (code: string, memberName: string, memberId: string) => Promise<Club | null>;
  leaveClub: (clubId: string) => Promise<void>;
  lockClub: (clubId: string, locked: boolean) => Promise<void>;
  updateMemberStats: (clubId: string, memberId: string, points: number, trees: number, miles: number) => Promise<void>;
  deleteClub: (clubId: string) => Promise<void>;
};

const ClubContext = createContext<ClubState | null>(null);
const STORAGE_KEY = '@ecotrek/clubs';
const MY_CLUB_KEY = '@ecotrek/my_club';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function ClubProvider({ children }: { children: React.ReactNode }) {
  const [myClub, setMyClub] = useState<Club | null>(null);
  const [joinedClubs, setJoinedClubs] = useState<Club[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [rawMy, rawJoined] = await Promise.all([
          AsyncStorage.getItem(MY_CLUB_KEY),
          AsyncStorage.getItem(STORAGE_KEY),
        ]);
        if (rawMy) setMyClub(JSON.parse(rawMy));
        if (rawJoined) setJoinedClubs(JSON.parse(rawJoined));
      } catch (e) {
        console.warn('Club load error', e);
      }
    })();
  }, []);

  const persist = useCallback(
    async (my: Club | null, joined: Club[]) => {
      await Promise.all([
        my
          ? AsyncStorage.setItem(MY_CLUB_KEY, JSON.stringify(my))
          : AsyncStorage.removeItem(MY_CLUB_KEY),
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(joined)),
      ]);
    },
    []
  );

  const createClub = useCallback(
    async (
      name: string,
      description: string,
      isLocked: boolean,
      ownerName: string,
      ownerId: string
    ): Promise<Club> => {
      const club: Club = {
        id: `club-${Date.now()}`,
        name,
        description,
        code: generateCode(),
        isLocked,
        ownerId,
        createdAt: Date.now(),
        totalPoints: 0,
        totalTrees: 0,
        members: [
          {
            id: ownerId,
            name: ownerName,
            points: 0,
            trees: 0,
            miles: 0,
            joinedAt: Date.now(),
            isOwner: true,
          },
        ],
      };
      setMyClub(club);
      const newJoined = [...joinedClubs, club];
      setJoinedClubs(newJoined);
      await persist(club, newJoined);
      return club;
    },
    [joinedClubs, persist]
  );

  const joinClub = useCallback(
    async (
      code: string,
      memberName: string,
      memberId: string
    ): Promise<Club | null> => {
      const found = joinedClubs.find(
        (c) => c.code === code.toUpperCase()
      );
      if (!found) return null;
      if (found.isLocked) return null;

      const alreadyIn = found.members.some((m) => m.id === memberId);
      if (alreadyIn) return found;

      const newMember: ClubMember = {
        id: memberId,
        name: memberName,
        points: 0,
        trees: 0,
        miles: 0,
        joinedAt: Date.now(),
      };

      const updated: Club = {
        ...found,
        members: [...found.members, newMember],
      };

      const newJoined = joinedClubs.map((c) =>
        c.id === found.id ? updated : c
      );
      setJoinedClubs(newJoined);
      await persist(myClub, newJoined);
      return updated;
    },
    [joinedClubs, myClub, persist]
  );

  const leaveClub = useCallback(
    async (clubId: string) => {
      const newJoined = joinedClubs.filter((c) => c.id !== clubId);
      const newMy = myClub?.id === clubId ? null : myClub;
      setJoinedClubs(newJoined);
      setMyClub(newMy);
      await persist(newMy, newJoined);
    },
    [joinedClubs, myClub, persist]
  );

  const lockClub = useCallback(
    async (clubId: string, locked: boolean) => {
      const updateClub = (c: Club) =>
        c.id === clubId ? { ...c, isLocked: locked } : c;
      const newJoined = joinedClubs.map(updateClub);
      const newMy = myClub
        ? myClub.id === clubId
          ? { ...myClub, isLocked: locked }
          : myClub
        : null;
      setJoinedClubs(newJoined);
      setMyClub(newMy);
      await persist(newMy, newJoined);
    },
    [joinedClubs, myClub, persist]
  );

  const updateMemberStats = useCallback(
    async (
      clubId: string,
      memberId: string,
      points: number,
      trees: number,
      miles: number
    ) => {
      const updateClub = (c: Club): Club => {
        if (c.id !== clubId) return c;
        const updatedMembers = c.members.map((m) =>
          m.id === memberId
            ? { ...m, points: m.points + points, trees: m.trees + trees, miles: m.miles + miles }
            : m
        );
        return {
          ...c,
          members: updatedMembers,
          totalPoints: updatedMembers.reduce((s, m) => s + m.points, 0),
          totalTrees: updatedMembers.reduce((s, m) => s + m.trees, 0),
        };
      };
      const newJoined = joinedClubs.map(updateClub);
      const newMy = myClub ? updateClub(myClub) : null;
      setJoinedClubs(newJoined);
      setMyClub(newMy);
      await persist(newMy, newJoined);
    },
    [joinedClubs, myClub, persist]
  );

  const deleteClub = useCallback(
    async (clubId: string) => {
      const newJoined = joinedClubs.filter((c) => c.id !== clubId);
      const newMy = myClub?.id === clubId ? null : myClub;
      setJoinedClubs(newJoined);
      setMyClub(newMy);
      await persist(newMy, newJoined);
    },
    [joinedClubs, myClub, persist]
  );

  const value = useMemo<ClubState>(
    () => ({
      myClub,
      joinedClubs,
      createClub,
      joinClub,
      leaveClub,
      lockClub,
      updateMemberStats,
      deleteClub,
    }),
    [
      myClub,
      joinedClubs,
      createClub,
      joinClub,
      leaveClub,
      lockClub,
      updateMemberStats,
      deleteClub,
    ]
  );

  return (
    <ClubContext.Provider value={value}>{children}</ClubContext.Provider>
  );
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx)
    throw new Error('useClub must be used inside <ClubProvider />');
  return ctx;
}