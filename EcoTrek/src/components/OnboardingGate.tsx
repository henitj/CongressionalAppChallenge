import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { keyFor, loadJSON, saveJSON } from '../services/storage';
import { COLORS } from '../constants/theme';
import OnboardingScreen from '../screens/OnboardingScreen';
import SetupScreen from '../screens/SetupScreen';

/**
 * Shows the first-run walkthrough once per account, then the profile setup,
 * then gets out of the way.
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

  if (!checked || profileLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primaryGlow} />
      </View>
    );
  }

  if (!onboarded) return <OnboardingScreen onDone={finishOnboarding} />;

  if (!hasProfile) return <SetupScreen onDone={finishSetup} />;

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
