import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking, Alert, View, Text, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { AppProvider } from '../context/AppContext';
import { EcoPointsProvider } from '../context/EcoPointsContext';
import { GemsProvider } from '../context/GemsContext';
import { TreeGrowthProvider } from '../context/TreeGrowthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ClubProvider } from '../context/ClubContext';
import { StreakProvider } from '../context/StreakContext';
import { ActivityProvider } from '../context/ActivityContext';
import { LogbookProvider } from '../context/LogbookContext';
import { ChallengeProvider } from '../context/ChallengeContext';
import { NotificationProvider } from '../context/NotificationContext';
import { WeatherProvider } from '../context/WeatherContext';
import { AnalyticsProvider } from '../context/AnalyticsContext';
import { ProfileProvider } from '../context/ProfileContext';

import HomeScreen from '../screens/HomeScreen';
import Header from '../components/Header';
import { TrailCover, TrailPhotoGallery } from '../components/TrailPhotos';
import { AUSTIN_TRAILS } from '../constants/austinTrails';
import * as TrailPhotosService from '../services/trailPhotos';
import * as TrailIntelService from '../services/trailIntel';
import TrackScreen from '../screens/TrackScreen';
import TreeScreen from '../screens/TreeScreen';
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
import FeedbackSheet from '../components/FeedbackSheet';
import { askPuterModel, extractPuterReply } from '../services/aiProvider';

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
          <GemsProvider>
            <TreeGrowthProvider>
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
            </TreeGrowthProvider>
            </GemsProvider>
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
  ['Home', HomeScreen, 'A little time outside.'],
  ['Track', TrackScreen, /1 symbolic tree per 1 mile/],
  ['Tree', TreeScreen, 'This week’s care'],
  ['More', MoreScreen, 'My walks'],
  ['Trails', TrailsScreen, 'Trails'],
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

describe('trail discovery upgrades', () => {
  it('Home does not expose the AI entry point', async () => {
    const utils = await mount(HomeScreen, 'A little time outside.');
    expect(utils.queryByTestId('assistant-fab')).toBeNull();
  });

  it('Trails is immediately browsable and has no automatic AI UI', async () => {
    const utils = await mount(TrailsScreen, 'Trails');
    expect(utils.queryByTestId('assistant-fab')).toBeNull();
    expect(utils.getAllByLabelText(/^Open /).length).toBeGreaterThan(0);
    expect(utils.queryByText('AI trail notes')).toBeNull();
  });

  it('trail details put ratings first and only load photos/extra notes on request', async () => {
    const intel = jest.spyOn(TrailIntelService, 'getTrailIntel');
    const cover = jest.spyOn(TrailPhotosService, 'getTrailCover');
    const gallery = jest.spyOn(TrailPhotosService, 'getTrailPhotos');
    try {
      const utils = await mount(TrailsScreen, 'Trails');
      expect(cover).not.toHaveBeenCalled();
      fireEvent.press(utils.getAllByLabelText(/^Rate /)[0]);
      await waitFor(() => expect(utils.queryByText('Your rating')).toBeTruthy());
      expect(utils.getByLabelText('5 stars')).toBeTruthy();
      expect(intel).not.toHaveBeenCalled();
      expect(gallery).not.toHaveBeenCalled();
      expect(utils.queryByText('Ask AI about it')).toBeNull();
      fireEvent.press(utils.getByText('Photos'));
      await waitFor(() => expect(gallery).toHaveBeenCalledTimes(1));
      expect(intel).not.toHaveBeenCalled();
    } finally { intel.mockRestore(); cover.mockRestore(); gallery.mockRestore(); }
  });

  it('Trails filter chips are multi-select and stack', async () => {
    const utils = await mount(TrailsScreen, 'Trails');

    // Both chips can be active at once — selecting the second must not
    // deselect the first (the old behaviour was single-choice).
    fireEvent.press(utils.getByLabelText('Filters and sort'));
    fireEvent.press(utils.getByText('Dog friendly'));
    fireEvent.press(utils.getByText('Family'));

    // The filter button badge counts BOTH active filters.
    const badge = utils.getByLabelText('Filters and sort');
    expect(badge).toBeTruthy();
    expect(utils.queryByText('2')).toBeTruthy();

    // Tapping an active chip toggles it back off.
    fireEvent.press(utils.getByText('Family'));
    expect(utils.queryByText('1')).toBeTruthy();

    // "All" clears everything.
    fireEvent.press(utils.getByText('Reset'));
    expect(utils.queryByText('1')).toBeFalsy();
  });

  it('the filter sheet has sliders for length, distance away, and climb', async () => {
    const utils = await mount(TrailsScreen, 'Trails');
    fireEvent.press(utils.getByLabelText('Filters and sort'));

    await waitFor(() => expect(utils.queryByText('Filter trails')).toBeTruthy(), {
      timeout: 4000,
    });
    expect(utils.getByLabelText('Trail length')).toBeTruthy();
    expect(utils.getByLabelText('Distance from you')).toBeTruthy();
    expect(utils.getByLabelText('Elevation gain')).toBeTruthy();
    // Untouched sliders read as "no limit".
    expect(utils.getByText('Any length')).toBeTruthy();
    expect(utils.getByText('Any distance')).toBeTruthy();
    expect(utils.getByText('Any climb')).toBeTruthy();
    // Sorting now lives in the same sheet.
    expect(utils.getByText('Sort by')).toBeTruthy();
    expect(utils.getByText('Your highest rated')).toBeTruthy();
  });

  it('slider accessibility actions adjust the value', async () => {
    const utils = await mount(TrailsScreen, 'Trails');
    fireEvent.press(utils.getByLabelText('Filters and sort'));
    await waitFor(() => expect(utils.queryByText('Filter trails')).toBeTruthy(), {
      timeout: 4000,
    });

    const slider = utils.getByLabelText('Trail length');
    fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    // 15 (Any length) stepped down once → "under 14 mi".
    expect(utils.getByText('under 14 mi')).toBeTruthy();
    fireEvent(slider, 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    expect(utils.getByText('Any length')).toBeTruthy();
  });
});

describe('navigation and trail imagery fixes', () => {
  it('the Trails header back button returns to the previous screen', async () => {
    const TestHome = ({ navigation }: any) => (
      <View>
        <Header title="Home" />
        <Pressable onPress={() => navigation.navigate('Trails')}><Text>Open Trails</Text></Pressable>
        <Text>Home screen visible</Text>
      </View>
    );
    const TestTrails = () => (
      <View>
        <Header title="Trails" back />
        <Text>Trails test screen</Text>
      </View>
    );
    const utils = render(
      <Providers>
        <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={TestHome} />
          <Stack.Screen name="Trails" component={TestTrails} />
        </Stack.Navigator>
      </Providers>
    );
    await waitFor(() => expect(utils.queryByText('Home screen visible')).toBeTruthy());
    fireEvent.press(utils.getByText('Open Trails'));
    await waitFor(() => expect(utils.queryByText('Trails test screen')).toBeTruthy());
    fireEvent.press(utils.getByLabelText('Go back'));
    await waitFor(() => expect(utils.queryByText('Trails test screen')).toBeNull());
    expect(utils.queryByText('Home screen visible')).toBeTruthy();
  });

  it('trail cards/details show an illustrated fallback when community photos are unavailable', async () => {
    const cover = jest.spyOn(TrailPhotosService, 'getTrailCover').mockResolvedValue(null);
    const gallery = jest.spyOn(TrailPhotosService, 'getTrailPhotos').mockResolvedValue({
      scenery: [],
      path: [],
      all: [],
    });
    try {
      const trail = { ...AUSTIN_TRAILS[0], imageUrl: undefined };
      const TrailPreview = () => (
        <View>
          <TrailCover trail={trail} />
          <TrailPhotoGallery trail={trail} />
          <Text>Photos preview test ready</Text>
        </View>
      );
      const utils = await mount(TrailPreview, 'Photos preview test ready');
      await waitFor(() => expect(utils.queryByText(/Photos are unavailable offline/i)).toBeTruthy());
      expect(utils.queryByText('Trail photos')).toBeFalsy();
    } finally {
      cover.mockRestore();
      gallery.mockRestore();
    }
  });
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

describe('the badge reward celebration', () => {
  it('a new badge wears a NEW mark and pays points with a celebration when claimed', async () => {
    // Seed one unlocked, unclaimed badge for the test user.
    await AsyncStorage.setItem(
      '@ecotrek/test-user/badges',
      JSON.stringify([{ id: 'first_hike', unlocked: true, unlockedAt: Date.now() }])
    );

    const utils = await mount(BadgesScreen, /of .* badges earned/);
    expect(utils.getByText(/new badge to claim/)).toBeTruthy();

    const tile = utils.getByLabelText(/First Steps\. New/);
    // Claiming is deliberately one tap: no detail sheet and no second button.
    fireEvent.press(tile);
    expect(utils.queryByText('Claim +20 EcoPoints')).toBeNull();
    await waitFor(() => expect(utils.queryByText('Badge unlocked!')).toBeTruthy(), {
      timeout: 4000,
    });
    expect(utils.queryByText('+20 EcoPoints')).toBeTruthy();

    // Tap the celebration away so the auto-dismiss timer is cleaned up.
    fireEvent.press(utils.getByLabelText('Dismiss celebration'));
    await waitFor(() => expect(utils.queryByText('Badge unlocked!')).toBeNull(), {
      timeout: 4000,
    });
  });
});

describe('the post-walk feedback popup', () => {
  it('asks after a walk and offers an honest way out', async () => {
    const utils = await mount(
      () => <FeedbackSheet visible onClose={() => {}} kind="hike" />,
      'How was that?'
    );
    expect(utils.queryByText('Give feedback')).toBeTruthy();
    expect(utils.queryByText('Not now')).toBeTruthy();
  });

  it('Give feedback opens the Google Form', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const utils = await mount(
      () => <FeedbackSheet visible onClose={() => {}} kind="hike" />,
      'How was that?'
    );
    fireEvent.press(utils.getByText('Give feedback'));
    expect(openURL).toHaveBeenCalledWith('https://forms.gle/mt4x5mzAyaG2xFEE6');
    openURL.mockRestore();
  });
});

describe('online Grok assistant provider', () => {
  it('accepts Puter reply shapes without rejecting valid long answers', () => {
    expect(extractPuterReply({ message: { content: '  A custom answer.  ' } })).toBe('A custom answer.');
    expect(extractPuterReply({ message: { content: [{ text: 'Hello' }, { text: 'there' }] } })).toBe('Hello there');
    expect(extractPuterReply({ message: { content: '' } })).toBeNull();
    expect(extractPuterReply({ text: 'x'.repeat(2001) })).toHaveLength(2001);
    expect(extractPuterReply({ text: 'x'.repeat(9000) })).toContain('Reply shortened.');
  });

  it('sends custom questions and relevant trail facts to Puter Grok', async () => {
    const previousWindow = (globalThis as any).window;
    const chat = jest.fn().mockResolvedValue({ message: { content: 'A real model answer.' } });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: { puter: { ai: { chat } } },
    });
    try {
      const answer = await askPuterModel(
        'Can you invent a funny name for a hiking club?',
        { trail: { name: 'Walnut Creek' }, allTrails: [], weather: null }
      );
      expect(answer).toBe('A real model answer.');
      expect(chat).toHaveBeenCalledTimes(1);
      const [messages, options] = chat.mock.calls[0];
      expect(messages[messages.length - 1].content).toContain('funny name');
      expect(messages[0].content).toContain('Walnut Creek');
      expect(options.model).toBe('x-ai/grok-4.7');
    } finally {
      if (previousWindow === undefined) delete (globalThis as any).window;
      else Object.defineProperty(globalThis, 'window', { configurable: true, writable: true, value: previousWindow });
    }
  });
});

describe('the trash question at the end of a walk', () => {
  function PostWalkQuestion({ onLogged }: { onLogged?: (n: number) => void }) {
    return (
      <CleanupSheet
        visible
        onClose={() => {}}
        title="How many pieces of trash do you pick up?"
        subtitle="Nice walk — every piece counts for extra points"
        allowNone
        onLogged={onLogged}
      />
    );
  }

  it('asks the question and offers an honest way out', async () => {
    const utils = await mount(PostWalkQuestion, 'How many pieces of trash do you pick up?');
    expect(utils.queryByText('How many pieces of trash do you pick up?')).toBeTruthy();
    expect(utils.queryByText('None this time')).toBeTruthy();
    // Small presets are quick to tap; the full honest range remains available in the field.
    expect(utils.getByLabelText('10 pieces')).toBeTruthy();
    expect(utils.getByLabelText('5 pieces')).toBeTruthy();
    expect(utils.getByLabelText('Number of pieces collected, 0 to 99')).toBeTruthy();
  });

  it('logging pieces hands the count back so points can be awarded', async () => {
    const logged: number[] = [];
    const Screen = () => <PostWalkQuestion onLogged={(n) => logged.push(n)} />;
    const utils = await mount(Screen, 'How many pieces of trash do you pick up?');

    fireEvent.press(utils.getByLabelText('10 pieces'));
    await waitFor(() => expect(utils.queryByText('Log 10 pieces')).toBeTruthy());
    fireEvent.press(utils.getByText('Log 10 pieces'));

    await waitFor(() => expect(logged).toEqual([10]));
  });
});

describe('stop button, feedback and the removed contacts feature', () => {
  it('tracking puts a big one-tap Stop and save control at the bottom', async () => {
    const utils = await mount(ActiveTrackingScreen, /Tracking/);
    expect(utils.getByLabelText('Pause')).toBeTruthy();
    expect(utils.getByText(/Stop and save/)).toBeTruthy();
  });

  it('tapping Stop finishes the hike and shows the summary', async () => {
    const utils = await mount(ActiveTrackingScreen, /Tracking/);
    fireEvent.press(utils.getByText(/Stop and save/));
    // A zero-second, zero-mile activity is rejected by design — the summary
    // must still appear, and the post-walk feedback popup is not offered.
    await waitFor(() => expect(utils.queryByText('This one did not count')).toBeTruthy(), { timeout: 8000 });
    expect(utils.queryByText('Give feedback')).toBeNull();
    expect(utils.queryByText('How was that?')).toBeNull();
    expect(utils.queryByText('Done')).toBeTruthy();
  });

  it('the contacts feature is gone from Settings', async () => {
    const utils = await mount(SettingsScreen, 'Units');
    expect(utils.queryByText('Emergency contact')).toBeNull();
    expect(utils.queryByLabelText('Emergency contact name')).toBeNull();
    expect(utils.queryByLabelText('Emergency contact phone')).toBeNull();
  });

  it('More ends with a Give Feedback button that opens the Google Form', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const utils = await mount(MoreScreen, 'My walks');
    fireEvent.press(utils.getByText('Give Feedback'));
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('https://forms.gle/mt4x5mzAyaG2xFEE6');
    openURL.mockRestore();
  });

  it('Give Feedback no longer lives on the Profile page', async () => {
    const utils = await mount(ProfileScreen, 'Share my progress');
    expect(utils.queryByText('Give Feedback')).toBeNull();
  });

  it('a failed open shows a friendly alert instead of crashing', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no browser'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const utils = await mount(MoreScreen, 'My walks');
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
    await waitFor(() => expect(queryByText('Start walking')).toBeTruthy());
    // The Google button is deliberately gone: without configured OAuth client
    // IDs it could only ever fail, so the screen offers the local profile only.
    expect(queryByText(/Google/i)).toBeNull();
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
    expect(queryByText('First name')).toBeTruthy();
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

  it('the start tutorial explains the 0–99 honesty count', async () => {
    const utils = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <OnboardingScreen onDone={() => {}} />
      </SafeAreaProvider>
    );

    for (let i = 0; i < 4; i += 1) {
      fireEvent.press(utils.getByText('Next'));
    }
    await waitFor(() => expect(utils.queryByText('Every piece counts.')).toBeTruthy());
    expect(utils.queryByText(/0 to 99/i)).toBeTruthy();
    expect(utils.queryByText('Small reward, capped at 10 points')).toBeTruthy();
  });
});

describe('empty states say something useful', () => {
  it('Home tells a brand new user what to do', async () => {
    const { queryByText } = await mount(HomeScreen, 'A little time outside.');
    expect(queryByText('Start a walk')).toBeTruthy();
    expect(queryByText('Explore trails')).toBeTruthy();
    expect(queryByText('Quick actions')).toBeNull();
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


describe('the redesigned tree page', () => {
  it('shows affordable-care requirements and previews growth without spending', async () => {
    const utils = await mount(TreeScreen, 'This week’s care');
    expect(utils.getByLabelText('Add water for 1 gem')).toBeDisabled();
    expect(utils.getByText('Growth image 1 / 100')).toBeTruthy();
    fireEvent.press(utils.getByText('Explore 100 images'));
    await waitFor(() => expect(utils.queryByText('100 small steps of growth')).toBeTruthy());
    fireEvent.press(utils.getByLabelText('Preview Sage tree'));
    expect(utils.getByText('All 100 images can be explored. Your real tree still needs calendar age and consistent weekly care. Previewing spends nothing and changes no progress.')).toBeTruthy();
    expect(utils.getByLabelText('0 gems available')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Close'));
    expect(utils.getByText('Growth image 1 / 100')).toBeTruthy();
  });
});
