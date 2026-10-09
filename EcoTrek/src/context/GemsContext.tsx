import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { isArray, keyFor, loadJSON, saveJSON } from '../services/storage';
import { GemReason, GEM_REASON_LABEL, GEM_VALUES } from '../constants/gems';

export type GemEvent = {
  id: string;
  reason: GemReason | 'spent';
  amount: number; // positive = earned, negative = spent
  label: string;
  timestamp: number;
};

type GemsState = {
  totalGems: number;
  lifetimeEarned: number;
  history: GemEvent[];
  /** Earn gems for a tracked action — mirrors EcoPointsContext's `award`. */
  earn: (reason: GemReason, opts?: { multiplier?: number; eventId?: string; label?: string }) => Promise<number>;
  /** Spend gems. Resolves false (and changes nothing) if the balance is too low. */
  spend: (amount: number, label: string) => Promise<boolean>;
  /**
   * Add or remove an exact signed amount, bypassing the earn-rate table.
   * For corrections only — e.g. undoing a challenge completion claws back
   * exactly the gems that completion paid out, even if that takes the
   * balance negative (mirrors how EcoPoints reverses with a negative
   * award()). Never use this for normal spending — use `spend`, which
   * refuses to go negative.
   */
  adjust: (amount: number, label: string) => Promise<void>;
};

const GemsContext = createContext<GemsState | null>(null);

export function GemsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const storeKey = keyFor(userId, 'gems');

  const [history, setHistory] = useState<GemEvent[]>([]);
  const historyRef = useRef<GemEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      const h = await loadJSON<GemEvent[]>(storeKey, [], isArray);
      if (cancelled) return;
      historyRef.current = h;
      setHistory(h);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  const sumOf = (list: GemEvent[]) => list.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0);

  const totalGems = useMemo(() => sumOf(history), [history]);

  const lifetimeEarned = useMemo(
    () => history.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0),
    [history]
  );

  const earn = useCallback<GemsState['earn']>(
    async (reason, opts = {}) => {
      if (opts.eventId && historyRef.current.some((e) => e.id === opts.eventId)) return 0;
      const amount = Math.round(GEM_VALUES[reason] * (opts.multiplier ?? 1));
      if (amount <= 0) return 0;

      const event: GemEvent = {
        id: opts.eventId ?? `${Date.now()}-${reason}-${Math.random().toString(36).slice(2, 7)}`,
        reason,
        amount,
        label: opts.label ?? GEM_REASON_LABEL[reason],
        timestamp: Date.now(),
      };
      const updated = [event, ...historyRef.current];
      historyRef.current = updated;
      setHistory(updated);
      await saveJSON(storeKey, updated);
      return amount;
    },
    [storeKey]
  );

  const spend = useCallback<GemsState['spend']>(
    async (amount, label) => {
      if (amount <= 0) return true;
      // Read the balance straight off the ref, not off the `totalGems` memo —
      // that memo only updates when React re-renders, which can lag behind
      // two spend() calls fired back to back in the same tick. The ref is
      // mutated synchronously by every earn/spend/adjust, so it is always
      // current regardless of render timing.
      if (sumOf(historyRef.current) < amount) return false;

      const event: GemEvent = {
        id: `${Date.now()}-spend-${Math.random().toString(36).slice(2, 7)}`,
        reason: 'spent',
        amount: -amount,
        label,
        timestamp: Date.now(),
      };
      const updated = [event, ...historyRef.current];
      historyRef.current = updated;
      setHistory(updated);
      await saveJSON(storeKey, updated);
      return true;
    },
    [storeKey]
  );

  const adjust = useCallback<GemsState['adjust']>(
    async (amount, label) => {
      if (amount === 0) return;
      const event: GemEvent = {
        id: `${Date.now()}-adjust-${Math.random().toString(36).slice(2, 7)}`,
        reason: 'spent',
        amount,
        label,
        timestamp: Date.now(),
      };
      const updated = [event, ...historyRef.current];
      historyRef.current = updated;
      setHistory(updated);
      await saveJSON(storeKey, updated);
    },
    [storeKey]
  );

  const value = useMemo<GemsState>(
    () => ({ totalGems, lifetimeEarned, history, earn, spend, adjust }),
    [totalGems, lifetimeEarned, history, earn, spend, adjust]
  );

  if (!loaded) return null;

  return <GemsContext.Provider value={value}>{children}</GemsContext.Provider>;
}

export function useGems() {
  const ctx = useContext(GemsContext);
  if (!ctx) throw new Error('useGems must be used inside <GemsProvider />');
  return ctx;
}
