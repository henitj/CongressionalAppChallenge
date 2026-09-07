import { TREE_RULES } from '../constants/theme';

/**
 * Virtual trees.
 *
 * EcoTrek trees are a SYMBOLIC reward for distance covered under your own
 * power. No real tree is planted, no money changes hands, and no planting
 * organisation is involved. The UI must never imply otherwise — say "trees
 * earned", never "trees planted for you".
 *
 * Why keep them at all? Because an abstract point score doesn't mean anything
 * to a person, and "you've grown a 12-tree forest" does. It's a unit of
 * progress, framed the way the app is about.
 *
 * (This replaces the old veritree.ts, which faked API receipts from a real
 * company. That would have been a false claim on the store listing.)
 */

export type TreeGrant = {
  id: string;
  trees: number;
  /** Cosmetic species label so each grant feels distinct. */
  species: string;
  earnedAt: string;
  reason: 'activity' | 'challenge' | 'badge';
};

/** Native Central Texas species, used purely as flavour labels. */
const SPECIES = [
  'Texas Live Oak',
  'Cedar Elm',
  'Mexican Plum',
  'Bald Cypress',
  'Texas Redbud',
  'Anacacho Orchid Tree',
  'Escarpment Black Cherry',
  'Texas Mountain Laurel',
  'Bigtooth Maple',
  'Possumhaw Holly',
];

/**
 * Deterministic species pick — the same activity always shows the same
 * species, so the history doesn't reshuffle every time you open the app.
 */
export function speciesFor(seed: string | number): string {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return SPECIES[h % SPECIES.length];
}

export function computeTrees(type: 'hike' | 'bike', miles: number): number {
  const rule = type === 'bike' ? TREE_RULES.bikeMilesPerTree : TREE_RULES.hikeMilesPerTree;
  return Math.floor(miles / rule);
}

export function createGrant(
  seed: string,
  trees: number,
  reason: TreeGrant['reason'] = 'activity'
): TreeGrant {
  return {
    id: `grant-${seed}`,
    trees,
    species: speciesFor(seed),
    earnedAt: new Date().toISOString(),
    reason,
  };
}

/** Plain-language explainer shown in the app so the framing is never unclear. */
export const TREES_DISCLAIMER =
  'Trees are a symbolic measure of your effort inside EcoTrek. They track distance you covered under your own power — they are not real trees planted on your behalf.';
