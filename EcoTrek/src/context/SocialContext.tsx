import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from './AuthContext';
import { useEcoPoints } from './EcoPointsContext';
import { isObject, keyFor, loadJSON, saveJSON } from '../services/storage';
import {
  FRIEND_CHALLENGE_POINTS,
  decodeFriendChallenge,
  decodeHikePlan,
  type FriendChallenge,
  type HikePlan,
} from '../services/social';

/**
 * Plans & friend challenges, stored only on this device.
 * Caps keep a paste-happy (or hostile) import loop from growing storage
 * forever: at most MAX_PLANS plans and MAX_CHALLENGES challenges are kept,
 * oldest first out. Imports are idempotent by id.
 */
const MAX_PLANS = 30;
const MAX_CHALLENGES = 30;

type SocialStore = { plans: HikePlan[]; challenges: FriendChallenge[] };

type SocialState = SocialStore & {
  addPlan: (plan: HikePlan) => void;
  importPlanCode: (code: string) => HikePlan | null;
  setRsvp: (id: string, rsvp: 'in' | 'out') => void;
  deletePlan: (id: string) => void;
  addChallenge: (challenge: FriendChallenge) => void;
  importChallengeCode: (code: string) => FriendChallenge | null;
  acceptChallenge: (id: string) => void;
  completeChallenge: (id: string) => Promise<boolean>;
  deleteChallenge: (id: string) => void;
};

const SocialContext = createContext<SocialState | null>(null);

function sanitizeStore(raw: unknown): SocialStore {
  if (!isObject(raw)) return { plans: [], challenges: [] };
  const obj = raw as Record<string, any>;
  const plans = Array.isArray(obj.plans)
    ? (obj.plans as HikePlan[]).filter(
        (p) => p && typeof p.id === 'string' && typeof p.trailName === 'string' && Number.isFinite(p.startsAt)
      )
    : [];
  const challenges = Array.isArray(obj.challenges)
    ? (obj.challenges as FriendChallenge[]).filter(
        (c) => c && typeof c.id === 'string' && Number.isFinite(c.targetMiles) && c.targetMiles > 0 && c.targetMiles <= 100
      )
    : [];
  return {
    plans: plans.slice(0, MAX_PLANS),
    challenges: challenges.slice(0, MAX_CHALLENGES),
  };
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { award } = useEcoPoints();
  const storeKey = keyFor(user?.id ?? null, 'social');
  const [store, setStore] = useState<SocialStore>({ plans: [], challenges: [] });
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    let cancelled = false;
    loadJSON<unknown>(storeKey, null).then((raw) => {
      if (!cancelled) setStore(sanitizeStore(raw));
    });
    return () => { cancelled = true; };
  }, [storeKey]);

  const mutate = useCallback(
    (fn: (prev: SocialStore) => SocialStore) => {
      setStore((prev) => {
        const next = fn(prev);
        saveJSON(storeKey, next);
        return next;
      });
    },
    [storeKey]
  );

  const addPlan = useCallback(
    (plan: HikePlan) =>
      mutate((prev) => ({
        ...prev,
        plans: [plan, ...prev.plans.filter((p) => p.id !== plan.id)].slice(0, MAX_PLANS),
      })),
    [mutate]
  );

  const importPlanCode = useCallback(
    (code: string): HikePlan | null => {
      const decoded = decodeHikePlan(code);
      if (!decoded) return null;
      const plan: HikePlan = { ...decoded, mine: false, rsvp: null };
      addPlan(plan);
      return plan;
    },
    [addPlan]
  );

  const setRsvp = useCallback(
    (id: string, rsvp: 'in' | 'out') =>
      mutate((prev) => ({ ...prev, plans: prev.plans.map((p) => (p.id === id ? { ...p, rsvp } : p)) })),
    [mutate]
  );

  const deletePlan = useCallback(
    (id: string) => mutate((prev) => ({ ...prev, plans: prev.plans.filter((p) => p.id !== id) })),
    [mutate]
  );

  const addChallenge = useCallback(
    (challenge: FriendChallenge) =>
      mutate((prev) => ({
        ...prev,
        challenges: [challenge, ...prev.challenges.filter((c) => c.id !== challenge.id)].slice(0, MAX_CHALLENGES),
      })),
    [mutate]
  );

  const importChallengeCode = useCallback(
    (code: string): FriendChallenge | null => {
      const decoded = decodeFriendChallenge(code);
      if (!decoded) return null;
      const challenge: FriendChallenge = { ...decoded, mine: false, acceptedAt: null, completedAt: null };
      addChallenge(challenge);
      return challenge;
    },
    [addChallenge]
  );

  const acceptChallenge = useCallback(
    (id: string) =>
      mutate((prev) => ({
        ...prev,
        challenges: prev.challenges.map((c) =>
          c.id === id && !c.acceptedAt ? { ...c, acceptedAt: Date.now() } : c
        ),
      })),
    [mutate]
  );

  const completeChallenge = useCallback(
    async (id: string): Promise<boolean> => {
      const target = storeRef.current.challenges.find((c) => c.id === id);
      if (!target || target.completedAt) return false;
      // Fixed reward, deduplicated by eventId inside EcoPoints — replaying
      // this (or importing the same code again) can never pay twice.
      await award('challenge_completed', {
        points: FRIEND_CHALLENGE_POINTS,
        label: `Friend challenge: ${target.title}`,
        eventId: `friend-challenge:${target.id}`,
      });
      mutate((prev) => ({
        ...prev,
        challenges: prev.challenges.map((c) => (c.id === id ? { ...c, completedAt: Date.now() } : c)),
      }));
      return true;
    },
    [award, mutate]
  );

  const deleteChallenge = useCallback(
    (id: string) =>
      mutate((prev) => ({ ...prev, challenges: prev.challenges.filter((c) => c.id !== id) })),
    [mutate]
  );

  const value = useMemo<SocialState>(
    () => ({
      ...store,
      addPlan,
      importPlanCode,
      setRsvp,
      deletePlan,
      addChallenge,
      importChallengeCode,
      acceptChallenge,
      completeChallenge,
      deleteChallenge,
    }),
    [store, addPlan, importPlanCode, setRsvp, deletePlan, addChallenge, importChallengeCode, acceptChallenge, completeChallenge, deleteChallenge]
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside <SocialProvider />');
  return ctx;
}
