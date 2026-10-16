import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from './AuthContext';
import { useEcoPoints } from './EcoPointsContext';
import { isObject, keyFor, loadJSON, saveJSON } from '../services/storage';
import {
  FRIEND_CHALLENGE_POINTS,
  decodeChallengeResult,
  decodeFriendChallenge,
  decodeHikePlan,
  decodeRsvp,
  decodeSapling,
  type FriendChallenge,
  type HikePlan,
  type SaplingGift,
} from '../services/social';

export type ReceivedSapling = SaplingGift & { planted: boolean };

/**
 * Plans & friend challenges, stored only on this device.
 * Caps keep a paste-happy (or hostile) import loop from growing storage
 * forever: at most MAX_PLANS plans and MAX_CHALLENGES challenges are kept,
 * oldest first out. Imports are idempotent by id.
 */
const MAX_PLANS = 30;
const MAX_CHALLENGES = 30;

type SocialStore = { plans: HikePlan[]; challenges: FriendChallenge[]; saplings: ReceivedSapling[] };

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
  /** Apply a friend's result code to one of my challenges. Returns their name. */
  applyResultCode: (code: string) => string | null;
  /** Apply a friend's RSVP code to one of my hike plans. */
  applyRsvpCode: (code: string) => string | null;
  importSaplingCode: (code: string) => ReceivedSapling | null;
  markSaplingPlanted: (id: string) => void;
};

const SocialContext = createContext<SocialState | null>(null);

function sanitizeStore(raw: unknown): SocialStore {
  if (!isObject(raw)) return { plans: [], challenges: [], saplings: [] };
  const obj = raw as Record<string, any>;
  const plans = Array.isArray(obj.plans)
    ? (obj.plans as HikePlan[]).filter(
        (p) => p && typeof p.id === 'string' && typeof p.trailName === 'string' && Number.isFinite(p.startsAt)
      )
    : [];
  const challenges = Array.isArray(obj.challenges)
    ? (obj.challenges as FriendChallenge[])
        .filter((c) => c && typeof c.id === 'string' && Number.isFinite(c.targetMiles) && c.targetMiles > 0 && c.targetMiles <= 200)
        // Challenges stored before metrics existed are miles challenges.
        .map((c) => ({ ...c, metric: c.metric === 'cleanup' ? 'cleanup' as const : 'miles' as const }))
    : [];
  const saplings = Array.isArray(obj.saplings)
    ? (obj.saplings as ReceivedSapling[]).filter((s) => s && typeof s.id === 'string' && Number.isFinite(s.imageIndex))
    : [];
  return {
    plans: plans.slice(0, MAX_PLANS),
    challenges: challenges.slice(0, MAX_CHALLENGES),
    saplings: saplings.slice(0, MAX_PLANS),
  };
}

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { award } = useEcoPoints();
  const storeKey = keyFor(user?.id ?? null, 'social');
  const [store, setStore] = useState<SocialStore>({ plans: [], challenges: [], saplings: [] });
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
      // Re-importing the same invite must not wipe an RSVP or guest replies.
      const existing = storeRef.current.plans.find((p) => p.id === decoded.id);
      if (existing) return existing;
      const plan: HikePlan = { ...decoded, mine: false, rsvp: null, guests: [] };
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
      // Re-importing must not reset acceptance, completion or results.
      const existing = storeRef.current.challenges.find((c) => c.id === decoded.id);
      if (existing) return existing;
      const challenge: FriendChallenge = { ...decoded, mine: false, acceptedAt: null, completedAt: null, friendResult: null };
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

  const applyResultCode = useCallback(
    (code: string): string | null => {
      const result = decodeChallengeResult(code);
      if (!result) return null;
      if (!storeRef.current.challenges.some((c) => c.id === result.challengeId)) return null;
      mutate((prev) => ({
        ...prev,
        challenges: prev.challenges.map((c) =>
          c.id === result.challengeId
            ? { ...c, friendResult: { name: result.name, amount: result.amount, completed: result.completed, at: result.at } }
            : c
        ),
      }));
      return result.name;
    },
    [mutate]
  );

  const applyRsvpCode = useCallback(
    (code: string): string | null => {
      const reply = decodeRsvp(code);
      if (!reply) return null;
      if (!storeRef.current.plans.some((p) => p.id === reply.planId)) return null;
      mutate((prev) => ({
        ...prev,
        plans: prev.plans.map((p) => {
          if (p.id !== reply.planId) return p;
          const guests = [...(p.guests ?? []).filter((g) => g.name !== reply.name), { name: reply.name, status: reply.status }];
          return { ...p, guests: guests.slice(0, 50) };
        }),
      }));
      return reply.name;
    },
    [mutate]
  );

  const importSaplingCode = useCallback(
    (code: string): ReceivedSapling | null => {
      const gift = decodeSapling(code);
      if (!gift) return null;
      const existingSapling = storeRef.current.saplings.find((s) => s.id === gift.id);
      if (existingSapling) return existingSapling;
      const sapling: ReceivedSapling = { ...gift, planted: false };
      mutate((prev) => ({
        ...prev,
        saplings: [sapling, ...prev.saplings.filter((s) => s.id !== sapling.id)].slice(0, MAX_PLANS),
      }));
      return sapling;
    },
    [mutate]
  );

  const markSaplingPlanted = useCallback(
    (id: string) =>
      mutate((prev) => ({ ...prev, saplings: prev.saplings.map((s) => (s.id === id ? { ...s, planted: true } : s)) })),
    [mutate]
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
      applyResultCode,
      applyRsvpCode,
      importSaplingCode,
      markSaplingPlanted,
    }),
    [store, addPlan, importPlanCode, setRsvp, deletePlan, addChallenge, importChallengeCode, acceptChallenge, completeChallenge, deleteChallenge, applyResultCode, applyRsvpCode, importSaplingCode, markSaplingPlanted]
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside <SocialProvider />');
  return ctx;
}
