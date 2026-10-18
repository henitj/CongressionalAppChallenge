/**
 * Step counting from the phone's motion sensor.
 *
 * GPS cannot see a walk around the house: indoors the fixes are poor, and a
 * living-room loop is shorter than the distance GPS noise is filtered at. The
 * accelerometer feels every footstep wherever you are, so a walk is measured
 * as steps x stride and combined with GPS (whichever saw more, see
 * `combineMiles`).
 *
 * This file is pure: no react-native import, so the rules run under Node.
 * `stepSensor.ts` feeds it real samples.
 */

/** Standard gravity, in m/s². The detector works in g so every sensor fits. */
export const GRAVITY = 9.80665;
/** Smoothing for footstep-sized wobble (ms time constant). */
export const SMOOTH_TAU_MS = 60;
/** Slow estimate of gravity/orientation (ms time constant). */
export const BASELINE_TAU_MS = 1200;
/** A footstep peak must rise this far (g) above the baseline. */
export const PEAK_MIN_G = 0.04;
/** Two steps closer than this are one step (about 3.5 steps a second). */
export const MIN_STEP_GAP_MS = 280;
/** Two steps further apart than this are not part of the same walk. */
export const MAX_STEP_GAP_MS = 2000;
/** Steps in a row needed before a walk is believed; they are then credited. */
export const WALK_CONFIRM_STEPS = 4;

export type StepDetector = {
  /** Feed one reading: time in ms and acceleration magnitude in g. Returns steps newly counted. */
  push: (timestampMs: number, magnitudeG: number) => number;
  /** Total steps counted so far. */
  readonly steps: number;
  /** Time of the last counted step, or 0. */
  readonly lastStepAt: number;
};

export function createStepDetector(): StepDetector {
  let steps = 0;
  let lastStepAt = 0;
  let lastT = 0;
  let smooth = 0;
  let baseline = 0;
  let prev = 0;
  let prev2 = 0;
  let prevT = 0;
  let primed = false;
  // Candidate steps of a walk that has not been confirmed yet.
  let pending = 0;
  let lastPeakAt = 0;

  const push = (t: number, g: number): number => {
    if (!Number.isFinite(t) || !Number.isFinite(g)) return 0;
    if (!primed) {
      primed = true;
      smooth = g;
      baseline = g;
      lastT = t;
      return 0;
    }
    const dt = t - lastT;
    if (dt <= 0) return 0;
    lastT = t;
    smooth += (g - smooth) * (1 - Math.exp(-dt / SMOOTH_TAU_MS));
    baseline += (g - baseline) * (1 - Math.exp(-dt / BASELINE_TAU_MS));
    const s = smooth - baseline;

    // A peak is the sample just before the signal turns down.
    let counted = 0;
    if (prev > prev2 && prev >= s && prev > PEAK_MIN_G) {
      const gap = prevT - lastPeakAt;
      if (lastPeakAt === 0 || gap >= MIN_STEP_GAP_MS) {
        if (lastPeakAt !== 0 && gap > MAX_STEP_GAP_MS) pending = 0;
        lastPeakAt = prevT;
        if (steps > 0 && lastStepAt && prevT - lastStepAt <= MAX_STEP_GAP_MS) {
          // Still walking.
          steps += 1;
          counted = 1;
          lastStepAt = prevT;
        } else {
          pending += 1;
          if (pending >= WALK_CONFIRM_STEPS) {
            // A real walk: credit the steps that proved it.
            steps += pending;
            counted = pending;
            pending = 0;
            lastStepAt = prevT;
          }
        }
      }
    }
    prev2 = prev;
    prev = s;
    prevT = t;
    return counted;
  };

  return {
    push,
    get steps() {
      return steps;
    },
    get lastStepAt() {
      return lastStepAt;
    },
  };
}

const METRES_PER_MILE = 1609.344;
const INCHES_PER_METRE = 39.3701;

/** Walking stride in metres. Uses height when the profile has one. */
export function strideMetres(heightInches: number | undefined | null): number {
  const h = Number(heightInches);
  if (!Number.isFinite(h) || h < 36 || h > 96) return 0.74; // about 29 in
  return Math.min(1.0, Math.max(0.5, (h * 0.413) / INCHES_PER_METRE));
}

export function stepsToMiles(steps: number, strideM: number): number {
  if (!Number.isFinite(steps) || steps <= 0) return 0;
  return (steps * strideM) / METRES_PER_MILE;
}

/**
 * GPS and the step counter measure the same walk. GPS is the better ruler
 * outdoors; steps are the only ruler indoors. Taking the larger never
 * double-counts and never loses a walk either sensor saw.
 */
export function combineMiles(gpsMiles: number, stepMiles: number): number {
  const g = Number.isFinite(gpsMiles) ? gpsMiles : 0;
  const s = Number.isFinite(stepMiles) ? stepMiles : 0;
  return Math.max(g, s);
}

/** Walking speed in mph from step times over the last `windowMs`. */
export function stepMph(stepTimes: number[], now: number, strideM: number, windowMs = 10_000): number {
  const recent = stepTimes.filter((t) => now - t <= windowMs && now - t >= 0);
  if (recent.length < 3) return 0;
  const span = Math.max(2000, Math.min(windowMs, now - recent[0]));
  const metres = (recent.length - 1) * strideM;
  return metres / METRES_PER_MILE / (span / 1000 / 3600);
}
