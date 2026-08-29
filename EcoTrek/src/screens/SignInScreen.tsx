import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Linking, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon, { IconName } from '../components/Icon';
import GoogleAccountSheet from '../components/GoogleAccountSheet';
import { Button, Sheet } from '../components/ui';
import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, PRIVACY_POLICY_URL } from '../constants/appInfo';
import { useTheme, Typography } from '../context/ThemeContext';

const FEATURES: { icon: IconName; title: string }[] = [
  { icon: 'navigation', title: 'Tap Start, and we count the miles for you' },
  { icon: 'sun', title: 'Today’s weather, in plain words' },
  { icon: 'tree', title: 'Miles become trees in your forest' },
];

export default function SignInScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { signInWithGoogle, signInAsGuest, error } = useAuth();
  const [showGuest, setShowGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [showGoogle, setShowGoogle] = useState(false);
  const [busy, setBusy] = useState(false);

  // The web demo cannot round-trip a real OAuth redirect, so there Google
  // sign-in goes through the local account sheet. Native uses the real flow.
  const useLocalGoogle = Platform.OS === 'web';

  const handleGoogle = async () => {
    if (useLocalGoogle) {
      setShowGoogle(true);
      return;
    }
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    setBusy(true);
    try {
      await signInAsGuest(guestName.trim() || 'Guest Trekker');
      setShowGuest(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mark */}
          <View style={styles.mark}>
            <Icon name="tree" size={30} color={colors.primaryGlow} strokeWidth={1.9} />
          </View>

          <Text style={[styles.title, typography.display]}>{APP_NAME}</Text>
          <Text style={[styles.tagline, typography.body]}>
            Every mile you move under your own power grows your forest.
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Icon name={f.icon} size={17} color={colors.primaryGlow} strokeWidth={1.9} />
                </View>
                <Text style={[styles.featureText, typography.bodyMed]}>{f.title}</Text>
              </View>
            ))}
          </View>

          <View style={{ flex: 1 }} />

          {/* Actions */}
          <View style={{ gap: SPACING.sm + 2 }}>
            {error ? (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={15} color={colors.dangerLight} strokeWidth={2} />
                <Text style={[styles.errorText, typography.small]}>{error}</Text>
              </View>
            ) : null}

            <Button
              label="Continue with Google"
              variant="secondary"
              size="lg"
              full
              loading={busy && !useLocalGoogle}
              onPress={handleGoogle}
            />

            <Button
              label="Continue as guest"
              variant="ghost"
              tone="rgba(255,255,255,0.85)"
              size="lg"
              full
              onPress={() => setShowGuest(true)}
            />

            <Text style={[styles.legal, typography.small]}>
              By continuing you agree to our{' '}
              <Text
                style={styles.legalLink}
                onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              >
                privacy policy
              </Text>
              . EcoTrek uses your location only while you are recording an activity.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {useLocalGoogle ? (
        <GoogleAccountSheet visible={showGoogle} onClose={() => setShowGoogle(false)} mode="signin" />
      ) : null}

      <Sheet
        visible={showGuest}
        onClose={() => setShowGuest(false)}
        title="Continue as guest"
        subtitle="Your progress stays on this device only"
      >
        <View style={{ gap: SPACING.md }}>
          <View style={{ gap: 6 }}>
            <Text style={[styles.fieldLabel, typography.overline]}>What should we call you?</Text>
            <TextInput
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Guest Trekker"
              placeholderTextColor={colors.textLight}
              maxLength={30}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleGuest}
            />
          </View>
          <Text style={[styles.guestNote, typography.small]}>
            You can start now and switch to Google later. Your walks on this phone will come with
            you.
          </Text>
          <Button label="Start as guest" full loading={busy} onPress={handleGuest} />
        </View>
      </Sheet>
    </View>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.primaryDark },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.xl,
      paddingBottom: SPACING.lg,
    },

    mark: {
      width: 62,
      height: 62,
      borderRadius: RADIUS.xl,
      backgroundColor: 'rgba(255,255,255,0.09)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.lg,
    },
    title: { color: '#fff' },
    tagline: { color: 'rgba(255,255,255,0.68)', marginTop: SPACING.sm, maxWidth: 320 },

    features: { marginTop: SPACING.xl, gap: SPACING.md + 2 },
    feature: { flexDirection: 'row', gap: SPACING.md - 2, alignItems: 'center' },
    featureIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.sm + 2,
      backgroundColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: { color: 'rgba(255,255,255,0.85)', flex: 1 },

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: 'rgba(192,57,43,0.25)',
      borderRadius: RADIUS.md,
      padding: SPACING.sm + 4,
    },
    errorText: { color: c.dangerLight, flex: 1 },

    fieldLabel: { color: c.textMuted },
    input: {
      backgroundColor: c.surfaceSunken,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: SPACING.md - 2,
      paddingVertical: 13,
      ...t.body,
      color: c.text,
    },
    guestNote: { color: c.textMuted },

    legal: {
      color: 'rgba(255,255,255,0.4)',
      textAlign: 'center',
      marginTop: SPACING.sm,
      lineHeight: 18,
    },
    legalLink: { color: 'rgba(255,255,255,0.75)', textDecorationLine: 'underline' },
  });
}
