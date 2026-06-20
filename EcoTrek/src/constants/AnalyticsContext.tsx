import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AnalyticsEvent = {
  event: string;
  timestamp: number;
  data?: Record<string, any>;
};

type AnalyticsState = {
  sessionCount: number;
  firstSeen: number | null;
  lastSeen: number | null;
  totalEvents: number;
  events: AnalyticsEvent[];
  logEvent: (event: string, data?: Record<string, any>) => Promise<void>;
  getSummary: () => AnalyticsSummary;
};

export type AnalyticsSummary = {
  sessionCount: number;
  firstSeen: string;
  lastSeen: string;
  totalEvents: number;
  deviceId: string;
  topEvents: { event: string; count: number }[];
};

const AnalyticsContext = createContext<AnalyticsState | null>(null);
const STORAGE_KEY = '@ecotrek/analytics';
const DEVICE_ID_KEY = '@ecotrek/device_id';

function genDeviceId() {
  return `DEV-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [sessionCount, setSessionCount] = useState(0);
  const [firstSeen, setFirstSeen] = useState<number | null>(null);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        // Device ID
        let did = await AsyncStorage.getItem(DEVICE_ID_KEY);
        if (!did) {
          did = genDeviceId();
          await AsyncStorage.setItem(DEVICE_ID_KEY, did);
        }
        setDeviceId(did);

        // Analytics
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const now = Date.now();

        if (raw) {
          const data = JSON.parse(raw);
          setSessionCount(data.sessionCount + 1);
          setFirstSeen(data.firstSeen);
          setLastSeen(now);
          setEvents(data.events ?? []);

          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              ...data,
              sessionCount: data.sessionCount + 1,
              lastSeen: now,
            })
          );
        } else {
          // First ever launch
          const initial = {
            sessionCount: 1,
            firstSeen: now,
            lastSeen: now,
            events: [],
          };
          setSessionCount(1);
          setFirstSeen(now);
          setLastSeen(now);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        }
      } catch (e) {
        console.warn('Analytics init error', e);
      }
    })();
  }, []);

  const logEvent = useCallback(
    async (event: string, data?: Record<string, any>) => {
      const evt: AnalyticsEvent = {
        event,
        timestamp: Date.now(),
        data,
      };
      setEvents((prev) => {
        const updated = [evt, ...prev].slice(0, 500); // keep last 500
        AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
          if (raw) {
            const parsed = JSON.parse(raw);
            AsyncStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({ ...parsed, events: updated })
            );
          }
        });
        return updated;
      });
    },
    []
  );

  const getSummary = useCallback((): AnalyticsSummary => {
    const eventCounts: Record<string, number> = {};
    events.forEach((e) => {
      eventCounts[e.event] = (eventCounts[e.event] ?? 0) + 1;
    });
    const topEvents = Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      sessionCount,
      firstSeen: firstSeen
        ? new Date(firstSeen).toLocaleDateString()
        : 'Never',
      lastSeen: lastSeen
        ? new Date(lastSeen).toLocaleString()
        : 'Never',
      totalEvents: events.length,
      deviceId,
      topEvents,
    };
  }, [sessionCount, firstSeen, lastSeen, events, deviceId]);

  const value = useMemo<AnalyticsState>(
    () => ({
      sessionCount,
      firstSeen,
      lastSeen,
      totalEvents: events.length,
      events,
      logEvent,
      getSummary,
    }),
    [sessionCount, firstSeen, lastSeen, events, logEvent, getSummary]
  );

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx)
    throw new Error(
      'useAnalytics must be used inside <AnalyticsProvider />'
    );
  return ctx;
}