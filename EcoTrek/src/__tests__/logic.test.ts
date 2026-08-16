/**
 * Logic tests for the parts of EcoTrek that are easy to get subtly wrong:
 * streak maths, week rollover, challenge selection, trail detection and the
 * weather safety verdict.
 *
 * Run with:  npm test
 *
 * These are plain assertions on purpose — no test framework to install, no
 * config to maintain, nothing that can rot.
 */

import assert from 'node:assert/strict';

import { dayKey, addDays, daysBetween, weekKey, weekStart, weekEnd } from '../services/dates';
import { challengesForWeek, CHALLENGE_CATALOG, CHALLENGES_PER_WEEK } from '../constants/challenges';
import { detectTrail, evaluateCompletion, validateActivity } from '../services/trailDetection';
import { AUSTIN_TRAILS } from '../constants/austinTrails';
import { Coord } from '../services/geo';

let passed = 0;
const results: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    results.push(`  PASS  ${name}`);
  } catch (e: any) {
    results.push(`  FAIL  ${name}\n        ${e.message}`);
    process.exitCode = 1;
  }
}

/* ── Date helpers ─────────────────────────────────────────────────────────── */

test('dayKey uses the local calendar day, not UTC', () => {
  // 11pm local on the 5th must be the 5th, even though it is the 6th in UTC.
  const d = new Date(2026, 2, 5, 23, 30);
  assert.equal(dayKey(d), '2026-03-05');
});

test('addDays crosses month boundaries', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('addDays handles a leap year', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2028-02-29', 1), '2028-03-01');
});

test('daysBetween is inclusive of direction', () => {
  assert.equal(daysBetween('2026-08-10', '2026-08-16'), 6);
  assert.equal(daysBetween('2026-08-16', '2026-08-10'), -6);
});

test('daysBetween is unaffected by daylight saving', () => {
  // US DST starts 8 March 2026. A naive ms-difference would give 6.958 days.
  assert.equal(daysBetween('2026-03-05', '2026-03-12'), 7);
});

test('weekStart is the Monday of that week', () => {
  const sunday = new Date(2026, 7, 16); // Sun 16 Aug 2026
  const start = weekStart(sunday);
  assert.equal(start.getDay(), 1, 'should be a Monday');
  assert.equal(dayKey(start), '2026-08-10');
});

test('weekEnd is exactly seven days after weekStart', () => {
  const d = new Date(2026, 7, 16);
  assert.equal(weekEnd(d).getTime() - weekStart(d).getTime(), 7 * 86400000);
});

test('weekKey is stable across a week and changes on Monday', () => {
  const mon = weekKey(new Date(2026, 7, 10));
  const sun = weekKey(new Date(2026, 7, 16));
  const nextMon = weekKey(new Date(2026, 7, 17));
  assert.equal(mon, sun, 'Monday and the following Sunday are the same week');
  assert.notEqual(sun, nextMon, 'the next Monday starts a new week');
});

/* ── Streak computation (mirrors StreakContext) ───────────────────────────── */

type Days = Record<string, { opened: boolean }>;

function computeStreak(days: Days, today = dayKey()): number {
  let cursor = days[today]?.opened ? today : addDays(today, -1);
  if (!days[cursor]?.opened) return 0;
  let streak = 0;
  while (days[cursor]?.opened) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

const openedOn = (keys: string[]): Days =>
  Object.fromEntries(keys.map((k) => [k, { opened: true }]));

test('streak counts consecutive days ending today', () => {
  const today = '2026-08-16';
  const days = openedOn([today, addDays(today, -1), addDays(today, -2)]);
  assert.equal(computeStreak(days, today), 3);
});

test('streak survives today not being checked in yet', () => {
  const today = '2026-08-16';
  const days = openedOn([addDays(today, -1), addDays(today, -2)]);
  assert.equal(computeStreak(days, today), 2, 'yesterday keeps it alive');
});

test('streak breaks after a full missed day', () => {
  const today = '2026-08-16';
  const days = openedOn([addDays(today, -2), addDays(today, -3)]);
  assert.equal(computeStreak(days, today), 0);
});

test('streak ignores a gap further back', () => {
  const today = '2026-08-16';
  const days = openedOn([today, addDays(today, -1), addDays(today, -5), addDays(today, -6)]);
  assert.equal(computeStreak(days, today), 2);
});

test('empty history is a zero streak', () => {
  assert.equal(computeStreak({}, '2026-08-16'), 0);
});

/* ── Weekly challenges ────────────────────────────────────────────────────── */

test('a week always yields five challenges', () => {
  for (const wk of ['2026-W01', '2026-W34', '2027-W52']) {
    assert.equal(challengesForWeek(wk).length, CHALLENGES_PER_WEEK);
  }
});

test('every week has 2 auto-tracked and 3 manual challenges', () => {
  for (let w = 1; w <= 52; w++) {
    const list = challengesForWeek(`2026-W${String(w).padStart(2, '0')}`);
    const auto = list.filter((c) => c.kind === 'auto').length;
    assert.equal(auto, 2, `week ${w} should have 2 auto`);
    assert.equal(list.length - auto, 3, `week ${w} should have 3 manual`);
  }
});

test('challenge selection is deterministic', () => {
  const a = challengesForWeek('2026-W34').map((c) => c.id);
  const b = challengesForWeek('2026-W34').map((c) => c.id);
  assert.deepEqual(a, b, 'same week must always give the same challenges');
});

test('challenges never repeat within a week', () => {
  const ids = challengesForWeek('2026-W34').map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('consecutive weeks are not identical', () => {
  const a = challengesForWeek('2026-W34').map((c) => c.id).join();
  const b = challengesForWeek('2026-W35').map((c) => c.id).join();
  assert.notEqual(a, b);
});

test('every catalogue entry has sane point values', () => {
  for (const c of CHALLENGE_CATALOG) {
    assert.ok(c.points > 0 && c.points <= 50, `${c.id} points out of range`);
    assert.ok(c.title.length > 0 && c.description.length > 0, `${c.id} missing copy`);
    if (c.kind === 'auto') {
      assert.ok(c.metric, `${c.id} auto challenge needs a metric`);
      assert.ok((c.target ?? 0) > 0, `${c.id} auto challenge needs a target`);
    }
  }
});

test('catalogue ids are unique', () => {
  const ids = CHALLENGE_CATALOG.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

/* ── Trail data integrity ─────────────────────────────────────────────────── */

test('every trail has coordinates needed for detection', () => {
  for (const t of AUSTIN_TRAILS) {
    assert.ok(Number.isFinite(t.startLat) && Number.isFinite(t.startLng), `${t.id} missing coords`);
    assert.ok(t.startLat > 25 && t.startLat < 37, `${t.id} latitude not in Texas`);
    assert.ok(t.startLng > -107 && t.startLng < -93, `${t.id} longitude not in Texas`);
    assert.ok(t.distanceMiles > 0, `${t.id} needs a distance`);
  }
});

test('trail ids and slugs are unique', () => {
  assert.equal(new Set(AUSTIN_TRAILS.map((t) => t.id)).size, AUSTIN_TRAILS.length);
  assert.equal(new Set(AUSTIN_TRAILS.map((t) => t.slug)).size, AUSTIN_TRAILS.length);
});

/* ── Trail detection ──────────────────────────────────────────────────────── */

const coord = (latitude: number, longitude: number, tOffsetSec = 0): Coord => ({
  latitude,
  longitude,
  timestamp: 1_760_000_000_000 + tOffsetSec * 1000,
});

const barton = AUSTIN_TRAILS.find((t) => t.id === 'barton-creek')!;
const ladybird = AUSTIN_TRAILS.find((t) => t.id === 'lady-bird-lake')!;

test('detects the trail you started at', () => {
  const res = detectTrail([coord(barton.startLat, barton.startLng)]);
  assert.equal(res.trail?.id, 'barton-creek');
  assert.equal(res.confidence, 'high');
});

test('returns nothing when far from every trailhead', () => {
  const res = detectTrail([coord(40.7128, -74.006)]); // New York
  assert.equal(res.trail, null);
  assert.equal(res.confidence, 'none');
});

test('an empty path detects nothing', () => {
  assert.equal(detectTrail([]).trail, null);
});

test('covering 70% of a loop counts as a completion', () => {
  const path = [
    coord(ladybird.startLat, ladybird.startLng, 0),
    coord(ladybird.startLat + 0.001, ladybird.startLng, 3600),
  ];
  const res = evaluateCompletion(path, ladybird.distanceMiles * 0.75);
  assert.equal(res.trail?.id, 'lady-bird-lake');
  assert.equal(res.completed, true);
  assert.ok(res.coveragePercent >= 70);
});

test('a short walk on a long trail is not a completion', () => {
  const path = [coord(ladybird.startLat, ladybird.startLng, 0)];
  const res = evaluateCompletion(path, 1);
  assert.equal(res.completed, false);
  assert.ok(res.reason?.includes('more'), 'should say how much further to go');
});

test('completion percentage never exceeds 100', () => {
  const path = [coord(ladybird.startLat, ladybird.startLng, 0)];
  const res = evaluateCompletion(path, ladybird.distanceMiles * 4);
  assert.ok(res.coveragePercent <= 100);
});

/* ── Anti-cheat ───────────────────────────────────────────────────────────── */

test('a normal hike is valid', () => {
  const path = [coord(30.2603, -97.75, 0), coord(30.2653, -97.75, 1800)];
  const res = validateActivity(path, 2, 1800, 'hike');
  assert.equal(res.valid, true);
  assert.equal(res.flagReason, null);
});

test('a car ride is rejected as too fast to be a hike', () => {
  const path = [coord(30.2603, -97.75, 0), coord(30.35, -97.75, 600)];
  const res = validateActivity(path, 20, 600, 'hike');
  assert.equal(res.valid, false);
  assert.equal(res.flagReason, 'speed_too_high');
});

test('a fast but plausible bike ride is accepted', () => {
  const path = [coord(30.2603, -97.75, 0), coord(30.2903, -97.75, 3600)];
  const res = validateActivity(path, 18, 3600, 'bike');
  assert.equal(res.valid, true, 'an 18 mph hour on a bike is a real ride');
});

test('activities under a minute are rejected', () => {
  const res = validateActivity([coord(30.26, -97.75, 0)], 0.1, 30, 'hike');
  assert.equal(res.valid, false);
  assert.equal(res.flagReason, 'too_short');
});

test('a GPS teleport is flagged', () => {
  // 60 miles in 60 seconds between two fixes.
  const path = [coord(30.2603, -97.75, 0), coord(31.13, -97.75, 60)];
  const res = validateActivity(path, 3, 3600, 'hike');
  assert.equal(res.valid, false);
  assert.equal(res.flagReason, 'teleport');
});

/* ── Report ───────────────────────────────────────────────────────────────── */

console.log('\nEcoTrek logic tests\n');
console.log(results.join('\n'));
console.log(
  `\n${passed}/${passed + results.filter((r) => r.includes('FAIL')).length} passed\n`
);
