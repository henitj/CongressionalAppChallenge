import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useApp } from './AppContext';
import { getWeatherReport, WeatherReport } from '../services/weather';
import { sendSafetyAlert } from '../services/notifications';

/**
 * Weather & conditions.
 *
 * Refreshes on mount, when the app returns to the foreground, and every 15
 * minutes while open. When conditions cross into DANGER it fires a local
 * notification once per hazard per day, so someone who left the app open
 * still finds out a flood warning went up before they head out.
 */

type WeatherState = {
  report: WeatherReport | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: (force?: boolean) => Promise<void>;
};

const WeatherContext = createContext<WeatherState | null>(null);

const REFRESH_MS = 15 * 60 * 1000;

export function WeatherProvider({
  children,
  notificationsEnabled = true,
}: {
  children: React.ReactNode;
  notificationsEnabled?: boolean;
}) {
  const { effectiveCoords } = useApp();
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetch = useRef(0);
  const notifyRef = useRef(notificationsEnabled);
  notifyRef.current = notificationsEnabled;

  const refresh = useCallback(
    async (force = false) => {
      if (!force && Date.now() - lastFetch.current < 60_000) return;
      lastFetch.current = Date.now();
      setLoading(true);
      setError(null);
      try {
        const r = await getWeatherReport(
          effectiveCoords.latitude,
          effectiveCoords.longitude,
          { force }
        );
        setReport(r);

        // Push a heads-up for genuinely dangerous conditions. The tone stays
        // calm and factual — it tells you what is happening and what to do,
        // it does not shout at you.
        if (notifyRef.current && r.level === 'danger' && r.advisories.length) {
          const top = r.advisories[0];
          const today = new Date().toDateString();
          sendSafetyAlert(
            `Weather heads-up: ${top.title}`,
            top.detail,
            `${today}:${top.id}`
          );
        }
      } catch {
        setError('Could not load conditions. Check your connection.');
      } finally {
        setLoading(false);
      }
    },
    [effectiveCoords.latitude, effectiveCoords.longitude]
  );

  useEffect(() => {
    refresh(true);
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => refresh(), REFRESH_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refresh]);

  const value = useMemo<WeatherState>(
    () => ({
      report,
      loading,
      error,
      lastUpdated: report?.fetchedAt ?? null,
      refresh,
    }),
    [report, loading, error, refresh]
  );

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

export function useWeather() {
  const ctx = useContext(WeatherContext);
  if (!ctx) throw new Error('useWeather must be used inside <WeatherProvider />');
  return ctx;
}
