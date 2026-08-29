import React from 'react';
import { Text, View } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppProvider } from '../context/AppContext';
import { EcoPointsProvider, useEcoPoints } from '../constants/EcoPointsContext';
import { SettingsProvider } from '../constants/SettingsContext';
import { ClubProvider, useClub } from '../constants/ClubContext';
import { StreakProvider, useStreak } from '../context/StreakContext';
import { ActivityProvider, useActivity } from '../context/ActivityContext';
import { LogbookProvider, useLogbook } from '../context/LogbookContext';
import { ChallengeProvider, useChallenges } from '../context/ChallengeContext';
import { ProfileProvider } from '../context/ProfileContext';
import { AUSTIN_TRAILS } from '../constants/austinTrails';

/**
 * Behaviour tests.
 *
 * These drive the real contexts the way the screens do — record an activity,
 * join a club, log a cleanup — and assert on what actually happened to the
 * user's points, streak and club.
 */

function AuthedOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return <>{children}</>;
}

const USER = {
  id: 'flow-user',
  name: 'Flow Tester',
  email: 'flow@example.com',
  provider: 'google' as const,
};

type Harness = {
  activity: ReturnType<typeof useActivity>;
  points: ReturnType<typeof useEcoPoints>;
  club: ReturnType<typeof useClub>;
  streak: ReturnType<typeof useStreak>;
  logbook: ReturnType<typeof useLogbook>;
  challenges: ReturnType<typeof useChallenges>;
};

let harness: Harness;

function Probe() {
  harness = {
    activity: useActivity(),
    points: useEcoPoints(),
    club: useClub(),
    streak: useStreak(),
    logbook: useLogbook(),
    challenges: useChallenges(),
  };
  return (
    <View>
      <Text>READY</Text>
    </View>
  );
}

async function boot() {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('@ecotrek/auth_user', JSON.stringify(USER));

  const utils = render(
    <AuthProvider>
      <AuthedOnly>
        <AppProvider>
        <EcoPointsProvider>
          <SettingsProvider>
          <ProfileProvider>
            <ClubProvider onJoined={() => harness?.points.award('club_joined')}>
              <StreakProvider>
                <ActivityProvider>
                  <LogbookProvider>
                    <ChallengeProvider>
                      <Probe />
                    </ChallengeProvider>
                  </LogbookProvider>
                </ActivityProvider>
              </StreakProvider>
            </ClubProvider>
          </ProfileProvider>
          </SettingsProvider>
        </EcoPointsProvider>
        </AppProvider>
      </AuthedOnly>
    </AuthProvider>
  );

  await waitFor(() => expect(utils.queryByText('READY')).toBeTruthy(), { timeout: 8000 });
  return utils;
}

const barton = AUSTIN_TRAILS.find((t) => t.id === 'barton-creek')!;

function noonToday(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).getTime();
}

function hikeInput(overrides: Partial<Parameters<Harness['activity']['addActivity']>[0]> = {}) {
  const start = noonToday();
  return {
    type: 'hike' as const,
    startedAt: start,
    endedAt: start + 3600_000,
    durationSec: 3600,
    miles: 3,
    path: [
      { latitude: barton.startLat, longitude: barton.startLng, timestamp: start },
      { latitude: barton.startLat + 0.01, longitude: barton.startLng, timestamp: start + 1800_000 },
      { latitude: barton.startLat + 0.02, longitude: barton.startLng, timestamp: start + 3600_000 },
    ],
    ...overrides,
  };
}

describe('recording an activity', () => {
  it('awards points, trees and marks the week active', async () => {
    await boot();

    const pointsBefore = harness.points.totalPoints;

    await act(async () => {
      await harness.activity.addActivity(hikeInput());
    });

    await waitFor(() => expect(harness.activity.totalActivities).toBe(1));

    expect(harness.activity.totalTrees).toBe(3);
    expect(harness.activity.totalMiles).toBe(3);

    const fromActivity = harness.points.history
      .filter((e) => e.action === 'hike_mile' || e.action === 'tree_earned')
      .reduce((sum, e) => sum + e.points, 0);
    expect(fromActivity).toBe(39);
    expect(harness.points.totalPoints).toBeGreaterThanOrEqual(pointsBefore + 39);

    // The week is now marked active on the streak.
    await waitFor(() => expect(harness.streak.activeThisWeek).toBe(true));
    expect(harness.streak.currentStreak).toBeGreaterThanOrEqual(1);
  });

  it('refuses to count a drive and awards nothing for it', async () => {
    await boot();
    const before = harness.points.totalPoints;

    await act(async () => {
      await harness.activity.addActivity(hikeInput({ miles: 40, durationSec: 3600 }));
    });

    await waitFor(() => expect(harness.activity.history.length).toBe(1));

    expect(harness.activity.history[0].valid).toBe(false);
    expect(harness.activity.history[0].flagReason).toBe('speed_too_high');
    expect(harness.activity.totalMiles).toBe(0);
    expect(harness.activity.totalTrees).toBe(0);
    expect(harness.points.totalPoints).toBe(before);
    // A drive must not complete an auto challenge either (40 "miles" would
    // have ticked off "Cover 2 miles" / "Cover 5 miles" for free).
    await waitFor(() => expect(harness.challenges.completedCount).toBe(0));
    expect(harness.challenges.pointsEarnedThisWeek).toBe(0);
  });

  it('does not double count a repeated save', async () => {
    await boot();
    const input = hikeInput();

    await act(async () => {
      await harness.activity.addActivity(input);
    });
    await waitFor(() => expect(harness.activity.totalActivities).toBe(1));

    await act(async () => {
      await harness.activity.addActivity(input);
    });
    await waitFor(() => expect(harness.activity.history.length).toBe(1));

    expect(harness.activity.totalActivities).toBe(1);
  });

  it('deleting an activity retracts its distance and trees', async () => {
    await boot();

    await act(async () => {
      await harness.activity.addActivity(hikeInput());
    });
    await waitFor(() => expect(harness.activity.totalActivities).toBe(1));

    const id = harness.activity.history[0].id;
    await act(async () => {
      await harness.activity.deleteActivity(id);
    });

    await waitFor(() => expect(harness.activity.totalActivities).toBe(0));
    expect(harness.activity.totalMiles).toBe(0);
    expect(harness.activity.totalTrees).toBe(0);
  });

  it('two activities in a row both register on the streak', async () => {
    await boot();
    const first = hikeInput();
    const second = hikeInput({ startedAt: first.startedAt + 1000 });

    await act(async () => {
      await harness.activity.addActivity(first);
      await harness.activity.addActivity(second);
    });

    await waitFor(() => expect(harness.activity.totalActivities).toBe(2));
    await waitFor(() => expect(harness.streak.activeThisWeek).toBe(true));

    // Both activities should be counted in the week.
    const weeks = Object.values(harness.streak.weeks);
    expect(weeks.reduce((n, w) => n + w.activities, 0)).toBeGreaterThanOrEqual(2);
  });

  it('records calories and elevation data on activities', async () => {
    await boot();

    await act(async () => {
      await harness.activity.addActivity(hikeInput());
    });

    await waitFor(() => expect(harness.activity.totalActivities).toBe(1));
    const activity = harness.activity.history[0];
    // Calories should be computed (may be 0 if no profile weight set)
    expect(typeof activity.calories).toBe('number');
    expect(typeof activity.elevationGain).toBe('number');
    expect(typeof activity.elevationLoss).toBe('number');
    expect(typeof activity.strikeCount).toBe('number');
  });
});

describe('clubs', () => {
  it('creating a club makes you its owner with an invite code', async () => {
    await boot();

    await act(async () => {
      await harness.club.createClub({
        name: 'Test Club',
        description: 'For testing',
        isLocked: false,
        maxMembers: 25,
      });
    });

    await waitFor(() => expect(harness.club.myClub).toBeTruthy());

    const club = harness.club.myClub!;
    expect(club.name).toBe('Test Club');
    expect(club.code).toHaveLength(6);
    expect(club.maxMembers).toBe(25);
    expect(club.members).toHaveLength(1);
    expect(club.members[0].role).toBe('owner');
    expect(harness.club.myRank).toBe(1);
  });

  it('joining with a bad code fails cleanly', async () => {
    await boot();
    await expect(harness.club.joinClub('ZZZZZZ')).rejects.toThrow(/No club found/i);
  });

  it('activity points flow into the club total', async () => {
    await boot();

    await act(async () => {
      await harness.club.createClub({
        name: 'Point Club',
        description: '',
        isLocked: false,
        maxMembers: 50,
      });
    });
    await waitFor(() => expect(harness.club.myClub).toBeTruthy());

    await act(async () => {
      await harness.activity.addActivity(hikeInput());
    });

    await waitFor(() => expect(harness.club.myClub!.totalPoints).toBeGreaterThanOrEqual(39));
    expect(harness.club.myClub!.totalTrees).toBe(3);
    expect(harness.club.myClub!.totalMiles).toBe(3);
  });

  it('a weekly goal accumulates and reports when it is met', async () => {
    await boot();

    await act(async () => {
      await harness.club.createClub({
        name: 'Goal Club',
        description: '',
        isLocked: false,
        maxMembers: 50,
      });
    });
    await waitFor(() => expect(harness.club.myClub).toBeTruthy());

    await act(async () => {
      await harness.club.setGoal('miles', 2);
    });
    await waitFor(() => expect(harness.club.activeGoal).toBeTruthy());
    expect(harness.club.activeGoal!.metAt).toBeNull();

    await act(async () => {
      await harness.activity.addActivity(hikeInput());
    });

    await waitFor(() => expect(harness.club.activeGoal!.progress).toBe(3));
    expect(harness.club.activeGoal!.metAt).not.toBeNull();
  });

  it('the member cap cannot be set below the current roster', async () => {
    await boot();

    await act(async () => {
      await harness.club.createClub({
        name: 'Cap Club',
        description: '',
        isLocked: false,
        maxMembers: 50,
      });
    });
    await waitFor(() => expect(harness.club.myClub).toBeTruthy());

    await act(async () => {
      await harness.club.setMaxMembers(1);
    });

    await waitFor(() => expect(harness.club.myClub!.maxMembers).toBe(2));
  });
});

describe('the logbook', () => {
  it('a cleanup records its litter count', async () => {
    await boot();

    await act(async () => {
      await harness.logbook.addCleanup(12);
    });

    await waitFor(() => expect(harness.logbook.cleanupCount).toBe(1));
    expect(harness.logbook.litterCollected).toBe(12);
  });

  it('multiple cleanups accumulate', async () => {
    await boot();

    await act(async () => {
      await harness.logbook.addCleanup(5);
      await harness.logbook.addCleanup(8);
    });

    await waitFor(() => expect(harness.logbook.cleanupCount).toBe(2));
    expect(harness.logbook.litterCollected).toBe(13);
  });
});

describe('weekly challenges', () => {
  it('offers five challenges and marks a manual one complete', async () => {
    await boot();

    expect(harness.challenges.challenges).toHaveLength(5);

    const manual = harness.challenges.challenges.find((c) => c.kind === 'manual')!;
    const before = harness.points.totalPoints;

    await act(async () => {
      await harness.challenges.completeChallenge(manual.id);
    });

    await waitFor(() => expect(harness.challenges.completedCount).toBeGreaterThanOrEqual(1));
    expect(harness.points.totalPoints - before).toBeGreaterThanOrEqual(manual.points);
  });

  it('auto challenges tick themselves off once the distance is there', async () => {
    await boot();

    const auto = harness.challenges.challenges.find(
      (c) => c.kind === 'auto' && c.metric === 'miles'
    );
    if (!auto) return;

    await act(async () => {
      await harness.activity.addActivity(hikeInput({ miles: auto.target ?? 2 }));
    });

    await waitFor(
      () => {
        const updated = harness.challenges.challenges.find((c) => c.id === auto.id)!;
        expect(updated.completed).toBe(true);
      },
      { timeout: 5000 }
    );
  });
});

describe('the weekly streak', () => {
  it('marks the current week active after an activity', async () => {
    await boot();

    await act(async () => {
      await harness.activity.addActivity(hikeInput());
    });

    await waitFor(() => expect(harness.streak.activeThisWeek).toBe(true));
  });

  it('tracks total active weeks', async () => {
    await boot();

    await act(async () => {
      await harness.activity.addActivity(hikeInput());
    });

    await waitFor(() => expect(harness.streak.totalActiveWeeks).toBeGreaterThanOrEqual(1));
  });

  it('freeze system starts with no available freezes', async () => {
    await boot();
    await waitFor(() => expect(harness.streak.availableFreezes).toBe(0));
  });

  it('week history returns the correct number of weeks', async () => {
    await boot();
    const history = harness.streak.weekHistory(8);
    expect(history).toHaveLength(8);
    expect(history[history.length - 1].isCurrent).toBe(true);
  });
});
