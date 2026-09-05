import React from 'react';
import { Text } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppProvider } from '../context/AppContext';
import { EcoPointsProvider } from '../constants/EcoPointsContext';
import { SettingsProvider } from '../constants/SettingsContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ClubProvider } from '../constants/ClubContext';
import { StreakProvider } from '../context/StreakContext';
import { ActivityProvider } from '../context/ActivityContext';
import { LogbookProvider } from '../context/LogbookContext';
import { ChallengeProvider } from '../context/ChallengeContext';
import { NotificationProvider } from '../context/NotificationContext';
import { WeatherProvider } from '../context/WeatherContext';
import { AnalyticsProvider } from '../constants/AnalyticsContext';
import { ProfileProvider } from '../context/ProfileContext';
import OnboardingGate from '../components/OnboardingGate';
import RootNavigator from '../navigation/RootNavigator';

/**
 * App-shell tests.
 *
 * The screen tests mount one screen at a time. These mount the REAL
 * RootNavigator behind the REAL OnboardingGate — the exact tree a user
 * runs — and then actually drive it: switch tabs, confirm simple mode
 * trims More, open the cleanup sheet, and check the new settings rows.
 */

const TEST_USER = {
  id: 'test-user',
  name: 'Test Trekker',
  email: 'test@example.com',
  provider: 'google' as const,
};

const TEST_PROFILE = {
  firstName: 'Test',
  lastName: 'Trekker',
  age: 40,
  heightInches: 68,
  weightPounds: 160,
  stepLengthInches: 26,
  createdAt: Date.now(),
  weightHistory: [],
  avatarUri: null,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('@ecotrek/auth_user', JSON.stringify(TEST_USER));
  await AsyncStorage.setItem('@ecotrek/test-user/user_profile', JSON.stringify(TEST_PROFILE));
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
                                  <AnalyticsProvider>{children}</AnalyticsProvider>
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

function FullApp() {
  return (
    <Providers>
      <OnboardingGate>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </OnboardingGate>
    </Providers>
  );
}

/** Probe that renders theme values as text so tests can assert on them. */
function ThemeProbe() {
  const { motionEnabled, fontScale } = useTheme();
  return (
    <Text>
      motion:{motionEnabled ? 'on' : 'off'} scale:{fontScale.toFixed(2)}
    </Text>
  );
}

function ThemedProbeApp() {
  return (
    <Providers>
      <ThemeProbe />
    </Providers>
  );
}

describe('the real app shell', () => {
  jest.setTimeout(20000);
  it('boots through the onboarding gate to the three tabs', async () => {
    const utils = render(<FullApp />);
    await waitFor(() => expect(utils.queryByText('Your last walk')).toBeTruthy(), {
      timeout: 10000,
    });
    // The three tabs render their labels as text.
    // react-navigation adds its own internal label node, so there can be
    // more than one — assert at least one of each tab exists.
    expect(utils.getAllByLabelText('Home').length).toBeGreaterThan(0);
    expect(utils.getAllByLabelText('Start').length).toBeGreaterThan(0);
    expect(utils.getAllByLabelText('More').length).toBeGreaterThan(0);
  });

  it('switching tabs really switches screens', async () => {
    const utils = render(<FullApp />);
    await waitFor(() => expect(utils.queryByText('Your last walk')).toBeTruthy(), {
      timeout: 10000,
    });

    fireEvent.press(utils.getAllByLabelText('Start')[0]);
    await waitFor(() => expect(utils.queryByText(/1 tree per 1 mile/)).toBeTruthy());

    fireEvent.press(utils.getAllByLabelText('More')[0]);
    await waitFor(() => expect(utils.queryByText('My walks')).toBeTruthy());

    fireEvent.press(utils.getAllByLabelText('Home')[0]);
    await waitFor(() => expect(utils.queryByText('Your last walk')).toBeTruthy());
  });

  it('simple mode hides Clubs and Weekly goals from More', async () => {
    await AsyncStorage.setItem(
      '@ecotrek/settings',
      JSON.stringify({
        units: 'imperial',
        tempUnit: 'F',
        appearance: 'light',
        textSize: 'default',
        simpleMode: true,
        reduceMotion: 'system',
      })
    );
    const utils = render(<FullApp />);
    await waitFor(() => expect(utils.queryByText('Your last walk')).toBeTruthy(), {
      timeout: 10000,
    });

    fireEvent.press(utils.getAllByLabelText('More')[0]);
    await waitFor(() => expect(utils.queryByText('My walks')).toBeTruthy());

    expect(utils.queryByText('Trails')).toBeTruthy();
    expect(utils.queryByText('Clubs')).toBeNull();
    expect(utils.queryByText('Weekly goals')).toBeNull();
  });

  it('the Impact screen can log a cleanup (the sheet is reachable)', async () => {
    const utils = render(<FullApp />);
    await waitFor(() => expect(utils.queryByText('Your last walk')).toBeTruthy(), {
      timeout: 10000,
    });

    fireEvent.press(utils.getAllByLabelText('More')[0]);
    await waitFor(() => expect(utils.queryByText('Impact')).toBeTruthy());
    fireEvent.press(utils.getByText('Impact'));
    await waitFor(() => expect(utils.queryByText(/Everything you have logged/i)).toBeTruthy(), {
      timeout: 8000,
    });

    // The Field log lives on the 'Records' inner tab.
    fireEvent.press(utils.getByText('Records'));
    await waitFor(() => expect(utils.queryByText('Field log')).toBeTruthy(), { timeout: 8000 });
    fireEvent.press(utils.getByText('Log a cleanup'));
    await waitFor(
      () => expect(utils.queryByText('Every piece counts')).toBeTruthy(),
      { timeout: 8000 }
    );
  });

  it('Settings offers Simple mode and Less motion', async () => {
    const utils = render(<FullApp />);
    await waitFor(() => expect(utils.queryByText('Your last walk')).toBeTruthy(), {
      timeout: 10000,
    });

    fireEvent.press(utils.getAllByLabelText('More')[0]);
    await waitFor(() => expect(utils.queryByText('Settings')).toBeTruthy());
    fireEvent.press(utils.getByText('Settings'));
    await waitFor(() => expect(utils.queryByText('Simple mode')).toBeTruthy());
    expect(utils.queryByText('Less motion')).toBeTruthy();
  });
});

describe('theme motion + simple mode scaling', () => {
  it('reduceMotion on turns motion off', async () => {
    await AsyncStorage.setItem(
      '@ecotrek/settings',
      JSON.stringify({
        units: 'imperial',
        tempUnit: 'F',
        appearance: 'light',
        textSize: 'default',
        simpleMode: false,
        reduceMotion: 'on',
      })
    );
    const utils = render(<ThemedProbeApp />);
    await waitFor(() => expect(utils.queryByText(/motion:off/)).toBeTruthy());
  });

  it('simple mode bumps the font scale', async () => {
    await AsyncStorage.setItem(
      '@ecotrek/settings',
      JSON.stringify({
        units: 'imperial',
        tempUnit: 'F',
        appearance: 'light',
        textSize: 'default',
        simpleMode: true,
        reduceMotion: 'system',
      })
    );
    const utils = render(<ThemedProbeApp />);
    await waitFor(() => expect(utils.queryByText(/scale:1\.12/)).toBeTruthy());
  });
});
