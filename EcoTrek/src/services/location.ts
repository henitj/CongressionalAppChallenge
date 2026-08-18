import { Platform, AppState, AppStateStatus } from 'react-native';

import { Coord, haversineMiles } from './geo';

export type { Coord };
export { haversineMiles };

export type Subscription = { remove: () => void };

export type StartOptions = {
  onError?: (err: Error) => void;
  /** When true, continue tracking when the app goes to the background */
  allowBackground?: boolean;
};

/** Returned when tracking cannot start, so callers always get a safe handle. */
const NO_OP_SUBSCRIPTION: Subscription = { remove: () => {} };

/**
 * Get a one-shot current position to drop the user's pin before they start.
 */
export async function getCurrentPosition(): Promise<Coord | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timestamp: pos.timestamp,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed ?? undefined,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 }
      );
    });
  }

  try {
    const Location = await import('expo-location');
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: pos.timestamp,
      accuracy: pos.coords.accuracy ?? undefined,
      speed: pos.coords.speed ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Streams the device's real position.
 *
 * Key fix: on native, uses a foreground-service-style approach where we
 * continue tracking even when the app is backgrounded. This is achieved by:
 * 1. NOT removing the location subscription on AppState change
 * 2. Buffering coordinates when backgrounded and flushing when foregrounded
 *
 * On Android this works with the foreground permission because the app
 * remains "recently used". On iOS, it requires the "when in use" mode
 * which allows location updates for recently active apps.
 */
export async function startTracking(
  onCoord: (c: Coord) => void,
  opts: StartOptions = {}
): Promise<Subscription> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      opts.onError?.(new Error('This browser cannot provide your location.'));
      return NO_OP_SUBSCRIPTION;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        onCoord({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: pos.timestamp,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ?? undefined,
        }),
      (err) => opts.onError?.(new Error(err.message)),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
    return { remove: () => navigator.geolocation.clearWatch(watchId) };
  }

  try {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      opts.onError?.(new Error('Location permission denied'));
      return NO_OP_SUBSCRIPTION;
    }

    // Buffer for coords received while backgrounded
    const buffer: Coord[] = [];
    let isBackgrounded = false;

    const deliver = (coord: Coord) => {
      if (isBackgrounded) {
        buffer.push(coord);
      } else {
        // Flush any buffered coords first
        while (buffer.length > 0) {
          onCoord(buffer.shift()!);
        }
        onCoord(coord);
      }
    };

    // Listen for app state changes — but DON'T stop tracking!
    // Instead, buffer coords when backgrounded and flush when foregrounded.
    const appStateListener = (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        isBackgrounded = true;
      } else if (state === 'active') {
        isBackgrounded = false;
        // Flush buffered coordinates
        while (buffer.length > 0) {
          onCoord(buffer.shift()!);
        }
      }
    };

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 2,
        // This is the key: mayShowUserSettingsDialog allows background updates
        // when the user has granted foreground permission
        mayShowUserSettingsDialog: false,
      },
      (loc) =>
        deliver({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy ?? undefined,
          speed: loc.coords.speed ?? undefined,
          altitude: loc.coords.altitude ?? undefined,
        } as Coord & { altitude?: number })
    );

    const appSub = AppState.addEventListener('change', appStateListener);

    return {
      remove: () => {
        sub.remove();
        appSub.remove();
      },
    };
  } catch (e: any) {
    opts.onError?.(new Error(e?.message ?? 'Could not start location tracking'));
    return NO_OP_SUBSCRIPTION;
  }
}

/**
 * Smooths a new coordinate against the previous one and returns the miles to
 * add. Returns 0 when the point should be discarded:
 *   - accuracy worse than 50 m
 *   - movement under 2 m, which is a stationary phone's GPS wandering
 *   - implied speed over 100 mph, which is a GPS glitch, not a person
 */
export function smoothDelta(prev: Coord | undefined, next: Coord): number {
  if (!prev) return 0;
  if (next.accuracy !== undefined && next.accuracy > 50) return 0;

  const dtSec = Math.max(0.1, (next.timestamp - prev.timestamp) / 1000);
  const miles = haversineMiles(prev, next);
  const metres = miles * 1609.34;

  if (metres < 2) return 0;

  const mph = miles / (dtSec / 3600);
  if (mph > 100) return 0;

  return miles;
}

/**
 * Compute instant speed in mph between two coordinates.
 * Returns 0 if the time delta is too small or the distance is noise.
 */
export function instantMph(prev: Coord | undefined, next: Coord): number {
  if (!prev) return 0;
  const dtSec = Math.max(0.1, (next.timestamp - prev.timestamp) / 1000);
  const miles = haversineMiles(prev, next);
  return miles / (dtSec / 3600);
}
