import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import Icon from './Icon';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import SetupScreen from '../screens/SetupScreen';

/**
 * First run: white profile setup, then the app.
 * Returning users with a saved name go straight to home.
 */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { hasProfile, loading: profileLoading } = useProfile();
  const { colors } = useTheme();

  if (profileLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: 20,
            backgroundColor: colors.primarySurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="tree" size={30} color={colors.primary} strokeWidth={1.9} />
        </View>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!hasProfile) return <SetupScreen onDone={() => {}} />;

  return <>{children}</>;
}
