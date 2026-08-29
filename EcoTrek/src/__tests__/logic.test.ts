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
import {
  activeDaysInLast,
  bonusForStreak,
  computeStreak as computeStreakSvc,
  DayMap,
  daysToNextBonus,
  hasComeback,
  longestRun,
  monthGrid,
  nextMilestone,
  perfectWeeks,
  streakRuns,
} from '../services/streaks';
import { answerQuestion, AssistantContext, resolveTrail } from '../services/assistant';
import {
  rarityLabel,
  SPECIES,
  SPECIES_BY_ID,
  speciesForTrail,
  TOTAL_ANIMALS,
  TOTAL_PLANTS,
  TOTAL_SPECIES,
  trailsForSpecies,
} from '../constants/species';
import { computeRecords, RecordActivity } from '../services/records';
import { buildRecap, lastWeekStart, RecapActivity } from '../services/recap';
import { buildVerdict, buildShortNote, LEVEL_META, Advisory, SafetyLevel } from '../services/weather';
import { paletteFor, skyPhaseForHour } from '../constants/theme';

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

/* ── Streak service ───────────────────────────────────────────────────────── */

const dayRec = (activities = 0) => ({ opened: true, activities, miles: activities, trees: 0 });

function buildDays(spec: Record<string, number>): DayMap {
  const out: DayMap = {};
  for (const [k, v] of Object.entries(spec)) out[k] = dayRec(v);
  return out;
}

test('streakRuns finds every unbroken run', () => {
  const days = buildDays({
    '2026-08-01': 0, '2026-08-02': 0,
    '2026-08-05': 0, '2026-08-06': 0, '2026-08-07': 0,
  });
  const runs = streakRuns(days);
  assert.equal(runs.length, 2);
  assert.equal(runs[0].length, 2);
  assert.equal(runs[1].length, 3);
});

test('longestRun reports the best run ever, not the current one', () => {
  const days = buildDays({
    '2026-07-01': 0, '2026-07-02': 0, '2026-07-03': 0, '2026-07-04': 0,
    '2026-08-10': 0,
  });
  assert.equal(longestRun(days), 4);
});

test('activeDaysInLast only counts days with an activity', () => {
  const today = '2026-08-16';
  const days = buildDays({
    [today]: 1,
    [addDays(today, -1)]: 0, // opened but no activity
    [addDays(today, -2)]: 3,
    [addDays(today, -40)]: 5, // outside the window
  });
  assert.equal(activeDaysInLast(days, 30, today), 2);
});

test('perfectWeeks needs an activity on all seven days', () => {
  // Mon 10 Aug 2026 through Sun 16 Aug
  const full: Record<string, number> = {};
  for (let i = 0; i < 7; i++) full[addDays('2026-08-10', i)] = 1;
  assert.equal(perfectWeeks(buildDays(full)), 1);

  delete full['2026-08-13'];
  assert.equal(perfectWeeks(buildDays(full)), 0, 'six of seven is not a perfect week');
});

test('hasComeback needs a lost 7-day streak and a new 3-day one', () => {
  const long: Record<string, number> = {};
  for (let i = 0; i < 8; i++) long[addDays('2026-06-01', i)] = 1;

  assert.equal(hasComeback(buildDays(long)), false, 'no comeback without a restart');

  const withRestart = { ...long };
  for (let i = 0; i < 3; i++) withRestart[addDays('2026-07-01', i)] = 1;
  assert.equal(hasComeback(buildDays(withRestart)), true);
});

test('daysToNextBonus counts down to the next multiple of seven', () => {
  assert.equal(daysToNextBonus(0), 7);
  assert.equal(daysToNextBonus(1), 6);
  assert.equal(daysToNextBonus(6), 1);
  assert.equal(daysToNextBonus(7), 7, 'just paid, so a full week to the next');
  assert.equal(daysToNextBonus(10), 4);
});

test('streak bonuses grow with the streak', () => {
  assert.equal(bonusForStreak(7), 10);
  assert.equal(bonusForStreak(14), 20);
  assert.equal(bonusForStreak(70), 100);
});

test('nextMilestone always points forward', () => {
  assert.equal(nextMilestone(0)?.days, 3);
  assert.equal(nextMilestone(7)?.days, 14);
  assert.equal(nextMilestone(400), null);
});

test('monthGrid pads to whole weeks', () => {
  const cells = monthGrid(2026, 7, {}); // August 2026
  assert.equal(cells.length % 7, 0);
  assert.equal(cells.filter((c) => c.day !== null).length, 31);
});

test('service and inline streak maths agree', () => {
  const today = '2026-08-16';
  const days = buildDays({ [today]: 1, [addDays(today, -1)]: 1 });
  assert.equal(computeStreakSvc(days, today), 2);
});

/* ── Assistant ────────────────────────────────────────────────────────────── */

const ctx: AssistantContext = {
  trails: AUSTIN_TRAILS,
  weather: null,
  completedTrailIds: new Set<string>(),
  userCoords: null,
  focus: null,
  units: 'imperial',
};

test('resolves a trail from its nickname', () => {
  assert.equal(resolveTrail('how long is the greenbelt', AUSTIN_TRAILS)?.id, 'barton-creek');
  assert.equal(resolveTrail('is the stairmaster hard', AUSTIN_TRAILS)?.id, 'river-place');
  assert.equal(resolveTrail('parking at mount bonnell', AUSTIN_TRAILS)?.id, 'mount-bonnell');
});

test('resolves a trail from its real name', () => {
  assert.equal(
    resolveTrail('tell me about the Barton Creek Greenbelt', AUSTIN_TRAILS)?.id,
    'barton-creek'
  );
});

test('does not invent a trail from an unrelated question', () => {
  assert.equal(resolveTrail('what is the weather like', AUSTIN_TRAILS), null);
});

test('carries the subject across a follow-up question', () => {
  const barton = AUSTIN_TRAILS.find((t) => t.id === 'barton-creek')!;
  const answer = answerQuestion('are dogs allowed there', { ...ctx, focus: barton });
  assert.equal(answer.trail?.id, 'barton-creek');
  assert.match(answer.text, /Barton Creek/);
});

test('answers a distance question with the real number', () => {
  const a = answerQuestion('how long is the greenbelt', ctx);
  assert.match(a.text, /7\.9 mi/);
});

test('answers dog questions correctly per trail', () => {
  const yes = answerQuestion('can I bring my dog to turkey creek', ctx);
  assert.match(yes.text, /^Yes/);

  const no = answerQuestion('dogs on slaughter creek', ctx);
  assert.match(no.text, /^No/);
});

test('recommendation respects hard constraints', () => {
  const a = answerQuestion('easy trail where I can bring my dog', ctx);
  assert.ok(a.results.length > 0, 'should return options');
  for (const t of a.results) {
    assert.equal(t.petFriendly, true, `${t.name} must allow dogs`);
    assert.equal(t.difficulty, 'Easy', `${t.name} must be easy`);
  }
});

test('recommendation excludes trails that fail the filter', () => {
  const a = answerQuestion('where can I go mountain biking', ctx);
  for (const t of a.results) {
    assert.notEqual(t.type, 'hike', `${t.name} is hiking only`);
  }
});

test('impossible requests say so instead of guessing', () => {
  const a = answerQuestion('a hard stroller friendly swimming trail under 1 mile', ctx);
  assert.equal(a.results.length, 0);
  assert.match(a.text, /Nothing in the catalogue/);
});

test('assistant answers in the user\'s chosen units', () => {
  const imperial = answerQuestion('how long is the greenbelt', ctx);
  assert.match(imperial.text, /7\.9 mi/);

  const metric = answerQuestion('how long is the greenbelt', { ...ctx, units: 'metric' });
  assert.match(metric.text, /12\.7 km/);
  assert.doesNotMatch(metric.text, /\bmi\b/, 'metric users should never see miles');
});

test('assistant never returns an empty answer', () => {
  const questions = [
    'hi', 'help', 'how far is walnut creek', 'is it shaded', 'where can I swim',
    'restrooms at mckinney falls', 'what animals live on the greenbelt',
    'best trail for kids', 'nearest trail', 'how much climbing on river place',
  ];
  for (const q of questions) {
    const a = answerQuestion(q, ctx);
    assert.ok(a.text.trim().length > 10, `empty answer for: ${q}`);
  }
});

/* ── Species catalogue ────────────────────────────────────────────────────── */

test('catalogue is built from the trail data', () => {
  assert.ok(TOTAL_SPECIES > 50, 'should have a real number of species');
  assert.equal(TOTAL_PLANTS + TOTAL_ANIMALS, TOTAL_SPECIES);
});

test('species ids are unique and resolvable', () => {
  const ids = SPECIES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate ids');
  for (const s of SPECIES) {
    assert.equal(SPECIES_BY_ID.get(s.id)?.name, s.name);
  }
});

test('every species is findable on at least one trail', () => {
  for (const s of SPECIES) {
    assert.ok(s.trailIds.length >= 1, `${s.name} is on no trail`);
    assert.ok(trailsForSpecies(s.id).length >= 1, `${s.name} resolves to no trail`);
  }
});

test('a species listed twice is merged, not duplicated', () => {
  // Ashe Juniper appears on several trails in the catalogue.
  const juniper = SPECIES.find((s) => s.name === 'Ashe Juniper');
  assert.ok(juniper, 'expected Ashe Juniper in the catalogue');
  assert.ok(juniper!.trailIds.length > 1, 'should be merged across trails');
});

test('trail species lists are non-empty and internally consistent', () => {
  for (const trail of AUSTIN_TRAILS) {
    const listed = speciesForTrail(trail.id);
    const expected = (trail.plants?.length ?? 0) + (trail.animals?.length ?? 0);
    assert.equal(listed.length, expected, `${trail.name} species count mismatch`);
  }
});

test('rarity reflects how many trails list it', () => {
  for (const s of SPECIES) {
    const label = rarityLabel(s);
    if (s.trailIds.length === 1) assert.equal(label, 'Rare');
    if (s.trailIds.length >= 4) assert.equal(label, 'Common');
  }
});

/* ── Personal records ─────────────────────────────────────────────────────── */

const fmt = (m: number) => String(Number(m.toFixed(2)));

function act(over: Partial<RecordActivity> = {}): RecordActivity {
  return {
    id: `a-${Math.random()}`,
    type: 'hike',
    startedAt: new Date(2026, 7, 10, 9).getTime(),
    miles: 3,
    durationSec: 3600,
    trees: 3,
    valid: true,
    ...over,
  };
}

test('no activities means no records', () => {
  assert.deepEqual(computeRecords([], fmt, 'mi'), []);
});

test('records pick the right activity', () => {
  const short = act({ id: 'short', miles: 2, durationSec: 1800 });
  const long = act({ id: 'long', miles: 9, durationSec: 10800 });
  const records = computeRecords([short, long], fmt, 'mi');

  const longest = records.find((r) => r.id === 'longest_distance');
  assert.equal(longest?.activityId, 'long');
  assert.equal(longest?.value, '9');
});

test('invalid activities can never set a record', () => {
  const real = act({ id: 'real', miles: 4 });
  const cheated = act({ id: 'cheated', miles: 500, valid: false });
  const records = computeRecords([real, cheated], fmt, 'mi');

  const longest = records.find((r) => r.id === 'longest_distance');
  assert.equal(longest?.activityId, 'real', 'a flagged activity must not hold a record');
});

test('pace records ignore anything under a mile', () => {
  // A 0.2 mi sprint would otherwise post an unbeatable pace.
  const sprint = act({ id: 'sprint', miles: 0.2, durationSec: 60 });
  const real = act({ id: 'real', miles: 3, durationSec: 1800 });
  const records = computeRecords([sprint, real], fmt, 'mi');

  const pace = records.find((r) => r.id === 'fastest_pace');
  assert.equal(pace?.activityId, 'real');
});

test('biggest day sums every activity on that day', () => {
  const morning = act({ startedAt: new Date(2026, 7, 12, 7).getTime(), miles: 3 });
  const evening = act({ startedAt: new Date(2026, 7, 12, 19).getTime(), miles: 4 });
  const other = act({ startedAt: new Date(2026, 7, 14, 9).getTime(), miles: 5 });
  const records = computeRecords([morning, evening, other], fmt, 'mi');

  assert.equal(records.find((r) => r.id === 'biggest_day')?.raw, 7);
});

test('records use the caller\'s unit formatter', () => {
  const km = (m: number) => String(Number((m * 1.60934).toFixed(1)));
  const records = computeRecords([act({ miles: 10 })], km, 'km');
  assert.equal(records.find((r) => r.id === 'longest_distance')?.value, '16.1');
});

/* ── Weekly recap ─────────────────────────────────────────────────────────── */

const MON = new Date(2026, 7, 10).getTime(); // Monday 10 Aug 2026
const DAY = 86400000;

function ract(dayOffset: number, over: Partial<RecapActivity> = {}): RecapActivity {
  return {
    startedAt: MON + dayOffset * DAY + 9 * 3600000,
    miles: 2,
    trees: 2,
    valid: true,
    ...over,
  };
}

test('recap only counts the week it covers', () => {
  const recap = buildRecap({
    activities: [ract(0), ract(3), ract(-4), ract(9)],
    points: [],
    activeDays: {},
    challengesCompleted: 0,
    sightings: 0,
    cleanups: 0,
    weekStartMs: MON,
  });
  assert.equal(recap.activities, 2, 'activities outside the window must be excluded');
  assert.equal(recap.miles, 4);
});

test('recap compares against the previous week', () => {
  const recap = buildRecap({
    activities: [ract(0, { miles: 10 }), ract(-6, { miles: 5 })],
    points: [],
    activeDays: {},
    challengesCompleted: 0,
    sightings: 0,
    cleanups: 0,
    weekStartMs: MON,
  });
  const distance = recap.metrics.find((m) => m.label === 'Distance')!;
  assert.equal(distance.value, 10);
  assert.equal(distance.previous, 5);
  assert.equal(distance.changePercent, 100);
});

test('recap reports new rather than a division by zero', () => {
  const recap = buildRecap({
    activities: [ract(1, { miles: 3 })],
    points: [],
    activeDays: {},
    challengesCompleted: 0,
    sightings: 0,
    cleanups: 0,
    weekStartMs: MON,
  });
  assert.equal(recap.metrics.find((m) => m.label === 'Distance')!.changePercent, null);
});

test('recap excludes invalid activities', () => {
  const recap = buildRecap({
    activities: [ract(0, { miles: 100, valid: false }), ract(1, { miles: 2 })],
    points: [],
    activeDays: {},
    challengesCompleted: 0,
    sightings: 0,
    cleanups: 0,
    weekStartMs: MON,
  });
  assert.equal(recap.miles, 2);
});

test('an empty week is flagged and worded kindly', () => {
  const recap = buildRecap({
    activities: [],
    points: [],
    activeDays: {},
    challengesCompleted: 0,
    sightings: 0,
    cleanups: 0,
    weekStartMs: MON,
  });
  assert.equal(recap.empty, true);
  assert.doesNotMatch(recap.headline, /0%|down/i, 'should not scold an empty week');
});

test('seven active days earns the perfect week headline', () => {
  const activeDays: Record<string, boolean> = {};
  for (let i = 0; i < 7; i++) activeDays[dayKey(MON + i * DAY)] = true;

  const recap = buildRecap({
    activities: [ract(0)],
    points: [],
    activeDays,
    challengesCompleted: 0,
    sightings: 0,
    cleanups: 0,
    weekStartMs: MON,
  });
  assert.equal(recap.activeDays, 7);
  assert.match(recap.headline, /perfect week/i);
});

test('lastWeekStart lands on the Monday before this one', () => {
  const start = lastWeekStart(new Date(2026, 7, 16)); // Sunday 16 Aug
  assert.equal(start.getDay(), 1, 'must be a Monday');
  assert.equal(dayKey(start), '2026-08-03');
});

/* ── Weather verdict tone ─────────────────────────────────────────────────── */
// We are not a weather app. The verdict must read as calm advice, never as
// an alarm. These guard the tone that got called out in review.

function adv(id: string, level: SafetyLevel): Advisory {
  return { id, level, icon: 'sun', title: id, detail: 'detail' };
}

test('good weather reads as an invitation, not a status code', () => {
  const { headline, summary } = buildVerdict('good', [], 'Partly cloudy', 78);
  assert.match(headline, /nice day/i);
  assert.match(summary, /78°F/);
});

test('a hot day is a nudge toward the morning, not a scolding', () => {
  const advisories = [adv('heat', 'caution')];
  const { headline } = buildVerdict('caution', advisories, 'Sunny', 96);
  assert.match(headline, /you can head out/i);
  const note = buildShortNote('caution', advisories);
  assert.match(note, /morning/i);
  assert.match(note, /water/i);
  assert.doesNotMatch(note, /do not|danger|warning/i);
});

test('warning stays doable and gentle', () => {
  const { headline } = buildVerdict('warning', [adv('heat-high', 'warning')], 'Sunny', 102);
  assert.match(headline, /doable/i);
  assert.doesNotMatch(headline, /danger|stay inside|do not/i);
});

test('danger says stay in without shouting', () => {
  const { headline, summary } = buildVerdict('danger', [adv('storm', 'danger')], 'Thunderstorm', 84);
  assert.match(headline, /stay in/i);
  // It still tells you the actual reason from the top advisory.
  assert.match(summary, /detail/i);
});

test('level labels are friendly, not alarm-level', () => {
  const labels = Object.values(LEVEL_META).map((m) => m.label);
  // The old "Use caution / Poor conditions / Stay inside" trio is gone.
  assert.ok(labels.includes('Good to go'));
  assert.ok(labels.includes('Doable, take it easy'));
  assert.ok(labels.includes('Stay in today'));
  assert.ok(!labels.some((l) => /poor conditions|use caution/i.test(l)));
});

/* ── Report ───────────────────────────────────────────────────────────────── */

console.log('\nEcoTrek logic tests\n');
console.log(results.join('\n'));
console.log(
  `\n${passed}/${passed + results.filter((r) => r.includes('FAIL')).length} passed\n`
);
