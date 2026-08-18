import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useStreak } from '../context/StreakContext';
import { COLORS, RADIUS } from '../constants/theme';

/**
 * Visual week-by-week streak strip. Shows the last N weeks as colored squares.
 * Green = active, amber = frozen, gray = missed, lighter green = current week.
 */
export default function StreakStrip({
  weeks = 8,
  compact = false,
  style,
}: {
  weeks?: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { weekHistory } = useStreak();
  const display = weekHistory(weeks);

  return (
    <View style={[styles.row, compact && styles.compact, style]}>
      {display.map((w) => (
        <View
          key={w.weekKey}
          style={[
            styles.cell,
            compact && styles.cellCompact,
            w.active && styles.cellActive,
            w.frozen && styles.cellFrozen,
            w.isCurrent && !w.active && styles.cellCurrent,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  compact: { gap: 3 },
  cell: {
    flex: 1,
    height: 28,
    borderRadius: RADIUS.xs + 2,
    backgroundColor: COLORS.surfaceSunken,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cellCompact: { height: 20 },
  cellActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cellFrozen: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  cellCurrent: { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primaryGlow },
});
