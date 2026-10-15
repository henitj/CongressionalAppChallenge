import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import {
  AUSTIN_TRAILS,
  fetchNearbyTrails,
  Trail,
  type TrailSource,
} from '../constants/austinTrails';
import { inServiceBbox, isNearAustin, withDistances } from '../services/nearbyTrails';
import { catalogueMatches, loadSavedTrailCatalogue, saveTrailCatalogue, type SavedTrailCatalogue } from '../services/trailCatalogueStorage';
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

function openDeviceLocationSettings() {
  if (Platform.OS === 'android' && typeof Linking.sendIntent === 'function') {
    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => Linking.openSettings());
    return;
  }
  Linking.openSettings().catch(() => {});
}

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
  const [trails, setTrails] = useState<Trail[]>(AUSTIN_TRAILS);
  const [trailsLoading, setTrailsLoading] = useState(false);
  const [trailsError, setTrailsError] = useState<string | null>(null);
  const [trailsRegion, setTrailsRegion] = useState<string | null>('Austin, TX');
  const [trailsSource, setTrailsSource] = useState<TrailSource>('collection');

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
  const browserFix = useRef<Promise<Coords | null> | null>(null);
  const browserExplain = useRef(false);
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

  const catalogueRequest = useRef(0);
  const savedCatalogue = useRef<SavedTrailCatalogue | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    loadSavedTrailCatalogue().then((saved) => {
      if (!mounted.current || !saved) return;
      savedCatalogue.current = saved;
      const position = coordsRef.current;
      if (!position || catalogueMatches(saved, position.latitude, position.longitude)) {
        setTrails(position ? withDistances(saved.trails, position.latitude, position.longitude) : saved.trails);
        setTrailsRegion(saved.region);
        setTrailsSource('cached');
        setTrailsLoading(false);
      }
    });
    return () => { mounted.current = false; catalogueRequest.current += 1; };
  }, []);

  const refreshTrails = useCallback(async () => {
    const request = ++catalogueRequest.current;
    setTrailsError(null);
    const latitude = coords?.latitude, longitude = coords?.longitude;
    if (latitude == null || longitude == null) {
      // Useful on the very first visit, without inventing the user's location:
      // browse the clearly-labelled offline Austin collection (no distances),
      // or saved trails. Live nearby discovery still needs a genuine fix.
      setTrailsLoading(false);
      return;
    }
    const matches = catalogueMatches(savedCatalogue.current, latitude, longitude);
    const austin = isNearAustin(latitude, longitude);
    const immediate = matches || austin;
    if (matches && savedCatalogue.current) {
      setTrails(withDistances(savedCatalogue.current.trails, latitude, longitude));
      setTrailsRegion(savedCatalogue.current.region);
      setTrailsSource('cached');
    } else if (austin) {
      setTrails(withDistances(AUSTIN_TRAILS, latitude, longitude));
      setTrailsRegion('Austin, TX');
      setTrailsSource('bundled');
    } else {
      setTrails([]);
      setTrailsRegion(null);
      setTrailsSource(inServiceBbox(latitude, longitude) ? 'live' : 'unsupported');
    }
    // Background enrichment must not hold offline/cached cards behind a
    // spinner. A single bounded lookup replaces the old nested retry queues.
    setTrailsLoading(!immediate && inServiceBbox(latitude, longitude));
    try {
      const data = await fetchNearbyTrails(latitude, longitude);
      if (!mounted.current || request !== catalogueRequest.current) return;
      if (data.trails.length === 0 && data.source === 'live' && immediate) {
        setTrailsError('Could not update nearby trails. Your saved list is still available.');
        return;
      }
      setTrails(data.trails);
      setTrailsRegion(data.region);
      setTrailsSource(data.source);
      if (data.trails.length) {
        const saved = { latitude, longitude, trails: data.trails, region: data.region, savedAt: Date.now() };
        savedCatalogue.current = saved;
        void saveTrailCatalogue(saved);
      }
    } catch (error: any) {
      if (mounted.current && request === catalogueRequest.current) setTrailsError(error?.message ?? 'Could not update trails.');
    } finally {
      if (mounted.current && request === catalogueRequest.current) setTrailsLoading(false);
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
              return null;
            }

            // A silent retry is only valid after an explicit browser grant;
            // never let lifecycle refreshes unexpectedly trigger a permission
            // prompt. Recheck on return from Settings so a new grant is picked
            // up without forcing the user to reopen the app.
            if (opts.silent && navigator.permissions?.query) {
              try {
                const state = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                if (state.state !== 'granted') {
                  setPermission(state.state === 'denied' ? 'denied' : 'unknown');
                  return null;
                }
              } catch {
                /* no Permissions API: keep the retry silent and do not guess */
                return null;
              }
            }

            // A browser (and the Android WebView shell this app also ships
            // as — see android-shell/README.md) will show the real "Allow
            // location?" system prompt only the first time, or while the
            // permission is still in the undecided "prompt" state. Once it
            // has been denied, calling getCurrentPosition again is silently
            // refused with NO prompt at all. Checking the state first lets us
            // explain how to restore access instead of repeating a request the
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
                  return null;
                }
              } catch {
                /* Permissions API unsupported here — fall through and just ask. */
              }
            }

            // Starting with an existing grant needs permission, not a cold
            // GPS lock. The tracker itself listens for precise real fixes.
            if (opts.permissionOnly && navigator.permissions?.query) {
              try {
                const access = await navigator.permissions.query({ name: 'geolocation' });
                if (access.state === 'granted') {
                  setPermission('granted');
                  return coordsRef.current ?? DEFAULT_LOCATION;
                }
              } catch { /* Older WebViews obtain the grant through a fix. */ }
            }
            browserExplain.current = browserExplain.current || !!opts.explain;
            if (!browserFix.current) {
              browserFix.current = new Promise<Coords | null>((resolve) => {
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
                  // code 1 = permission denied, 2 = device/browser location is
                  // unavailable, 3 = timeout. Do not mislabel a disabled GPS
                  // switch as an app-permission denial.
                  setPermission(err?.code === 1 ? 'denied' : 'unavailable');
                  if (browserExplain.current) {
                    if (err?.code === 2) {
                      alert(
                        'Turn on location services',
                        'EcoTrek has access, but your phone or browser could not get a location fix. Turn on the device Location switch, allow precise location for this site or app, then try again.'
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
                  resolve(opts.permissionOnly && Platform.OS !== 'web' ? DEFAULT_LOCATION : null);
                },
                { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
              );
              }).finally(() => {
                browserFix.current = null;
                browserExplain.current = false;
                if (mounted.current) setLocating(false);
              });
            }
            // Only the initial wait is four seconds. The shared browser fix
            // continues for up to 30s and updates the existing screen when it
            // lands, just like native GPS; a second Retry tap is unnecessary.
            let waitTimer: ReturnType<typeof setTimeout> | undefined;
            const position = await Promise.race([
              browserFix.current,
              new Promise<null>((resolve) => { waitTimer = setTimeout(() => resolve(null), 4000); }),
            ]).finally(() => { if (waitTimer) clearTimeout(waitTimer); });
            return position ?? coordsRef.current;

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

          if (typeof Location.hasServicesEnabledAsync === 'function') {
            try {
              const enabled = await Location.hasServicesEnabledAsync();
              if (!enabled) {
                setPermission('unavailable');
                if (opts.explain) {
                  alert(
                    'Turn on your device location',
                    'EcoTrek already has app permission, but Location Services are off. Turn on Location on your phone to find trails and record a route.',
                    [
                      { text: 'Not now', style: 'cancel' },
                      { text: 'Open location settings', onPress: openDeviceLocationSettings },
                    ]
                  );
                }
                return null;
              }
            } catch {
              /* Some Expo runtimes do not expose the device service state. */
            }
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
          let waitTimer: ReturnType<typeof setTimeout> | undefined;
          const pos = await Promise.race([
            fix,
            new Promise<null>((resolve) => { waitTimer = setTimeout(() => resolve(null), 4000); }),
          ]).finally(() => { if (waitTimer) clearTimeout(waitTimer); });
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
          setLocating(!!browserFix.current);
          inFlight.current = null;
        }
      })();

      if (!opts.permissionOnly) inFlight.current = run;
      return run;
    },
    [getPositionFix]
  );

  // When a person returns from Android/browser settings, refresh both the
  // permission and GPS-service states. The Trails page should recover without
  // requiring a force-quit or a second install.
  useEffect(() => {
    const refreshWhenActive = async () => {
      if (Platform.OS === 'web') {
        try {
          const state = await navigator.permissions?.query({ name: 'geolocation' });
          if (state?.state === 'granted') {
            setPermission('granted');
            void requestLocation({ silent: true });
          } else if (state?.state === 'denied') {
            setPermission('denied');
          }
        } catch {
          /* Browser without the Permissions API: the Enable button can retry. */
        }
        return;
      }

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPermission(status === 'denied' ? 'denied' : 'unknown');
          return;
        }
        const servicesEnabled =
          typeof Location.hasServicesEnabledAsync !== 'function' ||
          (await Location.hasServicesEnabledAsync());
        setPermission(servicesEnabled ? 'granted' : 'unavailable');
        if (servicesEnabled) void requestLocation({ silent: true });
      } catch {
        setPermission('unavailable');
      }
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshWhenActive();
    });
    return () => subscription.remove();
  }, [requestLocation]);

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
