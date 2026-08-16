import { Platform } from 'react-native';

import { Coord, haversineMiles } from './geo';

export type { Coord };
export { haversineMiles };

export type Subscription = { remove: () => void };
export type TrackingMode = 'gps' | 'demo';

export type StartOptions = {
  mode?: TrackingMode;
  onError?: (err: Error) => void;
};

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
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      timestamp: loc.timestamp,
      accuracy: loc.coords.accuracy ?? undefined,
      speed: loc.coords.speed ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Cross-platform location tracking.
 * - Web: navigator.geolocation.watchPosition with high accuracy
 * - Native (iOS/Android): expo-location.watchPositionAsync
 * - Demo mode: simulated walker around downtown Austin (for testing)
 */
export async function startTracking(
  onCoord: (c: Coord) => void,
  opts: StartOptions = {}
): Promise<Subscription> {
  const mode = opts.mode ?? 'gps';
  if (mode === 'demo') return startSimulator(onCoord);

  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      opts.onError?.(new Error('Geolocation not supported in this browser'));
      return startSimulator(onCoord);
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
      (err) => {
        opts.onError?.(new Error(err.message));
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
    return { remove: () => navigator.geolocation.clearWatch(watchId) };
  }

  const Location = await import('expo-location');
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    opts.onError?.(new Error('Location permission denied'));
    return startSimulator(onCoord);
  }

  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 2, // meters
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
}

/**
 * Smooths a new coordinate against the previous one:
 *   - Rejects points with poor accuracy (>50m)
 *   - Rejects points that imply teleportation (>100mph)
 *   - Rejects micro-noise (<2m) so a stationary phone doesn't accumulate distance
 * Returns the miles to add (0 if rejected).
 */
export function smoothDelta(prev: Coord | undefined, next: Coord): number {
  if (!prev) return 0;
  if (next.accuracy !== undefined && next.accuracy > 50) return 0;

  const dtSec = Math.max(0.1, (next.timestamp - prev.timestamp) / 1000);
  const miles = haversineMiles(prev, next);
  const meters = miles * 1609.34;

  // Reject GPS jitter when stationary
  if (meters < 2) return 0;

  // Reject impossible speeds (>100mph)
  const mph = miles / (dtSec / 3600);
  if (mph > 100) return 0;

  return miles;
}

function startSimulator(onCoord: (c: Coord) => void): Subscription {
  // Simulates a 12 mph bike ride starting at Lady Bird Lake (Butler Trail)
  let lat = 30.2628;
  let lng = -97.7484;
  let bearing = Math.random() * Math.PI * 2;
  const interval = setInterval(() => {
    bearing += (Math.random() - 0.5) * 0.4;
    // ~ 12 mph = 5.4 m/s. Tick is 1s, so ~5m per tick = ~0.00005 deg
    const step = 0.00005;
    lat += Math.cos(bearing) * step;
    lng += Math.sin(bearing) * step;
    onCoord({
      latitude: lat,
      longitude: lng,
      timestamp: Date.now(),
      accuracy: 5,
      speed: 5.4,
    });
  }, 1000);
  return { remove: () => clearInterval(interval) };
}
