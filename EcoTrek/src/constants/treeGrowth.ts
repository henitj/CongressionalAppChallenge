/**
 * The Tree page — a slow, standalone spend for Gems.
 *
 * You grow one tree at a time through six stages. Every stage needs three
 * kinds of care (water, sunlight, nutrients); each unit of care costs Gems,
 * and the cost rises a little each stage so a fully grown tree is a real,
 * multi-week goal — not something one good hike pays for outright.
 *
 * When a tree reaches 'flourishing' you can plant a new one. Past trees are
 * kept in a simple forest count, so there is always something next to work
 * toward even after the "current" tree is full grown.
 */

import { IconName } from '../components/Icon';

export type CareKind = 'water' | 'sun' | 'nutrients';

export const CARE_KINDS: CareKind[] = ['water', 'sun', 'nutrients'];

export const CARE_LABEL: Record<CareKind, string> = {
  water: 'Water',
  sun: 'Sunlight',
  nutrients: 'Nutrients',
};

export const CARE_ICON: Record<CareKind, IconName> = {
  water: 'droplet',
  sun: 'sun',
  nutrients: 'leaf',
};

export type TreeStage = {
  id: 'seed' | 'sprout' | 'sapling' | 'young' | 'mature' | 'flourishing';
  name: string;
  blurb: string;
  /** Units of each care type needed before this stage is done. */
  unitsPerCare: number;
  /** Gem cost of a single unit of care at this stage. */
  unitCost: number;
};

export const TREE_STAGES: TreeStage[] = [
  { id: 'seed', name: 'Seed', blurb: 'Tucked into the soil, waiting.', unitsPerCare: 2, unitCost: 8 },
  { id: 'sprout', name: 'Sprout', blurb: 'A first green curl breaks the surface.', unitsPerCare: 3, unitCost: 10 },
  { id: 'sapling', name: 'Sapling', blurb: 'Thin, bendy, and reaching up.', unitsPerCare: 3, unitCost: 14 },
  { id: 'young', name: 'Young tree', blurb: 'Sturdy enough for a few leaves of its own.', unitsPerCare: 4, unitCost: 18 },
  { id: 'mature', name: 'Mature tree', blurb: 'Full and shady, with real roots.', unitsPerCare: 4, unitCost: 24 },
  { id: 'flourishing', name: 'Flourishing tree', blurb: 'Blossoms, fruit, and a forest that remembers it.', unitsPerCare: 5, unitCost: 30 },
];

export function stageIndex(id: TreeStage['id']) {
  return TREE_STAGES.findIndex((s) => s.id === id);
}

export function costForUnit(stage: TreeStage) {
  return stage.unitCost;
}

/** Total gems needed to fully grow one tree start to finish, for display. */
export const TOTAL_GEMS_FOR_FULL_TREE = TREE_STAGES.reduce(
  (sum, s) => sum + s.unitsPerCare * CARE_KINDS.length * s.unitCost,
  0
);
