import { addDays, dayKey } from './dates';

/**
 * Streak maths.
 *
 * Kept free of react-native imports so every rule here is unit tested in
 * plain Node. Streaks are the one feature where an off-by-one is immediately
 * visible to the user, so none of this lives inline in a component.
 */

export type DayRecord = {
  opened: boolean;
  activities: number;
  miles: number;
  trees: number;
};

export type DayMap = Record<string, DayRecord>;

/** Consecutive checked-in days ending today (or yesterday, if today is not in yet). */
export function computeStreak(days: DayMap, today = dayKey()): number {
  let cursor = days[today]?.opened ? today : addDays(today, -1);
  if (!days[cursor]?.opened) return 0;

  let streak = 0;
  while (days[cursor]?.opened) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Every unbroken run of checked-in days, oldest first. */
export function streakRuns(days: DayMap): { start: string; end: string; length: number }[] {
  const keys = Object.keys(days)
    .filter((k) => days[k]?.opened)
    .sort();
  if (!keys.length) return [];

  const runs: { start: string; end: string; length: number }[] = [];
  let start = keys[0];
  let prev = keys[0];
  let length = 1;

  for (let i = 1; i < keys.length; i++) {
    if (keys[i] === addDays(prev, 1)) {
      length++;
    } else {
      runs.push({ start, end: prev, length });
      start = keys[i];
      length = 1;
    }
    prev = keys[i];
  }
  runs.push({ start, end: prev, length });
  return runs;
}

export function longestRun(days: DayMap): number {
  return streakRuns(days).reduce((max, r) => Math.max(max, r.length), 0);
}

/** Days in the last `n` days where an activity was actually logged. */
export function activeDaysInLast(days: DayMap, n: number, today = dayKey()): number {
  let count = 0;
  for (let i = 0; i < n; i++) {
    if ((days[addDays(today, -i)]?.activities ?? 0) > 0) count++;
  }
  return count;
}

/**
 * Weeks where an activity was logged on all seven days.
 * Counts Monday-start weeks, matching the challenge reset.
 */
export function perfectWeeks(days: DayMap): number {
  const active = Object.keys(days)
    .filter((k) => (days[k]?.activities ?? 0) > 0)
    .sort();
  if (active.length < 7) return 0;

  let count = 0;
  const seen = new Set<string>();

  for (const key of active) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const monday = addDays(key, -((date.getDay() + 6) % 7));
    if (seen.has(monday)) continue;
    seen.add(monday);

    let all = true;
    for (let i = 0; i < 7; i++) {
      if ((days[addDays(monday, i)]?.activities ?? 0) === 0) {
        all = false;
        break;
      }
    }
    if (all) count++;
  }
  return count;
}

/**
 * True once the user has lost a streak of 7+ days and built a new one of 3+
 * afterwards. Restarting is harder than starting, so it gets its own badge.
 */
export function hasComeback(days: DayMap): boolean {
  const runs = streakRuns(days);
  for (let i = 0; i < runs.length - 1; i++) {
    if (runs[i].length >= 7 && runs.slice(i + 1).some((r) => r.length >= 3)) return true;
  }
  return false;
}

/** Days until the next seven-day bonus. */
export function daysToNextBonus(streak: number): number {
  if (streak <= 0) return 7;
  const into = streak % 7;
  return into === 0 ? 7 : 7 - into;
}

/** Bonus points paid when a streak reaches a multiple of seven. */
export function bonusForStreak(streak: number): number {
  return 10 * Math.floor(streak / 7);
}


export type Milestone = { days: number; name: string; badgeId: string };

export const STREAK_MILESTONES: Milestone[] = [
  { days: 3, name: 'Warming Up', badgeId: 'streak_3' },
  { days: 7, name: 'Seven Straight', badgeId: 'streak_7' },
  { days: 14, name: 'Two Weeks Deep', badgeId: 'streak_14' },
  { days: 30, name: 'Unbroken', badgeId: 'streak_30' },
  { days: 60, name: 'Two Month Machine', badgeId: 'streak_60' },
  { days: 100, name: 'Triple Digits', badgeId: 'streak_100' },
  { days: 365, name: 'Year of Trails', badgeId: 'streak_365' },
];

export function nextMilestone(streak: number): Milestone | null {
  return STREAK_MILESTONES.find((m) => m.days > streak) ?? null;
}

/** Calendar grid for a given month, padded to whole weeks (Sunday start). */
export function monthGrid(
  year: number,
  month: number,
  days: DayMap
): { day: string | null; record: DayRecord | null }[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay(); // 0 = Sunday

  const cells: { day: string | null; record: DayRecord | null }[] = [];
  for (let i = 0; i < lead; i++) cells.push({ day: null, record: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dayKey(new Date(year, month, d));
    cells.push({ day: key, record: days[key] ?? null });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, record: null });
  return cells;
}
