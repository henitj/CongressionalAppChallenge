import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import { Screen, Card, Pill, ProgressBar, Sheet } from '../components/ui';
import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import {
  Badge,
  BADGE_CATEGORY_LABEL,
  BADGE_CATEGORY_ORDER,
  useEcoPoints,
} from '../constants/EcoPointsContext';
import { useTheme, Typography } from '../context/ThemeContext';

/**
 * Dedicated badges page. Profile used to dump every badge in one giant list
 * that wrapped badly. Here they sit in a real 3-across grid, grouped so you
 * can actually find one.
 */
export default function BadgesScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { badges, unlockedBadges } = useEcoPoints();
  const [selected, setSelected] = useState<Badge | null>(null);

  const grouped = useMemo(() => {
    return BADGE_CATEGORY_ORDER.map((cat) => ({
      cat,
      label: BADGE_CATEGORY_LABEL[cat],
      items: badges.filter((b) => b.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [badges]);

  return (
    <Screen>
      <Header
        title="Badges"
        subtitle={`${unlockedBadges.length} of ${badges.length} earned`}
        back
      />

      <View style={styles.body}>
        <Card>
          <Text style={styles.summary}>
            {unlockedBadges.length} of {badges.length} badges earned
          </Text>
          <ProgressBar
            percent={badges.length ? (unlockedBadges.length / badges.length) * 100 : 0}
            style={{ marginTop: SPACING.sm }}
            height={10}
          />
        </Card>

        {grouped.map((g) => (
          <View key={g.cat}>
            <Text style={styles.section}>{g.label}</Text>
            <View style={styles.grid}>
              {g.items.map((b) => (
                <View key={b.id} style={styles.cell}>
                  <Pressable
                    onPress={() => setSelected(b)}
                    style={[styles.tile, b.unlocked && styles.tileOn]}
                    accessibilityLabel={`${b.name}. ${b.unlocked ? 'Earned' : 'Not yet earned'}`}
                  >
                    <Icon
                      name={b.icon}
                      size={26}
                      color={b.unlocked ? colors.primary : colors.textLight}
                      strokeWidth={1.9}
                    />
                    <Text
                      style={[styles.name, b.unlocked && styles.nameOn]}
                      numberOfLines={2}
                    >
                      {b.name}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <Sheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={selected?.unlocked ? 'Earned' : 'Not yet earned'}
      >
        {selected ? (
          <View style={styles.detail}>
            <View style={[styles.large, selected.unlocked && styles.largeOn]}>
              <Icon
                name={selected.icon}
                size={42}
                color={selected.unlocked ? colors.primary : colors.textLight}
                strokeWidth={1.7}
              />
            </View>
            <Text style={styles.desc}>{selected.description}</Text>
            {selected.unlocked && selected.unlockedAt ? (
              <Pill
                label={`Earned ${new Date(selected.unlockedAt).toLocaleDateString()}`}
                tone="primary"
                size="sm"
              />
            ) : (
              <Pill label="Keep going — you will earn this" tone="neutral" size="sm" />
            )}
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({

  body: { paddingHorizontal: SPACING.md, gap: SPACING.lg },
  summary: { ...t.h3, color: c.text },
  section: { ...t.h3, color: c.text, marginBottom: SPACING.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  cell: {
    width: '33.333%',
    padding: 6,
  },
  tile: {
    aspectRatio: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  tileOn: {
    backgroundColor: c.primarySurface,
    borderColor: c.primaryGlow,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  nameOn: { color: c.primary },
  detail: { alignItems: 'center', gap: SPACING.md, paddingBottom: SPACING.md },
  large: {
    width: 96,
    height: 96,
    borderRadius: RADIUS.xl,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeOn: { backgroundColor: c.primarySurface },
  desc: { ...t.body, color: c.textSecondary, textAlign: 'center' },

  });
}
