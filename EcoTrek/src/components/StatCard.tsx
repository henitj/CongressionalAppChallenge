import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

type Props = {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
};

export default function StatCard({
  label,
  value,
  unit,
  accent,
  icon,
  trend,
  size = 'md',
}: Props) {
  const accentColor = accent ?? COLORS.primary;

  return (
    <View style={[styles.card, { borderTopColor: accentColor }]}>
      {/* Top row: icon + label */}
      <View style={styles.topRow}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: accentColor + '18' }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        )}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {trend && (
          <Text style={styles.trend}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </Text>
        )}
      </View>

      {/* Value */}
      <Text
        style={[
          styles.value,
          size === 'sm' && { fontSize: 20 },
          size === 'lg' && { fontSize: 36 },
          { color: COLORS.text },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
        {unit ? <Text style={styles.unit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: 6,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 13 },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  trend: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '800',
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});