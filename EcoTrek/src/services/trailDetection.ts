import { Coord, haversineMiles } from './geo';
import { AUSTIN_TRAILS, Trail } from '../constants/austinTrails';

/**
 * Trail detection & completion verification.
 *
 * Two jobs:
 *   1. Figure out WHICH trail the user was on, from their GPS track.
 *   2. Decide whether they actually completed it — so "trail completed"
 *      badges and challenge credit mean something and can't be farmed by
 *      driving in circles.
 */

/** How close the start of an activity must be to a trailhead, in miles. */
const TRAILHEAD_RADIUS_MI = 0.35;

/** Fraction of a trail's length you must cover for it to count as complete. */
const COMPLETION_COVERAGE = 0.7;

/** Above this average speed we assume a vehicle, not a hike or ride. */
const MAX_AVG_MPH = { hike: 9, bike: 28 };

/** A single GPS jump faster than this is physically impossible. */
const MAX_INSTANT_MPH = 45;

export type DetectionResult = {
  trail: Trail | null;
  /** Miles from the activity start to that trail's trailhead. */
  distanceToTrailheadMi: number | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
};

export type CompletionResult = {
  trail: Trail | null;
  completed: boolean;
  coveragePercent: number;
  /** Why it didn't count, if it didn't. */
  reason: string | null;
};

export type ValidationResult = {
  valid: boolean;
  flagReason: string | null;
  avgMph: number;
  maxSegmentMph: number;
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

  // Score every trail: closeness of the trailhead + how much of the user's
  // track stayed near that trail's start/end corridor.
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

  // Point-to-point trails should finish somewhere other than the start.
  if (!trail.isLoop && trail.endLat != null && trail.endLng != null && path.length > 1) {
    const end = path[path.length - 1];
    const dToEnd = haversineMiles(end, { latitude: trail.endLat, longitude: trail.endLng });
    const dToStart = haversineMiles(end, { latitude: trail.startLat, longitude: trail.startLng });
    // Allow an out-and-back: ending near the start is fine if the distance
    // covered is at least the full round trip.
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

/* ── 3. Is this activity plausible? (anti-cheat) ──────────────────────────── */

export function validateActivity(
  path: Coord[],
  miles: number,
  durationSec: number,
  type: 'hike' | 'bike'
): ValidationResult {
  const hours = durationSec / 3600;
  const avgMph = hours > 0 ? miles / hours : 0;

  let maxSegmentMph = 0;
  for (let i = 1; i < path.length; i++) {
    const dt = (path[i].timestamp - path[i - 1].timestamp) / 3600000;
    if (dt <= 0) continue;
    const d = haversineMiles(path[i - 1], path[i]);
    const mph = d / dt;
    if (mph > maxSegmentMph) maxSegmentMph = mph;
  }

  if (durationSec < 60) {
    return { valid: false, flagReason: 'too_short', avgMph, maxSegmentMph };
  }
  if (avgMph > MAX_AVG_MPH[type]) {
    return { valid: false, flagReason: 'speed_too_high', avgMph, maxSegmentMph };
  }
  if (maxSegmentMph > MAX_INSTANT_MPH) {
    return { valid: false, flagReason: 'teleport', avgMph, maxSegmentMph };
  }

  return { valid: true, flagReason: null, avgMph, maxSegmentMph };
}

export const FLAG_MESSAGES: Record<string, string> = {
  too_short: 'Activity was under a minute, so it was not saved.',
  speed_too_high: 'That pace looks like a vehicle, so this one does not count toward trees.',
  teleport: 'Your GPS jumped a long way — this activity was not counted.',
};

/** Live detection while tracking: "You're on the Barton Creek Greenbelt". */
export function detectCurrentTrail(coord: Coord | undefined, trails: Trail[] = AUSTIN_TRAILS) {
  if (!coord) return null;
  const res = detectTrail([coord], trails);
  return res.confidence === 'high' || res.confidence === 'medium' ? res.trail : null;
}
