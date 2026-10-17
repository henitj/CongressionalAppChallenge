import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Linking, Alert, View, Text, Pressable } from 'react-native';
import * as Location from 'expo-location';
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
import { SocialProvider } from '../context/SocialContext';
import SocialScreen from '../screens/SocialScreen';
import { encodeFriendChallenge, encodeHikePlan } from '../services/social';

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
  jest.restoreAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem('@ecotrek/auth_user', JSON.stringify(TEST_USER));
  await AsyncStorage.setItem('@ecotrek/test-user/tree-introduction-seen', JSON.stringify(true));
  jest.spyOn(Location, 'getForegroundPermissionsAsync').mockResolvedValue({ status: 'denied' } as any);
  jest.spyOn(Location, 'requestForegroundPermissionsAsync').mockResolvedValue({ status: 'denied' } as any);
  jest.spyOn(Location, 'getLastKnownPositionAsync').mockResolvedValue(null);
  jest.spyOn(Location, 'getCurrentPositionAsync').mockResolvedValue({ coords: { latitude: 30.2672, longitude: -97.7431 }, timestamp: Date.now() } as any);
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
                      <SocialProvider>
                      <NotificationProvider>
                        <WeatherProvider notificationsEnabled={false}>
                          <AnalyticsProvider>
                            <NavigationContainer>{children}</NavigationContainer>
                          </AnalyticsProvider>
                        </WeatherProvider>
                      </NotificationProvider>
                      </SocialProvider>
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

async function mount(Component: React.ComponentType<any>, anchor: string | RegExp, initialParams?: Record<string, unknown>) {
  const utils = render(
    <Providers>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Target" component={Component} initialParams={initialParams} />
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
  ['Conditions', ConditionsScreen, /Location needed|Conditions unavailable|Today and the next few hours/i],
  ['Badges', BadgesScreen, /of .* badges earned/i],
  ['Safety', SafetyScreen, 'Emergency numbers'],
  ['Settings', SettingsScreen, 'Units'],
  ['Streak', StreakScreen, 'Weekly Streak'],
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
  it('More does not expose a user-facing assistant or Grok chat', async () => {
    const utils = await mount(MoreScreen, 'My walks');
    expect(utils.queryByText(/Assistant|Grok|Puter/i)).toBeNull();
  });

  it('asks for a real location instead of showing Austin to a new international user', async () => {
    const utils = await mount(TrailsScreen, 'Trails');
    await waitFor(() => expect(utils.queryByText('Find trails near you')).toBeTruthy());
    expect(utils.queryByText(AUSTIN_TRAILS[0].name)).toBeNull();
    expect(utils.getByText('Use location')).toBeTruthy();
  });

  it('trail details lead with the selected trail photos and useful actions', async () => {
    const intel = jest.spyOn(TrailIntelService, 'getTrailIntel');
    const cover = jest.spyOn(TrailPhotosService, 'getTrailCover');
    const photo = { url: 'https://commons.wikimedia.org/trail-view.jpg', thumbUrl: 'https://commons.wikimedia.org/trail-view.jpg', title: 'Trail view', kind: 'scenery' as const };
    const gallery = jest.spyOn(TrailPhotosService, 'getTrailPhotos').mockResolvedValue({ scenery: [photo], path: [], all: [photo] });
    const permission = jest.spyOn(Location, 'getForegroundPermissionsAsync').mockResolvedValue({ status: 'granted' } as any);
    try {
      const utils = await mount(TrailsScreen, 'Trails');
      await waitFor(() => expect(cover).toHaveBeenCalled(), { timeout: 4000 });
      expect(gallery).not.toHaveBeenCalled();
      fireEvent.press(utils.getAllByLabelText(/^Open /)[0]);
      await waitFor(() => expect(gallery).toHaveBeenCalledTimes(1));
      expect(utils.getByText('Photos of this trail')).toBeTruthy();
      expect(utils.getByText('Share with friends')).toBeTruthy();
      expect(utils.getByText('Rate this trail')).toBeTruthy();
      expect(intel).not.toHaveBeenCalled();
      expect(utils.queryByText('Ask AI about it')).toBeNull();
    } finally { permission.mockRestore(); intel.mockRestore(); cover.mockRestore(); gallery.mockRestore(); }
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
      await waitFor(() => expect(utils.queryByText(/Community photos aren’t available right now/i)).toBeTruthy());
      expect(utils.queryByText('Trail photo preview')).toBeTruthy();
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
    expect(utils.queryByText(/Share it anywhere/i)).toBeTruthy();
    expect(utils.queryByText('Share as image')).toBeTruthy();
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
  it('shows gradual growth without exposing image counts or spending on preview', async () => {
    const utils = await mount(TreeScreen, 'This week’s care');
    expect(utils.getByLabelText('Add water for 1 gem')).toBeDisabled();
    expect(utils.getByText('New seedling')).toBeTruthy();
    expect(utils.queryByText(/Growth image \d+ \/ \d+/i)).toBeNull();
    fireEvent.press(utils.getByText('Explore growth stages'));
    await waitFor(() => expect(utils.queryByText('Tree growth stages')).toBeTruthy());
    fireEvent.press(utils.getByLabelText('Preview Sage tree'));
    expect(utils.getByText('Browse every illustrated stage without changing your real tree. Progress still needs calendar time and consistent weekly care.')).toBeTruthy();
    expect(utils.getByLabelText('0 gems available')).toBeTruthy();
    fireEvent.press(utils.getByLabelText('Close'));
    expect(utils.getByText('New seedling')).toBeTruthy();
  });

  it('introduces growth and the oldest sage before Done opens the live tree', async () => {
    await AsyncStorage.removeItem('@ecotrek/test-user/tree-introduction-seen');
    const utils = await mount(TreeScreen, 'A little care grows a tree');
    expect(utils.getByText('A little care grows a tree')).toBeTruthy();
    fireEvent.press(utils.getByText('Next'));
    await waitFor(() => expect(utils.getByText('The oldest sage tree')).toBeTruthy());
    expect(utils.getByText(/six months/i)).toBeTruthy();
    fireEvent.press(utils.getByText('Done'));
    await waitFor(() => expect(utils.getByText('This week’s care')).toBeTruthy());
  });
});


describe('friends & plans (database-free social)', () => {
  it('does not offer a sample trail when location discovery has not found one', async () => {
    const utils = await mount(SocialScreen, /Plan a hike/);
    expect(utils.getByText('Find trails near you before planning a hike with friends.')).toBeTruthy();
    fireEvent.press(utils.getByText('Create hike & share invite'));
    expect(utils.getByText('Find nearby trails first, then choose one to plan with friends.')).toBeTruthy();
  });

  it('creates a hike plan from a selected trail, imports a challenge code, and tracks RSVP state', async () => {
    const utils = await mount(SocialScreen, /Plan a hike/, { trailId: 'barton-creek' });
    expect(utils.queryByText(/Plan a hike/)).toBeTruthy();
    expect(utils.queryByText(/Challenge a friend/)).toBeTruthy();
    fireEvent.press(utils.getByText('Create hike & share invite'));
    await waitFor(() => expect(utils.queryByText('My hike plans')).toBeTruthy());
    await waitFor(() => expect(utils.queryByText(/I'm in/)).toBeTruthy());
    // Import a friend's challenge by pasting its code.
    const now = Date.now();
    const code = encodeFriendChallenge({ id: 'friend-c1', title: 'Walk 5 miles in 7 days', metric: 'miles', targetMiles: 5, deadline: now + 7 * 86400000, fromName: 'Jo', createdAt: now });
    const input = utils.getByLabelText('Paste a hike or challenge code');
    fireEvent.changeText(input, code);
    fireEvent.press(utils.getByText('Add it'));
    await waitFor(() => expect(utils.queryByText(/challenged you: Walk 5 miles/)).toBeTruthy());
    await waitFor(() => expect(utils.queryByText('Accept challenge')).toBeTruthy());
    fireEvent.press(utils.getByText('Accept challenge'));
    await waitFor(() => expect(utils.queryByText('Accept challenge')).toBeNull());
    // Re-importing the same code five times never duplicates the challenge.
    for (let i = 0; i < 5; i++) { fireEvent.changeText(input, code); fireEvent.press(utils.getByText('Add it')); }
    await waitFor(() => expect(utils.getAllByText(/Share result with challenger|Share \/ re-send/).length).toBe(1));
    // A junk code is rejected gracefully.
    fireEvent.changeText(input, 'v1.garbage.zzz');
    fireEvent.press(utils.getByText('Add it'));
    await waitFor(() => expect(utils.queryByText(/does not look right/)).toBeTruthy());
  });

  it('imports a hike plan from a deep-link style code and lets you RSVP out', async () => {
    const now = Date.now();
    const code = encodeHikePlan({ id: 'friend-p1', trailId: 'barton-creek', trailName: 'Barton Creek Greenbelt', area: 'South Austin', startsAt: now + 86400000, durationMin: 120, notes: '', hostName: 'Jo', createdAt: now });
    const utils = await mount(SocialScreen, /Plan a hike/, { plan: code });
    await waitFor(() => expect(utils.queryByText(/You're invited: Barton Creek/)).toBeTruthy());
    fireEvent.press(utils.getByLabelText(/I'm out for Barton Creek/));
    await waitFor(() => expect(utils.getAllByText('Barton Creek Greenbelt').length).toBe(1));
  });
});

describe('social v2: cleanup challenges, results, RSVP, sapling', () => {
  it('creates a cleanup challenge and shows a friend result sent back', async () => {
    const utils = await mount(SocialScreen, /Plan a hike/);
    fireEvent.press(utils.getByText(/Trail cleanup/));
    fireEvent.press(utils.getByText('Create challenge & share'));
    await waitFor(() => expect(utils.queryByText(/Pick up 25 pieces of litter/)).toBeTruthy());
    const now = Date.now();
    const code = encodeFriendChallenge({ id: 'loop-c1', title: 'Walk 5 miles in 7 days', metric: 'miles', targetMiles: 5, deadline: now + 7 * 86400000, fromName: 'Jo', createdAt: now });
    fireEvent.changeText(utils.getByLabelText('Paste a hike or challenge code'), code);
    fireEvent.press(utils.getByText('Add it'));
    await waitFor(() => expect(utils.queryByText(/challenged you: Walk 5 miles/)).toBeTruthy());
    const { encodeChallengeResult } = require('../services/social');
    fireEvent.changeText(utils.getByLabelText('Paste a hike or challenge code'), encodeChallengeResult({ challengeId: 'loop-c1', name: 'Jo', amount: 5, completed: true, at: now }));
    fireEvent.press(utils.getByText('Add it'));
    await waitFor(() => expect(utils.queryByText(/sent their result/)).toBeTruthy());
    await waitFor(() => expect(utils.queryByText(/Jo: 5 mi — finished it!/)).toBeTruthy());
  });

  it('imports a sapling gift and plants it for a tree head start', async () => {
    const utils = await mount(SocialScreen, /Plan a hike/);
    const now = Date.now();
    const { encodeSapling } = require('../services/social');
    const input = utils.getByLabelText('Paste a hike or challenge code');
    fireEvent.changeText(input, encodeSapling({ id: 'sap-1', fromName: 'Jo', stageName: 'Sapling', imageIndex: 12, createdAt: now }));
    fireEvent.press(utils.getByText('Add it'));
    await waitFor(() => expect(utils.queryByText(/passed you a sapling/)).toBeTruthy());
    fireEvent.press(utils.getByText('Plant it'));
    await waitFor(() => expect(utils.queryByText(/got a 4-week head start/)).toBeTruthy());
  });

  it('applies an RSVP code to my own hike plan', async () => {
    const utils = await mount(SocialScreen, /Plan a hike/, { trailId: 'barton-creek' });
    fireEvent.press(utils.getByText('Create hike & share invite'));
    await waitFor(() => expect(utils.queryByText(/I'm in/)).toBeTruthy());
    const now = Date.now();
    const { encodeHikePlan, encodeRsvp } = require('../services/social');
    const input = utils.getByLabelText('Paste a hike or challenge code');
    fireEvent.changeText(input, encodeHikePlan({ id: 'host-p1', trailId: 'barton-creek', trailName: 'Barton Creek Greenbelt', area: 'South Austin', startsAt: now + 86400000, durationMin: 120, notes: '', hostName: 'Me', createdAt: now }));
    fireEvent.press(utils.getByText('Add it'));
    await waitFor(() => expect(utils.queryByText(/You're invited: Barton Creek/)).toBeTruthy());
    fireEvent.changeText(input, encodeRsvp({ planId: 'host-p1', name: 'Jo', status: 'in' }));
    fireEvent.press(utils.getByText('Add it'));
    await waitFor(() => expect(utils.queryByText(/RSVP is saved/)).toBeTruthy());
    await waitFor(() => expect(utils.queryByText(/Replies: ✅ Jo/)).toBeTruthy());
  });
});
