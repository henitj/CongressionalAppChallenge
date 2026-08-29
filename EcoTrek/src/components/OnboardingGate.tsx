import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { keyFor, loadJSON, saveJSON } from '../services/storage';
import { useTheme } from '../context/ThemeContext';
import OnboardingScreen from '../screens/OnboardingScreen';
import SetupScreen from '../screens/SetupScreen';

/**
 * First run, once per account: profile setup (Get Started) immediately after
 * sign-in, then the short app introduction, then the app. Both steps are
 * persisted, so returning users go straight to home.
 */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { hasProfile, loading: profileLoading } = useProfile();
  const onboardedKey = keyFor(user?.id ?? null, 'onboarded');

  const [checked, setChecked] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChecked(false);
    (async () => {
      const done = await loadJSON<boolean>(onboardedKey, false);
      if (cancelled) return;
      setOnboarded(done);
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [onboardedKey]);

  const finishOnboarding = async () => {
    setOnboarded(true);
    await saveJSON(onboardedKey, true);
  };

  const finishSetup = () => {
    // hasProfile flips once Setup writes a first name (or Skip does).
  };

  const { colors } = useTheme();

  if (!checked || profileLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.primaryDark,
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
            backgroundColor: 'rgba(255,255,255,0.09)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="tree" size={30} color={colors.primaryGlow} strokeWidth={1.9} />
        </View>
        <ActivityIndicator size="small" color={colors.primaryGlow} />
      </View>
    );
  }

  if (!hasProfile) return <SetupScreen onDone={finishSetup} />;

  if (!onboarded) return <OnboardingScreen onDone={finishOnboarding} />;

  return <>{children}</>;
}
