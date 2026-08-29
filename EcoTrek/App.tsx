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
import Icon from './src/components/Icon';
import { APP_NAME } from './src/constants/appInfo';

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
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ ...styles.loading, backgroundColor: colors.primaryDark }}>
        <View style={styles.mark}>
          <Icon name="tree" size={30} color={colors.primaryGlow} strokeWidth={1.9} />
        </View>
        <Text style={styles.appName}>{APP_NAME}</Text>
        <ActivityIndicator size="small" color={colors.primaryGlow} style={{ marginTop: 18 }} />
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
// The app owns text sizing: Settings → text size scales the whole type ramp
// through ThemeContext, uniformly. If we also let the OS accessibility scale
// apply on top, the two multipliers fight each other and on a phone with
// large system text the layout blew up. One scaler, predictable result.
(Text as any).defaultProps.allowFontScaling = false;

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
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.4,
    marginTop: 16,
  },
});
