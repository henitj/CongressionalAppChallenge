/**
 * Pure date helpers for streaks and weekly challenges.
 *
 * Everything works in the device's LOCAL calendar, never UTC — a streak has to
 * flip at the user's midnight, not London's. Kept react-native free so it can
 * be tested in plain Node.
 */

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(d: Date | number = new Date()): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Whole days from `a` to `b`. Uses Date.UTC on the parsed components so
 * daylight-saving transitions cannot produce 6.958 days for a week.
 */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

/** ISO-style Monday-based week id, e.g. "2026-W34". */
export function weekKey(d: Date = new Date()): string {
  // Convert local calendar components to UTC for DST-independent ISO arithmetic.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Monday 00:00 of the week containing `d`. */
export function weekStart(d: Date = new Date()): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

/** Next Monday 00:00 — when the weekly challenge set expires. */
export function weekEnd(d: Date = new Date()): Date {
  const s = weekStart(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7);
}
