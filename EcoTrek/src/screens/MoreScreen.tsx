import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Divider, Button } from '../components/ui';
import { ColorPalette, RADIUS, SPACING } from '../constants/theme';
import { Typography, useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { openFeedbackForm } from '../constants/feedback';

type Row = { icon: IconName; label: string; hint: string; to: string };
type Section = { title: string; rows: Row[] };

/**
 * More, but organised. Two simple groups answer two questions:
 *   • You      — your stuff
 *   • App      — settings, safety and feedback
 * (Clubs are hidden in this build; we can wire them back in later.)
 */
const SECTIONS: Section[] = [
  {
    title: 'You',
    rows: [
      { icon: 'user', label: 'Profile', hint: 'Your photo, level and badges', to: 'Profile' },
      { icon: 'tree', label: 'Impact', hint: 'Everything you have logged', to: 'Impact' },
      { icon: 'clock', label: 'My walks', hint: 'Every walk you have saved', to: 'History' },
    ],
  },
  {
    title: 'Explore',
    rows: [
      { icon: 'map', label: 'Trails', hint: 'Walks and rides near you', to: 'Trails' },
      { icon: 'target', label: 'Weekly goals', hint: 'Five small things this week', to: 'Challenges' },
    ],
  },
  {
    title: 'App',
    rows: [
      { icon: 'shield', label: 'Safety', hint: 'What to do if you need help', to: 'Safety' },
      { icon: 'sliders', label: 'Settings', hint: 'Text size, look, units', to: 'Settings' },
    ],
  },
];

export default function MoreScreen() {
  const navigation = useNavigation<any>();
  const { colors, typography } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <Screen>
      <Header title="More" subtitle={user?.name ? `Signed in as ${user.name}` : undefined} hideAvatar />
      <View style={styles.body}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title}</Text>
            <Card padded={false}>
              {section.rows.map((row, i) => (
                <View key={row.to}>
                  {i > 0 ? <Divider style={{ marginLeft: 64 }} /> : null}
                  <Pressable
                    onPress={() => navigation.navigate(row.to)}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityLabel={row.label}
                  >
                    <View style={styles.icon}>
                      <Icon name={row.icon} size={20} color={colors.primary} strokeWidth={1.9} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.label} numberOfLines={1}>{row.label}</Text>
                      <Text style={styles.hint} numberOfLines={2}>{row.hint}</Text>
                    </View>
                    <Icon name="chevron-right" size={18} color={colors.textLight} />
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        ))}

        {/* Give feedback — always the last thing on the page, right under
            the sections instead of buried in Profile. Opens the team's
            Google Form directly; the link lives in src/constants/feedback.ts
            and nowhere else. */}
        <View style={styles.feedbackWrap}>
          <Button
            label="Give Feedback"
            icon="star"
            variant="secondary"
            size="lg"
            full
            onPress={openFeedbackForm}
          />
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: SPACING.md + 4 },
    section: { gap: SPACING.sm },
    sectionTitle: {
      ...t.overline,
      marginLeft: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: 16,
      paddingHorizontal: SPACING.md + 2,
      minHeight: 64,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.md,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { ...t.h4, color: c.text },
    hint: { ...t.small, color: c.textMuted, marginTop: 2 },
    feedbackWrap: { marginTop: SPACING.sm },
  });
}
