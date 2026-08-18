/**
 * Background location task.
 *
 * TaskManager requires the task to be defined at module load, before the
 * app is ready. App.tsx imports this file so the task exists even after
 * the OS wakes us from the background.
 *
 * We only start the task while a walk or ride is recording. Stopping the
 * activity stops the task — we do not track people otherwise.
 */

import { Coord } from './geo';

export const LOCATION_TASK = 'ECOTREK_LOCATION';

export type TrackPoint = Coord & { altitude?: number };

type Listener = (point: TrackPoint) => void;

const listeners = new Set<Listener>();

export function addLocationListener(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitLocation(point: TrackPoint) {
  listeners.forEach((fn) => {
    try {
      fn(point);
    } catch {
      /* a bad listener must not kill the others */
    }
  });
}

try {
  // Dynamic require keeps this file importable in Jest without the native
  // module, and still registers the task in the real app.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
  if (typeof TaskManager.defineTask === 'function') {
    TaskManager.defineTask(LOCATION_TASK, async (body) => {
      const data = body.data as { locations?: any[] } | undefined;
      if (body.error || !data?.locations?.length) return;
      for (const loc of data.locations) {
        if (!loc?.coords) continue;
        emitLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp ?? Date.now(),
          accuracy: loc.coords.accuracy ?? undefined,
          speed: loc.coords.speed ?? undefined,
          altitude: loc.coords.altitude ?? undefined,
        });
      }
    });
  }
} catch {
  /* Expo Go / tests / web — startTracking falls back to a foreground watch. */
}
