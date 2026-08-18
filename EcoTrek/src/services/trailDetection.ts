import { Coord, haversineMiles } from './geo';
import { AUSTIN_TRAILS, Trail } from '../constants/austinTrails';

/**
 * Trail detection & completion verification.
 */

/** How close the start of an activity must be to a trailhead, in miles. */
const TRAILHEAD_RADIUS_MI = 0.35;

/** Fraction of a trail's length you must cover for it to count as complete. */
const COMPLETION_COVERAGE = 0.7;

/**
 * Speed limits for anti-cheat:
 * - Walking/hiking: 20 mph max (generous for downhill running)
 * - Biking: 30 mph max (generous for experienced cyclists)
 */
const MAX_AVG_MPH = { hike: 20, bike: 30 };

/** A single GPS jump faster than this is physically impossible. */
const MAX_INSTANT_MPH = 45;

/** Number of speed violations forgiven before activity is flagged */
export const MAX_SPEED_STRIKES = 3;

export type DetectionResult = {
  trail: Trail | null;
  distanceToTrailheadMi: number | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
};

export type CompletionResult = {
  trail: Trail | null;
  completed: boolean;
  coveragePercent: number;
  reason: string | null;
};

export type ValidationResult = {
  valid: boolean;
  flagReason: string | null;
  avgMph: number;
  maxSegmentMph: number;
  strikeCount: number;
};

/* ── 1. Which trail is this? ──────────────────────────────────────────────── */

export function detectTrail(
  path: Coord[],
  trails: Trail[] = AUSTIN_TRAILS
): DetectionResult {
  if (!path.length) {
    return { trail: null, distanceToTrailheadMi: null, confidence: 'none' };
  }

  const start = path[0];
  let best: { trail: Trail; dist: number } | null = null;

  for (const t of trails) {
    if (t.startLat == null || t.startLng == null) continue;

    const dStart = haversineMiles(start, { latitude: t.startLat, longitude: t.startLng });
    const dEnd =
      t.endLat != null && t.endLng != null
        ? haversineMiles(start, { latitude: t.endLat, longitude: t.endLng })
        : Infinity;
    const d = Math.min(dStart, dEnd);

    if (!best || d < best.dist) best = { trail: t, dist: d };
  }

  if (!best || best.dist > TRAILHEAD_RADIUS_MI * 4) {
    return { trail: null, distanceToTrailheadMi: best?.dist ?? null, confidence: 'none' };
  }

  const confidence: DetectionResult['confidence'] =
    best.dist <= TRAILHEAD_RADIUS_MI
      ? 'high'
      : best.dist <= TRAILHEAD_RADIUS_MI * 2
      ? 'medium'
      : 'low';

  return { trail: best.trail, distanceToTrailheadMi: best.dist, confidence };
}

/* ── 2. Did they complete it? ─────────────────────────────────────────────── */

export function evaluateCompletion(
  path: Coord[],
  miles: number,
  trails: Trail[] = AUSTIN_TRAILS
): CompletionResult {
  const detection = detectTrail(path, trails);
  const trail = detection.trail;

  if (!trail) {
    return { trail: null, completed: false, coveragePercent: 0, reason: 'No known trail nearby.' };
  }

  if (detection.confidence === 'low') {
    return {
      trail,
      completed: false,
      coveragePercent: 0,
      reason: `You started ${detection.distanceToTrailheadMi?.toFixed(1)} mi from the ${trail.name} trailhead.`,
    };
  }

  const coverage = trail.distanceMiles > 0 ? miles / trail.distanceMiles : 0;
  const coveragePercent = Math.min(100, Math.round(coverage * 100));

  if (coverage < COMPLETION_COVERAGE) {
    const remaining = Math.max(0, trail.distanceMiles * COMPLETION_COVERAGE - miles);
    return {
      trail,
      completed: false,
      coveragePercent,
      reason: `${remaining.toFixed(1)} mi more to log this as a completion.`,
    };
  }

  if (!trail.isLoop && trail.endLat != null && trail.endLng != null && path.length > 1) {
    const end = path[path.length - 1];
    const dToEnd = haversineMiles(end, { latitude: trail.endLat, longitude: trail.endLng });
    const dToStart = haversineMiles(end, { latitude: trail.startLat, longitude: trail.startLng });
    const outAndBack = dToStart < TRAILHEAD_RADIUS_MI && miles >= trail.distanceMiles * 1.6;
    if (dToEnd > TRAILHEAD_RADIUS_MI * 3 && !outAndBack) {
      return {
        trail,
        completed: false,
        coveragePercent,
        reason: 'Distance is there, but you did not finish at either trailhead.',
      };
    }
  }

  return { trail, completed: true, coveragePercent, reason: null };
}

/* ── 3. Is this activity plausible? (anti-cheat with strike system) ────────── */

export function validateActivity(
  path: Coord[],
  miles: number,
  durationSec: number,
  type: 'hike' | 'bike'
): ValidationResult {
  const hours = durationSec / 3600;
  const avgMph = hours > 0 ? miles / hours : 0;

  let maxSegmentMph = 0;
  let strikeCount = 0;
  const speedLimit = MAX_AVG_MPH[type];

  for (let i = 1; i < path.length; i++) {
    const dt = (path[i].timestamp - path[i - 1].timestamp) / 3600000;
    if (dt <= 0) continue;
    const d = haversineMiles(path[i - 1], path[i]);
    const mph = d / dt;
    if (mph > maxSegmentMph) maxSegmentMph = mph;
    // Count segments that exceed the speed limit
    if (mph > speedLimit) strikeCount++;
  }

  if (durationSec < 60) {
    return { valid: false, flagReason: 'too_short', avgMph, maxSegmentMph, strikeCount };
  }

  // Average speed check: if the overall average exceeds the limit, flag it
  if (avgMph > speedLimit) {
    return { valid: false, flagReason: 'speed_too_high', avgMph, maxSegmentMph, strikeCount };
  }

  // Strike system: 3 forgiven momentary violations
  if (strikeCount > MAX_SPEED_STRIKES) {
    return { valid: false, flagReason: 'too_many_strikes', avgMph, maxSegmentMph, strikeCount };
  }

  if (maxSegmentMph > MAX_INSTANT_MPH) {
    return { valid: false, flagReason: 'teleport', avgMph, maxSegmentMph, strikeCount };
  }

  return { valid: true, flagReason: null, avgMph, maxSegmentMph, strikeCount };
}

/**
 * Live speed check — returns whether a single reading exceeds the limit
 * for the given activity type. Used during tracking to show warnings.
 */
export function checkLiveSpeed(
  prev: Coord | undefined,
  curr: Coord,
  type: 'hike' | 'bike'
): { overLimit: boolean; currentMph: number; limit: number } {
  const limit = MAX_AVG_MPH[type];
  if (!prev) return { overLimit: false, currentMph: 0, limit };

  const dt = (curr.timestamp - prev.timestamp) / 3600000;
  if (dt <= 0) return { overLimit: false, currentMph: 0, limit };

  const d = haversineMiles(prev, curr);
  const mph = d / dt;
  return { overLimit: mph > limit, currentMph: Math.round(mph * 10) / 10, limit };
}

export const FLAG_MESSAGES: Record<string, string> = {
  too_short: 'Activity was under a minute, so it was not saved.',
  speed_too_high: 'Your average speed suggests this may not have been a walking or biking activity. Please review and try again.',
  too_many_strikes: 'We noticed several moments of unusually high speed during your activity. For fairness, this activity could not be counted. Please make sure you are hiking or biking at a reasonable pace.',
  teleport: 'Your GPS signal jumped unexpectedly — this activity was not counted. Try again with a clear sky view.',
};

/** Live detection while tracking: "You're on the Barton Creek Greenbelt". */
export function detectCurrentTrail(coord: Coord | undefined, trails: Trail[] = AUSTIN_TRAILS) {
  if (!coord) return null;
  const res = detectTrail([coord], trails);
  return res.confidence === 'high' || res.confidence === 'medium' ? res.trail : null;
}
