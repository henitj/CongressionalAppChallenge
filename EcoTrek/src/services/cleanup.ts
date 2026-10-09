/**
 * Post-trail cleanup: the rules behind the "how much trash did you pick up?"
 * question that appears when a trail ends.
 *
 * Kept out of the screens so the number limits and rewards can be tested and
 * so the local database, cloud API, and UI all use the same rules.
 */

/** The largest honest count the app accepts in one post-trail answer. */
export const MAX_CLEANUP_PIECES = 99;

/** Kept for the impact/logbook screens that describe a longer walk. */
export const CLEANUP_PROMPT_SEC = 10 * 60;

/** Flat thank-you points for logging a cleanup. */
export const CLEANUP_BASE_POINTS = 15;

/**
 * Normalizes user input before it reaches AsyncStorage, the points ledger, or
 * the shared club. Empty, fractional, negative, and non-finite values are
 * harmless; a count above 99 is capped rather than becoming a leaderboard
 * shortcut.
 */
export function normalizeCleanupPieces(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_CLEANUP_PIECES, Math.floor(n));
}

/**
 * Points rise with every piece up to the 99 cap. Anything above the cap is
 * capped first, so it earns exactly what 99 earns: the reward never falls as
 * the count grows, and a runaway count is not a leaderboard shortcut.
 */
export function cleanupBonusPoints(pieces: number): number {
  if (!Number.isFinite(pieces) || pieces <= 0) return 0;
  return CLEANUP_BASE_POINTS + normalizeCleanupPieces(pieces) * 2;
}

/**
 * Roughly how long the picking-up took, credited back as active time. Twenty
 * seconds a piece, capped at ten minutes.
 */
export function cleanupBonusSeconds(pieces: number): number {
  const safe = normalizeCleanupPieces(pieces);
  if (safe <= 0) return 0;
  return Math.min(safe * 20, 10 * 60);
}

/**
 * Legacy helper for callers that only want to ask after a substantial walk.
 * The end-of-trail flow uses shouldAskCleanupAfterTrail below so every valid
 * trail gets the honesty prompt, including a short named trail.
 */
export function shouldAskCleanup(
  durationSec: number,
  rejected: boolean,
  mode?: 'hike' | 'bike'
): boolean {
  if (rejected) return false;
  if (mode === 'bike') return true;
  return durationSec >= CLEANUP_PROMPT_SEC;
}

/** Every valid trail asks exactly once when its summary opens. */
export function shouldAskCleanupAfterTrail(rejected: boolean): boolean {
  return !rejected;
}
