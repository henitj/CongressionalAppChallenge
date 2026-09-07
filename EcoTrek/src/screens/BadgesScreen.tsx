import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import Confetti from '../components/Confetti';
import { Screen, Card, Pill, ProgressBar, Sheet, Button } from '../components/ui';
import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import {
  BADGE_CLAIM_POINTS,
  Badge,
  BADGE_CATEGORY_LABEL,
  BADGE_CATEGORY_ORDER,
  useEcoPoints,
} from '../constants/EcoPointsContext';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme, Typography } from '../context/ThemeContext';

/**
 * Dedicated badges page. Profile used to dump every badge in one giant list
 * that wrapped badly. Here they sit in a tidy grid, grouped so you can
 * actually find one.
 *
 * Every badge carries a small point reward. When a badge unlocks it gets a
 * little dot; tapping it and claiming the reward pays out EcoPoints and
 * fires a confetti celebration.
 *
 * Layout note: tile sizes are computed as exact pixel values from the screen
 * width instead of percentage widths + aspectRatio. That combination used to
 * reflow while scrolling on Android, which made the grid look glitchy.
 */
export default function BadgesScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { badges, unlockedBadges, newBadges, claimBadge } = useEcoPoints();
  const { width, isTablet, contentWidth, badgeColumns } = useResponsive();
  const [selected, setSelected] = useState<Badge | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [celebration, setCelebration] = useState<{ badge: Badge; points: number } | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Whole number of equal columns; the grid gets a couple of extra px of
  // slack per row so rounding can never push a tile onto a new line.
  const columnWidth = isTablet ? Math.min(width, contentWidth) : width;
  const cellSize = Math.floor((columnWidth - SPACING.md * 2) / badgeColumns);

  useEffect(() => {
    return () => {
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    };
  }, []);

  const grouped = useMemo(() => {
    return BADGE_CATEGORY_ORDER.map((cat) => ({
      cat,
      label: BADGE_CATEGORY_LABEL[cat],
      items: badges.filter((b) => b.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [badges]);

  const handleClaim = async (badge: Badge) => {
    if (claiming) return;
    setClaiming(true);
    try {
      const points = await claimBadge(badge.id);
      setSelected(null);
      if (points > 0) {
        setCelebration({ badge, points });
        // The celebration dismisses itself so nobody is ever stuck behind it.
        celebrationTimer.current = setTimeout(() => setCelebration(null), 6000);
      }
    } finally {
      setClaiming(false);
    }
  };

  const dismissCelebration = () => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    setCelebration(null);
  };

  const subtitle =
    newBadges.length > 0
      ? `${newBadges.length} new badge${newBadges.length === 1 ? '' : 's'} to claim · ${unlockedBadges.length} of ${badges.length} earned`
      : `${unlockedBadges.length} of ${badges.length} earned`;

  return (
    <View style={styles.page}>
      <Screen>
        <Header title="Badges" subtitle={subtitle} back />

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
                {g.items.map((b) => {
                  const isNew = b.unlocked && !b.claimedAt;
                  return (
                    <View key={b.id} style={[styles.cell, { width: cellSize, height: cellSize }]}>
                      <Pressable
                        onPress={() => setSelected(b)}
                        style={[
                          styles.tile,
                          b.unlocked && styles.tileOn,
                          isNew && styles.tileNew,
                        ]}
                        accessibilityLabel={`${b.name}. ${
                          isNew
                            ? `New, tap to claim ${BADGE_CLAIM_POINTS} points`
                            : b.unlocked
                            ? 'Earned'
                            : 'Not yet earned'
                        }`}
                      >
                        {isNew ? <View style={styles.newDot} /> : null}
                        <Icon
                          name={b.icon}
                          size={26}
                          color={b.unlocked ? colors.primary : colors.textLight}
                          strokeWidth={1.9}
                        />
                        <Text style={[styles.name, b.unlocked && styles.nameOn]} numberOfLines={2}>
                          {b.name}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
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
              {selected.unlocked && !selected.claimedAt ? (
                <>
                  <Pill
                    label={
                      selected.unlockedAt
                        ? `Earned ${new Date(selected.unlockedAt).toLocaleDateString()}`
                        : 'Earned'
                    }
                    tone="primary"
                    size="sm"
                  />
                  <Button
                    label={`Claim +${BADGE_CLAIM_POINTS} EcoPoints`}
                    icon="gift"
                    full
                    loading={claiming}
                    disabled={claiming}
                    onPress={() => handleClaim(selected)}
                  />
                </>
              ) : selected.unlocked && selected.unlockedAt ? (
                <Pill
                  label={`Earned ${new Date(selected.unlockedAt).toLocaleDateString()} · reward claimed`}
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

      {/* Full-screen reward celebration: confetti plus what was earned.
          Rendered outside the scrolling Screen so it covers the whole page
          and does not scroll with the badge grid. */}
      {celebration ? (
        <Pressable
          style={styles.celebrationOverlay}
          onPress={dismissCelebration}
          accessibilityLabel="Dismiss celebration"
        >
          <Confetti />
          <View style={styles.celebrationCard}>
            <View style={styles.celebrationIcon}>
              <Icon name={celebration.badge.icon} size={38} color="#fff" strokeWidth={1.8} />
            </View>
            <Text style={styles.celebrationTitle}>Badge unlocked!</Text>
            <Text style={styles.celebrationName}>{celebration.badge.name}</Text>
            <View style={styles.celebrationPoints}>
              <Icon name="star" size={16} color={colors.accentDark} strokeWidth={2.2} />
              <Text style={styles.celebrationPointsText}>+{celebration.points} EcoPoints</Text>
            </View>
            <Text style={styles.celebrationHint}>Tap anywhere to keep exploring</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({

  page: { flex: 1 },
  body: { paddingHorizontal: SPACING.md, gap: SPACING.lg },
  summary: { ...t.h3, color: c.text },
  section: { ...t.h3, color: c.text, marginBottom: SPACING.sm },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    padding: 5,
  },
  tile: {
    flex: 1,
    borderRadius: RADIUS.lg,
    // One uniform border everywhere: changing border widths between states
    // made tiles jump a pixel when a badge was claimed.
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
    overflow: 'hidden',
  },
  tileOn: {
    backgroundColor: c.primarySurface,
    borderColor: c.primaryGlow,
  },
  tileNew: {
    borderColor: c.accent,
  },
  // Sits INSIDE the tile (no negative offsets) so Android never clips or
  // flickers it while the list scrolls.
  newDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: c.accent,
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

  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  celebrationCard: {
    backgroundColor: c.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    maxWidth: 340,
    width: '100%',
  },
  celebrationIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  celebrationTitle: { ...t.h2, color: c.text },
  celebrationName: { ...t.h3, color: c.primary, textAlign: 'center' },
  celebrationPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.accentLight,
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
  },
  celebrationPointsText: { ...t.bodyMed, color: c.accentDark },
  celebrationHint: { ...t.small, color: c.textMuted, marginTop: SPACING.xs },

  });
}
