import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import { Screen, Card, SectionHeader, Pill, Button } from '../components/ui';

import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { useStreak } from '../context/StreakContext';
import { useTheme, Typography } from '../context/ThemeContext';

export default function StreakScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const {
    currentStreak,
    longestStreak,
    totalActiveWeeks,
    availableFreezes,
    freezes,
    useFreeze,
    weekHistory,
    activeThisWeek,
  } = useStreak();

  const [freezing, setFreezing] = useState(false);
  const history = weekHistory(12);

  const handleUseFreeze = async () => {
    if (availableFreezes === 0) {
      Alert.alert(
        'No freezes available',
        'Earn more freezes by maintaining a 4-week streak. You get 1 freeze for every 4 consecutive active weeks, up to 4 stored.'
      );
      return;
    }

    Alert.alert(
      'Use a streak freeze?',
      'This will protect your most recent missed week. You cannot undo this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use freeze',
          onPress: async () => {
            setFreezing(true);
            await useFreeze();
            setFreezing(false);
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <Header title="Weekly Streak" back />

      <View style={styles.body}>
        {/* Main streak display */}
        <Card tone="dark" style={styles.heroCard}>
          <Text style={styles.heroLabel}>Current streak</Text>
          <View style={styles.heroValue}>
            <Text style={styles.heroNumber}>{currentStreak}</Text>
            <Text style={styles.heroUnit}>week{currentStreak === 1 ? '' : 's'}</Text>
          </View>

          <View style={styles.heroStats}>
            <HeroStat value={longestStreak} label="Best ever" />
            <HeroStat value={totalActiveWeeks} label="Total active" />
            <HeroStat value={availableFreezes} label="Freezes" />
          </View>

          {!activeThisWeek ? (
            <View style={styles.nudgeBanner}>
              <Icon name="alert-circle" size={16} color={colors.primaryGlow} strokeWidth={2} />
              <Text style={styles.nudgeText}>
                Log an activity this week to keep your streak going!
              </Text>
            </View>
          ) : (
            <View style={[styles.nudgeBanner, { backgroundColor: 'rgba(125,212,173,0.15)' }]}>
              <Icon name="check-circle" size={16} color={colors.primaryGlow} strokeWidth={2} />
              <Text style={styles.nudgeText}>
                You're active this week — streak is safe!
              </Text>
            </View>
          )}
        </Card>

        {/* Freeze system */}
        <Card>
          <View style={styles.freezeHead}>
            <View style={styles.freezeIcon}>
              <Icon name="shield" size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.freezeTitle}>Streak Freezes</Text>
              <Text style={styles.freezeSub}>
                Skip a week without breaking your streak
              </Text>
            </View>
            <Pill label={`${availableFreezes}/4`} tone="primary" size="sm" />
          </View>

          <View style={styles.freezeSlots}>
            {[0, 1, 2, 3].map((i) => {
              const freeze = freezes.filter((f) => !f.usedAt)[i];
              return (
                <View
                  key={i}
                  style={[styles.freezeSlot, freeze && styles.freezeSlotFilled]}
                >
                  <Icon
                    name="shield"
                    size={18}
                    color={freeze ? colors.primary : colors.textLight}
                    strokeWidth={2}
                  />
                </View>
              );
            })}
          </View>

          <Text style={styles.freezeHint}>
            Earn 1 freeze for every 4 consecutive active weeks. Stack up to 4 freezes.
          </Text>

          <Button
            label={availableFreezes > 0 ? 'Use a freeze' : 'No freezes available'}
            variant="secondary"
            full
            disabled={availableFreezes === 0 || freezing}
            loading={freezing}
            onPress={handleUseFreeze}
          />
        </Card>

        {/* Week history */}
        <View>
          <SectionHeader title="Last 12 weeks" />
          <Card>
            <View style={styles.weekGrid}>
              {history.map((w) => (
                <View key={w.weekKey} style={styles.weekCell}>
                  <View
                    style={[
                      styles.weekDot,
                      w.active && styles.weekDotActive,
                      w.frozen && styles.weekDotFrozen,
                      w.isCurrent && !w.active && styles.weekDotCurrent,
                    ]}
                  />
                  <Text style={styles.weekLabel}>
                    {w.weekKey.split('-W')[1]}
                  </Text>
                  {w.activities > 0 ? (
                    <Text style={styles.weekActivities}>{w.activities}</Text>
                  ) : null}
                </View>
              ))}
            </View>

            <View style={styles.legend}>
              <LegendItem color={colors.primary} label="Active" />
              <LegendItem color={colors.accent} label="Frozen" />
              <LegendItem color={colors.primarySurface} border={colors.primaryGlow} label="Current" />
              <LegendItem color={colors.surfaceSunken} border={colors.border} label="Missed" />
            </View>
          </Card>
        </View>

        {/* How it works */}
        <Card tone="sunken">
          <Text style={styles.howTitle}>How weekly streaks work</Text>
          <View style={styles.howItem}>
            <Icon name="check-circle" size={15} color={colors.primary} strokeWidth={2} />
            <Text style={styles.howText}>Log any activity during the week to mark it active</Text>
          </View>
          <View style={styles.howItem}>
            <Icon name="shield" size={15} color={colors.accent} strokeWidth={2} />
            <Text style={styles.howText}>Use a freeze to protect a missed week</Text>
          </View>
          <View style={styles.howItem}>
            <Icon name="award" size={15} color={colors.primary} strokeWidth={2} />
            <Text style={styles.howText}>Earn bonus points at every 4-week milestone</Text>
          </View>
          <View style={styles.howItem}>
            <Icon name="calendar" size={15} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.howText}>Weeks reset every Monday at midnight</Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function LegendItem({ color, border, label }: { color: string; border?: string; label: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          { backgroundColor: color, borderColor: border ?? color, borderWidth: border ? 1.5 : 0 },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({

  body: { paddingHorizontal: SPACING.md, gap: SPACING.md + 2 },

  heroCard: { gap: SPACING.md, padding: SPACING.lg },
  heroLabel: { ...t.overline, color: 'rgba(255,255,255,0.6)' },
  heroValue: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  heroNumber: { fontSize: 64, fontWeight: '700', color: '#fff', letterSpacing: -0.6 },
  heroUnit: { ...t.h2, color: 'rgba(255,255,255,0.6)' },
  heroStats: {
    flexDirection: 'row',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  heroStatValue: { ...t.h2, color: '#fff' },
  heroStatLabel: { ...t.micro, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginTop: 2 },

  nudgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
  },
  nudgeText: { ...t.small, color: c.primaryGlow, flex: 1 },

  freezeHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  freezeIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: c.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freezeTitle: { ...t.h4, color: c.text },
  freezeSub: { ...t.small, color: c.textMuted, marginTop: 1 },

  freezeSlots: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  freezeSlot: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: c.surfaceSunken,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freezeSlotFilled: { backgroundColor: c.primarySurface, borderColor: c.primaryGlow },
  freezeHint: { ...t.small, color: c.textMuted, marginTop: SPACING.sm },

  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  weekCell: {
    width: '22%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
  },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.surfaceSunken,
    borderWidth: 1,
    borderColor: c.border,
  },
  weekDotActive: { backgroundColor: c.primary, borderColor: c.primary },
  weekDotFrozen: { backgroundColor: c.accent, borderColor: c.accent },
  weekDotCurrent: { backgroundColor: c.primarySurface, borderColor: c.primaryGlow },
  weekLabel: { ...t.micro, color: c.textMuted },
  weekActivities: { fontSize: 9, color: c.textLight },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: c.borderLight },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 12, height: 12, borderRadius: 6 },
  legendText: { ...t.micro, color: c.textMuted },

  howTitle: { ...t.h4, color: c.text, marginBottom: SPACING.sm },
  howItem: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  howText: { ...t.small, color: c.textSecondary, flex: 1 },

  });
}
