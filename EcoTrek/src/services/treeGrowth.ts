import { CARE_GROWTH_FACTORS, CARE_KINDS, MATURE_IMAGE, TREE_IMAGE_COUNT, TREE_STAGES, WITHOUT_OUTDOOR_FACTOR, type CareKind, type TreeStage } from '../constants/treeGrowth';
import { dayKey, daysBetween, weekKey, weekStart } from './dates';

export type CareProgress = Record<CareKind, number>;
export type TreeGrowthStore = {
  version: 3;
  plantedAt: number;
  careWeek: string;
  care: CareProgress;
  /** Includes partial care, so it no longer disappears at the next Monday. */
  careHistory: Record<string, CareProgress>;
  /** Full-care weeks retained for migration, rewards and compatibility. */
  careWeeks: string[];
  outdoorWeeks: string[];
  forest: number;
  goldenApples: number;
  harvestedWeeks: string[];
  lastSeenAt: number;
  legacyMigrated?: boolean;
};
export type TreeSeason = 'spring' | 'summer' | 'fall' | 'winter';
export const zeroCare = (): CareProgress => ({ water: 0, sun: 0, nutrients: 0 });
export const completeCare = (): CareProgress => ({ water: 1, sun: 1, nutrients: 1 });
export function emptyTree(now = Date.now()): TreeGrowthStore {
  return { version: 3, plantedAt: now, careWeek: weekKey(new Date(now)), care: zeroCare(), careHistory: {}, careWeeks: [], outdoorWeeks: [], forest: 0, goldenApples: 0, harvestedWeeks: [], lastSeenAt: now };
}
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1_000_000, Math.floor(value))) : 0;
const timestamp = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
const WEEK = /^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/;
function validWeek(value: unknown): value is string {
  if (typeof value !== 'string' || !WEEK.test(value)) return false;
  const year = Number(value.slice(0, 4));
  return value <= weekKey(new Date(year, 11, 28));
}
function weeks(value: unknown, first: string, last: string): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((key): key is string => validWeek(key) && key >= first && key <= last))].sort() : [];
}
function normalizeCare(value: unknown): CareProgress {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { water: count(raw.water) > 0 ? 1 : 0, sun: count(raw.sun) > 0 ? 1 : 0, nutrients: count(raw.nutrients) > 0 ? 1 : 0 };
}
export function mergeCare(a: CareProgress, b: CareProgress): CareProgress {
  return { water: Math.max(a.water, b.water), sun: Math.max(a.sun, b.sun), nutrients: Math.max(a.nutrients, b.nutrients) };
}
export function careUnits(care: CareProgress): number { return CARE_KINDS.filter((kind) => care[kind] > 0).length; }
export function weeklyGrowthFactor(care: CareProgress, outdoors = true): number {
  return CARE_GROWTH_FACTORS[careUnits(care)] * (outdoors ? 1 : WITHOUT_OUTDOOR_FACTOR);
}

/** V2 keeps its real birthday and every full-care credit. V1 alone had no date.
 * Partial care is preserved, not discarded on a weekly rollover or upgrade. */
export function normalizeTreeGrowth(value: unknown, time = Date.now()): TreeGrowthStore {
  const raw = value && typeof value === 'object' ? value as Record<string, any> : {};
  const legacy = raw.version !== 2 && raw.version !== 3 && ['seed', 'sprout', 'sapling', 'young', 'mature', 'flourishing'].includes(raw.stageId);
  const plantedAt = Math.min(time, timestamp(raw.plantedAt, time));
  const lastSeenAt = Math.max(plantedAt, Math.min(timestamp(raw.lastSeenAt, time), time));
  const first = weekKey(new Date(plantedAt)), current = weekKey(new Date(time));
  const careWeek = validWeek(raw.careWeek) && raw.careWeek >= first && raw.careWeek <= current ? raw.careWeek : current;
  const care = legacy && raw.stageId !== 'seed' ? completeCare() : normalizeCare(raw.care);
  const careWeeks = weeks(raw.careWeeks, first, current);
  const careHistory: Record<string, CareProgress> = {};
  for (const week of careWeeks) careHistory[week] = completeCare();
  if (raw.careHistory && typeof raw.careHistory === 'object' && !Array.isArray(raw.careHistory)) {
    for (const [week, value] of Object.entries(raw.careHistory)) {
      if (!validWeek(week) || week < first || week > current) continue;
      careHistory[week] = mergeCare(careHistory[week] ?? zeroCare(), normalizeCare(value));
    }
  }
  if (careUnits(care) > 0) careHistory[careWeek] = mergeCare(careHistory[careWeek] ?? zeroCare(), care);
  for (const [week, value] of Object.entries(careHistory)) if (careUnits(value) === 3 && !careWeeks.includes(week)) careWeeks.push(week);
  return { version: 3, plantedAt, lastSeenAt, careWeek, care, careHistory, careWeeks: careWeeks.sort(), outdoorWeeks: weeks(raw.outdoorWeeks, first, current), forest: count(raw.forest), goldenApples: count(raw.goldenApples), harvestedWeeks: weeks(raw.harvestedWeeks, '2000-W01', current), ...(legacy || raw.legacyMigrated === true ? { legacyMigrated: true } : {}) };
}
export function addCalendarMonths(time: number, months: number): number {
  const start = new Date(time);
  const target = new Date(start.getFullYear(), start.getMonth() + months, 1, start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(start.getDate(), lastDay));
  return target.getTime();
}
export function stageReadyAt(stage: TreeStage, plantedAt: number): number {
  const days = new Date(plantedAt); days.setDate(days.getDate() + stage.minDays);
  return Math.max(days.getTime(), stage.minMonths ? addCalendarMonths(plantedAt, stage.minMonths) : plantedAt);
}
export function atCurrentWeek(store: TreeGrowthStore, time: number): TreeGrowthStore {
  const now = Math.max(time, store.lastSeenAt), current = weekKey(new Date(now));
  const history = { ...(store.careHistory ?? {}) };
  if (careUnits(store.care) > 0) history[store.careWeek] = mergeCare(history[store.careWeek] ?? zeroCare(), store.care);
  return { ...store, careHistory: history, lastSeenAt: now, ...(current !== store.careWeek ? { careWeek: current, care: zeroCare() } : {}) };
}
export function careProgress(_stage: TreeStage, care: CareProgress): number { return careUnits(care) / 3; }

/** Weighted growth is additive. Missing care slows a week; it cannot erase
 * old growth. Full weekly care + an outing earns 1 equivalent growth week.
 * Calendar gates independently prevent gems/taps from buying biological age. */
export function effectiveGrowthWeeks(store: TreeGrowthStore, time: number): number {
  const now = Math.max(time, store.lastSeenAt), first = weekKey(new Date(store.plantedAt)), current = weekKey(new Date(now));
  const slots = Math.max(1, 1 + Math.floor(daysBetween(dayKey(weekStart(new Date(store.plantedAt))), dayKey(weekStart(new Date(now)))) / 7));
  const baseline = CARE_GROWTH_FACTORS[0] * WITHOUT_OUTDOOR_FACTOR;
  const history = { ...(store.careHistory ?? {}) };
  for (const key of store.careWeeks) if (key >= first && key <= current) history[key] = completeCare();
  if (store.careWeek <= current && careUnits(store.care) > 0) history[store.careWeek] = mergeCare(history[store.careWeek] ?? zeroCare(), store.care);
  const outdoors = new Set(store.outdoorWeeks.filter((key) => key >= first && key <= current));
  const recorded = new Set([...Object.keys(history), ...outdoors]);
  let score = slots * baseline;
  for (const week of recorded) {
    if (!validWeek(week) || week < first || week > current) continue;
    score += weeklyGrowthFactor(history[week] ?? zeroCare(), outdoors.has(week)) - baseline;
  }
  return Math.max(0, score);
}
export function stageForImage(image: number): TreeStage {
  const index = Math.max(0, Math.min(TREE_IMAGE_COUNT - 1, Math.floor(Number.isFinite(image) ? image : 0)));
  return [...TREE_STAGES].reverse().find((stage) => stage.firstImage <= index) ?? TREE_STAGES[0];
}
export function imageForGrowth(effort: number, plantedAt: number, now: number): { imageIndex: number; milestoneIndex: number; progress: number } {
  const milestoneIndex = TREE_STAGES.reduce((current, stage, i) => effort + 1e-8 >= stage.minWeeks && now >= stageReadyAt(stage, plantedAt) ? i : current, 0);
  const stage = TREE_STAGES[milestoneIndex], next = TREE_STAGES[milestoneIndex + 1];
  const effortFraction = next ? (effort - stage.minWeeks) / (next.minWeeks - stage.minWeeks) : 1;
  const ageFraction = next ? (now - stageReadyAt(stage, plantedAt)) / Math.max(1, stageReadyAt(next, plantedAt) - stageReadyAt(stage, plantedAt)) : 1;
  const progress = Math.max(0, Math.min(1, effortFraction, ageFraction));
  // A visual interpolation must never round into a milestone whose real
  // calendar/effort gate has not been met (especially the birthday millisecond).
  const lastPermittedImage = next ? next.firstImage - 1 : TREE_IMAGE_COUNT - 1;
  return { imageIndex: Math.min(lastPermittedImage, Math.floor(stage.firstImage + (next ? next.firstImage - stage.firstImage : 0) * progress)), milestoneIndex, progress };
}
export function treeStatus(saved: TreeGrowthStore, time = Date.now()) {
  const now = Math.max(time, saved.lastSeenAt), store = atCurrentWeek(saved, now);
  const outdoors = new Set(store.outdoorWeeks);
  const growthWeeks = new Set(store.careWeeks.filter((key) => outdoors.has(key))).size;
  const effort = effectiveGrowthWeeks(store, now);
  const { imageIndex, milestoneIndex: index, progress } = imageForGrowth(effort, store.plantedAt, now);
  const stage = TREE_STAGES[index], next = TREE_STAGES[index + 1];
  const outdoorThisWeek = outdoors.has(store.careWeek), careComplete = careUnits(store.care) === 3;
  const isFullyGrown = imageIndex >= MATURE_IMAGE;
  const missingCare = CARE_KINDS.filter((kind) => store.care[kind] !== 1);
  const growthFactor = weeklyGrowthFactor(store.care, outdoorThisWeek);
  return { stage, stageNumber: index + 1, stageCount: TREE_STAGES.length, nextStage: next, care: store.care, careHistory: store.careHistory, growthWeeks, effectiveGrowthWeeks: effort, progress, imageIndex, imageCount: TREE_IMAGE_COUNT, overallProgress: imageIndex / (TREE_IMAGE_COUNT - 1), outdoorThisWeek, careComplete, careUnits: careUnits(store.care), missingCare, growthFactor, growthPercent: Math.round(growthFactor * 100), carePercent: Math.round(CARE_GROWTH_FACTORS[careUnits(store.care)] * 100), isFullyGrown, isSage: imageIndex === TREE_IMAGE_COUNT - 1, plantedAt: store.plantedAt, ageDays: Math.max(0, daysBetween(dayKey(store.plantedAt), dayKey(now))), nextStageAt: next ? stageReadyAt(next, store.plantedAt) : null, weeksToNext: next ? Math.max(0, next.minWeeks - effort) : 0, canHarvest: isFullyGrown && outdoorThisWeek && careComplete && !store.harvestedWeeks.includes(store.careWeek), harvestedThisWeek: store.harvestedWeeks.includes(store.careWeek), forest: store.forest, goldenApples: store.goldenApples, legacyMigrated: !!store.legacyMigrated, now };
}
export function treeGrowthAge(id: TreeStage['id'], progress: number) { return Math.max(0, TREE_STAGES.findIndex((stage) => stage.id === id)) + (Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0); }
export function treeSeason(time = Date.now(), latitude = 0): TreeSeason {
  const north: TreeSeason[] = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter'];
  return north[(new Date(time).getMonth() + (latitude < 0 ? 6 : 0)) % 12];
}
export function seasonalTreeBehavior(season: TreeSeason, isFullyGrown: boolean) { return { fallingLeaves: season === 'fall' && isFullyGrown, bareBranches: season === 'winter' && isFullyGrown, snow: season === 'winter', goldenFruit: isFullyGrown }; }
export function qualifiesForTreeWeek(activity: { valid: boolean; miles: number; durationSec: number }): boolean { return activity.valid && Number.isFinite(activity.miles) && activity.miles >= 0.1 && Number.isFinite(activity.durationSec) && activity.durationSec >= 60; }
