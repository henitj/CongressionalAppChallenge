import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { LinkingOptions } from '@react-navigation/native';

import HomeScreen from '../screens/HomeScreen';
import TrackScreen from '../screens/TrackScreen';
import MoreScreen from '../screens/MoreScreen';
import ActiveTrackingScreen from '../screens/ActiveTrackingScreen';
import TrailsScreen from '../screens/TrailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ImpactScreen from '../screens/ImpactScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SafetyScreen from '../screens/SafetyScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import TreeScreen from '../screens/TreeScreen';
import ConditionsScreen from '../screens/ConditionsScreen';
import StreakScreen from '../screens/StreakScreen';
import AssistantScreen from '../screens/AssistantScreen';
import ActivityDetailScreen from '../screens/ActivityDetailScreen';
import RecapScreen from '../screens/RecapScreen';
import HistoryScreen from '../screens/HistoryScreen';
import BadgesScreen from '../screens/BadgesScreen';

import Icon, { IconName } from '../components/Icon';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * URL-based linking — this is what makes the Android (hardware/gesture)
 * back button work at all.
 *
 * The phone app ships as a native WebView shell around this app's web
 * export (see android-shell/README.md). That shell's back button handler
 * already does the right thing: `webView.goBack()` if there is WebView
 * history, otherwise let the activity close. But without a `linking`
 * config, React Navigation on web never calls `history.pushState` when you
 * move between screens — every screen change is pure in-memory state, the
 * browser URL never changes, and the WebView never gains a single extra
 * history entry. So `canGoBack()` was always false and the very first back
 * press on *any* screen fell straight through to closing the app.
 *
 * Giving every screen a path means each `navigate(...)` call pushes real
 * browser history, which the native shell's `webView.canGoBack()` can then
 * walk back through one screen at a time — and only exits once that
 * history is actually exhausted (i.e. you are back at the first screen).
 */
export const linking: LinkingOptions<any> = {
  prefixes: ['https://appassets.ecotrek.app', 'ecotrek://'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: 'home',
          Track: 'track',
          More: 'more',
        },
      },
      ActiveTracking: 'active-tracking',
      Trails: 'trails',
      Profile: 'profile',
      Impact: 'impact',
      Challenges: 'challenges',
      Tree: 'tree',
      Conditions: 'conditions',
      Streak: 'streak',
      Assistant: 'assistant',
      ActivityDetail: 'activity/:activityId',
      Recap: 'recap',
      Safety: 'safety',
      Settings: 'settings',
      History: 'history',
      Badges: 'badges',
    },
  },
};

const TABS: { name: string; icon: IconName; label: string }[] = [
  { name: 'Home', icon: 'home', label: 'Home' },
  { name: 'Track', icon: 'play', label: 'Start' },
  { name: 'More', icon: 'sliders', label: 'More' },
];

function TabItem({ icon, label, focused }: { icon: IconName; label: string; focused: boolean }) {
  const { colors, fontScale } = useTheme();
  return (
    <View style={[styles.tabItem, { width: Math.round(72 * Math.max(1, fontScale)) }]}>
      <Icon
        name={icon}
        size={Math.round(24 * Math.max(1, fontScale))}
        color={focused ? colors.primary : colors.textMuted}
        strokeWidth={focused ? 2.2 : 1.8}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? colors.primary : colors.textMuted, fontSize: Math.round(12 * fontScale) },
        ]}
        numberOfLines={1}
        accessibilityLabel={label}
      >
        {label}
      </Text>
    </View>
  );
}

function Tabs() {
  const { colors, fontScale } = useTheme();
  // Large text grows the tab labels, so the bar has to grow
  // with them — otherwise the words are clipped by the bar's fixed height.
  const barHeight = Math.round((Platform.OS === 'ios' ? 94 : 78) + (fontScale - 1) * 34);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find((t) => t.name === route.name);
        return {
          headerShown: false,
          unmountOnBlur: true,
          tabBarShowLabel: false,
          tabBarStyle: [
            styles.tabBar,
            { backgroundColor: colors.surface, borderTopColor: colors.border, height: barHeight },
          ],
          tabBarItemStyle: { paddingTop: 6 },
          tabBarIcon: ({ focused }) => (
            <TabItem icon={tab?.icon ?? 'circle'} label={tab?.label ?? route.name} focused={focused} />
          ),
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { motionEnabled } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: motionEnabled ? 'default' : 'none' }}
    >
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen
        name="ActiveTracking"
        component={ActiveTrackingScreen}
        options={{
          gestureEnabled: false,
          animation: motionEnabled ? 'slide_from_bottom' : 'none',
        }}
      />
      <Stack.Screen name="Trails" component={TrailsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Impact" component={ImpactScreen} />
      <Stack.Screen name="Challenges" component={ChallengesScreen} />
      <Stack.Screen name="Tree" component={TreeScreen} />
      <Stack.Screen name="Conditions" component={ConditionsScreen} />
      <Stack.Screen name="Streak" component={StreakScreen} />
      <Stack.Screen name="Assistant" component={AssistantScreen} />
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
      <Stack.Screen name="Recap" component={RecapScreen} />
      <Stack.Screen name="Safety" component={SafetyScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Badges" component={BadgesScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 94 : 78,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 6,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 72,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
