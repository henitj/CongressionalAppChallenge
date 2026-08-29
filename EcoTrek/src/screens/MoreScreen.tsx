import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Divider } from '../components/ui';
import { ColorPalette, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

type Row = { icon: IconName; label: string; hint: string; to: string; hideInSimple?: boolean };
type Section = { title: string; rows: Row[] };

/**
 * More, but organised. One flat list of seven things was the old design and
 * it read like a dump. Now the page answers three questions:
 *   • You      — who you are and what you have done
 *   • Explore  — places to go and people to go with
 *   • App      — the practical stuff
 */
const SECTIONS: Section[] = [
  {
    title: 'You',
    rows: [
      { icon: 'user', label: 'Profile', hint: 'Your photo, level and badges', to: 'Profile' },
      { icon: 'clock', label: 'My walks', hint: 'Every walk you have saved', to: 'History' },
    ],
  },
  {
    title: 'Explore',
    rows: [
      { icon: 'map', label: 'Trails', hint: 'Austin walks and rides', to: 'Trails' },
      { icon: 'users', label: 'Clubs', hint: 'Walk with friends', to: 'Clubs', hideInSimple: true },
      { icon: 'target', label: 'Weekly goals', hint: 'Five small things this week', to: 'Challenges', hideInSimple: true },
    ],
  },
  {
    title: 'App',
    rows: [
      { icon: 'shield', label: 'Safety', hint: 'What to do if you need help', to: 'Safety' },
      { icon: 'sliders', label: 'Settings', hint: 'Text size, simple mode, units', to: 'Settings' },
    ],
  },
];

export default function MoreScreen() {
  const navigation = useNavigation<any>();
  const { simpleMode, colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Screen>
      <Header title="More" subtitle={user?.name ? `Signed in as ${user.name}` : undefined} hideAvatar />
      <View style={styles.body}>
        {SECTIONS.map((section) => {
          const rows = section.rows.filter((r) => !(simpleMode && r.hideInSimple));
          if (rows.length === 0) return null;
          return (
            <View key={section.title} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title}</Text>
              <Card padded={false}>
                {rows.map((row, i) => (
                  <View key={row.to}>
                    {i > 0 ? <Divider style={{ marginLeft: 62 }} /> : null}
                    <Pressable
                      onPress={() => navigation.navigate(row.to)}
                      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel={row.label}
                    >
                      <View style={styles.icon}>
                        <Icon name={row.icon} size={20} color={colors.primary} strokeWidth={1.9} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>{row.label}</Text>
                        <Text style={styles.hint}>{row.hint}</Text>
                      </View>
                      <Icon name="chevron-right" size={18} color={colors.textLight} />
                    </Pressable>
                  </View>
                ))}
              </Card>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: SPACING.md },
    section: { gap: SPACING.sm - 2 },
    sectionTitle: {
      ...TYPOGRAPHY.overline,
      marginLeft: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: 14,
      paddingHorizontal: SPACING.md,
      minHeight: 60,
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.md,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { ...TYPOGRAPHY.h4, color: c.text },
    hint: { ...TYPOGRAPHY.small, color: c.textMuted, marginTop: 2 },
  });
}
