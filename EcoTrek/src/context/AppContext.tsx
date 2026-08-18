import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { fetchNearbyTrails, Trail } from '../constants/austinTrails';

/**
 * Location + trail catalogue.
 *
 * Important change from the original version: this NO LONGER asks for location
 * permission the instant the app boots. Google Play flags apps that request
 * sensitive permissions before the user has seen why, and users reject a
 * prompt that appears on a screen they haven't read yet.
 *
 * Instead permission is requested when a feature actually needs it (starting a
 * track, sorting trails by distance, loading local weather), and screens can
 * show an explanation first.
 */

export type Coords = { latitude: number; longitude: number };

/** Fallback so weather and trails still work if permission is refused. */
export const DEFAULT_LOCATION: Coords = { latitude: 30.2672, longitude: -97.7431 }; // Austin

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'unavailable';

type AppContextType = {
  trails: Trail[];
  trailsLoading: boolean;
  trailsError: string | null;
  refreshTrails: () => Promise<void>;

  coords: Coords | null;
  /** coords if we have them, otherwise Austin — safe to use anywhere. */
  effectiveCoords: Coords;
  usingFallbackLocation: boolean;
  permission: PermissionState;
  locating: boolean;
  /** Prompts for permission if needed, then resolves coordinates. */
  requestLocation: (opts?: { silent?: boolean; permissionOnly?: boolean }) => Promise<Coords | null>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [trailsLoading, setTrailsLoading] = useState(true);
  const [trailsError, setTrailsError] = useState<string | null>(null);

  const [coords, setCoords] = useState<Coords | null>(null);
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [locating, setLocating] = useState(false);
  const inFlight = useRef<Promise<Coords | null> | null>(null);
  const coordsRef = useRef<Coords | null>(null);
  coordsRef.current = coords;

  /* ── Trails load immediately; they do not need permission ──────────────── */
  const refreshTrails = useCallback(async () => {
    setTrailsLoading(true);
    setTrailsError(null);
    try {
      const data = await fetchNearbyTrails(coords?.latitude, coords?.longitude);
      setTrails(data);
    } catch (e: any) {
      setTrailsError(e?.message ?? 'Could not load trails');
    } finally {
      setTrailsLoading(false);
    }
  }, [coords?.latitude, coords?.longitude]);

  useEffect(() => {
    refreshTrails();
  }, [refreshTrails]);

  /* ── Check (do not request) permission status on mount ─────────────────── */
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        setPermission('unknown');
        return;
      }
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          setPermission('granted');
          // Already granted on a previous run — safe to use it silently.
          requestLocation({ silent: true });
        }
      } catch {
        setPermission('unavailable');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocation = useCallback(
    async (opts: { silent?: boolean; permissionOnly?: boolean } = {}): Promise<Coords | null> => {
      if (inFlight.current && !opts.permissionOnly) return inFlight.current;

      const run = (async (): Promise<Coords | null> => {
        setLocating(true);
        try {
          if (Platform.OS === 'web') {
            if (typeof navigator === 'undefined' || !navigator.geolocation) {
              setPermission('unavailable');
              return opts.permissionOnly ? DEFAULT_LOCATION : null;
            }
            return await new Promise<Coords | null>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const c = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                  };
                  setPermission('granted');
                  setCoords(c);
                  resolve(c);
                },
                () => {
                  setPermission('denied');
                  resolve(opts.permissionOnly ? DEFAULT_LOCATION : null);
                },
                { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
              );
            });
          }

          const existing = await Location.getForegroundPermissionsAsync();
          let status = existing.status;

          if (status !== 'granted') {
            if (opts.silent) {
              setPermission(status === 'denied' ? 'denied' : 'unknown');
              return null;
            }
            const asked = await Location.requestForegroundPermissionsAsync();
            status = asked.status;
          }

          if (status !== 'granted') {
            setPermission('denied');
            return null;
          }

          setPermission('granted');

          // Starting a hike should not wait for a fresh GPS lock. Last-known
          // is plenty; ActiveTracking will pick up a precise fix on its own.
          if (opts.permissionOnly) {
            if (coordsRef.current) return coordsRef.current;
            try {
              const last = await Location.getLastKnownPositionAsync();
              if (last) {
                const c = { latitude: last.coords.latitude, longitude: last.coords.longitude };
                setCoords(c);
                return c;
              }
            } catch {
              /* ignore */
            }
            return DEFAULT_LOCATION;
          }

          try {
            const last = await Location.getLastKnownPositionAsync();
            if (last && Date.now() - last.timestamp < 180_000) {
              const c = { latitude: last.coords.latitude, longitude: last.coords.longitude };
              setCoords(c);
              return c;
            }
          } catch {
            /* ignore */
          }

          const pos = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
          ]);
          if (!pos) return coordsRef.current;
          const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCoords(c);
          return c;
        } catch (e) {
          console.warn('[location] failed', e);
          return coordsRef.current;
        } finally {
          setLocating(false);
          inFlight.current = null;
        }
      })();

      if (!opts.permissionOnly) inFlight.current = run;
      return run;
    },
    []
  );

  const value = useMemo<AppContextType>(
    () => ({
      trails,
      trailsLoading,
      trailsError,
      refreshTrails,
      coords,
      effectiveCoords: coords ?? DEFAULT_LOCATION,
      usingFallbackLocation: coords == null,
      permission,
      locating,
      requestLocation,
    }),
    [trails, trailsLoading, trailsError, refreshTrails, coords, permission, locating, requestLocation]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
