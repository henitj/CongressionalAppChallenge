import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Linking, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon, { IconName } from '../components/Icon';
import Logo from '../components/Logo';
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
          <Logo size={88} style={styles.mark} />

          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.tagline}>
            Every mile you move under your own power grows your forest.
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Icon name={f.icon} size={17} color={colors.primary} strokeWidth={1.9} />
                </View>
                <Text style={styles.featureText}>{f.title}</Text>
              </View>
            ))}
          </View>

          <View style={{ flex: 1 }} />

          <View style={{ gap: SPACING.sm + 2 }}>
            {error ? (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={15} color={colors.danger} strokeWidth={2} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              label="Continue with Google"
              size="lg"
              full
              loading={busy && !useLocalGoogle}
              onPress={handleGoogle}
            />

            <Button
              label="Continue as guest"
              variant="secondary"
              size="lg"
              full
              onPress={() => setShowGuest(true)}
            />

            <Text style={styles.legal}>
              By continuing you agree to our{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
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
            <Text style={styles.fieldLabel}>What should we call you?</Text>
            <TextInput
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Your first name"
              placeholderTextColor={colors.textLight}
              maxLength={30}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleGuest}
            />
          </View>
          <Text style={styles.guestNote}>
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
    root: { flex: 1, backgroundColor: c.background },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.xl,
      paddingBottom: SPACING.lg,
    },

    mark: {
      marginBottom: SPACING.lg,
    },
    title: { ...t.display, color: c.text },
    tagline: { ...t.body, color: c.textSecondary, marginTop: SPACING.sm, maxWidth: 320 },

    features: { marginTop: SPACING.xl, gap: SPACING.md + 2 },
    feature: { flexDirection: 'row', gap: SPACING.md - 2, alignItems: 'center' },
    featureIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.sm + 2,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: { ...t.bodyMed, color: c.text, flex: 1 },

    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: c.dangerLight,
      borderRadius: RADIUS.md,
      padding: SPACING.sm + 4,
    },
    errorText: { ...t.small, color: c.danger, flex: 1 },

    fieldLabel: { ...t.overline, color: c.textMuted },
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
    guestNote: { ...t.small, color: c.textMuted },

    legal: {
      ...t.small,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: SPACING.sm,
      lineHeight: 18,
    },
    legalLink: { color: c.primary, textDecorationLine: 'underline' },
  });
}
