import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Sheet } from './ui';
import { RADIUS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  name: string;
  miles: string;
  unit: string;
  trees: number;
  streak: number;
  level: string;
  trails?: number;
};

/**
 * A simple, accessible progress summary. This used to render a ViewShot image
 * and offer a broken image-share action. Progress is now readable in the
 * sheet, with no misleading image or button that cannot reliably share one.
 */
export default function ShareCard({
  visible,
  onClose,
  name,
  miles,
  unit,
  trees,
  streak,
  level,
  trails = 0,
}: Props) {
  const { colors, typography } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title="Share your progress" subtitle="A quick look at your EcoTrek progress">
      <View style={[styles.summary, { backgroundColor: colors.primarySurface, borderColor: colors.border }]}>
        <Text style={[typography.h2, { color: colors.text }]}>{name}</Text>
        <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]}>{level}</Text>
        <View style={styles.stats}>
          <SummaryStat value={miles} label={unit} />
          <SummaryStat value={String(trees)} label={trees === 1 ? 'tree' : 'trees'} />
          <SummaryStat value={String(streak)} label="week streak" />
          <SummaryStat value={String(trails)} label="trails" />
        </View>
      </View>
      <Text style={[typography.small, { color: colors.textMuted, textAlign: 'center', marginTop: SPACING.md }]}>
        You can show this to people.
      </Text>
    </Sheet>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[typography.h3, { color: colors.primary }]}>{value}</Text>
      <Text style={[typography.micro, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '40%',
  },
});
