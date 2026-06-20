import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { ActivityProvider } from './src/context/ActivityContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { EcoPointsProvider } from './src/constants/EcoPointsContext';
import SignInScreen from './src/screens/SignInScreen';
import { COLORS } from './src/constants/theme';

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
        <ActivityProvider>
          <EcoPointsProvider>
            <StatusBar style="light" />
            <Gate />
          </EcoPointsProvider>
        </ActivityProvider>
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