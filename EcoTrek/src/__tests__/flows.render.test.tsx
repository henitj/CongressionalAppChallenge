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
import { AUSTIN_TRAILS } from '../constants/austinTrails';
import { SPECIES } from '../constants/species';

/**
 * Behaviour tests.
 *
 * These drive the real contexts the way the screens do — record an activity,
 * join a club, log a species — and assert on what actually happened to the
 * user's points, streak and club. Rendering tests prove a screen appears;
 * these prove the app does the right thing when you use it.
 */


/**
 * Mirrors App.tsx: the provider stack only mounts once a user exists.
 *
 * This matters. Every store is namespaced by user id, so mounting the stack
 * before auth resolves makes the providers load under "anon" and then reload
 * under the real id, discarding anything written in between. The app never
 * does this because Gate renders SignIn until a user is present.
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

/** Everything the tests need to poke at, exposed from inside the stack. */
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

/**
 * Noon today.
 *
 * Activities are credited to the day they STARTED, so a test that used
 * "an hour ago" silently began failing when the suite ran just after midnight
 * — the activity correctly landed on yesterday. Anchoring to midday keeps the
 * test about the behaviour under test rather than the clock.
 */
function noonToday(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).getTime();
}

/** A plausible hour-long hike starting at a real trailhead. */
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
  it('awards points, trees and a streak day', async () => {
    await boot();

    const pointsBefore = harness.points.totalPoints;

    await act(async () => {
      await harness.activity.addActivity(hikeInput());
    });

    await waitFor(() => expect(harness.activity.totalActivities).toBe(1));

    // 3 miles hiked = 3 trees at one per mile.
    expect(harness.activity.totalTrees).toBe(3);
    expect(harness.activity.totalMiles).toBe(3);

    // Assert on the activity's own payout rather than the total: logging an
    // activity can also tick off a weekly challenge, and which challenges the
    // current week offers is not this test's business.
    const fromActivity = harness.points.history
      .filter((e) => e.action === 'hike_mile' || e.action === 'tree_earned')
      .reduce((sum, e) => sum + e.points, 0);
    // 3 x hike_mile (5) + 3 x tree_earned (8) = 39.
    expect(fromActivity).toBe(39);
    expect(harness.points.totalPoints).toBeGreaterThanOrEqual(pointsBefore + 39);

    // The day is now marked active on the streak calendar.
    await waitFor(() => expect(harness.streak.activeToday).toBe(true));
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

  it('two activities in a row both land on the streak calendar', async () => {
    await boot();
    const first = hikeInput();
    const second = hikeInput({ startedAt: first.startedAt + 1000 });

    await act(async () => {
      await harness.activity.addActivity(first);
      await harness.activity.addActivity(second);
    });

    await waitFor(() => expect(harness.activity.totalActivities).toBe(2));
    await waitFor(() => {
      const today = harness.streak.calendar(1)[0];
      expect(today.active).toBe(true);
    });
    // Both activities must be counted on the day, not just the last one.
    const days = Object.values(harness.streak.days);
    expect(days.reduce((n, d) => n + d.activities, 0)).toBe(2);
  });

  it('credits an activity to the day it started, not the day it ended', async () => {
    await boot();

    // A hike that sets off at 23:30 and finishes after midnight belongs to the
    // day you set out. Anything else would hand people a free streak day.
    const d = new Date();
    const lateStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 30, 0).getTime();

    await act(async () => {
      await harness.activity.addActivity(
        hikeInput({
          startedAt: lateStart,
          endedAt: lateStart + 3600_000,
          path: [
            { latitude: barton.startLat, longitude: barton.startLng, timestamp: lateStart },
            {
              latitude: barton.startLat + 0.02,
              longitude: barton.startLng,
              timestamp: lateStart + 3600_000,
            },
          ],
        })
      );
    });

    await waitFor(() => expect(harness.activity.totalActivities).toBe(1));
    const startDay = new Date(lateStart);
    const key = `${startDay.getFullYear()}-${String(startDay.getMonth() + 1).padStart(2, '0')}-${String(
      startDay.getDate()
    ).padStart(2, '0')}`;
    await waitFor(() => expect(harness.streak.days[key]?.activities).toBe(1));
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

    // At least the activity's own 39 points; a weekly challenge completing on
    // the same save legitimately adds more.
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

    // One member already, and the floor is the roster size.
    await waitFor(() => expect(harness.club.myClub!.maxMembers).toBe(2));
  });
});

describe('the field log', () => {
  it('logging a species awards points exactly once', async () => {
    await boot();
    const species = SPECIES[0];
    const before = harness.points.totalPoints;

    let first = false;
    await act(async () => {
      first = await harness.logbook.logSighting(species.id, null);
    });
    expect(first).toBe(true);

    await waitFor(() => expect(harness.logbook.speciesLogged).toBe(1));
    expect(harness.points.totalPoints - before).toBe(4);

    // Tapping the same species again must not pay out a second time.
    let second = true;
    await act(async () => {
      second = await harness.logbook.logSighting(species.id, null);
    });
    expect(second).toBe(false);
    expect(harness.logbook.speciesLogged).toBe(1);
    expect(harness.points.totalPoints - before).toBe(4);
  });

  it('removing a sighting takes the points back', async () => {
    await boot();
    const species = SPECIES[0];
    const before = harness.points.totalPoints;

    await act(async () => {
      await harness.logbook.logSighting(species.id, null);
    });
    await waitFor(() => expect(harness.logbook.speciesLogged).toBe(1));

    await act(async () => {
      await harness.logbook.removeSighting(species.id);
    });

    await waitFor(() => expect(harness.logbook.speciesLogged).toBe(0));
    expect(harness.points.totalPoints).toBe(before);
  });

  it('a cleanup records its litter count', async () => {
    await boot();
    const before = harness.points.totalPoints;

    await act(async () => {
      await harness.logbook.logCleanup(12, null);
    });

    await waitFor(() => expect(harness.logbook.cleanupCount).toBe(1));
    expect(harness.logbook.litterCollected).toBe(12);
    expect(harness.points.totalPoints - before).toBe(15);
  });

  it('cleanup counts are clamped to something sane', async () => {
    await boot();

    await act(async () => {
      await harness.logbook.logCleanup(99999, null);
    });

    await waitFor(() => expect(harness.logbook.cleanupCount).toBe(1));
    expect(harness.logbook.litterCollected).toBe(500);
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
    if (!auto) return; // This week's set may not include a mileage challenge.

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

describe('the streak', () => {
  it('starts at one on first open and awards the daily check-in', async () => {
    await boot();
    await waitFor(() => expect(harness.streak.currentStreak).toBe(1));
    expect(harness.streak.checkedInToday).toBe(true);
    expect(harness.points.history.some((e) => e.action === 'daily_login')).toBe(true);
  });

  it('does not award the daily check-in twice in one day', async () => {
    await boot();
    await waitFor(() => expect(harness.streak.checkedInToday).toBe(true));

    await act(async () => {
      await harness.streak.checkIn();
      await harness.streak.checkIn();
    });

    const logins = harness.points.history.filter((e) => e.action === 'daily_login');
    expect(logins).toHaveLength(1);
  });
});
