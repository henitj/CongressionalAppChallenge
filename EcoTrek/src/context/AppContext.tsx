import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { fetchNearbyTrails, Trail, type TrailSource } from '../constants/austinTrails';

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
  /** City / area the current catalogue was looked up for. */
  trailsRegion: string | null;
  /** Why the current list looks the way it does. */
  trailsSource: TrailSource;
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
  const [trailsRegion, setTrailsRegion] = useState<string | null>(null);
  const [trailsSource, setTrailsSource] = useState<TrailSource>('need-location');

  const [coords, setCoords] = useState<Coords | null>(null);
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [locating, setLocating] = useState(false);
  const inFlight = useRef<Promise<Coords | null> | null>(null);
  const coordsRef = useRef<Coords | null>(null);
  coordsRef.current = coords;

  /**
   * A single shared GPS fix. The first caller starts it, everyone else
   * reuses the same promise, and — crucially — the fix is NOT thrown away
   * when a caller stops waiting. A cold GPS can take longer than the 4s we
   * are willing to block on it; before, the slow fix was discarded and the
   * Trails page needed a second tap to finally load. Now the fix still lands
   * in state whenever it arrives, and anything watching updates on its own.
   */
  const positionFix = useRef<Promise<Coords | null> | null>(null);
  const getPositionFix = useCallback((): Promise<Coords | null> => {
    if (!positionFix.current) {
      positionFix.current = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
        .then((pos) => ({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }))
        .catch((e) => {
          console.warn('[location] fix failed', e);
          return null;
        })
        .finally(() => {
          positionFix.current = null;
        });
    }
    return positionFix.current;
  }, []);

  const refreshTrails = useCallback(async () => {
    setTrailsLoading(true);
    setTrailsError(null);
    try {
      const data = await fetchNearbyTrails(coords?.latitude, coords?.longitude);
      setTrails(data.trails);
      setTrailsRegion(data.region);
      setTrailsSource(data.source);
    } catch (e: any) {
      setTrailsError(e?.message ?? 'Could not load trails');
    } finally {
      setTrailsLoading(false);
    }
  }, [coords?.latitude, coords?.longitude]);

  useEffect(() => {
    refreshTrails();
  }, [refreshTrails]);

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

          const fix = getPositionFix();
          const pos = await Promise.race([
            fix,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
          ]);
          if (pos) {
            setCoords(pos);
            return pos;
          }
          // The fix is still working. Keep listening instead of discarding
          // it: when it lands, coordinates update on their own and the
          // trails list / weather pick them up — no second tap needed.
          fix.then((c) => {
            if (c) setCoords(c);
          });
          return coordsRef.current;
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
      trailsRegion,
      trailsSource,
      refreshTrails,
      coords,
      effectiveCoords: coords ?? DEFAULT_LOCATION,
      usingFallbackLocation: coords == null,
      permission,
      locating,
      requestLocation,
    }),
    [trails, trailsLoading, trailsError, trailsRegion, trailsSource, refreshTrails, coords, permission, locating, requestLocation]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
