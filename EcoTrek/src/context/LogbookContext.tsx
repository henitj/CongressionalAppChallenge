import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { useClub } from '../constants/ClubContext';
import { SPECIES_BY_ID, TOTAL_SPECIES } from '../constants/species';
import { keyFor, loadJSON, saveJSON } from '../services/storage';

/**
 * Field log — the two things you record on a trail that are not an activity:
 * species you spotted, and litter you picked up.
 *
 * They live together because they behave identically: a small append-only log,
 * points on each entry, and counters that feed badges. Splitting them into two
 * providers would double the nesting for no benefit.
 *
 * Points earned here flow to the club, the same as everything else.
 */

export type Sighting = {
  speciesId: string;
  /** Trail it was logged on, when the user picked one. */
  trailId: string | null;
  loggedAt: number;
};

export type Cleanup = {
  id: string;
  /** Pieces of litter collected. Self-reported, like the manual challenges. */
  pieces: number;
  trailId: string | null;
  loggedAt: number;
};

type Stored = {
  sightings: Sighting[];
  cleanups: Cleanup[];
};

const EMPTY: Stored = { sightings: [], cleanups: [] };

type LogbookState = {
  sightings: Sighting[];
  cleanups: Cleanup[];
  loading: boolean;

  /** Species ids already logged, for fast checklist lookups. */
  loggedSpeciesIds: Set<string>;
  speciesLogged: number;
  plantsLogged: number;
  animalsLogged: number;
  totalSpecies: number;
  completionPercent: number;

  cleanupCount: number;
  litterCollected: number;

  hasLogged: (speciesId: string) => boolean;
  logSighting: (speciesId: string, trailId?: string | null) => Promise<boolean>;
  removeSighting: (speciesId: string) => Promise<void>;
  logCleanup: (pieces: number, trailId?: string | null) => Promise<void>;
  removeCleanup: (id: string) => Promise<void>;
  /** Species logged on a given day, used by the recap. */
  sightingsInRange: (from: number, to: number) => number;
  cleanupsInRange: (from: number, to: number) => number;
};

const LogbookContext = createContext<LogbookState | null>(null);

export function LogbookProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { award } = useEcoPoints();
  const { contribute, myClub } = useClub();

  const storeKey = keyFor(user?.id ?? null, 'logbook');
  const [state, setState] = useState<Stored>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const stored = await loadJSON<Stored>(storeKey, EMPTY);
      if (cancelled) return;
      setState({
        sightings: Array.isArray(stored.sightings) ? stored.sightings : [],
        cleanups: Array.isArray(stored.cleanups) ? stored.cleanups : [],
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  const persist = useCallback(
    (update: (prev: Stored) => Stored) => {
      setState((prev) => {
        const next = update(prev);
        saveJSON(storeKey, next);
        return next;
      });
    },
    [storeKey]
  );

  /* ── Sightings ─────────────────────────────────────────────────────────── */

  const loggedSpeciesIds = useMemo(
    () => new Set(state.sightings.map((s) => s.speciesId)),
    [state.sightings]
  );

  const hasLogged = useCallback(
    (speciesId: string) => loggedSpeciesIds.has(speciesId),
    [loggedSpeciesIds]
  );

  /**
   * Returns false when the species was already logged. Each species pays out
   * once — otherwise the checklist becomes a tap-repeatedly points button.
   */
  const logSighting = useCallback(
    async (speciesId: string, trailId: string | null = null) => {
      if (!SPECIES_BY_ID.has(speciesId)) return false;
      if (loggedSpeciesIds.has(speciesId)) return false;

      persist((prev) => ({
        ...prev,
        sightings: [{ speciesId, trailId, loggedAt: Date.now() }, ...prev.sightings],
      }));

      const points = await award('species_logged', {
        label: `Spotted ${SPECIES_BY_ID.get(speciesId)!.name}`,
      });
      if (myClub) await contribute({ points, trees: 0, miles: 0 });
      return true;
    },
    [loggedSpeciesIds, persist, award, contribute, myClub]
  );

  /** Undo, for a misidentification. Retracts the points too. */
  const removeSighting = useCallback(
    async (speciesId: string) => {
      if (!loggedSpeciesIds.has(speciesId)) return;

      persist((prev) => ({
        ...prev,
        sightings: prev.sightings.filter((s) => s.speciesId !== speciesId),
      }));

      const points = await award('species_logged', {
        points: -4,
        label: `Removed ${SPECIES_BY_ID.get(speciesId)?.name ?? 'sighting'}`,
      });
      if (myClub) await contribute({ points, trees: 0, miles: 0 });
    },
    [loggedSpeciesIds, persist, award, contribute, myClub]
  );

  /* ── Cleanups ──────────────────────────────────────────────────────────── */

  const logCleanup = useCallback(
    async (pieces: number, trailId: string | null = null) => {
      const count = Math.max(1, Math.min(500, Math.round(pieces)));
      const entry: Cleanup = {
        id: `cleanup-${Date.now()}`,
        pieces: count,
        trailId,
        loggedAt: Date.now(),
      };

      persist((prev) => ({ ...prev, cleanups: [entry, ...prev.cleanups] }));

      const points = await award('cleanup', {
        label: `Picked up ${count} piece${count === 1 ? '' : 's'} of litter`,
      });
      if (myClub) await contribute({ points, trees: 0, miles: 0 });
    },
    [persist, award, contribute, myClub]
  );

  const removeCleanup = useCallback(
    async (id: string) => {
      const entry = state.cleanups.find((c) => c.id === id);
      if (!entry) return;

      persist((prev) => ({ ...prev, cleanups: prev.cleanups.filter((c) => c.id !== id) }));

      const points = await award('cleanup', { points: -15, label: 'Removed a cleanup' });
      if (myClub) await contribute({ points, trees: 0, miles: 0 });
    },
    [state.cleanups, persist, award, contribute, myClub]
  );

  /* ── Derived ───────────────────────────────────────────────────────────── */

  const counts = useMemo(() => {
    let plants = 0;
    let animals = 0;
    for (const id of loggedSpeciesIds) {
      const species = SPECIES_BY_ID.get(id);
      if (!species) continue;
      if (species.kind === 'plant') plants++;
      else animals++;
    }
    return {
      plantsLogged: plants,
      animalsLogged: animals,
      speciesLogged: loggedSpeciesIds.size,
      litterCollected: state.cleanups.reduce((sum, c) => sum + c.pieces, 0),
    };
  }, [loggedSpeciesIds, state.cleanups]);

  const sightingsInRange = useCallback(
    (from: number, to: number) =>
      state.sightings.filter((s) => s.loggedAt >= from && s.loggedAt < to).length,
    [state.sightings]
  );

  const cleanupsInRange = useCallback(
    (from: number, to: number) =>
      state.cleanups.filter((c) => c.loggedAt >= from && c.loggedAt < to).length,
    [state.cleanups]
  );

  const value = useMemo<LogbookState>(
    () => ({
      sightings: state.sightings,
      cleanups: state.cleanups,
      loading,
      loggedSpeciesIds,
      ...counts,
      totalSpecies: TOTAL_SPECIES,
      completionPercent: TOTAL_SPECIES ? (counts.speciesLogged / TOTAL_SPECIES) * 100 : 0,
      cleanupCount: state.cleanups.length,
      hasLogged,
      logSighting,
      removeSighting,
      logCleanup,
      removeCleanup,
      sightingsInRange,
      cleanupsInRange,
    }),
    [
      state,
      loading,
      loggedSpeciesIds,
      counts,
      hasLogged,
      logSighting,
      removeSighting,
      logCleanup,
      removeCleanup,
      sightingsInRange,
      cleanupsInRange,
    ]
  );

  if (loading) return null;

  return <LogbookContext.Provider value={value}>{children}</LogbookContext.Provider>;
}

export function useLogbook() {
  const ctx = useContext(LogbookContext);
  if (!ctx) throw new Error('useLogbook must be used inside <LogbookProvider />');
  return ctx;
}
