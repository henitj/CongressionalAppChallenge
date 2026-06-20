import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import TrackScreen from '../screens/TrackScreen';
import TrailsScreen from '../screens/TrailsScreen';
import ImpactScreen from '../screens/ImpactScreen';
import SafetyScreen from '../screens/SafetyScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home', icon: '🏡', label: 'Home' },
  { name: 'Track', icon: '🥾', label: 'Track' },
  { name: 'Trails', icon: '🗺️', label: 'Trails' },
  { name: 'Impact', icon: '🌳', label: 'Impact' },
  { name: 'Clubs', icon: '👥', label: 'Clubs' },
];

function TabIcon({
  icon,
  label,
  focused,
}: {
  icon: string;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconActive]}>
      <Text style={styles.tabEmoji}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find((t) => t.name === route.name)!;
        return {
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={tab?.icon ?? '●'}
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
      <Tab.Screen name="Impact" component={ImpactScreen} />
      <Tab.Screen name="Clubs" component={LeaderboardScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: Platform.OS === 'ios' ? 82 : 64,
    paddingBottom: Platform.OS === 'ios' ? 22 : 6,
    paddingTop: 6,
    ...SHADOWS.lg,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    gap: 2,
    minWidth: 52,
  },
  tabIconActive: {
    backgroundColor: COLORS.primarySurface,
  },
  tabEmoji: {
    fontSize: 19,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});