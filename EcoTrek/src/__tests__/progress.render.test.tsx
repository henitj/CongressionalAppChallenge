import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from '../context/AuthContext';
import { EcoPointsProvider, useEcoPoints } from '../context/EcoPointsContext';
import { StreakProvider, useStreak } from '../context/StreakContext';
import { currentWeeklyStreak, freezeTarget, activeMilestones, weekOffset, WeekMap } from '../services/weeklyStreaks';
import { weekKey } from '../services/dates';
import { keyFor, loadJSON, saveJSON, copyUserData } from '../services/storage';

let streak: ReturnType<typeof useStreak>;
let points: ReturnType<typeof useEcoPoints>;
function Probe() {
  streak = useStreak(); points = useEcoPoints();
  return <Text>ready</Text>;
}
function App() {
  return <AuthProvider><EcoPointsProvider><StreakProvider><Probe /></StreakProvider></EcoPointsProvider></AuthProvider>;
}
beforeEach(async () => { await AsyncStorage.clear(); });
async function boot() {
  const ui = render(<App />);
  await waitFor(() => expect(ui.queryByText('ready')).toBeTruthy());
  return ui;
}
function dateOffset(weeks: number) {
  const d = new Date(); d.setDate(d.getDate() - weeks * 7); return d.getTime();
}
function weeksAt(offsets: number[], now: Date): WeekMap {
  return Object.fromEntries(offsets.map((offset) => {
    const key = weekOffset(offset, now);
    return [key, { weekKey: key, active: true, activities: 1, miles: 2, frozen: false }];
  }));
}

describe('weekly streak regressions', () => {
  it('handles ISO year boundaries and an unfinished current week', () => {
    const now = new Date(2027, 0, 4);
    expect(weekKey(new Date(2027, 0, 1))).toBe('2026-W53');
    expect(weekKey(now)).toBe('2027-W01');
    expect(currentWeeklyStreak(weeksAt([1, 2, 3], now), now)).toBe(3);
    expect(currentWeeklyStreak(weeksAt([0, 2, 3], now), now)).toBe(1);
    expect(currentWeeklyStreak(weeksAt([2, 3], now), now)).toBe(0);
  });
  it('never freezes an active week, an already frozen week, or pre-account history', () => {
    const now = new Date(2026, 8, 19);
    expect(freezeTarget({}, now)).toBeNull();
    expect(freezeTarget(weeksAt([0, 1, 2], now), now)).toBeNull();
    const weeks = weeksAt([0, 2, 3], now);
    const target = freezeTarget(weeks, now)!;
    expect(target).toBe(weekOffset(1, now));
    weeks[target] = { weekKey: target, active: false, frozen: true, activities: 0, miles: 0 };
    expect(freezeTarget(weeks, now)).toBeNull();
    expect(currentWeeklyStreak(weeks, now)).toBe(4);
    expect(activeMilestones(weeks)).toEqual([]);
  });
  it('earns freezes again after a broken streak, never twice for the same milestone', async () => {
    await boot();
    await act(async () => {
      for (const offset of [9, 8, 7, 6, 3, 2, 1, 0])
        await streak.recordActivity(1, 1, dateOffset(offset), `walk-${offset}`);
    });
    expect(streak.availableFreezes).toBe(2);
    expect(streak.currentStreak).toBe(4);
    const before = points.totalPoints;
    await act(async () => { await streak.recordActivity(1, 1, dateOffset(0), 'walk-0'); });
    expect(streak.availableFreezes).toBe(2);
    expect(points.totalPoints).toBe(before);
    expect(streak.weeks[weekKey()].activities).toBe(1);
  });
  it('protects last week once and restores the saved streak on remount', async () => {
    const ui = await boot();
    await act(async () => {
      for (const offset of [5, 4, 3, 2]) await streak.recordActivity(2, 2, dateOffset(offset), `walk-${offset}`);
    });
    expect(streak.availableFreezes).toBe(1);
    expect(streak.currentStreak).toBe(0);
    let results: unknown[] = [];
    await act(async () => { results = await Promise.all([streak.useFreeze(), streak.useFreeze()]); });
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(streak.currentStreak).toBe(5);
    expect(streak.availableFreezes).toBe(0);
    ui.unmount();
    await boot();
    expect(streak.currentStreak).toBe(5);
    expect(streak.availableFreezes).toBe(0);
    expect(Object.keys(streak.days).every((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))).toBe(true);
  });
  it('caps stored freezes at four', async () => {
    await boot();
    await act(async () => {
      for (let offset = 23; offset >= 0; offset--) await streak.recordActivity(1, 1, dateOffset(offset), `a-${offset}`);
    });
    expect(streak.availableFreezes).toBe(4);
  });
});

describe('badge rewards and persistence', () => {
  it('credits a badge exactly once under concurrent taps and after restart', async () => {
    await saveJSON(keyFor(null, 'badges'), [{ id: 'first_hike', unlocked: true }]);
    const ui = await boot();
    let awards: number[] = [];
    await act(async () => { awards = await Promise.all([points.claimBadge('first_hike'), points.claimBadge('first_hike')]); });
    expect(awards.sort()).toEqual([0, 20]);
    expect(points.totalPoints).toBe(20);
    ui.unmount();
    await boot();
    await act(async () => { expect(await points.claimBadge('first_hike')).toBe(0); });
    expect(points.totalPoints).toBe(20);
  });
  it('hides club badges even when they were previously earned', async () => {
    await saveJSON(keyFor(null, 'badges'), [{ id: 'club_member', unlocked: true }]);
    await boot();
    expect(points.badges.some((b) => b.id === 'club_member')).toBe(false);
    expect(points.newBadges.some((b) => b.id === 'club_member')).toBe(false);
  });
  it('serializes rapid saves, isolates accounts and copies all profile/log fields', async () => {
    const key = keyFor('guest', 'user_profile');
    await Promise.all([saveJSON(key, { age: 21 }), saveJSON(key, { age: 22, heightInches: 65, weightPounds: 140, stepLengthInches: 26 })]);
    await saveJSON(keyFor('guest', 'activities'), [{ id: 'ride', type: 'bike', miles: 3 }]);
    await copyUserData('guest', 'google-user');
    expect(await loadJSON(keyFor('google-user', 'user_profile'), {})).toEqual({ age: 22, heightInches: 65, weightPounds: 140, stepLengthInches: 26 });
    expect(await loadJSON(keyFor('google-user', 'activities'), [])).toHaveLength(1);
    expect(await loadJSON(keyFor('another-user', 'activities'), [])).toEqual([]);
  });
});

describe('guest upgrades into an existing account', () => {
  it('merges walks and rides without duplicates and preserves existing profile choices', async () => {
    await saveJSON(keyFor('guest', 'activities'), [{ id: 'walk', startedAt: 100 }, { id: 'ride', startedAt: 200 }]);
    await saveJSON(keyFor('google', 'activities'), [{ id: 'old', startedAt: 50 }]);
    await saveJSON(keyFor('guest', 'user_profile'), { firstName: 'Guest', age: 44, heightInches: 68 });
    await saveJSON(keyFor('google', 'user_profile'), { firstName: 'Alex', age: 0 });
    await copyUserData('guest', 'google');
    await copyUserData('guest', 'google');
    const activities = await loadJSON<any[]>(keyFor('google', 'activities'), []);
    expect(activities.map((a) => a.id)).toEqual(['ride', 'walk', 'old']);
    expect(await loadJSON(keyFor('google', 'user_profile'), {})).toMatchObject({ firstName: 'Alex', age: 44, heightInches: 68 });
    expect(await loadJSON(keyFor('guest', 'activities'), [])).toHaveLength(2);
  });
});
