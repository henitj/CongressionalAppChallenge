import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update, 
  remove, 
  child, 
  onValue,
  DataSnapshot 
} from 'firebase/database';

// Initialize Firebase configuration using your Realtime Database URL
const firebaseConfig = {
  databaseURL: "https://playground-80aef-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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

  // Sync clubs from Firebase Realtime Database in real-time
  useEffect(() => {
    const clubsRef = ref(db, 'clubs');
    const unsubscribe = onValue(clubsRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        const clubsArray: Club[] = Object.values(data);
        setJoinedClubs(clubsArray);
      } else {
        setJoinedClubs([]);
      }
    }, (error: Error) => {
      console.warn('Firebase sync error', error);
    });

    return () => unsubscribe();
  }, []);

  const createClub = useCallback(
    async (
      name: string,
      description: string,
      isLocked: boolean,
      ownerName: string,
      ownerId: string
    ): Promise<Club> => {
      const clubId = `club-${Date.now()}`;
      const club: Club = {
        id: clubId,
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

      await set(ref(db, `clubs/${clubId}`), club);
      setMyClub(club);
      return club;
    },
    []
  );

  const joinClub = useCallback(
    async (
      code: string,
      memberName: string,
      memberId: string
    ): Promise<Club | null> => {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, 'clubs'));
      
      if (!snapshot.exists()) return null;

      const clubsData = snapshot.val() as Record<string, Club>;
      const foundEntry = Object.entries(clubsData).find(
        ([_, c]) => c.code === code.toUpperCase()
      );

      if (!foundEntry) return null;
      const [clubId, found] = foundEntry;

      if (found.isLocked) return null;

      const members = found.members || [];
      const alreadyIn = members.some((m) => m.id === memberId);
      
      let updatedMembers = members;
      if (!alreadyIn) {
        const newMember: ClubMember = {
          id: memberId,
          name: memberName,
          points: 0,
          trees: 0,
          miles: 0,
          joinedAt: Date.now(),
        };
        updatedMembers = [...members, newMember];
      }

      const updated: Club = {
        ...found,
        members: updatedMembers,
      };

      await update(ref(db, `clubs/${clubId}`), { members: updatedMembers });
      return updated;
    },
    []
  );

  const leaveClub = useCallback(
    async (clubId: string) => {
      if (myClub?.id === clubId) {
        setMyClub(null);
      }
    },
    [myClub]
  );

  const lockClub = useCallback(
    async (clubId: string, locked: boolean) => {
      await update(ref(db, `clubs/${clubId}`), { isLocked: locked });
      if (myClub?.id === clubId) {
        setMyClub((prev: Club | null) => (prev ? { ...prev, isLocked: locked } : null));
      }
    },
    [myClub]
  );

  const updateMemberStats = useCallback(
    async (
      clubId: string,
      memberId: string,
      points: number,
      trees: number,
      miles: number
    ) => {
      const clubRef = ref(db, `clubs/${clubId}`);
      const snapshot = await get(clubRef);

      if (!snapshot.exists()) return;
      const club = snapshot.val() as Club;

      const updatedMembers = club.members.map((m) =>
        m.id === memberId
          ? { ...m, points: m.points + points, trees: m.trees + trees, miles: m.miles + miles }
          : m
      );

      const totalPoints = updatedMembers.reduce((s, m) => s + m.points, 0);
      const totalTrees = updatedMembers.reduce((s, m) => s + m.trees, 0);

      await update(clubRef, {
        members: updatedMembers,
        totalPoints,
        totalTrees,
      });
    },
    []
  );

  const deleteClub = useCallback(
    async (clubId: string) => {
      await remove(ref(db, `clubs/${clubId}`));
      if (myClub?.id === clubId) {
        setMyClub(null);
      }
    },
    [myClub]
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