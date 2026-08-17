import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClub } from '../constants/ClubContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { useAuth } from '../context/AuthContext';
import { keyFor, loadJSON, saveJSON } from '../services/storage';

/**
 * Pays out the club weekly goal bonus, exactly once per goal.
 *
 * The club record itself cannot award points — ClubProvider sits above
 * EcoPointsProvider — and a goal is shared, so every member has to be paid
 * independently on their own device. Each payout is keyed by club and week, so
 * reinstalling, re-syncing or re-rendering can never pay twice.
 *
 * Lives in a hook rather than a provider because exactly one component needs
 * it, and a whole context layer for one integer is not worth the nesting.
 */

type Stored = {
  /** "<clubId>:<weekId>" for every goal already paid out. */
  rewarded: string[];
  /** Lifetime count, kept separately so trimming the list never loses it. */
  count: number;
};

const EMPTY: Stored = { rewarded: [], count: 0 };

/** Only recent keys need keeping; the count is the part that must persist. */
const MAX_KEYS = 60;

export function useClubGoalRewards(): { clubGoalsMet: number } {
  const { user } = useAuth();
  const { myClub, activeGoal } = useClub();
  const { award } = useEcoPoints();

  const storeKey = keyFor(user?.id ?? null, 'club_goal_rewards');
  const [state, setState] = useState<Stored>(EMPTY);
  const loaded = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loaded.current = false;
    (async () => {
      const stored = await loadJSON<Stored>(storeKey, EMPTY);
      if (cancelled) return;
      setState({
        rewarded: Array.isArray(stored.rewarded) ? stored.rewarded : [],
        count: Number(stored.count) || 0,
      });
      loaded.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  const payout = useCallback(
    async (key: string, goalLabel: string) => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        await award('club_goal', { label: `Club goal met: ${goalLabel}` });
        setState((prev) => {
          const next: Stored = {
            rewarded: [key, ...prev.rewarded].slice(0, MAX_KEYS),
            count: prev.count + 1,
          };
          saveJSON(storeKey, next);
          return next;
        });
      } finally {
        inFlight.current = false;
      }
    },
    [award, storeKey]
  );

  useEffect(() => {
    if (!loaded.current || !myClub || !activeGoal?.metAt) return;

    const key = `${myClub.id}:${activeGoal.weekId}`;
    if (state.rewarded.includes(key)) return;

    payout(key, `${activeGoal.target} ${activeGoal.metric}`);
  }, [myClub, activeGoal, state.rewarded, payout]);

  return useMemo(() => ({ clubGoalsMet: state.count }), [state.count]);
}
