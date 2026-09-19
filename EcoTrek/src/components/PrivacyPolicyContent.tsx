import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { SPACING, ColorPalette } from '../constants/theme';
import { Typography, useTheme } from '../context/ThemeContext';
import {
  PRIVACY_POLICY,
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_CONTACT_EMAIL,
} from '../constants/privacyPolicy';

/**
 * Renders the full embedded privacy policy. Used in three places — the
 * accept/reject consent gate, the read-only Settings page, and the sign-in
 * screen's policy sheet — so the text can never drift between them.
 */

/** Renders a paragraph, turning the contact email into a tappable mailto link. */
function Paragraph({ text, style, linkColor }: { text: string; style: any; linkColor: string }) {
  if (!text.includes(PRIVACY_CONTACT_EMAIL)) {
    return <Text style={style}>{text}</Text>;
  }
  const parts = text.split(PRIVACY_CONTACT_EMAIL);
  return (
    <Text style={style}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 ? (
            <Text
              style={{ color: linkColor, fontWeight: '600' }}
              onPress={() => Linking.openURL(`mailto:${PRIVACY_CONTACT_EMAIL}`)}
              accessibilityRole="link"
            >
              {PRIVACY_CONTACT_EMAIL}
            </Text>
          ) : null}
        </React.Fragment>
      ))}
    </Text>
  );
}

export default function PrivacyPolicyContent() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <View>
      <Text style={styles.updated}>Last updated: {PRIVACY_POLICY_LAST_UPDATED}</Text>
      {PRIVACY_POLICY.map((block, index) => {
        switch (block.type) {
          case 'h2':
            return (
              <Text key={index} style={styles.h2} accessibilityRole="header">
                {block.text}
              </Text>
            );
          case 'h3':
            return (
              <Text key={index} style={styles.h3} accessibilityRole="header">
                {block.text}
              </Text>
            );
          case 'bullets':
            return (
              <View key={index} style={styles.bullets}>
                {block.items.map((item, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>{'\u2022'}</Text>
                    <Paragraph text={item} style={styles.bulletText} linkColor={colors.primary} />
                  </View>
                ))}
              </View>
            );
          case 'p':
          default:
            return (
              <Paragraph
                key={index}
                text={block.text}
                style={styles.p}
                linkColor={colors.primary}
              />
            );
        }
      })}
    </View>
  );
}

const makeStyles = (colors: ColorPalette, typography: Typography) =>
  StyleSheet.create({
    updated: {
      ...typography.smallMed,
      color: colors.textMuted,
      marginBottom: SPACING.md,
    },
    h2: {
      ...typography.h3,
      color: colors.text,
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    h3: {
      ...typography.h4,
      color: colors.text,
      marginTop: SPACING.md,
      marginBottom: SPACING.xs + 2,
    },
    p: {
      ...typography.small,
      color: colors.textSecondary,
      marginBottom: SPACING.sm + 2,
    },
    bullets: {
      marginBottom: SPACING.sm + 2,
      gap: 6,
    },
    bulletRow: {
      flexDirection: 'row',
      paddingRight: SPACING.sm,
    },
    bulletDot: {
      ...typography.small,
      color: colors.primary,
      width: 18,
      textAlign: 'center',
    },
    bulletText: {
      ...typography.small,
      color: colors.textSecondary,
      flex: 1,
    },
  });
