import React from 'react';
import { Text } from 'react-native';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { keyFor, loadJSON, isArray, isObject } from '../services/storage';
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
import MoreScreen from '../screens/MoreScreen';
import TrackScreen from '../screens/TrackScreen';

import ErrorBoundary from '../components/ErrorBoundary';

/**
 * Resilience tests — "no matter what happens, the app must not crash".
 *
 * These mount real screens on top of deliberately corrupted stored state:
 * truncated JSON, JSON `null`, arrays where objects belong and objects where
 * arrays belong. Every one of these payloads has appeared in the wild on some
 * app at some point (killed process mid-write, hand-edited stores, schema
 * drift). The app must fall back to defaults and still work.
 */

const TEST_USER = {
  id: 'test-user',
  name: 'Test Trekker',
  email: 'test@example.com',
  provider: 'google' as const,
};

const USER_KEYS = [
  'activities', // array
  'points', // array
  'badges', // array
  'logbook', // array
  'streak', // object
  'challenges', // object
  'notifications', // object
  'user_profile', // object
  'club_goal_rewards', // object
  'analytics', // object
];

const GLOBAL_KEYS = ['@ecotrek/clubs/v2']; // array

const HOSTILE_PAYLOADS: [string, string][] = [
  ['truncated JSON', '{{{{"never": closes'],
  ['JSON null', 'null'],
  ['wrong shape', '{"a":1}'],
];

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

async function mountOnCorruptedState(Component: React.ComponentType<any>, anchor: string | RegExp) {
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

describe('corrupted stored state never crashes the app', () => {
  for (const [label, payload] of HOSTILE_PAYLOADS) {
    it(`home survives: ${label} in every store key`, async () => {
      for (const name of USER_KEYS) {
        await AsyncStorage.setItem(keyFor(TEST_USER.id, name), payload);
      }
      for (const key of GLOBAL_KEYS) {
        await AsyncStorage.setItem(key, payload);
      }
      await mountOnCorruptedState(HomeScreen, 'Your last walk');
    });

    it(`more survives: ${label} in every store key`, async () => {
      for (const name of USER_KEYS) {
        await AsyncStorage.setItem(keyFor(TEST_USER.id, name), payload);
      }
      for (const key of GLOBAL_KEYS) {
        await AsyncStorage.setItem(key, payload);
      }
      await mountOnCorruptedState(MoreScreen, 'My walks');
    });

    it(`start survives: ${label} in every store key`, async () => {
      for (const name of USER_KEYS) {
        await AsyncStorage.setItem(keyFor(TEST_USER.id, name), payload);
      }
      for (const key of GLOBAL_KEYS) {
        await AsyncStorage.setItem(key, payload);
      }
      await mountOnCorruptedState(TrackScreen, /1 tree per 1 mile/);
    });
  }

  it('an array in an object key falls back to defaults', async () => {
    await AsyncStorage.setItem(keyFor(TEST_USER.id, 'streak'), '[1,2,3]');
    await mountOnCorruptedState(HomeScreen, 'Your last walk');
  });

  it('an object in an array key falls back to defaults', async () => {
    await AsyncStorage.setItem(keyFor(TEST_USER.id, 'activities'), '{"nope":true}');
    await mountOnCorruptedState(MoreScreen, 'My walks');
  });
});

describe('storage validators', () => {
  it('loadJSON returns the fallback for unparseable data', async () => {
    await AsyncStorage.setItem('@ecotrek/test/x', 'not json at all');
    expect(await loadJSON('@ecotrek/test/x', { safe: true }, isObject)).toEqual({ safe: true });
  });

  it('loadJSON returns the fallback when the shape is wrong', async () => {
    await AsyncStorage.setItem('@ecotrek/test/arr', '{"not":"an array"}');
    expect(await loadJSON<string[]>('@ecotrek/test/arr', ['fallback'], isArray)).toEqual([
      'fallback',
    ]);

    await AsyncStorage.setItem('@ecotrek/test/obj', '[1,2,3]');
    expect(await loadJSON('@ecotrek/test/obj', { ok: 1 }, isObject)).toEqual({ ok: 1 });
  });

  it('loadJSON passes valid, shape-correct data through', async () => {
    await AsyncStorage.setItem('@ecotrek/test/good', '["a","b"]');
    expect(await loadJSON<string[]>('@ecotrek/test/good', [], isArray)).toEqual(['a', 'b']);
  });

  it('isArray and isObject describe plain values correctly', () => {
    expect(isArray([1])).toBe(true);
    expect(isArray({})).toBe(false);
    expect(isArray(null)).toBe(false);
    expect(isObject({ a: 1 })).toBe(true);
    expect(isObject([1])).toBe(false);
    expect(isObject(null)).toBe(false);
  });
});

describe('ErrorBoundary', () => {
  let shouldThrow: boolean;
  function Bomber() {
    if (shouldThrow) throw new Error('kaboom-test');
    return <Text>Back on track</Text>;
  }

  // React logs the thrown error while rendering; the global spy in
  // jest.setup.js treats any other console.error as a real problem. Inside
  // these tests the error IS the thing under test, so quiet it here.
  let quietConsole: jest.SpyInstance;

  beforeEach(() => {
    shouldThrow = true;
    quietConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    quietConsole.mockRestore();
  });

  it('shows the calm fallback when a screen throws — with no providers at all', async () => {
    const utils = render(
      <ErrorBoundary>
        <Bomber />
      </ErrorBoundary>
    );
    await waitFor(() => expect(utils.queryByText('Something went wrong')).toBeTruthy());
    expect(utils.queryByText('kaboom-test')).toBeTruthy();
    expect(utils.getByLabelText('Try again')).toBeTruthy();
  });

  it('recovers when the error is transient', async () => {
    const utils = render(
      <ErrorBoundary>
        <Bomber />
      </ErrorBoundary>
    );
    await waitFor(() => expect(utils.queryByText('Something went wrong')).toBeTruthy());

    shouldThrow = false; // the transient problem is gone
    fireEvent.press(utils.getByLabelText('Try again'));
    await waitFor(() => expect(utils.queryByText('Back on track')).toBeTruthy());
    expect(utils.queryByText('Something went wrong')).toBeNull();
  });
});
