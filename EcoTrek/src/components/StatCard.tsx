import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

type Props = {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
  icon?: React.ReactNode;
};

export default function StatCard({ label, value, unit, accent, icon }: Props) {
  return (
    <View style={[styles.card, accent ? { borderLeftColor: accent } : null]}>
      <View style={styles.row}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>
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
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  icon: { marginRight: SPACING.xs },
  label: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { ...TYPOGRAPHY.h1, color: COLORS.text },
  unit: { ...TYPOGRAPHY.body, color: COLORS.textMuted, fontWeight: '500' },
});
