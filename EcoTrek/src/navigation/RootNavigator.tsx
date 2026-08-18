import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import TrackScreen from '../screens/TrackScreen';
import ActiveTrackingScreen from '../screens/ActiveTrackingScreen';
import TrailsScreen from '../screens/TrailsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ImpactScreen from '../screens/ImpactScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SafetyScreen from '../screens/SafetyScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import ConditionsScreen from '../screens/ConditionsScreen';
import StreakScreen from '../screens/StreakScreen';
import AssistantScreen from '../screens/AssistantScreen';
import ActivityDetailScreen from '../screens/ActivityDetailScreen';
import RecapScreen from '../screens/RecapScreen';
import HistoryScreen from '../screens/HistoryScreen';

import Icon, { IconName } from '../components/Icon';
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TABS: { name: string; icon: IconName; label: string }[] = [
  { name: 'Home', icon: 'home', label: 'Home' },
  { name: 'Track', icon: 'navigation', label: 'Track' },
  { name: 'Trails', icon: 'map', label: 'Trails' },
  { name: 'Clubs', icon: 'users', label: 'Clubs' },
  { name: 'Profile', icon: 'user', label: 'Profile' },
];

function TabItem({ icon, label, focused }: { icon: IconName; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Icon
        name={icon}
        size={22}
        color={focused ? COLORS.primary : COLORS.textMuted}
        strokeWidth={focused ? 2.2 : 1.8}
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find((t) => t.name === route.name);
        return {
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: { paddingTop: 6 },
          tabBarIcon: ({ focused }) => (
            <TabItem
              icon={tab?.icon ?? 'circle'}
              label={tab?.label ?? route.name}
              focused={focused}
            />
          ),
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen name="Trails" component={TrailsScreen} />
      <Tab.Screen name="Clubs" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen
        name="ActiveTracking"
        component={ActiveTrackingScreen}
        options={{
          gestureEnabled: false,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="Impact" component={ImpactScreen} />
      <Stack.Screen name="Challenges" component={ChallengesScreen} />
      <Stack.Screen name="Conditions" component={ConditionsScreen} />
      <Stack.Screen name="Streak" component={StreakScreen} />
      <Stack.Screen name="Assistant" component={AssistantScreen} />
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
      <Stack.Screen name="Recap" component={RecapScreen} />
      <Stack.Screen name="Safety" component={SafetyScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 4,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 64,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
