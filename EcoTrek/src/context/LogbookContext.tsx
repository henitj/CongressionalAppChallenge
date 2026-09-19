import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { isArray, keyFor, loadJSON, saveJSON } from '../services/storage';
import { api, isBackendConfigured, ROUTES } from '../services/api';
import { normalizeCleanupPieces } from '../services/cleanup';

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
    let cancelled = false;
    (async () => {
      const stored = await loadJSON<CleanupRecord[]>(storeKey, [], isArray);
      if (cancelled) return;
      setCleanups(stored);
      if (isBackendConfigured()) {
        const remote = await api.get<CleanupRecord[]>(ROUTES.cleanups);
        if (!cancelled && remote.ok && Array.isArray(remote.data)) {
          const byId = new Map<string, CleanupRecord>();
          [...remote.data, ...stored].forEach((record) => byId.set(record.id, record));
          const merged = [...byId.values()].sort((a, b) => b.date - a.date).slice(0, 500);
          setCleanups(merged);
          saveJSON(storeKey, merged);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  const addCleanup = useCallback(
    async (litterCount: number, notes?: string) => {
      const count = normalizeCleanupPieces(litterCount);
      if (count < 1) return;
      const record: CleanupRecord = {
        id: `cleanup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: Date.now(),
        litterCount: count,
        notes,
      };
      setCleanups((prev) => {
        const next = [record, ...prev].slice(0, 500);
        saveJSON(storeKey, next);
        return next;
      });
      // Local-first remains the source of truth when offline. When the API is
      // configured, the same small record is easy to inspect in the database.
      if (isBackendConfigured()) {
        api.post(ROUTES.cleanups, record);
      }
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
