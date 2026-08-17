import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Icon from './Icon';
import { COLORS, RADIUS, TYPOGRAPHY } from '../constants/theme';
import { useStreak } from '../context/StreakContext';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Compact streak calendar.
 *
 * Three states per day, deliberately distinguishable without colour alone:
 *   • filled + check  → you got out and logged an activity
 *   • outlined dot    → you opened the app (streak kept alive)
 *   • empty           → missed
 */
export default function StreakStrip({
  days = 7,
  style,
  compact,
}: {
  days?: number;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const { calendar } = useStreak();
  const items = calendar(days);

  return (
    <View style={[styles.row, style]}>
      {items.map((d) => {
        const letter = DAY_LETTERS[d.date.getDay()];
        return (
          <View key={d.day} style={styles.col}>
            <Text style={[styles.letter, d.isToday && styles.letterToday]}>{letter}</Text>
            <View
              style={[
                styles.cell,
                compact && styles.cellCompact,
                d.opened && styles.cellOpened,
                d.active && styles.cellActive,
                d.isToday && styles.cellToday,
              ]}
            >
              {d.active ? (
                <Icon name="check" size={compact ? 11 : 13} color="#fff" strokeWidth={2.8} />
              ) : d.opened ? (
                <View style={styles.innerDot} />
              ) : null}
            </View>
            {!compact ? (
              <Text style={[styles.num, d.isToday && styles.numToday]}>{d.date.getDate()}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  col: { alignItems: 'center', gap: 5, flex: 1 },
  letter: {
    ...TYPOGRAPHY.micro,
    color: COLORS.textLight,
  },
  letterToday: { color: COLORS.primary },
  cell: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm + 2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellCompact: { width: 26, height: 26, borderRadius: RADIUS.sm },
  cellOpened: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primaryGlow,
  },
  cellActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cellToday: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  innerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primaryLight,
  },
  num: { ...TYPOGRAPHY.micro, color: COLORS.textLight },
  numToday: { color: COLORS.text, fontWeight: '700' },
});
