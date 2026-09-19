import { weekKey, weekStart } from './dates';

export type WeekRecord = { weekKey: string; active: boolean; activities: number; miles: number; frozen: boolean };
export type StreakFreeze = { earnedAt: number; usedAt: number | null; usedForWeek: string | null };
export type WeekMap = Record<string, WeekRecord>;

export function weekOffset(offset: number, now = new Date()): string {
  const d = weekStart(now);
  d.setDate(d.getDate() - offset * 7);
  return weekKey(d);
}

export function currentWeeklyStreak(weeks: WeekMap, now = new Date()): number {
  let count = 0;
  for (let i = 0; i < 5200; i++) {
    const w = weeks[weekOffset(i, now)];
    if (w?.active || w?.frozen) count++;
    else if (i !== 0) break; // This week is still in progress.
  }
  return count;
}

/** Only last week can be repaired, and only if it bridges an existing streak. */
export function freezeTarget(weeks: WeekMap, now = new Date()): string | null {
  const key = weekOffset(1, now);
  const last = weeks[key];
  const before = weeks[weekOffset(2, now)];
  return !last?.active && !last?.frozen && (before?.active || before?.frozen) ? key : null;
}

function weekDate(key: string): Date {
  const [year, week] = key.split('-W').map(Number);
  const first = weekStart(new Date(year, 0, 4));
  first.setDate(first.getDate() + (week - 1) * 7);
  return first;
}

/** Stable milestone IDs, including after a broken streak. Frozen weeks don't earn freezes. */
export function activeMilestones(weeks: WeekMap): string[] {
  const milestones: string[] = [];
  let run = 0;
  let previous: string | null = null;
  for (const key of Object.keys(weeks).sort()) {
    const w = weeks[key];
    if (!w.active) { run = 0; previous = null; continue; }
    run = previous === weekOffset(1, weekDate(key)) ? run + 1 : 1;
    if (run % 4 === 0) milestones.push(key);
    previous = key;
  }
  return milestones;
}

export function longestWeeklyStreak(weeks: WeekMap): number {
  let best = 0, run = 0;
  let previous: string | null = null;
  for (const key of Object.keys(weeks).sort()) {
    if (!weeks[key].active && !weeks[key].frozen) { run = 0; previous = null; continue; }
    run = previous === weekOffset(1, weekDate(key)) ? run + 1 : 1;
    best = Math.max(best, run);
    previous = key;
  }
  return best;
}
