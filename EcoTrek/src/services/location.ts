import { Platform } from 'react-native';

import { Coord, haversineMiles } from './geo';
import { addLocationListener, emitLocation, LOCATION_TASK } from './locationTask';

export type { Coord };
export { haversineMiles };

export type Subscription = { remove: () => void };

export type StartOptions = {
  onError?: (err: Error) => void;
  /** Keep measuring if the user locks the phone or switches apps. */
  allowBackground?: boolean;
};

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

    const toCoord = (pos: {
      coords: {
        latitude: number;
        longitude: number;
        accuracy: number | null;
        speed: number | null;
      };
      timestamp: number;
    }): Coord => ({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      timestamp: pos.timestamp,
      accuracy: pos.coords.accuracy ?? undefined,
      speed: pos.coords.speed ?? undefined,
    });

    const last = await Location.getLastKnownPositionAsync();
    if (last && Date.now() - last.timestamp < 180_000) {
      return toCoord(last);
    }

    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    if (pos) return toCoord(pos);
    return last ? toCoord(last) : null;
  } catch {
    return null;
  }
}

/**
 * Streams the device's real position.
 *
 * While a walk or ride is recording we keep measuring even if the phone is
 * locked or another app is in front:
 *   • Android — a foreground service with a persistent notification
 *   • iOS — the location background mode, started from the tracking screen
 *
 * When the activity ends we stop the task. We never track otherwise.
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

    if (opts.allowBackground) {
      try {
        await Location.requestBackgroundPermissionsAsync();
      } catch {
        /* Expo Go and some devices have no background permission — we still track in the foreground. */
      }
    }

    const unlisten = addLocationListener(onCoord);
    let usedBackgroundTask = false;

    if (opts.allowBackground) {
      try {
        const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
        if (already) await Location.stopLocationUpdatesAsync(LOCATION_TASK);

        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 2,
          pausesUpdatesAutomatically: false,
          activityType: Location.ActivityType?.Fitness,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'EcoTrek is recording',
            notificationBody: 'Measuring your walk or ride. Tap to return.',
            notificationColor: '#1A7A5A',
          },
        });
        usedBackgroundTask = true;
      } catch (e) {
        console.warn('[location] background task unavailable, using live watch', e);
      }
    }

    // Live watch for a snappy on-screen update. The background task covers
    // the locked-phone case; both feed the same listener, so we drop
    // near-duplicate points by timestamp.
    let lastTs = 0;
    const deliver = (coord: Coord) => {
      if (coord.timestamp && Math.abs(coord.timestamp - lastTs) < 400) return;
      lastTs = coord.timestamp || Date.now();
      onCoord(coord);
    };

    // Rebind: task + watch both go through deliver when we have both.
    unlisten();
    const unlistenAll = addLocationListener(deliver);

    const watchOptions = {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 2,
      mayShowUserSettingsDialog: false,
    };
    const onFix = (loc: any) =>
      emitLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: loc.timestamp,
        accuracy: loc.coords.accuracy ?? undefined,
        speed: loc.coords.speed ?? undefined,
        altitude: loc.coords.altitude ?? undefined,
      });

    let watch: { remove: () => void } | null = null;
    try {
      // Without the background task the live watch is the only source, so its
      // failure is a real failure. With the task, the watch only adds
      // on-screen updates while the app is open, so its failure is harmless.
      if (!usedBackgroundTask) {
        watch = await Location.watchPositionAsync(watchOptions, onFix);
      } else {
        try {
          watch = await Location.watchPositionAsync(watchOptions, onFix);
        } catch {
          /* the background task alone is enough */
        }
      }
    } catch (e) {
      // Release everything this call acquired, so a failed start leaves no
      // listener or background task behind.
      unlistenAll();
      if (usedBackgroundTask) Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {});
      throw e;
    }

    return {
      remove: () => {
        unlistenAll();
        watch?.remove();
        if (usedBackgroundTask) {
          Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {});
        }
      },
    };
  } catch (e: any) {
    opts.onError?.(new Error(e?.message ?? 'Could not start location tracking'));
    return NO_OP_SUBSCRIPTION;
  }
}
