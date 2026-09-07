/**
 * Post-walk cleanup: the rules behind the "did you pick up any trash?"
 * question that appears when a walk ends.
 *
 * Kept out of the screen so the numbers can be tested and so anywhere else
 * that logs a cleanup rewards it identically.
 */

/**
 * A walk has to be at least this long before we ask.
 *
 * Under ten minutes it is a stroll to the car, and a prompt that fires every
 * single time is how a good question turns into something people tap past
 * without reading.
 */
export const CLEANUP_PROMPT_SEC = 10 * 60;

/** Flat points for logging any cleanup at all (also POINT_VALUES.cleanup). */
export const CLEANUP_BASE_POINTS = 15;

/** Bonus points for a cleanup: a flat thank-you plus a little per piece. */
export function cleanupBonusPoints(pieces: number): number {
  if (!Number.isFinite(pieces) || pieces <= 0) return 0;
  return Math.min(CLEANUP_BASE_POINTS + Math.floor(pieces) * 2, 60);
}

/**
 * Roughly how long the picking-up took, credited back as active time.
 * Twenty seconds a piece, capped at ten minutes so nobody can claim an
 * afternoon by typing 999.
 */
export function cleanupBonusSeconds(pieces: number): number {
  if (!Number.isFinite(pieces) || pieces <= 0) return 0;
  return Math.min(Math.floor(pieces) * 20, 10 * 60);
}

/** Should the cleanup question be asked after this activity? */
export function shouldAskCleanup(
  durationSec: number,
  rejected: boolean,
  mode?: 'hike' | 'bike'
): boolean {
  if (rejected) return false;
  // After a ride we always ask — the user wants to log trash they picked up.
  if (mode === 'bike') return true;
  return durationSec >= CLEANUP_PROMPT_SEC;
}
