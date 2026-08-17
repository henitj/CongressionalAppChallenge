import { dayKey, weekStart } from './dates';

/**
 * Weekly recap.
 *
 * Summarises the week that just ended and compares it with the one before, so
 * the numbers mean something. "12 miles" is a fact; "12 miles, up from 7" is a
 * story.
 *
 * Pure and unit tested — the recap has to be right, because it is the thing
 * that lands in a notification on a Sunday evening.
 */

export type RecapActivity = {
  startedAt: number;
  miles: number;
  trees: number;
  valid: boolean;
  trailCompleted?: boolean;
};

export type RecapPointEvent = {
  timestamp: number;
  points: number;
};

export type RecapInput = {
  activities: RecapActivity[];
  points: RecapPointEvent[];
  /** day key -> whether an activity was logged that day */
  activeDays: Record<string, boolean>;
  challengesCompleted: number;
  sightings: number;
  cleanups: number;
  /** Monday of the week being summarised. Defaults to last week. */
  weekStartMs?: number;
};

export type RecapMetric = {
  label: string;
  value: number;
  previous: number;
  /** Percent change, or null when there is no previous figure to compare. */
  changePercent: number | null;
};

export type WeeklyRecap = {
  weekStart: number;
  weekEnd: number;
  /** "11 – 17 August" */
  rangeLabel: string;
  miles: number;
  activities: number;
  trees: number;
  points: number;
  activeDays: number;
  trailsCompleted: number;
  challengesCompleted: number;
  sightings: number;
  cleanups: number;
  metrics: RecapMetric[];
  /** One line worth reading. Never generic filler. */
  headline: string;
  /** True when there is genuinely nothing to report. */
  empty: boolean;
};

const WEEK_MS = 7 * 86400000;

function sumWindow(
  activities: RecapActivity[],
  from: number,
  to: number
): { miles: number; trees: number; count: number; trails: number } {
  let miles = 0;
  let trees = 0;
  let count = 0;
  let trails = 0;
  for (const a of activities) {
    if (!a.valid || a.startedAt < from || a.startedAt >= to) continue;
    miles += a.miles;
    trees += a.trees;
    count += 1;
    if (a.trailCompleted) trails += 1;
  }
  return { miles: Math.round(miles * 100) / 100, trees, count, trails };
}

function change(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString(undefined, {
    day: 'numeric',
    ...(sameMonth ? {} : { month: 'long' }),
  });
  const endLabel = end.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  return `${startLabel} – ${endLabel}`;
}

/** Monday of the week before the one containing `now`. */
export function lastWeekStart(now: Date = new Date()): Date {
  const thisMonday = weekStart(now);
  return new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7);
}

export function buildRecap(input: RecapInput): WeeklyRecap {
  const start = input.weekStartMs ?? lastWeekStart().getTime();
  const end = start + WEEK_MS;
  const prevStart = start - WEEK_MS;

  const now = sumWindow(input.activities, start, end);
  const prev = sumWindow(input.activities, prevStart, start);

  const points = input.points.reduce(
    (sum, e) => (e.timestamp >= start && e.timestamp < end ? sum + e.points : sum),
    0
  );
  const prevPoints = input.points.reduce(
    (sum, e) => (e.timestamp >= prevStart && e.timestamp < start ? sum + e.points : sum),
    0
  );

  let activeDays = 0;
  for (let i = 0; i < 7; i++) {
    if (input.activeDays[dayKey(start + i * 86400000)]) activeDays++;
  }
  let prevActiveDays = 0;
  for (let i = 0; i < 7; i++) {
    if (input.activeDays[dayKey(prevStart + i * 86400000)]) prevActiveDays++;
  }

  const metrics: RecapMetric[] = [
    { label: 'Distance', value: now.miles, previous: prev.miles, changePercent: change(now.miles, prev.miles) },
    { label: 'Activities', value: now.count, previous: prev.count, changePercent: change(now.count, prev.count) },
    { label: 'Trees', value: now.trees, previous: prev.trees, changePercent: change(now.trees, prev.trees) },
    { label: 'Points', value: points, previous: prevPoints, changePercent: change(points, prevPoints) },
    {
      label: 'Days out',
      value: activeDays,
      previous: prevActiveDays,
      changePercent: change(activeDays, prevActiveDays),
    },
  ];

  const empty = now.count === 0 && points === 0 && input.sightings === 0 && input.cleanups === 0;

  return {
    weekStart: start,
    weekEnd: end,
    rangeLabel: formatRange(new Date(start), new Date(end - 86400000)),
    miles: now.miles,
    activities: now.count,
    trees: now.trees,
    points,
    activeDays,
    trailsCompleted: now.trails,
    challengesCompleted: input.challengesCompleted,
    sightings: input.sightings,
    cleanups: input.cleanups,
    metrics,
    headline: buildHeadline({
      empty,
      miles: now.miles,
      prevMiles: prev.miles,
      activeDays,
      trails: now.trails,
      challenges: input.challengesCompleted,
      sightings: input.sightings,
    }),
    empty,
  };
}

/**
 * Picks the single most interesting thing that happened, in priority order.
 * A recap that says "you did 0 miles, down 100%" every week gets ignored, so
 * the empty case is written to be encouraging rather than accusing.
 */
function buildHeadline(x: {
  empty: boolean;
  miles: number;
  prevMiles: number;
  activeDays: number;
  trails: number;
  challenges: number;
  sightings: number;
}): string {
  if (x.empty) return 'A quiet week. The trails will still be there.';

  if (x.activeDays === 7) return 'Seven days out of seven. A perfect week.';
  if (x.prevMiles > 0 && x.miles > x.prevMiles * 1.5) {
    return `Your biggest jump yet — ${Math.round((x.miles / x.prevMiles - 1) * 100)}% more distance than last week.`;
  }
  if (x.trails > 0) {
    return `You finished ${x.trails} full trail${x.trails === 1 ? '' : 's'} this week.`;
  }
  if (x.challenges >= 5) return 'You cleared every challenge on the board.';
  if (x.sightings >= 5) return `You logged ${x.sightings} species. Good eyes.`;
  if (x.activeDays >= 4) return `Out on ${x.activeDays} separate days. That is the habit forming.`;
  if (x.miles > 0) return `${x.miles} miles under your own power.`;
  return 'Small week, but you showed up.';
}
