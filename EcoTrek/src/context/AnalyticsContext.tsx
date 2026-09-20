import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { isObject, keyFor, loadJSON, saveJSON } from '../services/storage';

/**
 * Lightweight, on-device usage analytics.
 *
 * This exists so the team can answer "which screens do people actually use"
 * without shipping a third-party tracking SDK. Nothing is transmitted
 * anywhere: the numbers live in this device's storage and are visible to the
 * user. That is what lets the privacy policy honestly say the app contains no
 * trackers and no advertising identifiers.
 *
 * The event log is namespaced per user like every other store, so two accounts
 * on one phone do not pool their history. The device id deliberately is NOT
 * per-user — it identifies the hardware, not the person.
 */

export type AnalyticsEvent = {
  event: string;
  timestamp: number;
  data?: Record<string, unknown>;
};

export type AnalyticsSummary = {
  sessionCount: number;
  firstSeen: string;
  lastSeen: string;
  totalEvents: number;
  deviceId: string;
  topEvents: { event: string; count: number }[];
};

type Stored = {
  sessionCount: number;
  firstSeen: number;
  lastSeen: number;
  events: AnalyticsEvent[];
};

type AnalyticsState = {
  sessionCount: number;
  firstSeen: number | null;
  lastSeen: number | null;
  totalEvents: number;
  events: AnalyticsEvent[];
  deviceId: string;
  logEvent: (event: string, data?: Record<string, unknown>) => void;
  getSummary: () => AnalyticsSummary;
  clear: () => Promise<void>;
};

const AnalyticsContext = createContext<AnalyticsState | null>(null);

/** Device-wide, so it survives switching accounts. */
const DEVICE_ID_KEY = '@ecotrek/device_id';

/** Keeping the log bounded stops it growing without limit on a long-lived install. */
const MAX_EVENTS = 500;

function generateDeviceId(): string {
  return `DEV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const EMPTY: Stored = { sessionCount: 0, firstSeen: 0, lastSeen: 0, events: [] };

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storeKey = keyFor(user?.id ?? null, 'analytics');

  const [state, setState] = useState<Stored>(EMPTY);
  const [deviceId, setDeviceId] = useState('');

  // The single source of truth for writes. Holding the latest state in a ref
  // lets logEvent persist without a read-modify-write against storage, which
  // is what made rapid consecutive events lose each other.
  const stateRef = useRef<Stored>(EMPTY);
  const ready = useRef(false);

  useEffect(() => {
    let cancelled = false;
    ready.current = false;

    (async () => {
      try {
        let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
        if (!id) {
          id = generateDeviceId();
          await AsyncStorage.setItem(DEVICE_ID_KEY, id);
        }
        if (cancelled) return;
        setDeviceId(id);

        const stored = await loadJSON<Stored>(storeKey, EMPTY, isObject);
        if (cancelled) return;

        const now = Date.now();
        // Guard every field: a partially written or hand-edited record used to
        // produce NaN session counts that then persisted forever.
        const next: Stored = {
          sessionCount: (Number(stored.sessionCount) || 0) + 1,
          firstSeen: Number(stored.firstSeen) || now,
          lastSeen: now,
          events: Array.isArray(stored.events) ? stored.events : [],
        };

        stateRef.current = next;
        setState(next);
        ready.current = true;
        saveJSON(storeKey, next);
      } catch (e) {
        console.warn('[analytics] init failed', e);
        ready.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  const logEvent = useCallback(
    (event: string, data?: Record<string, unknown>) => {
      // Dropping events fired before load finishes is deliberate: writing then
      // would race the loader and clobber the restored history.
      if (!ready.current) return;

      const next: Stored = {
        ...stateRef.current,
        lastSeen: Date.now(),
        events: [{ event, timestamp: Date.now(), data }, ...stateRef.current.events].slice(
          0,
          MAX_EVENTS
        ),
      };
      stateRef.current = next;
      setState(next);
      saveJSON(storeKey, next);
    },
    [storeKey]
  );

  const getSummary = useCallback((): AnalyticsSummary => {
    const counts = new Map<string, number>();
    for (const e of state.events) counts.set(e.event, (counts.get(e.event) ?? 0) + 1);

    return {
      sessionCount: state.sessionCount,
      firstSeen: state.firstSeen ? new Date(state.firstSeen).toLocaleDateString() : 'Never',
      lastSeen: state.lastSeen ? new Date(state.lastSeen).toLocaleString() : 'Never',
      totalEvents: state.events.length,
      deviceId,
      topEvents: [...counts.entries()]
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }, [state, deviceId]);

  const clear = useCallback(async () => {
    stateRef.current = EMPTY;
    setState(EMPTY);
    await saveJSON(storeKey, EMPTY);
  }, [storeKey]);

  const value = useMemo<AnalyticsState>(
    () => ({
      sessionCount: state.sessionCount,
      firstSeen: state.firstSeen || null,
      lastSeen: state.lastSeen || null,
      totalEvents: state.events.length,
      events: state.events,
      deviceId,
      logEvent,
      getSummary,
      clear,
    }),
    [state, deviceId, logEvent, getSummary, clear]
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) throw new Error('useAnalytics must be used inside <AnalyticsProvider />');
  return ctx;
}
