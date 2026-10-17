import type { IconName } from '../components/Icon';

export type CareKind = 'water' | 'sun' | 'nutrients';
export const CARE_KINDS: CareKind[] = ['water', 'sun', 'nutrients'];
export const CARE_LABEL: Record<CareKind, string> = { water: 'Water', sun: 'Sunlight', nutrients: 'Soil' };
export const CARE_ICON: Record<CareKind, IconName> = { water: 'droplet', sun: 'sun', nutrients: 'leaf' };
export const WEEKLY_CARE_COST = 1;
export const TREE_IMAGE_COUNT = 100;
export const MATURE_IMAGE = 80;
/** Complete weekly care is essential for flourishing, not just more taps. */
export const CARE_GROWTH_FACTORS = [0.05, 0.25, 0.60, 1] as const;
export const WITHOUT_OUTDOOR_FACTOR = 0.75;
export type TreeStage = {
  id: 'seed' | 'sprout' | 'leaves' | 'sapling' | 'branching' | 'fork' | 'young' | 'leafy' | 'buds' | 'flower' | 'bloom' | 'fruitset' | 'expanding' | 'bearing' | 'mature' | 'old' | 'sage';
  name: string;
  blurb: string;
  minWeeks: number;
  minDays: number;
  minMonths?: number;
  timeLabel: string;
  /** Index into 100 actual geometry-grown raster images, not a scale factor. */
  firstImage: number;
  heightRatio: number;
  unitsPerCare: number;
  unitCost: number;
};
const stage = (s: Omit<TreeStage, 'heightRatio' | 'unitsPerCare' | 'unitCost'>): TreeStage => ({ ...s, heightRatio: 0.1 + s.firstImage / 99 * 0.82, unitsPerCare: 1, unitCost: WEEKLY_CARE_COST });
export const TREE_STAGES: TreeStage[] = [
  stage({ id: 'seed', name: 'New seedling', blurb: 'A tiny living beginning, with its first delicate shoot.', minWeeks: 0, minDays: 0, timeLabel: 'Planting day', firstImage: 0 }),
  stage({ id: 'sprout', name: 'First shoot', blurb: 'The little stem lengthens. Each new leaf opens gradually.', minWeeks: 1, minDays: 7, timeLabel: '1 week', firstImage: 6 }),
  stage({ id: 'leaves', name: 'First leaves', blurb: 'Small true leaves gather the light your tree needs.', minWeeks: 2, minDays: 14, timeLabel: '2 weeks', firstImage: 12 }),
  stage({ id: 'sapling', name: 'Little sapling', blurb: 'A slender stem, a few leaf pairs, and roots taking hold.', minWeeks: 3, minDays: 21, timeLabel: '3 weeks', firstImage: 18 }),
  stage({ id: 'branching', name: 'Branching sapling', blurb: 'The first side shoots emerge from the same growing stem.', minWeeks: 4, minDays: 28, timeLabel: '4 weeks', firstImage: 25 }),
  stage({ id: 'fork', name: 'Forked sapling', blurb: 'Fine woody branches begin supporting a wider spread of leaves.', minWeeks: 5, minDays: 35, timeLabel: '5 weeks', firstImage: 31 }),
  stage({ id: 'young', name: 'Young tree', blurb: 'A slightly taller tree, with more branching—not a sudden adult canopy.', minWeeks: 6, minDays: 42, timeLabel: '6 weeks', firstImage: 38 }),
  stage({ id: 'leafy', name: 'Leafy young tree', blurb: 'New leaves fill the spaces between its developing branches.', minWeeks: 7, minDays: 49, timeLabel: '7 weeks', firstImage: 44 }),
  stage({ id: 'buds', name: 'First buds', blurb: 'Small flower buds form on the young shoots.', minWeeks: 8, minDays: 56, timeLabel: '8 weeks', firstImage: 48 }),
  stage({ id: 'flower', name: 'First flower', blurb: 'A pale pink-white apple blossom opens on a young branch.', minWeeks: 9, minDays: 63, timeLabel: '9 weeks', firstImage: 52 }),
  stage({ id: 'bloom', name: 'Growing in bloom', blurb: 'More blossoms open as the tree continues filling out.', minWeeks: 10, minDays: 70, timeLabel: '10 weeks', firstImage: 57 }),
  stage({ id: 'fruitset', name: 'First fruitlets', blurb: 'Tiny green fruit develops where the blossoms were.', minWeeks: 11, minDays: 77, timeLabel: '11 weeks', firstImage: 63 }),
  stage({ id: 'expanding', name: 'Expanding canopy', blurb: 'Leafy shoots extend, the crown broadens, and the trunk slowly thickens.', minWeeks: 12, minDays: 84, timeLabel: '12 weeks', firstImage: 69 }),
  stage({ id: 'bearing', name: 'Young bearing tree', blurb: 'Small apples and a fuller crown, with more growing still to do.', minWeeks: 14, minDays: 98, timeLabel: '14 weeks', firstImage: 75 }),
  stage({ id: 'mature', name: 'Full-grown tree', blurb: 'Four months of patient care, with a healthy branching orchard canopy.', minWeeks: 17, minDays: 0, minMonths: 4, timeLabel: '4 months', firstImage: 80 }),
  stage({ id: 'old', name: 'Established tree', blurb: 'The same tree deepens its bark texture and gradually thickens its trunk.', minWeeks: 21, minDays: 0, minMonths: 5, timeLabel: '5 months', firstImage: 90 }),
  stage({ id: 'sage', name: 'Sage tree', blurb: 'An established tree, with a fuller crown and a story in every branch.', minWeeks: 26, minDays: 0, minMonths: 6, timeLabel: '6 months', firstImage: 99 }),
];
export function stageIndex(id: TreeStage['id']) { return TREE_STAGES.findIndex((s) => s.id === id); }
export function costForUnit(_stage: TreeStage) { return WEEKLY_CARE_COST; }
export const TOTAL_GEMS_FOR_FULL_TREE = TREE_STAGES.find((item) => item.id === 'mature')!.minWeeks * CARE_KINDS.length * WEEKLY_CARE_COST;
