import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import {
  AUSTIN_TRAILS,
  fetchNearbyTrails,
  Trail,
  type TrailSource,
} from '../constants/austinTrails';
import { isNearAustin, withDistances } from '../services/nearbyTrails';
import { alert } from '../services/alert';

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
  /**
   * Prompts for permission if needed, then resolves coordinates.
   *
   * `explain: true` marks this as a call the person made on purpose (tapping
   * an "Enable location" button) — if the browser/OS permission is already
   * denied, or the fix fails, we surface a plain-language alert so tapping
   * the button does *something* visible instead of quietly failing again
   * the way a bare permission re-request does once it has been refused.
   */
  requestLocation: (opts?: { silent?: boolean; permissionOnly?: boolean; explain?: boolean }) => Promise<Coords | null>;
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
    const lat = coords?.latitude;
    const lon = coords?.longitude;

    // Austin ships with a vetted offline catalogue. Put it on screen while
    // the live lookup retries in the background so the page is useful on the
    // very first tap, even if Overpass is slow.
    if (lat != null && lon != null && isNearAustin(lat, lon)) {
      const immediate = withDistances(AUSTIN_TRAILS, lat, lon);
      setTrails(immediate);
      setTrailsRegion('Austin, TX');
      setTrailsSource('bundled');
    }

    try {
      // A cold Overpass/Nominatim request is the most common reason the old
      // Trails page looked empty until the user tapped Retry several times.
      // Treat the first open like a small, bounded retry queue instead. The
      // request that eventually succeeds updates the same screen; no second
      // tap is needed.
      const attempts = lat == null || lon == null ? 1 : 3;
      let data = await fetchNearbyTrails(lat, lon);
      for (let attempt = 1; attempt < attempts && data.trails.length === 0 && data.source === 'live'; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, attempt === 1 ? 250 : 700));
        data = await fetchNearbyTrails(lat, lon);
      }

      setTrails(data.trails);
      setTrailsRegion(data.region);
      setTrailsSource(data.source);
    } catch (e: any) {
      // The catalogue service normally returns a safe empty result, but this
      // envelope protects the page if a future provider throws unexpectedly.
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
        // A browser that already allowed location can be asked quietly, so the
        // trail list (and the assistant that reads it) is ready without a visit
        // to Trails first. Without a grant we never prompt on start-up.
        try {
          const status = await navigator.permissions?.query({ name: 'geolocation' });
          if (status?.state === 'granted') requestLocation({ silent: true });
        } catch {
          /* no Permissions API: Trails asks the first time it opens */
        }
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
    async (
      opts: { silent?: boolean; permissionOnly?: boolean; explain?: boolean } = {}
    ): Promise<Coords | null> => {
      if (inFlight.current && !opts.permissionOnly) return inFlight.current;

      const run = (async (): Promise<Coords | null> => {
        setLocating(true);
        try {
          if (Platform.OS === 'web') {
            if (typeof navigator === 'undefined' || !navigator.geolocation) {
              setPermission('unavailable');
              if (opts.explain) {
                alert(
                  'Location is not available',
                  'This browser or device cannot provide a location. Distance tracking still works from your motion once a walk or ride starts.'
                );
              }
              return opts.permissionOnly ? DEFAULT_LOCATION : null;
            }

            // A browser (and the Android WebView shell this app also ships
            // as — see android-shell/README.md) will show the real "Allow
            // location?" system prompt only the first time, or while the
            // permission is still in the undecided "prompt" state. Once it
            // has been denied, calling getCurrentPosition again is silently
            // refused with NO prompt at all — which is exactly why tapping
            // "Enable location" over and over used to look like it did
            // nothing. Checking the state first lets us tell the person what
            // is actually going on instead of repeating a request the
            // platform has already decided to ignore.
            if (opts.explain && navigator.permissions?.query) {
              try {
                const state = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                if (state.state === 'denied') {
                  setPermission('denied');
                  setLocating(false);
                  alert(
                    'Location is blocked for EcoTrek',
                    Platform.select({
                      android:
                        'Your phone already said no to this request, so it won\u2019t ask again on its own. Open your phone\u2019s Settings → Apps → EcoTrek → Permissions → Location and set it to Allow, then come back and try again.',
                      default:
                        'Your browser already said no to this request, so it won\u2019t ask again on its own. Open your browser\u2019s site settings for this page, allow Location, then reload and try again.',
                    }) as string
                  );
                  return opts.permissionOnly ? DEFAULT_LOCATION : null;
                }
              } catch {
                /* Permissions API unsupported here — fall through and just ask. */
              }
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
                (err) => {
                  setPermission('denied');
                  if (opts.explain) {
                    // code 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT.
                    if (err?.code === 2) {
                      alert(
                        'Can\u2019t find a location fix',
                        'Your phone\u2019s Location/GPS service may be turned off. Turn it on from your phone\u2019s quick settings, then try again.'
                      );
                    } else if (err?.code === 3) {
                      alert(
                        'That took too long',
                        'Could not get a location fix in time. Try again somewhere with a clearer view of the sky or a steadier signal.'
                      );
                    } else {
                      alert(
                        'Location permission needed',
                        Platform.select({
                          android:
                            'EcoTrek needs Location access to measure your walks and rides. Allow it in the prompt, or in your phone\u2019s Settings → Apps → EcoTrek → Permissions if you don\u2019t see one.',
                          default:
                            'EcoTrek needs Location access to measure your walks and rides. Allow it when your browser asks, or turn it on in your browser\u2019s site settings for this page.',
                        }) as string
                      );
                    }
                  }
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
            if (opts.explain) {
              alert(
                'Location permission needed',
                existing.canAskAgain === false
                  ? 'EcoTrek can\u2019t ask again automatically. Open Settings → Apps → EcoTrek → Permissions → Location and allow it, then come back.'
                  : 'EcoTrek needs Location access to measure your walks and rides. Allow it in the prompt to continue.',
                existing.canAskAgain === false
                  ? [
                      { text: 'Not now', style: 'cancel' },
                      { text: 'Open settings', onPress: () => Linking.openSettings() },
                    ]
                  : undefined
              );
            }
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
          }).catch(() => {});
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
    [getPositionFix]
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
