import { dayKey, weekKey } from './dates';

/**
 * Personal records.
 *
 * Everything here is derived from the activity history on demand — no records
 * are stored, so they can never drift out of sync with the activities that
 * produced them. Deleting an activity correctly retracts any record it held.
 *
 * Only valid activities count. A flagged one cannot set a record.
 */

export type RecordActivity = {
  id: string;
  type: 'hike' | 'bike';
  startedAt: number;
  miles: number;
  durationSec: number;
  trees: number;
  valid: boolean;
};

export type PersonalRecord = {
  id: string;
  label: string;
  /** Formatted for display, e.g. "8.2" or "1h 46m". */
  value: string;
  /** Unit shown after the value, if any. Distances are left to the caller. */
  unit?: string;
  detail: string;
  /** Activity that set it, when a single one did. */
  activityId?: string;
  /** Raw number, for callers that want to format it themselves. */
  raw: number;
};

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatPace(minutesPerMile: number): string {
  const m = Math.floor(minutesPerMile);
  const s = Math.round((minutesPerMile - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * @param activities full history, any order
 * @param formatMiles caller's unit formatter, so records respect the
 *   imperial/metric setting instead of hardcoding miles
 * @param distanceUnit label for that formatter, e.g. "mi"
 */
export function computeRecords(
  activities: RecordActivity[],
  formatMiles: (m: number) => string,
  distanceUnit: string
): PersonalRecord[] {
  const valid = activities.filter((a) => a.valid);
  if (valid.length === 0) return [];

  const records: PersonalRecord[] = [];

  // ── Longest single activity ────────────────────────────────────────────
  const longest = valid.reduce((best, a) => (a.miles > best.miles ? a : best));
  records.push({
    id: 'longest_distance',
    label: 'Longest activity',
    value: formatMiles(longest.miles),
    unit: distanceUnit,
    detail: `${longest.type === 'bike' ? 'Ride' : 'Hike'} on ${formatDate(longest.startedAt)}`,
    activityId: longest.id,
    raw: longest.miles,
  });

  // ── Longest time out ───────────────────────────────────────────────────
  const longestTime = valid.reduce((best, a) => (a.durationSec > best.durationSec ? a : best));
  records.push({
    id: 'longest_duration',
    label: 'Most time outside',
    value: formatDuration(longestTime.durationSec),
    detail: `In one go, on ${formatDate(longestTime.startedAt)}`,
    activityId: longestTime.id,
    raw: longestTime.durationSec,
  });

  // ── Fastest pace, over a meaningful distance ───────────────────────────
  // Anything under a mile is dominated by GPS noise and a sprint at the end,
  // so it would produce a record nobody could ever beat honestly.
  const paceable = valid.filter((a) => a.miles >= 1 && a.durationSec > 0);
  if (paceable.length) {
    const fastest = paceable.reduce((best, a) =>
      a.durationSec / a.miles < best.durationSec / best.miles ? a : best
    );
    const minutesPerMile = fastest.durationSec / 60 / fastest.miles;
    records.push({
      id: 'fastest_pace',
      label: 'Fastest pace',
      value: formatPace(minutesPerMile),
      unit: `/${distanceUnit}`,
      detail: `Over ${formatMiles(fastest.miles)} ${distanceUnit} on ${formatDate(fastest.startedAt)}`,
      activityId: fastest.id,
      raw: minutesPerMile,
    });
  }

  // ── Biggest day ────────────────────────────────────────────────────────
  const byDay = new Map<string, number>();
  for (const a of valid) {
    const k = dayKey(a.startedAt);
    byDay.set(k, (byDay.get(k) ?? 0) + a.miles);
  }
  const [bestDay, bestDayMiles] = [...byDay.entries()].reduce((best, entry) =>
    entry[1] > best[1] ? entry : best
  );
  records.push({
    id: 'biggest_day',
    label: 'Biggest day',
    value: formatMiles(bestDayMiles),
    unit: distanceUnit,
    detail: formatDate(new Date(bestDay).getTime() + 12 * 3600000),
    raw: bestDayMiles,
  });

  // ── Biggest week ───────────────────────────────────────────────────────
  const byWeek = new Map<string, number>();
  for (const a of valid) {
    const k = weekKey(new Date(a.startedAt));
    byWeek.set(k, (byWeek.get(k) ?? 0) + a.miles);
  }
  const [, bestWeekMiles] = [...byWeek.entries()].reduce((best, entry) =>
    entry[1] > best[1] ? entry : best
  );
  records.push({
    id: 'biggest_week',
    label: 'Biggest week',
    value: formatMiles(bestWeekMiles),
    unit: distanceUnit,
    detail: `Across ${byWeek.size} week${byWeek.size === 1 ? '' : 's'} of tracking`,
    raw: bestWeekMiles,
  });

  // ── Most trees from one activity ───────────────────────────────────────
  const treeLeader = valid.reduce((best, a) => (a.trees > best.trees ? a : best));
  if (treeLeader.trees > 0) {
    records.push({
      id: 'most_trees',
      label: 'Most trees at once',
      value: String(treeLeader.trees),
      unit: treeLeader.trees === 1 ? 'tree' : 'trees',
      detail: `From one ${treeLeader.type === 'bike' ? 'ride' : 'hike'} on ${formatDate(treeLeader.startedAt)}`,
      activityId: treeLeader.id,
      raw: treeLeader.trees,
    });
  }

  // ── Earliest start, because dawn starts deserve credit in Texas ────────
  const earliest = valid.reduce((best, a) => {
    const hour = new Date(a.startedAt).getHours() + new Date(a.startedAt).getMinutes() / 60;
    const bestHour = new Date(best.startedAt).getHours() + new Date(best.startedAt).getMinutes() / 60;
    return hour < bestHour ? a : best;
  });
  records.push({
    id: 'earliest_start',
    label: 'Earliest start',
    value: new Date(earliest.startedAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }),
    detail: `Beating the heat on ${formatDate(earliest.startedAt)}`,
    activityId: earliest.id,
    raw: new Date(earliest.startedAt).getHours(),
  });

  return records;
}
