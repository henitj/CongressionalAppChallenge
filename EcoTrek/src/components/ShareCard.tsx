import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import Icon from './Icon';
import { Button, Sheet } from './ui';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { shareText } from '../services/share';

type Props = {
  visible: boolean;
  onClose: () => void;
  name: string;
  miles: string;
  unit: string;
  trees: number;
  streak: number;
  level: string;
};

export default function ShareCard({
  visible,
  onClose,
  name,
  miles,
  unit,
  trees,
  streak,
  level,
}: Props) {
  const message =
    `${name} walked ${miles} ${unit} with EcoTrek.\n` +
    `${trees} tree${trees === 1 ? '' : 's'} · ${level}` +
    (streak > 0 ? ` · ${streak}-week streak` : '') +
    `\nWant to join me?`;

  return (
    <Sheet visible={visible} onClose={onClose} title="Share your progress">
      <View style={styles.card}>
        <View style={styles.mark}>
          <Icon name="tree" size={28} color={COLORS.primaryGlow} strokeWidth={1.8} />
        </View>
        <Text style={styles.kicker}>EcoTrek</Text>
        <Text style={styles.headline}>{name} went outside</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {miles}
              <Text style={styles.statUnit}> {unit}</Text>
            </Text>
            <Text style={styles.statLabel}>Walked</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{trees}</Text>
            <Text style={styles.statLabel}>{trees === 1 ? 'Tree' : 'Trees'}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Week streak</Text>
          </View>
        </View>
        <Text style={styles.level}>{level}</Text>
      </View>
      <Text style={styles.hint}>This is the card your family will see. Tap Share to send it.</Text>
      <Button
        label="Share this card"
        icon="share"
        size="lg"
        full
        onPress={() => shareText(message, `${name}'s walk`)}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { ...TYPOGRAPHY.overline, color: COLORS.primaryGlow },
  headline: { ...TYPOGRAPHY.h2, color: '#fff', textAlign: 'center' },
  stats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: SPACING.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '700', color: '#fff' },
  statUnit: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  statLabel: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  level: { ...TYPOGRAPHY.smallMed, color: COLORS.primaryGlow, marginTop: SPACING.sm },
  hint: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginBottom: SPACING.md, textAlign: 'center' },
});
