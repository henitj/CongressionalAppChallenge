import { Platform } from 'react-native';

import { Coord, haversineMiles } from './geo';

export type { Coord };
export { haversineMiles };

export type Subscription = { remove: () => void };

export type StartOptions = {
  onError?: (err: Error) => void;
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
 * There is deliberately no simulated fallback. An earlier version dropped into
 * a fake "walker around Lady Bird Lake" whenever permission was denied or the
 * browser had no geolocation — which meant the app invented distance and
 * awarded real trees for it. If we cannot read the GPS we say so and record
 * nothing.
 *
 * - Web: navigator.geolocation.watchPosition
 * - Native: expo-location.watchPositionAsync at navigation accuracy
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

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 2, // metres
      },
      (loc) =>
        onCoord({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy ?? undefined,
          speed: loc.coords.speed ?? undefined,
        })
    );
    return { remove: () => sub.remove() };
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
