import './src/services/locationTask';

import React, { useCallback, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from './src/context/ThemeContext';
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
import { ThemeProvider } from './src/context/ThemeContext';
import { ClubProvider, useClub } from './src/constants/ClubContext';
import { StreakProvider, useStreak } from './src/context/StreakContext';
import { ActivityProvider, useActivity } from './src/context/ActivityContext';
import { ChallengeProvider, useChallenges } from './src/context/ChallengeContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import { WeatherProvider } from './src/context/WeatherContext';
import { AnalyticsProvider } from './src/constants/AnalyticsContext';
import { ProfileProvider } from './src/context/ProfileContext';
import { useClubGoalRewards } from './src/hooks/useClubGoalRewards';

/**
 * Provider order:
 *   Auth        → who is signed in
 *   Profile     → user physical data (height, weight, etc.)
 *   App         → location + trail catalogue
 *   EcoPoints   → points ledger and badges
 *   Settings    → units
 *   Club        → clubs (needs Auth)
 *   Streak      → weekly streaks (awards points)
 *   Activity    → hikes and rides (records streak + club contributions, needs Profile)
 *   Challenge   → weekly challenges
 *   Notification→ reminders
 *   Weather     → conditions
 */

function ProgressSync() {
  const { refreshBadges } = useEcoPoints();
  const { totalMiles, totalTrees, totalActivities, hikes, rides, uniqueTrailsCompleted } =
    useActivity();
  const {
    currentStreak,
    longestStreak,
    totalActiveWeeks,
  } = useStreak();
  const { lifetimeCompleted } = useChallenges();
  const { myClub, myMember } = useClub();
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
      totalActiveDays: totalActiveWeeks,
      activeDaysLast30: 0,
      perfectWeeks: 0,
      hadComeback: false,
      trailsCompleted: uniqueTrailsCompleted,
      challengesCompleted: lifetimeCompleted,
      clubsJoined: myClub ? 1 : 0,
      clubsFounded: myMember?.role === 'owner' ? 1 : 0,
      speciesLogged: 0,
      plantsLogged: 0,
      animalsLogged: 0,
      cleanups: 0,
      litterCollected: 0,
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
    totalActiveWeeks,
    uniqueTrailsCompleted,
    lifetimeCompleted,
    myClub,
    myMember?.role,
    clubGoalsMet,
  ]);

  return null;
}

function WeatherLayer({ children }: { children: React.ReactNode }) {
  const { enabled, safetyAlerts, permissionGranted } = useNotifications();
  return (
    <WeatherProvider notificationsEnabled={enabled && safetyAlerts && permissionGranted}>
      {children}
    </WeatherProvider>
  );
}

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

  return (
    <EcoPointsProvider>
        <ProfileProvider>
          <ClubLayer>
            <StreakProvider>
              <ActivityProvider>
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
              </ActivityProvider>
            </StreakProvider>
          </ClubLayer>
        </ProfileProvider>
    </EcoPointsProvider>
  );
}

function ThemedStatusBar() {
  const { appearance } = useTheme();
  return <StatusBar style={appearance === 'dark' ? 'light' : 'dark'} />;
}

if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
(Text as any).defaultProps.allowFontScaling = true;
(Text as any).defaultProps.maxFontSizeMultiplier = 1.8;

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppProvider>
              <ThemedStatusBar />
              <Gate />
            </AppProvider>
          </AuthProvider>
        </ThemeProvider>
      </SettingsProvider>
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
