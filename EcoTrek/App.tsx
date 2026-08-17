import React, { useCallback, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

import RootNavigator from './src/navigation/RootNavigator';
import SignInScreen from './src/screens/SignInScreen';
import OnboardingGate from './src/components/OnboardingGate';
import { COLORS } from './src/constants/theme';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { EcoPointsProvider, useEcoPoints } from './src/constants/EcoPointsContext';
import { SettingsProvider } from './src/constants/SettingsContext';
import { ClubProvider, useClub } from './src/constants/ClubContext';
import { StreakProvider, useStreak } from './src/context/StreakContext';
import { ActivityProvider, useActivity } from './src/context/ActivityContext';
import { LogbookProvider, useLogbook } from './src/context/LogbookContext';
import { ChallengeProvider, useChallenges } from './src/context/ChallengeContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import { WeatherProvider } from './src/context/WeatherContext';
import { AnalyticsProvider } from './src/constants/AnalyticsContext';
import { useClubGoalRewards } from './src/hooks/useClubGoalRewards';

/**
 * Provider order matters — each layer may only use hooks from layers ABOVE it.
 *
 *   Auth        → who is signed in (namespaces every other store)
 *   App         → location + trail catalogue
 *   EcoPoints   → points ledger and badges
 *   Settings    → units
 *   Club        → clubs (needs Auth)
 *   Streak      → daily check-ins (awards points, so needs EcoPoints)
 *   Activity    → hikes and rides (records streak days + club contributions)
 *   Logbook     → species sightings and cleanups (awards points, pays club)
 *   Challenge   → weekly challenges (reads Activity + Streak, pays Club)
 *   Notification→ reminders (reads Streak + Challenge)
 *   Weather     → conditions (fires safety alerts if notifications are on)
 */

/**
 * Recomputes badge unlocks and pays the club goal bonus.
 *
 * Sits at the bottom of the stack because it is the only place with a view of
 * every store at once. Renders nothing.
 */
function ProgressSync() {
  const { refreshBadges } = useEcoPoints();
  const { totalMiles, totalTrees, totalActivities, hikes, rides, uniqueTrailsCompleted } =
    useActivity();
  const {
    currentStreak,
    longestStreak,
    totalActiveDays,
    activeDaysLast30,
    perfectWeeks,
    hadComeback,
  } = useStreak();
  const { lifetimeCompleted } = useChallenges();
  const { myClub, myMember } = useClub();
  const { speciesLogged, plantsLogged, animalsLogged, cleanupCount, litterCollected } = useLogbook();
  const { clubGoalsMet } = useClubGoalRewards();

  useEffect(() => {
    refreshBadges({
      totalMiles,
      totalTrees,
      totalActivities,
      hikes,
      rides,
      currentStreak,
      longestStreak,
      totalActiveDays,
      activeDaysLast30,
      perfectWeeks,
      hadComeback,
      trailsCompleted: uniqueTrailsCompleted,
      challengesCompleted: lifetimeCompleted,
      clubsJoined: myClub ? 1 : 0,
      clubsFounded: myMember?.role === 'owner' ? 1 : 0,
      speciesLogged,
      plantsLogged,
      animalsLogged,
      cleanups: cleanupCount,
      litterCollected,
      clubGoalsMet,
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
    totalActiveDays,
    activeDaysLast30,
    perfectWeeks,
    hadComeback,
    uniqueTrailsCompleted,
    lifetimeCompleted,
    myClub,
    myMember?.role,
    speciesLogged,
    plantsLogged,
    animalsLogged,
    cleanupCount,
    litterCollected,
    clubGoalsMet,
  ]);

  return null;
}

/** Weather needs to know whether it may fire safety notifications. */
function WeatherLayer({ children }: { children: React.ReactNode }) {
  const { enabled, safetyAlerts, permissionGranted } = useNotifications();
  return (
    <WeatherProvider notificationsEnabled={enabled && safetyAlerts && permissionGranted}>
      {children}
    </WeatherProvider>
  );
}

/**
 * Clubs sit above EcoPoints, so joining cannot award its own points. This
 * layer closes that loop — without it, `club_joined` was a scoring rule that
 * never fired.
 */
function ClubLayer({ children }: { children: React.ReactNode }) {
  const { award } = useEcoPoints();
  const handleJoined = useCallback(() => {
    award('club_joined');
  }, [award]);

  return <ClubProvider onJoined={handleJoined}>{children}</ClubProvider>;
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

  // Everything below requires a signed-in user, so each store can be
  // namespaced by user id and never leak between accounts.
  return (
    <EcoPointsProvider>
      <SettingsProvider>
        <ClubLayer>
          <StreakProvider>
            <ActivityProvider>
              <LogbookProvider>
                <ChallengeProvider>
                  <NotificationProvider>
                    <WeatherLayer>
                      <AnalyticsProvider>
                        <ProgressSync />
                        <OnboardingGate>
                          <NavigationContainer>
                            <RootNavigator />
                          </NavigationContainer>
                        </OnboardingGate>
                      </AnalyticsProvider>
                    </WeatherLayer>
                  </NotificationProvider>
                </ChallengeProvider>
              </LogbookProvider>
            </ActivityProvider>
          </StreakProvider>
        </ClubLayer>
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
