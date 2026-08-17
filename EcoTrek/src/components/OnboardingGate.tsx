import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { keyFor, loadJSON, saveJSON } from '../services/storage';
import { COLORS } from '../constants/theme';
import OnboardingScreen from '../screens/OnboardingScreen';

/**
 * Shows the first-run walkthrough once per account, then gets out of the way.
 *
 * The flag is stored per user rather than per device, so a second person
 * signing in on the same phone still gets the introduction.
 */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storeKey = keyFor(user?.id ?? null, 'onboarded');

  const [checked, setChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChecked(false);
    (async () => {
      const done = await loadJSON<boolean>(storeKey, false);
      if (cancelled) return;
      setNeedsOnboarding(!done);
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [storeKey]);

  const finish = async () => {
    setNeedsOnboarding(false);
    await saveJSON(storeKey, true);
  };

  if (!checked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primaryGlow} />
      </View>
    );
  }

  if (needsOnboarding) return <OnboardingScreen onDone={finish} />;

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
