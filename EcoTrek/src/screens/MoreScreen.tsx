import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Divider } from '../components/ui';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

type Row = { icon: IconName; label: string; hint: string; to: string; hideInSimple?: boolean };

const ROWS: Row[] = [
  { icon: 'map', label: 'Trails', hint: 'Austin walks and rides', to: 'Trails' },
  { icon: 'clock', label: 'My walks', hint: 'This week and every walk you have saved', to: 'History' },
  { icon: 'users', label: 'Clubs', hint: 'Walk with friends', to: 'Clubs', hideInSimple: true },
  { icon: 'target', label: 'Weekly goals', hint: 'Five small things this week', to: 'Challenges', hideInSimple: true },
  { icon: 'user', label: 'Profile', hint: 'Your name, level, and badges', to: 'Profile' },
  { icon: 'shield', label: 'Safety', hint: 'What to do if you need help', to: 'Safety' },
  { icon: 'sliders', label: 'Settings', hint: 'Text size, simple mode, units', to: 'Settings' },
];

export default function MoreScreen() {
  const navigation = useNavigation<any>();
  const { simpleMode } = useTheme();
  const { user } = useAuth();

  const rows = ROWS.filter((r) => !(simpleMode && r.hideInSimple));

  return (
    <Screen>
      <Header title="More" subtitle={user?.name ? `Signed in as ${user.name}` : undefined} hideAvatar />
      <View style={styles.body}>
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
                  <Icon name={row.icon} size={20} color={COLORS.primary} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{row.label}</Text>
                  <Text style={styles.hint}>{row.hint}</Text>
                </View>
                <Icon name="chevron-right" size={18} color={COLORS.textLight} />
              </Pressable>
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 16,
    paddingHorizontal: SPACING.md,
    minHeight: 64,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...TYPOGRAPHY.h4, color: COLORS.text },
  hint: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
});
