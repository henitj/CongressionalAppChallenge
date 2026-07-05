import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { ActivityProvider } from './src/context/ActivityContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { EcoPointsProvider } from './src/constants/EcoPointsContext';
import { SettingsProvider } from './src/constants/SettingsContext'; 
import { AnalyticsProvider } from './src/constants/AnalyticsContext'; 
// ADDED: Import your Clubs/Club provider (verify this exact path in your project structure)
import { ClubProvider } from './src/constants/ClubContext'; 
import SignInScreen from './src/screens/SignInScreen';
import { COLORS } from './src/constants/theme';
import { AppProvider } from './src/context/AppContext';

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!user) return <SignInScreen />;

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <ActivityProvider>
            <EcoPointsProvider>
              <SettingsProvider>
                {/* ADDED: Nesting ClubProvider here so useClubs works inside all screens */}
                <ClubProvider>
                  <AnalyticsProvider>
                    <StatusBar style="light" />
                    <Gate />
                  </AnalyticsProvider>
                </ClubProvider>
              </SettingsProvider>
            </EcoPointsProvider>
          </ActivityProvider>
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