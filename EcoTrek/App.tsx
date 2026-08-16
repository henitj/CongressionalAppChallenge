import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

import RootNavigator from './src/navigation/RootNavigator';
import SignInScreen from './src/screens/SignInScreen';
import { COLORS } from './src/constants/theme';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { EcoPointsProvider, useEcoPoints } from './src/constants/EcoPointsContext';
import { SettingsProvider } from './src/constants/SettingsContext';
import { ClubProvider, useClub } from './src/constants/ClubContext';
import { StreakProvider, useStreak } from './src/context/StreakContext';
import { ActivityProvider, useActivity } from './src/context/ActivityContext';
import { ChallengeProvider, useChallenges } from './src/context/ChallengeContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import { WeatherProvider } from './src/context/WeatherContext';
import { AnalyticsProvider } from './src/constants/AnalyticsContext';

/**
 * Provider order matters — each layer may only use hooks from layers ABOVE it.
 *
 *   Auth        → who is signed in (namespaces every other store)
 *   App         → location + trail catalogue
 *   EcoPoints   → points ledger and badges
 *   Settings    → units
 *   Club        → clubs (needs Auth)
 *   Streak      → daily check-ins (awards points, so needs EcoPoints)
 *   Activity    → hikes/rides (records streak days + club contributions)
 *   Challenge   → weekly challenges (reads Activity + Streak, pays Club)
 *   Notification→ reminders (reads Streak + Challenge)
 *   Weather     → conditions (fires safety alerts if notifications are on)
 */

/** Recomputes badge unlocks whenever any underlying stat moves. */
function BadgeSync() {
  const { refreshBadges } = useEcoPoints();
  const { totalMiles, totalTrees, totalActivities, hikes, rides, uniqueTrailsCompleted } =
    useActivity();
  const { currentStreak, longestStreak } = useStreak();
  const { lifetimeCompleted } = useChallenges();
  const { myClub, myMember } = useClub();

  useEffect(() => {
    refreshBadges({
      totalMiles,
      totalTrees,
      totalActivities,
      hikes,
      rides,
      currentStreak,
      longestStreak,
      trailsCompleted: uniqueTrailsCompleted,
      challengesCompleted: lifetimeCompleted,
      clubsJoined: myClub ? 1 : 0,
      clubsFounded: myMember?.role === 'owner' ? 1 : 0,
    });
  }, [
    refreshBadges,
    totalMiles,
    totalTrees,
    totalActivities,
    hikes,
    rides,
    currentStreak,
    longestStreak,
    uniqueTrailsCompleted,
    lifetimeCompleted,
    myClub,
    myMember?.role,
  ]);

  return null;
}

/** Weather needs to know whether it's allowed to fire safety notifications. */
function WeatherLayer({ children }: { children: React.ReactNode }) {
  const { enabled, safetyAlerts, permissionGranted } = useNotifications();
  return (
    <WeatherProvider notificationsEnabled={enabled && safetyAlerts && permissionGranted}>
      {children}
    </WeatherProvider>
  );
}

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primaryGlow} />
      </View>
    );
  }

  if (!user) return <SignInScreen />;

  // Everything below here requires a signed-in user, so the stores can be
  // namespaced by user id and never leak between accounts.
  return (
    <EcoPointsProvider>
      <SettingsProvider>
        <ClubProvider>
          <StreakProvider>
            <ActivityProvider>
              <ChallengeProvider>
                <NotificationProvider>
                  <WeatherLayer>
                    <AnalyticsProvider>
                      <BadgeSync />
                      <NavigationContainer>
                        <RootNavigator />
                      </NavigationContainer>
                    </AnalyticsProvider>
                  </WeatherLayer>
                </NotificationProvider>
              </ChallengeProvider>
            </ActivityProvider>
          </StreakProvider>
        </ClubProvider>
      </SettingsProvider>
    </EcoPointsProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Gate />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
