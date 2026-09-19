import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from '../components/Icon';
import PrivacyPolicyContent from '../components/PrivacyPolicyContent';
import { Button } from '../components/ui';
import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { Typography, useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { APP_NAME } from '../constants/appInfo';
import { PRIVACY_CONTACT_EMAIL } from '../constants/privacyPolicy';

/**
 * The consent gate. Shown once per account (and again whenever the policy
 * version changes) before anything else in the app.
 *
 *   Accept → recorded, and the user continues into the app.
 *   Reject → rerouted to a "consent declined" screen. EcoTrek cannot run
 *            without the policy, so from there the user can either go back
 *            and review the policy again, or sign out — which returns them
 *            to the sign-in screen.
 */

type Props = {
  /** Called after the user taps Accept. The caller persists the consent. */
  onAccept: () => void;
};

export default function PrivacyConsentScreen({ onAccept }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { signOut } = useAuth();
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={styles.declinedWrap}>
            <View style={[styles.declinedIcon, { backgroundColor: colors.dangerLight }]}>
              <Icon name="shield" size={30} color={colors.danger} strokeWidth={1.9} />
            </View>
            <Text style={styles.declinedTitle}>Policy declined</Text>
            <Text style={styles.declinedBody}>
              No problem — nothing has been collected. But {APP_NAME} can’t run without your
              agreement to the privacy policy, so the app will stay right here.
            </Text>
            <Text style={styles.declinedBody}>
              If you change your mind, you can review the policy again below. Questions? Email us
              at{' '}
              <Text
                style={styles.declinedLink}
                onPress={() => Linking.openURL(`mailto:${PRIVACY_CONTACT_EMAIL}`)}
              >
                {PRIVACY_CONTACT_EMAIL}
              </Text>
              .
            </Text>

            <View style={styles.declinedButtons}>
              <Button
                label="Review the policy again"
                size="lg"
                full
                onPress={() => setDeclined(false)}
              />
              <Button
                label="Sign out"
                variant="secondary"
                size="lg"
                full
                icon="log-out"
                onPress={() => {
                  void signOut();
                }}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primarySurface }]}>
            <Icon name="shield" size={22} color={colors.primary} strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title}>Privacy Policy</Text>
            <Text style={styles.subtitle}>Please review before you continue</Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator
        >
          <PrivacyPolicyContent />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={styles.footerNote}>
            By tapping Accept you agree to the {APP_NAME} privacy policy.
          </Text>
          <Button label="Accept" size="lg" full icon="check" onPress={onAccept} />
          <Button
            label="Reject"
            variant="secondary"
            size="lg"
            full
            onPress={() => setDeclined(true)}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: ColorPalette, typography: Typography) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.md,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...typography.h2,
      color: colors.text,
    },
    subtitle: {
      ...typography.small,
      color: colors.textMuted,
      marginTop: 1,
    },
    scroll: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xl,
    },
    footer: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      gap: SPACING.sm + 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: colors.background,
    },
    footerNote: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
    },
    declinedWrap: {
      flex: 1,
      paddingHorizontal: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.md,
    },
    declinedIcon: {
      width: 66,
      height: 66,
      borderRadius: RADIUS.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.xs,
    },
    declinedTitle: {
      ...typography.h2,
      color: colors.text,
      textAlign: 'center',
    },
    declinedBody: {
      ...typography.small,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    declinedLink: {
      color: colors.primary,
      fontWeight: '600',
    },
    declinedButtons: {
      alignSelf: 'stretch',
      gap: SPACING.sm + 2,
      marginTop: SPACING.md,
    },
  });
