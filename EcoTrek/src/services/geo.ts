/**
 * Pure geometry helpers.
 *
 * Kept free of any react-native import so it can run in plain Node (tests,
 * scripts, and later your API server if you want the same distance maths on
 * both sides).
 */

export type Coord = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number; // metres
  speed?: number; // m/s
  altitude?: number; // metres above sea level
};

/** Great-circle distance in miles. */
export function haversineMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  if (!a || !b || !Number.isFinite(a.latitude) || !Number.isFinite(b.latitude) || !Number.isFinite(a.longitude) || !Number.isFinite(b.longitude)) {
    return 0;
  }
  const R = 3958.8; // Earth radius, miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const clampedX = Math.min(1, Math.max(0, x));
  const result = R * 2 * Math.atan2(Math.sqrt(clampedX), Math.sqrt(1 - clampedX));
  return Number.isFinite(result) ? result : 0;
}

// ─── Track filter ────────────────────────────────────────────────────────────
//
// The live tracker used to compare every raw fix with the one before it. A
// phone standing still wanders a few metres between fixes, so those steps added
// up to phantom miles and phantom speed strikes. The filter below:
//   1. ignores fixes that are too inaccurate or that imply a GPS jump;
//   2. averages the last few good fixes, which damps the wobble;
//   3. counts distance only once the smoothed position has really moved over a
//      short window ("moving"), and only from an anchor (the last counted
//      point) once it is beyond the accuracy radius.
// A phone that stays put therefore never moves its anchor and counts nothing.

/** Fixes less accurate than this are ignored outright. */
export const MAX_FIX_ACCURACY_M = 50;
/** A raw step faster than this is a GPS jump, not a walk (same as validation). */
export const MAX_STEP_MPH = 45;
/** Fixes averaged together to damp GPS wobble. */
export const SMOOTH_FIXES = 5;
/** How far back the "is it moving?" test looks. */
export const MOVING_WINDOW_MS = 20_000;
/** Displacement over the moving window that counts as movement (about 1.3 mph), or the fix's accuracy if larger. */
export const MOVING_MIN_M = 12;
/** Smallest anchor step that is ever counted. */
export const MIN_STEP_M = 10;
/** Largest anchor step threshold, however poor the fix. */
export const MAX_STEP_THRESHOLD_M = 25;
/** Altitude must move this far before it counts toward gain or loss. */
export const ELEVATION_STEP_M = 3;
/** Without a usable point for this long, the next fix starts afresh. */
export const STALE_ANCHOR_MS = 20_000;

const METRES_PER_MILE = 1609.344;
const FEET_PER_METRE = 3.28084;

/** A smoothed position, with the time it describes. */
type SmoothPoint = { latitude: number; longitude: number; timestamp: number; accuracy?: number };

export type TrackState = {
  /** Last counted point (smoothed). Distance and speed are measured from here. */
  anchor: SmoothPoint | null;
  /** The last few accepted raw fixes, averaged to smooth the position. */
  recent: Coord[];
  /** Smoothed positions from the last MOVING_WINDOW_MS, for the moving test. */
  history: SmoothPoint[];
  miles: number;
  /** Altitude (m) the elevation hysteresis is measured from. */
  elevationRef: number | null;
  gainFt: number;
  lossFt: number;
};

export const EMPTY_TRACK: TrackState = {
  anchor: null,
  recent: [],
  history: [],
  miles: 0,
  elevationRef: null,
  gainFt: 0,
  lossFt: 0,
};

export type TrackStepResult = {
  state: TrackState;
  /**
   * ignored — a poor fix or a GPS jump; nothing changes.
   * still   — wobble, or not moving; nothing is counted.
   * started — a new anchor; the point belongs on the path, no distance yet.
   * moved   — real movement; the distance and speed were counted.
   */
  status: 'ignored' | 'still' | 'started' | 'moved';
  /** Speed over the step in mph. Zero unless the status is `moved`. */
  mph: number;
  /**
   * The smoothed point to store on the path when the status is `started` or
   * `moved`. The path is made of these points, so the saved route measures
   * exactly what the live counter measured. Null otherwise.
   */
  point: Coord | null;
};

function timeOf(c: { timestamp?: number }, fallback: number): number {
  return c.timestamp || fallback;
}

function metresBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  return haversineMiles(a, b) * METRES_PER_MILE;
}

function smoothOf(recent: Coord[]): SmoothPoint {
  const n = recent.length;
  const last = recent[n - 1];
  const accs = recent.map((c) => c.accuracy).filter((a): a is number => a != null);
  return {
    latitude: recent.reduce((sum, c) => sum + c.latitude, 0) / n,
    longitude: recent.reduce((sum, c) => sum + c.longitude, 0) / n,
    timestamp: timeOf(last, Date.now()),
    accuracy: accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : undefined,
  };
}

function advanceElevation(state: TrackState, altitude: number | undefined): TrackState {
  if (altitude == null || !Number.isFinite(altitude)) return state;
  if (state.elevationRef == null) return { ...state, elevationRef: altitude };
  const rise = altitude - state.elevationRef;
  // Hysteresis: small wobbles never add up, only a real change does.
  if (Math.abs(rise) < ELEVATION_STEP_M) return state;
  const feet = Math.abs(rise) * FEET_PER_METRE;
  return rise > 0
    ? { ...state, elevationRef: altitude, gainFt: state.gainFt + feet }
    : { ...state, elevationRef: altitude, lossFt: state.lossFt + feet };
}

/**
 * Feed one GPS fix at a time. Pure, so the rules can be tested without a
 * phone. The caller keeps the returned `state` for the next fix.
 */
export function advanceTrack(prev: TrackState, fix: Coord): TrackStepResult {
  const ignored = (): TrackStepResult => ({ state: prev, status: 'ignored', mph: 0, point: null });
  if (!Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) return ignored();
  if (fix.accuracy != null && fix.accuracy > MAX_FIX_ACCURACY_M) return ignored();

  const fixAt = timeOf(fix, Date.now());
  let base = prev;

  // Raw jump check against the last accepted fix.
  const lastRaw = prev.recent[prev.recent.length - 1];
  if (lastRaw) {
    const elapsedMs = fixAt - timeOf(lastRaw, fixAt);
    const rawMph = metresBetween(lastRaw, fix) / METRES_PER_MILE / (Math.max(0.1, elapsedMs / 1000) / 3600);
    if (rawMph > MAX_STEP_MPH) {
      if (elapsedMs <= STALE_ANCHOR_MS) return ignored();
      // Nothing usable for a while: this fix is the new start, not a jump.
      base = { ...EMPTY_TRACK, miles: prev.miles, gainFt: prev.gainFt, lossFt: prev.lossFt };
    }
  }

  const recent = [...base.recent, fix].slice(-SMOOTH_FIXES);
  const point = smoothOf(recent);
  const history = [...base.history, point].filter((p) => point.timestamp - p.timestamp <= MOVING_WINDOW_MS);
  const next: TrackState = { ...base, recent, history };

  if (!base.anchor) {
    return {
      state: advanceElevation({ ...next, anchor: point, elevationRef: null }, fix.altitude),
      status: 'started',
      mph: 0,
      point,
    };
  }

  // Moving means the smoothed position has really changed over the window.
  const oldest = history[0];
  const windowAgeMs = point.timestamp - oldest.timestamp;
  const movedInWindow = metresBetween(oldest, point);
  // A noisier fix has to move further before it counts as movement.
  const movingNeed = Math.min(MAX_STEP_THRESHOLD_M, Math.max(MOVING_MIN_M, point.accuracy ?? 0));
  const moving = windowAgeMs >= 5000 && movedInWindow >= movingNeed;

  const metres = metresBetween(base.anchor, point);
  const threshold = Math.min(
    MAX_STEP_THRESHOLD_M,
    Math.max(MIN_STEP_M, base.anchor.accuracy ?? 0, point.accuracy ?? 0)
  );
  if (!moving || metres < threshold) {
    return { state: next, status: 'still', mph: 0, point: null };
  }

  const hours = Math.max(0.1, (point.timestamp - base.anchor.timestamp) / 1000) / 3600;
  const mph = metres / METRES_PER_MILE / hours;
  if (mph > MAX_STEP_MPH) return ignored();

  const moved: TrackState = {
    ...next,
    anchor: point,
    miles: next.miles + metres / METRES_PER_MILE,
  };
  return { state: advanceElevation(moved, fix.altitude), status: 'moved', mph, point };
}
