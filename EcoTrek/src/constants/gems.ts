/**
 * Gems — a second, spendable currency, separate from EcoPoints.
 *
 * EcoPoints only ever go up; they are a lifetime score. Gems are meant to be
 * spent: you earn them the same way you earn EcoPoints (walking, riding,
 * finishing weekly goals, claiming badges) and you spend them a few at a
 * time on the Tree page, watering a seed through its growth stages. Spending
 * gems never touches your EcoPoints, trees-earned count, or any badge.
 */

export type GemReason =
  | 'hike_mile'
  | 'bike_mile'
  | 'tree_earned'
  | 'trail_completed'
  | 'challenge_completed'
  | 'badge_claimed'
  | 'cleanup'
  | 'streak_bonus';

/** Gems per unit for each way of earning them. "per unit" = per mile / per tree / flat. */
export const GEM_VALUES: Record<GemReason, number> = {
  hike_mile: 1,
  bike_mile: 1,
  tree_earned: 2,
  trail_completed: 12,
  challenge_completed: 8,
  badge_claimed: 15,
  cleanup: 4,
  streak_bonus: 10,
};

export const GEM_REASON_LABEL: Record<GemReason, string> = {
  hike_mile: 'Hiked a mile',
  bike_mile: 'Biked a mile',
  tree_earned: 'Tree earned',
  trail_completed: 'Trail completed',
  challenge_completed: 'Weekly goal completed',
  badge_claimed: 'Badge claimed',
  cleanup: 'Trail cleanup',
  streak_bonus: 'Streak kept',
};
