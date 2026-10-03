import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Linking, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon, { IconName } from '../components/Icon';
import Logo from '../components/Logo';
import { Button } from '../components/ui';
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
  const { signInAsGuest, error } = useAuth();
  const [busy, setBusy] = useState(false);

  // The gap above the button scales with the screen instead of collapsing, and
  // tops out on a tall screen so the button does not drift to the very bottom.
  const { height: windowHeight } = useWindowDimensions();
  const buttonGap = Math.min(Math.max(SPACING.lg, Math.round(windowHeight * 0.04)), 96);

  const handleStart = async () => {
    setBusy(true);
    try {
      await signInAsGuest('Guest Trekker');
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
          <View style={styles.column}>
            <Logo size={80} style={styles.mark} />

            <Text style={styles.title}>{APP_NAME}</Text>
            <Text style={styles.tagline}>
              Walks, rides and trails — recorded on this device, with nothing to sign up for.
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

            <View style={{ minHeight: buttonGap }} />

            {error ? (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={15} color={colors.danger} strokeWidth={2} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button label="Start walking" size="lg" full loading={busy} onPress={handleStart} />

            <Text style={styles.legal}>
              No account and no sign-in: your walks, points and settings are stored on this device.
              Recording uses your location only while you are walking a route — see the{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                privacy policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
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
      alignItems: 'center',
    },
    // A phone-width column, centred: on a laptop the old full-bleed buttons
    // stretched the whole window and the screen looked broken.
    column: { width: '100%', maxWidth: 460, flexGrow: 1 },

    mark: {
      marginBottom: SPACING.lg,
    },
    title: { ...t.display, color: c.text },
    tagline: { ...t.body, color: c.textSecondary, marginTop: SPACING.sm, maxWidth: 360 },

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
      marginBottom: SPACING.sm,
    },
    errorText: { ...t.small, color: c.danger, flex: 1 },

    legal: {
      ...t.small,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: SPACING.md,
      lineHeight: 18,
    },
    legalLink: { color: c.primary, textDecorationLine: 'underline' },
  });
}
