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
import { ProfileProvider } from '../context/ProfileContext';

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
import ActivityDetailScreen from '../screens/ActivityDetailScreen';
import RecapScreen from '../screens/RecapScreen';
import HistoryScreen from '../screens/HistoryScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SignInScreen from '../screens/SignInScreen';

/**
 * Render smoke tests.
 *
 * Type checking proves the code compiles. This proves it runs: every screen is
 * mounted inside the real provider stack, on a completely empty account, which
 * is exactly the state a brand new user and a Play Store reviewer will see.
 */

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
          <ProfileProvider>
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
          </ProfileProvider>
          </SettingsProvider>
          </EcoPointsProvider>
          </AppProvider>
        </AuthedOnly>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

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
  ['Streak', StreakScreen, 'Weekly Streak'],
  ['Assistant', AssistantScreen, /What do you want to know/i],
  ['ActivityDetail', ActivityDetailScreen, /Activity not found/i],
  ['Recap', RecapScreen, /Nothing logged last week/i],
  ['History', HistoryScreen, /No activities yet/i],
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
    const { queryByText } = await mount(LeaderboardScreen, 'My club');
    expect(queryByText(/You are not in a club/i)).toBeTruthy();
    expect(queryByText('Enter a code')).toBeTruthy();
  });

  it('Home surfaces the weekly challenges even with no history', async () => {
    const { queryByText } = await mount(HomeScreen, 'This week');
    expect(queryByText(/of 5 done/i)).toBeTruthy();
  });

  it('History starts empty with a call to action', async () => {
    const { queryByText } = await mount(HistoryScreen, /No activities yet/i);
    expect(queryByText('Start tracking')).toBeTruthy();
  });
});
