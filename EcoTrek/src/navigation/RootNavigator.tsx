import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TrackScreen from '../screens/TrackScreen';
import TrailsScreen from '../screens/TrailsScreen';
import ImpactScreen from '../screens/ImpactScreen';
import SafetyScreen from '../screens/SafetyScreen';
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.iconBox}>
      <Text style={{ fontSize: 18 }}>{label}</Text>
      <View
        style={[
          styles.dot,
          { backgroundColor: focused ? COLORS.primary : 'transparent' },
        ]}
      />
    </View>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused }) => {
          const map: Record<string, string> = {
            Home: '🏠',
            Track: '🥾',
            Trails: '🗺️',
            Impact: '🌳',
            Safety: '🛡️',
          };
          return <TabIcon label={map[route.name]} focused={focused} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Track" component={TrackScreen} />
      <Tab.Screen name="Trails" component={TrailsScreen} />
      <Tab.Screen name="Impact" component={ImpactScreen} />
      <Tab.Screen name="Safety" component={SafetyScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconBox: { alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
});
