import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppProvider } from '../context/AppContext';
import { EcoPointsProvider } from '../constants/EcoPointsContext';
import { SettingsProvider } from '../constants/SettingsContext';
import { ClubProvider } from '../constants/ClubContext';
import { StreakProvider } from '../context/StreakContext';
import { ActivityProvider } from '../context/ActivityContext';
import { LogbookProvider } from '../context/LogbookContext';
import { ChallengeProvider } from '../context/ChallengeContext';
import { NotificationProvider } from '../context/NotificationContext';
import { WeatherProvider } from '../context/WeatherContext';
import { AnalyticsProvider } from '../constants/AnalyticsContext';

import HomeScreen from '../screens/HomeScreen';
import TrackScreen from '../screens/TrackScreen';
import TrailsScreen from '../screens/TrailsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ImpactScreen from '../screens/ImpactScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import ConditionsScreen from '../screens/ConditionsScreen';
import SafetyScreen from '../screens/SafetyScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StreakScreen from '../screens/StreakScreen';
import AssistantScreen from '../screens/AssistantScreen';
import SpeciesScreen from '../screens/SpeciesScreen';
import ActivityDetailScreen from '../screens/ActivityDetailScreen';
import RecapScreen from '../screens/RecapScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SignInScreen from '../screens/SignInScreen';

/**
 * Render smoke tests.
 *
 * Type checking proves the code compiles. This proves it runs: every screen is
 * mounted inside the real provider stack, on a completely empty account, which
 * is exactly the state a brand new user and a Play Store reviewer will see.
 *
 * The stack is real on purpose. Mocking the contexts would only test the
 * mocks — most of the bugs worth catching live in how providers interact.
 */

// AuthContext reads a persisted session before rendering children, so a signed
// in user is seeded rather than mocked.
const TEST_USER = {
  id: 'test-user',
  name: 'Test Trekker',
  email: 'test@example.com',
  provider: 'google' as const,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('@ecotrek/auth_user', JSON.stringify(TEST_USER));
  jest.clearAllMocks();
});


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

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <AuthProvider>
        <AuthedOnly>
          <AppProvider>
          <EcoPointsProvider>
          <SettingsProvider>
            <ClubProvider>
              <StreakProvider>
                <ActivityProvider>
                  <LogbookProvider>
                    <ChallengeProvider>
                      <NotificationProvider>
                        <WeatherProvider notificationsEnabled={false}>
                          <AnalyticsProvider>
                            <NavigationContainer>{children}</NavigationContainer>
                          </AnalyticsProvider>
                        </WeatherProvider>
                      </NotificationProvider>
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
    </SafeAreaProvider>
  );
}

/**
 * Mounts a screen and waits until a known piece of its content is on screen.
 *
 * Waiting on an anchor string matters: several providers return null until
 * their stores load, and the outermost SafeAreaProvider renders regardless, so
 * merely asserting "the tree is not null" passes even when the screen itself
 * rendered nothing at all.
 */
const Stack = createNativeStackNavigator();

async function mount(Component: React.ComponentType<any>, anchor: string | RegExp) {
  const utils = render(
    <Providers>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Target" component={Component} />
      </Stack.Navigator>
    </Providers>
  );
  await waitFor(() => expect(utils.queryByText(anchor)).toBeTruthy(), { timeout: 8000 });
  return utils;
}

/** Each screen plus a string that only appears once it has really rendered. */
const SCREENS: [string, React.ComponentType<any>, string | RegExp][] = [
  ['Home', HomeScreen, 'Your totals'],
  ['Track', TrackScreen, /How trees are earned/i],
  ['Trails', TrailsScreen, 'Ask about a trail'],
  ['Clubs', LeaderboardScreen, 'My club'],
  ['Profile', ProfileScreen, 'Accomplishments'],
  ['Impact', ImpactScreen, /Everything you have logged/i],
  ['Challenges', ChallengesScreen, /Completed this week/i],
  ['Conditions', ConditionsScreen, /Conditions unavailable|Trail safety report/i],
  ['Safety', SafetyScreen, 'Emergency numbers'],
  ['Settings', SettingsScreen, 'Units'],
  ['Streak', StreakScreen, 'Milestones'],
  ['Assistant', AssistantScreen, /What do you want to know/i],
  ['Species', SpeciesScreen, /species logged/i],
  ['ActivityDetail', ActivityDetailScreen, /Activity not found/i],
  ['Recap', RecapScreen, /Nothing logged last week/i],
];

describe('every screen renders on an empty account', () => {
  for (const [name, Screen, anchor] of SCREENS) {
    it(`${name} renders real content`, async () => {
      const { queryByText } = await mount(Screen, anchor);
      expect(queryByText(anchor)).toBeTruthy();
    });
  }
});

describe('screens that do not need the provider stack', () => {
  it('SignIn renders, including the guest route', async () => {
    // SignIn sits above the rest of the stack but still needs Auth.
    const { queryByText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <AuthProvider>
          <SignInScreen />
        </AuthProvider>
      </SafeAreaProvider>
    );
    await waitFor(() => expect(queryByText('Continue as guest')).toBeTruthy());
    expect(queryByText('EcoTrek')).toBeTruthy();
  });

  it('Onboarding renders and can be skipped', async () => {
    const { toJSON, queryByText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <OnboardingScreen onDone={() => {}} />
      </SafeAreaProvider>
    );
    await waitFor(() => expect(queryByText('Track what you move')).toBeTruthy());
    expect(queryByText('Skip')).toBeTruthy();
    expect(toJSON()).toBeTruthy();
  });
});

describe('empty states say something useful', () => {
  it('Home tells a brand new user what to do', async () => {
    const { queryByText } = await mount(HomeScreen, 'Your totals');
    expect(queryByText(/No activities yet/i)).toBeTruthy();
    expect(queryByText('Start tracking')).toBeTruthy();
  });

  it('Clubs opens on the tab that explains how to join', async () => {
    // Someone with no club must land somewhere actionable, not on an empty
    // leaderboard with no explanation of how to get onto it.
    const { queryByText } = await mount(LeaderboardScreen, 'My club');
    expect(queryByText(/You are not in a club/i)).toBeTruthy();
    expect(queryByText('Enter a code')).toBeTruthy();
  });

  it('Home surfaces the weekly challenges even with no history', async () => {
    const { queryByText } = await mount(HomeScreen, 'This week');
    expect(queryByText(/of 5 done/i)).toBeTruthy();
  });

  it('Species starts with the whole catalogue still to find', async () => {
    const { queryByText } = await mount(SpeciesScreen, /species logged/i);
    expect(queryByText(/still to find/i)).toBeTruthy();
  });
});
