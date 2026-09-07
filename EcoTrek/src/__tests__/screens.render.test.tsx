import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppProvider } from '../context/AppContext';
import { EcoPointsProvider } from '../constants/EcoPointsContext';
import { SettingsProvider } from '../constants/SettingsContext';
import { ThemeProvider } from '../context/ThemeContext';
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
import SetupScreen from '../screens/SetupScreen';
import BadgesScreen from '../screens/BadgesScreen';
import MoreScreen from '../screens/MoreScreen';
import ActiveTrackingScreen from '../screens/ActiveTrackingScreen';
import CleanupSheet from '../components/CleanupSheet';

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
          <ThemeProvider>
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
          </ThemeProvider>
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
  ['Home', HomeScreen, 'Your last walk'],
  ['Track', TrackScreen, /1 tree per 1 mile/],
  ['More', MoreScreen, 'My walks'],
  ['Trails', TrailsScreen, 'Ask about a trail'],
  ['Clubs', LeaderboardScreen, 'My club'],
  ['Profile', ProfileScreen, /earned/],
  ['Impact', ImpactScreen, /Everything you have logged/i],
  ['Challenges', ChallengesScreen, /Completed this week/i],
  ['Conditions', ConditionsScreen, /Conditions unavailable|Today and the next few hours/i],
  ['Badges', BadgesScreen, /of .* badges earned/i],
  ['Safety', SafetyScreen, 'Emergency numbers'],
  ['Settings', SettingsScreen, 'Units'],
  ['Streak', StreakScreen, 'Weekly Streak'],
  ['Assistant', AssistantScreen, /What do you want to know/i],
  ['ActivityDetail', ActivityDetailScreen, /Activity not found/i],
  ['Recap', RecapScreen, /Nothing logged last week/i],
  ['History', HistoryScreen, 'No walks yet'],
];

describe('every screen renders on an empty account', () => {
  for (const [name, Screen, anchor] of SCREENS) {
    it(`${name} renders real content`, async () => {
      const { queryByText } = await mount(Screen, anchor);
      expect(queryByText(anchor)).toBeTruthy();
    });
  }
});

describe('review fixes', () => {
  it('More is grouped into sections, not one flat list', async () => {
    const { queryByText } = await mount(MoreScreen, 'My walks');
    expect(queryByText('Explore')).toBeTruthy();
    expect(queryByText('App')).toBeTruthy();
    expect(queryByText('Safety')).toBeTruthy();
    expect(queryByText('Settings')).toBeTruthy();
  });

  it('Profile offers to add your own photo', async () => {
    const { getByLabelText } = await mount(ProfileScreen, 'Share my progress');
    expect(getByLabelText('Add your photo')).toBeTruthy();
  });

  it('Share opens the readable progress sheet', async () => {
    const utils = await mount(ProfileScreen, 'Share my progress');
    fireEvent.press(utils.getByText('Share my progress'));
    await waitFor(() => expect(utils.queryByText('Share your progress')).toBeTruthy(), { timeout: 4000 });
    expect(utils.queryByText(/a quick look at your ecotrek progress/i)).toBeTruthy();
  });
});

describe('the trash question at the end of a walk', () => {
  function PostWalkQuestion({ onLogged }: { onLogged?: (n: number) => void }) {
    return (
      <CleanupSheet
        visible
        onClose={() => {}}
        title="Pieces of trash you picked up"
        subtitle="Nice walk — every piece counts for extra points"
        allowNone
        onLogged={onLogged}
      />
    );
  }

  it('asks the question and offers an honest way out', async () => {
    const utils = await mount(PostWalkQuestion, 'Did you pick up any trash?');
    expect(utils.queryByText('How many pieces did you pick up?')).toBeTruthy();
    expect(utils.queryByText('None this time')).toBeTruthy();
    // Presets are there so nobody has to type on a phone after a walk.
    expect(utils.getByLabelText('10 pieces')).toBeTruthy();
  });

  it('logging pieces hands the count back so points can be awarded', async () => {
    const logged: number[] = [];
    const Screen = () => <PostWalkQuestion onLogged={(n) => logged.push(n)} />;
    const utils = await mount(Screen, 'Pieces of trash you picked up');

    fireEvent.press(utils.getByLabelText('10 pieces'));
    await waitFor(() => expect(utils.queryByText('Log 10 pieces')).toBeTruthy());
    fireEvent.press(utils.getByText('Log 10 pieces'));

    await waitFor(() => expect(logged).toEqual([10]));
  });
});

describe('stop button, feedback and the removed contacts feature', () => {
  it('tracking puts a big one-tap Stop control in the top bar', async () => {
    const utils = await mount(ActiveTrackingScreen, /Recording/);
    expect(utils.getByLabelText('Stop and save')).toBeTruthy();
    expect(utils.getByLabelText('Pause')).toBeTruthy();
    expect(utils.getByText('Stop')).toBeTruthy();
  });

  it('tapping Stop finishes the hike and shows the summary', async () => {
    const utils = await mount(ActiveTrackingScreen, /Recording/);
    fireEvent.press(utils.getByLabelText('Stop and save'));
    // A zero-second, zero-mile activity is rejected by design — the summary
    // must still appear, and no feedback button is offered for it.
    await waitFor(() => expect(utils.queryByText('This one did not count')).toBeTruthy(), { timeout: 8000 });
    expect(utils.queryByText('Give feedback')).toBeNull();
    expect(utils.queryByText('Done')).toBeTruthy();
  });

  it('the contacts feature is gone from Settings', async () => {
    const utils = await mount(SettingsScreen, 'Units');
    expect(utils.queryByText('Emergency contact')).toBeNull();
    expect(utils.queryByLabelText('Emergency contact name')).toBeNull();
    expect(utils.queryByLabelText('Emergency contact phone')).toBeNull();
  });

  it('Profile ends with a Give Feedback button that opens the Google Form', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const utils = await mount(ProfileScreen, 'Share my progress');
    fireEvent.press(utils.getByText('Give Feedback'));
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('https://forms.gle/E3p559tiqrNMtZDS7');
    openURL.mockRestore();
  });

  it('a failed open shows a friendly alert instead of crashing', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no browser'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const utils = await mount(ProfileScreen, 'Share my progress');
    fireEvent.press(utils.getByText('Give Feedback'));
    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(alert.mock.calls[0][0]).toBe('One moment');
    // The button still works afterwards — the failure did not break anything.
    fireEvent.press(utils.getByText('Give Feedback'));
    expect(openURL).toHaveBeenCalledTimes(2);
    openURL.mockRestore();
    alert.mockRestore();
  });
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
          <SettingsProvider>
            <ThemeProvider>
              <SignInScreen />
            </ThemeProvider>
          </SettingsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    );
    await waitFor(() => expect(queryByText('Continue as guest')).toBeTruthy());
    expect(queryByText('Continue with Google')).toBeTruthy();
    expect(queryByText('EcoTrek')).toBeTruthy();
  });

  it('Setup can be skipped', async () => {
    const { queryByText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <AuthProvider>
          <SettingsProvider>
            <ThemeProvider>
              <ProfileProvider>
                <SetupScreen onDone={() => {}} />
              </ProfileProvider>
            </ThemeProvider>
          </SettingsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    );
    await waitFor(() => expect(queryByText('Skip')).toBeTruthy());
    expect(queryByText(/Your profile/i)).toBeTruthy();
    expect(queryByText(/First name/i)).toBeTruthy();
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
    await waitFor(() => expect(queryByText('Tap Start. Then walk.')).toBeTruthy());
    expect(queryByText('Skip')).toBeTruthy();
    expect(toJSON()).toBeTruthy();
  });
});

describe('empty states say something useful', () => {
  it('Home tells a brand new user what to do', async () => {
    const { queryByText } = await mount(HomeScreen, 'Your last walk');
    expect(queryByText(/You have not walked yet/i)).toBeTruthy();
  });

  it('Clubs opens on the tab that explains how to join', async () => {
    const { queryByText } = await mount(LeaderboardScreen, 'My club');
    expect(queryByText(/You are not in a club/i)).toBeTruthy();
    expect(queryByText('Enter a code')).toBeTruthy();
  });

  it('History starts empty with a call to action', async () => {
    const { queryByText } = await mount(HistoryScreen, /No walks yet/i);
    expect(queryByText('Start walk')).toBeTruthy();
  });
});
