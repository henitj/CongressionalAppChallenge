import { IconName } from '../components/Icon';

/**
 * Weekly challenge catalogue.
 *
 * Design rule: every challenge here must be doable by a normal person in a
 * normal week, with no special equipment and no travel. Nothing takes more
 * than about 20 minutes. Most are a single small habit you tick off yourself.
 *
 * Two kinds:
 *   • 'auto'   — the app can measure it (miles, activity count, streak days)
 *                and ticks it off for you.
 *   • 'manual' — honour system. You tap "Mark complete". This is intentional:
 *                the point is to nudge a real-world habit, not to police it.
 *
 * Points from a completed challenge go to your EcoPoints AND straight to your
 * club's total, so finishing challenges is how you carry your team.
 */

export type ChallengeKind = 'auto' | 'manual';

export type ChallengeMetric = 'miles' | 'activities' | 'trees' | 'streak_days';

export type ChallengeCategory = 'move' | 'habit' | 'nature' | 'community';

export type ChallengeTemplate = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  points: number;
  kind: ChallengeKind;
  category: ChallengeCategory;
  metric?: ChallengeMetric;
  target?: number;
};

export const CATEGORY_LABEL: Record<ChallengeCategory, string> = {
  move: 'Get moving',
  habit: 'Small habit',
  nature: 'Notice nature',
  community: 'Community',
};

export const CHALLENGE_CATALOG: ChallengeTemplate[] = [
  /* ── Auto-tracked: measured from your logged activities ─────────────────── */
  {
    id: 'move-2-miles',
    title: 'Cover 2 miles',
    description: 'Any mix of hiking and biking this week. About a 40-minute walk.',
    icon: 'activity',
    points: 25,
    kind: 'auto',
    category: 'move',
    metric: 'miles',
    target: 2,
  },
  {
    id: 'move-5-miles',
    title: 'Cover 5 miles',
    description: 'Spread across as many trips as you like.',
    icon: 'trending-up',
    points: 40,
    kind: 'auto',
    category: 'move',
    metric: 'miles',
    target: 5,
  },
  {
    id: 'move-three-trips',
    title: 'Get out three times',
    description: 'Three separate tracked activities. Ten minutes each counts.',
    icon: 'route',
    points: 30,
    kind: 'auto',
    category: 'move',
    metric: 'activities',
    target: 3,
  },
  {
    id: 'move-one-trip',
    title: 'Log one activity',
    description: 'Just one. Walk around the block with the app running.',
    icon: 'play',
    points: 15,
    kind: 'auto',
    category: 'move',
    metric: 'activities',
    target: 1,
  },
  {
    id: 'streak-four-days',
    title: 'Check in four days',
    description: 'Open EcoTrek on four different days this week.',
    icon: 'flame',
    points: 25,
    kind: 'auto',
    category: 'habit',
    metric: 'streak_days',
    target: 4,
  },
  {
    id: 'earn-two-trees',
    title: 'Earn two trees',
    description: 'Two miles hiked, or six biked. Your call.',
    icon: 'tree',
    points: 30,
    kind: 'auto',
    category: 'move',
    metric: 'trees',
    target: 2,
  },

  /* ── Manual: tap to mark complete ───────────────────────────────────────── */
  {
    id: 'habit-reusable-bottle',
    title: 'Bring a reusable bottle',
    description: 'Take a refillable bottle on a trek instead of buying plastic.',
    icon: 'droplet',
    points: 20,
    kind: 'manual',
    category: 'habit',
  },
  {
    id: 'habit-three-pieces',
    title: 'Pick up three pieces of litter',
    description: 'Three is the whole task. Grab them on your way past.',
    icon: 'leaf',
    points: 25,
    kind: 'manual',
    category: 'habit',
  },
  {
    id: 'habit-walk-instead',
    title: 'Walk one trip you would have driven',
    description: 'The shop, a friend\u2019s place, school. One trip.',
    icon: 'boot',
    points: 25,
    kind: 'manual',
    category: 'habit',
  },
  {
    id: 'habit-lights-out',
    title: 'Lights out for an hour',
    description: 'Turn off everything you are not using for one hour tonight.',
    icon: 'zap',
    points: 15,
    kind: 'manual',
    category: 'habit',
  },
  {
    id: 'habit-meatless-meal',
    title: 'Eat one plant-based meal',
    description: 'One meal, one day. Beans on toast counts.',
    icon: 'leaf',
    points: 20,
    kind: 'manual',
    category: 'habit',
  },
  {
    id: 'habit-recycle-right',
    title: 'Recycle something properly',
    description: 'Rinse it, check the number, put it in the right bin.',
    icon: 'refresh',
    points: 15,
    kind: 'manual',
    category: 'habit',
  },
  {
    id: 'habit-shorter-shower',
    title: 'Take a five-minute shower',
    description: 'Set a timer once this week. Austin is a drought city.',
    icon: 'water',
    points: 15,
    kind: 'manual',
    category: 'habit',
  },
  {
    id: 'nature-spot-plant',
    title: 'Identify a native plant',
    description: 'Find one plant listed on a trail page and spot it in real life.',
    icon: 'leaf',
    points: 20,
    kind: 'manual',
    category: 'nature',
  },
  {
    id: 'nature-spot-animal',
    title: 'Spot a bird or animal',
    description: 'Heron, hawk, armadillo, turtle — anything wild.',
    icon: 'eye',
    points: 20,
    kind: 'manual',
    category: 'nature',
  },
  {
    id: 'nature-sunrise-or-sunset',
    title: 'Catch a sunrise or sunset outside',
    description: 'Be outdoors for one of them this week.',
    icon: 'sun',
    points: 20,
    kind: 'manual',
    category: 'nature',
  },
  {
    id: 'nature-quiet-ten',
    title: 'Ten quiet minutes outside',
    description: 'Phone away, sit outside for ten minutes. That is it.',
    icon: 'moon',
    points: 15,
    kind: 'manual',
    category: 'nature',
  },
  {
    id: 'nature-new-trail',
    title: 'Try a trail you have never done',
    description: 'Pick anything from the Trails tab you have not visited.',
    icon: 'map-pin',
    points: 35,
    kind: 'manual',
    category: 'nature',
  },
  {
    id: 'nature-water-check',
    title: 'Check conditions before you go',
    description: 'Read the safety report on the Home screen before a trek.',
    icon: 'shield',
    points: 10,
    kind: 'manual',
    category: 'nature',
  },
  {
    id: 'community-bring-friend',
    title: 'Bring someone with you',
    description: 'Take a friend or family member on one trek.',
    icon: 'users',
    points: 30,
    kind: 'manual',
    category: 'community',
  },
  {
    id: 'community-share-impact',
    title: 'Share your progress',
    description: 'Send your miles and trees to one person this week.',
    icon: 'share',
    points: 20,
    kind: 'manual',
    category: 'community',
  },
  {
    id: 'community-cheer',
    title: 'Cheer on a club member',
    description: 'Message someone in your club about their week.',
    icon: 'award',
    points: 15,
    kind: 'manual',
    category: 'community',
  },
  {
    id: 'community-invite',
    title: 'Invite one person to your club',
    description: 'Share your club code with someone new.',
    icon: 'plus',
    points: 25,
    kind: 'manual',
    category: 'community',
  },
];

/* ── Deterministic weekly selection ───────────────────────────────────────── */

/**
 * Simple string hash. Deterministic across devices and app restarts, so
 * everyone in a club sees the same challenges in the same week without the
 * server having to tell them.
 */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic shuffle seeded by the week id. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const CHALLENGES_PER_WEEK = 5;

/**
 * Picks this week's line-up: always 2 auto-tracked and 3 manual, so there is
 * something you can finish by walking and something you can finish by
 * choosing differently.
 */
export function challengesForWeek(weekId: string): ChallengeTemplate[] {
  const seed = hash(weekId);
  const auto = seededShuffle(
    CHALLENGE_CATALOG.filter((c) => c.kind === 'auto'),
    seed
  ).slice(0, 2);
  const manual = seededShuffle(
    CHALLENGE_CATALOG.filter((c) => c.kind === 'manual'),
    seed ^ 0x9e3779b9
  ).slice(0, CHALLENGES_PER_WEEK - 2);

  return [...auto, ...manual];
}
