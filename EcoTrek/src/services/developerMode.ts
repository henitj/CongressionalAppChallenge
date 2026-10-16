import { AUSTIN_TRAILS, type Trail } from '../constants/austinTrails';
import type { Coord } from './location';

/**
 * Developer / demo mode.
 *
 * Typing the exact secret below into the first-name and/or last-name field
 * (Setup, or the name editor on Profile) switches the account into developer
 * mode. It exists so a demo video can be recorded without walking every mile
 * live: instant walks, instant trail completions, a pre-seeded Austin history
 * and faster tree growth. Normal accounts never see any of it — every check
 * in the app goes through `isDeveloperProfile` / `isDeveloperName`.
 *
 * The secret is matched EXACTLY (case- and punctuation-sensitive). It may be
 * typed into the first-name field alone, the last-name field alone, or split
 * across the two fields (first + last, with or without the space).
 */
export const DEVELOPER_SECRET = 'c2Mzs2R=).jY6gz).#rL!5k}Treasure';

/** Forced profile values for a developer account. */
export const DEVELOPER_AGE = 100;
export const DEVELOPER_STEP_LENGTH_INCHES = 50;

export function isDeveloperName(firstName?: string | null, lastName?: string | null): boolean {
  const first = firstName ?? '';
  const last = lastName ?? '';
  return (
    first === DEVELOPER_SECRET ||
    last === DEVELOPER_SECRET ||
    `${first} ${last}` === DEVELOPER_SECRET ||
    `${first}${last}` === DEVELOPER_SECRET ||
    // Full name pasted into one field, then split on the first space by a form.
    `${first} ${last}`.trim() === DEVELOPER_SECRET
  );
}

export function isDeveloperProfile(profile?: {
  firstName?: string | null;
  lastName?: string | null;
  developerMode?: boolean | null;
} | null): boolean {
  if (!profile) return false;
  return profile.developerMode === true || isDeveloperName(profile.firstName, profile.lastName);
}

const METRES_PER_DEGREE_LAT = 111_320;

/**
 * A plausible GPS path for an instant/demo activity: starts exactly at the
 * trailhead, heads to the trail end (or due north for loops / point trails
 * without a recorded end, then back), spread evenly over `durationSec` so
 * every segment sits at an ordinary walking speed and passes validation.
 */
export function buildDemoPath(
  trail: Trail,
  miles: number,
  startedAt: number,
  durationSec: number
): Coord[] {
  const points = 24;
  const start = { latitude: trail.startLat, longitude: trail.startLng };
  const hasEnd = trail.endLat != null && trail.endLng != null && !trail.isLoop;
  const end = hasEnd
    ? { latitude: trail.endLat as number, longitude: trail.endLng as number }
    : {
        // Out-and-back to the north for loops / trails without an end point:
        // half the distance out, then retrace back to the trailhead.
        latitude: trail.startLat + (miles / 2) * 1609.34 / METRES_PER_DEGREE_LAT,
        longitude: trail.startLng,
      };
  const path: Coord[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    // Loops and out-and-back paths finish where they started.
    const leg = !hasEnd ? (t <= 0.5 ? t * 2 : 2 - t * 2) : t;
    path.push({
      latitude: start.latitude + (end.latitude - start.latitude) * leg,
      longitude: start.longitude + (end.longitude - start.longitude) * leg,
      timestamp: startedAt + Math.round(durationSec * 1000 * t),
    });
  }
  return path;
}

export type DemoActivityInput = {
  type: 'hike' | 'bike';
  startedAt: number;
  endedAt: number;
  miles: number;
  durationSec: number;
  path: Coord[];
};

/** Instant walk/ride of `miles` starting at the Lady Bird Lake trailhead. */
export function buildDemoWalk(miles: number, startedAt = Date.now()): DemoActivityInput {
  const trail = AUSTIN_TRAILS[0];
  const durationSec = Math.max(600, Math.round((miles / 3) * 3600)); // ~3 mph
  return {
    type: 'hike',
    startedAt,
    endedAt: startedAt + durationSec * 1000,
    miles,
    durationSec,
    path: buildDemoPath(trail, miles, startedAt, durationSec),
  };
}

/** Instant completion of a real Austin trail, dated `daysAgo` days ago. */
export function buildDemoTrailCompletion(trail: Trail, daysAgo: number, hour = 9): DemoActivityInput {
  const when = new Date();
  when.setDate(when.getDate() - daysAgo);
  when.setHours(hour, 0, 0, 0);
  const startedAt = when.getTime();
  const type = trail.type === 'bike' ? 'bike' : 'hike';
  const mph = type === 'bike' ? 10 : 3;
  const durationSec = Math.max(600, Math.round((trail.distanceMiles / mph) * 3600));
  return {
    type,
    startedAt,
    endedAt: startedAt + durationSec * 1000,
    miles: trail.distanceMiles,
    durationSec,
    path: buildDemoPath(trail, trail.distanceMiles, startedAt, durationSec),
  };
}

/**
 * Pre-done Austin history for the demo account: a few well-known local
 * trails, already walked over the last few weeks.
 */
export function buildDeveloperSeedHistory(): DemoActivityInput[] {
  const wanted: { id: string; daysAgo: number; hour: number }[] = [
    { id: 'lady-bird-lake', daysAgo: 21, hour: 8 },
    { id: 'barton-creek', daysAgo: 14, hour: 9 },
    { id: 'mckinney-falls', daysAgo: 7, hour: 10 },
    { id: 'shoal-creek', daysAgo: 2, hour: 17 },
    { id: 'mount-bonnell', daysAgo: 0, hour: 9 },
  ];
  return wanted
    .map(({ id, daysAgo, hour }) => {
      const trail = AUSTIN_TRAILS.find((t) => t.id === id);
      return trail ? buildDemoTrailCompletion(trail, daysAgo, hour) : null;
    })
    .filter((a): a is DemoActivityInput => a != null);
}
