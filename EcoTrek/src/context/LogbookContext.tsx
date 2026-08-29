import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { keyFor, loadJSON, saveJSON } from '../services/storage';

/**
 * Logbook context — simplified to just cleanup tracking.
 * Species tracking has been removed.
 */

export type CleanupRecord = {
  id: string;
  date: number;
  litterCount: number;
  notes?: string;
};

type LogbookState = {
  cleanupCount: number;
  cleanups: CleanupRecord[];
  addCleanup: (litterCount: number, notes?: string) => Promise<void>;
  clearLogbook: () => Promise<void>;
};

const LogbookContext = createContext<LogbookState | null>(null);

export function LogbookProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storeKey = keyFor(user?.id ?? null, 'logbook');

  const [cleanups, setCleanups] = useState<CleanupRecord[]>([]);

  useEffect(() => {
    (async () => {
      const stored = await loadJSON<CleanupRecord[]>(storeKey, []);
      setCleanups(stored);
    })();
  }, [storeKey]);

  const addCleanup = useCallback(
    async (litterCount: number, notes?: string) => {
      const record: CleanupRecord = {
        id: `cleanup-${Date.now()}`,
        date: Date.now(),
        litterCount,
        notes,
      };
      setCleanups((prev) => {
        const next = [record, ...prev];
        saveJSON(storeKey, next);
        return next;
      });
    },
    [storeKey]
  );

  const clearLogbook = useCallback(async () => {
    setCleanups([]);
    saveJSON(storeKey, []);
  }, [storeKey]);

  const value = useMemo<LogbookState>(
    () => ({
      cleanupCount: cleanups.length,
      cleanups,
      addCleanup,
      clearLogbook,
    }),
    [cleanups, addCleanup, clearLogbook]
  );

  return <LogbookContext.Provider value={value}>{children}</LogbookContext.Provider>;
}

export function useLogbook() {
  const ctx = useContext(LogbookContext);
  if (!ctx) throw new Error('useLogbook must be used inside <LogbookProvider />');
  return {
    ...ctx,
    // Compatibility shims for existing code
    speciesLogged: 0,
    totalSpecies: 0,
    plantsLogged: 0,
    animalsLogged: 0,
    litterCollected: ctx.cleanups.reduce((s, c) => s + c.litterCount, 0),
    sightingsInRange: (_from: number, _to: number) => 0,
    cleanupsInRange: (from: number, to: number) =>
      ctx.cleanups.filter((c) => c.date >= from && c.date < to).length,
  };
}
