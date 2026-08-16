import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import StreakStrip from '../components/StreakStrip';
import { Screen, Card, Pill, ProgressBar, Divider, Banner } from '../components/ui';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useStreak } from '../context/StreakContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { STREAK_MILESTONES } from '../services/streaks';
import { dayKey } from '../services/dates';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function StreakScreen() {
  const {
    currentStreak,
    longestStreak,
    totalActiveDays,
    totalCheckIns,
    activeDaysLast30,
    perfectWeeks,
    daysToNextBonus,
    nextBonusPoints,
    nextMilestone,
    activeToday,
    monthCells,
  } = useStreak();
  const { badges } = useEcoPoints();

  const now = new Date();
  const [offset, setOffset] = useState(0); // months back from this month

  const viewing = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const cells = monthCells(viewing.year, viewing.month);
  const today = dayKey();

  const monthActive = cells.filter((c) => (c.record?.activities ?? 0) > 0).length;
  const monthMiles = cells.reduce((s, c) => s + (c.record?.miles ?? 0), 0);

  const streakBadges = badges.filter(
    (b) => b.id.startsWith('streak_') || ['perfect_week', 'perfect_weeks_4', 'month_20', 'comeback', 'hundred_days'].includes(b.id)
  );

  return (
    <Screen>
      <Header title="Streak" subtitle="Consistency beats intensity" back />

      <View style={styles.body}>
        {/* ── The number ─────────────────────────────────────────────────── */}
        <Card tone="dark" style={styles.hero}>
          <View style={styles.heroFlame}>
            <Icon
              name="flame"
              size={34}
              color={currentStreak > 0 ? COLORS.accent : 'rgba(255,255,255,0.3)'}
              strokeWidth={1.8}
            />
          </View>

          <Text style={styles.heroNumber}>{currentStreak}</Text>
          <Text style={styles.heroLabel}>
            day{currentStreak === 1 ? '' : 's'} in a row
          </Text>

          <Text style={styles.heroStatus}>
            {currentStreak === 0
              ? 'Open the app tomorrow to start one.'
              : activeToday
              ? 'Logged an activity today. Locked in.'
              : 'Checked in today. Log an activity to fill the square.'}
          </Text>

          <View style={styles.heroStats}>
            <HeroStat value={longestStreak} label="Longest" />
            <HeroStat value={totalActiveDays} label="Active days" />
            <HeroStat value={totalCheckIns} label="Check-ins" />
          </View>
        </Card>

        {/* ── Next bonus ─────────────────────────────────────────────────── */}
        <Card>
          <View style={styles.bonusRow}>
            <View style={styles.bonusIcon}>
              <Icon name="zap" size={17} color={COLORS.accentDark} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bonusTitle}>
                {daysToNextBonus} more day{daysToNextBonus === 1 ? '' : 's'} to a bonus
              </Text>
              <Text style={styles.bonusSub}>
                Worth {nextBonusPoints} points. Bonuses grow the longer you hold the streak.
              </Text>
            </View>
          </View>
          <ProgressBar
            percent={((7 - daysToNextBonus) / 7) * 100}
            color={COLORS.accent}
            style={{ marginTop: SPACING.sm + 4 }}
          />
        </Card>

        {/* ── Last two weeks ─────────────────────────────────────────────── */}
        <Card>
          <Text style={styles.sectionLabel}>Last 14 days</Text>
          <StreakStrip days={14} compact style={{ marginTop: SPACING.sm + 2 }} />
          <View style={styles.legend}>
            <LegendItem color={COLORS.primary} label="Activity logged" />
            <LegendItem color={COLORS.primarySurface} border={COLORS.primaryGlow} label="Opened app" />
            <LegendItem color={COLORS.surfaceSunken} border={COLORS.border} label="Missed" />
          </View>
        </Card>

        {/* ── Month calendar ─────────────────────────────────────────────── */}
        <Card>
          <View style={styles.monthHead}>
            <Pressable onPress={() => setOffset((o) => o + 1)} hitSlop={10} style={styles.monthNav}>
              <Icon name="chevron-left" size={17} color={COLORS.textSecondary} strokeWidth={2.1} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.monthTitle}>
                {MONTHS[viewing.month]} {viewing.year}
              </Text>
              <Text style={styles.monthSub}>
                {monthActive} active day{monthActive === 1 ? '' : 's'} · {monthMiles.toFixed(1)} mi
              </Text>
            </View>
            <Pressable
              onPress={() => setOffset((o) => Math.max(0, o - 1))}
              hitSlop={10}
              style={[styles.monthNav, offset === 0 && { opacity: 0.3 }]}
              disabled={offset === 0}
            >
              <Icon name="chevron-right" size={17} color={COLORS.textSecondary} strokeWidth={2.1} />
            </Pressable>
          </View>

          <View style={styles.weekHeader}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekHeaderText}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, i) => {
              const active = (cell.record?.activities ?? 0) > 0;
              const opened = !!cell.record?.opened;
              const isToday = cell.day === today;
              return (
                <View key={i} style={styles.gridCellWrap}>
                  {cell.day ? (
                    <View
                      style={[
                        styles.gridCell,
                        opened && styles.gridCellOpened,
                        active && styles.gridCellActive,
                        isToday && styles.gridCellToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.gridCellText,
                          opened && { color: COLORS.primary },
                          active && { color: '#fff' },
                        ]}
                      >
                        {Number(cell.day.slice(-2))}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.gridCell} />
                  )}
                </View>
              );
            })}
          </View>
        </Card>

        {/* ── Milestones ─────────────────────────────────────────────────── */}
        <Card padded={false}>
          <View style={{ padding: SPACING.md, paddingBottom: SPACING.sm }}>
            <Text style={styles.sectionLabel}>Milestones</Text>
            {nextMilestone ? (
              <Text style={styles.milestoneNext}>
                {nextMilestone.days - currentStreak} day
                {nextMilestone.days - currentStreak === 1 ? '' : 's'} to {nextMilestone.name}
              </Text>
            ) : (
              <Text style={styles.milestoneNext}>Every milestone cleared.</Text>
            )}
          </View>

          {STREAK_MILESTONES.map((m, i) => {
            const reached = longestStreak >= m.days;
            const inProgress = !reached && (nextMilestone?.days === m.days);
            return (
              <View key={m.days}>
                {i > 0 ? <Divider style={{ marginLeft: 58 }} /> : null}
                <View style={styles.milestoneRow}>
                  <View style={[styles.milestoneIcon, reached && styles.milestoneIconDone]}>
                    <Icon
                      name={reached ? 'check' : 'flame'}
                      size={15}
                      color={reached ? '#fff' : COLORS.textLight}
                      strokeWidth={reached ? 2.6 : 1.9}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.milestoneName, reached && { color: COLORS.text }]}>
                      {m.name}
                    </Text>
                    <Text style={styles.milestoneDays}>{m.days} day streak</Text>
                    {inProgress ? (
                      <ProgressBar
                        percent={(currentStreak / m.days) * 100}
                        height={4}
                        style={{ marginTop: 6 }}
                      />
                    ) : null}
                  </View>
                  {reached ? <Pill label="Earned" tone="primary" size="sm" /> : null}
                </View>
              </View>
            );
          })}
        </Card>

        {/* ── Streak badges ──────────────────────────────────────────────── */}
        <Card>
          <Text style={styles.sectionLabel}>Streak badges</Text>
          <Text style={styles.badgeCount}>
            {streakBadges.filter((b) => b.unlocked).length} of {streakBadges.length} earned
          </Text>
          <View style={styles.badgeList}>
            {streakBadges.map((b) => (
              <View key={b.id} style={[styles.badgeChip, b.unlocked && styles.badgeChipOn]}>
                <Icon
                  name={b.icon}
                  size={14}
                  color={b.unlocked ? COLORS.primary : COLORS.textLight}
                  strokeWidth={2}
                />
                <Text style={[styles.badgeChipText, b.unlocked && { color: COLORS.primary }]}>
                  {b.name}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {perfectWeeks > 0 ? (
          <Banner
            tone="success"
            icon="award"
            title={`${perfectWeeks} perfect week${perfectWeeks === 1 ? '' : 's'}`}
            message="Weeks where you got out all seven days. That is genuinely hard."
          />
        ) : null}

        <Card tone="sunken">
          <Text style={styles.rulesTitle}>How the streak works</Text>
          <Rule icon="calendar" text="Opening the app counts as a check-in and keeps the streak alive." />
          <Rule icon="boot" text="Logging an activity fills the square in solid — that is the one worth chasing." />
          <Rule icon="clock" text="It only breaks after a whole day passes with no check-in, and it resets at your local midnight." />
          <Rule icon="zap" text="Every seventh day pays a bonus that scales with how long you have held it." />
        </Card>
      </View>
    </Screen>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function LegendItem({ color, border, label }: { color: string; border?: string; label: string }) {
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

function Rule({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.rule}>
      <Icon name={icon} size={15} color={COLORS.textMuted} strokeWidth={1.9} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },

  hero: { alignItems: 'center', paddingVertical: SPACING.lg, gap: 2 },
  heroFlame: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  heroNumber: { fontSize: 68, fontWeight: '700', color: '#fff', letterSpacing: -0.6 },
  heroLabel: { ...TYPOGRAPHY.h4, color: 'rgba(255,255,255,0.65)' },
  heroStatus: {
    ...TYPOGRAPHY.small,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: SPACING.sm,
    maxWidth: 280,
  },
  heroStats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  heroStatValue: { ...TYPOGRAPHY.h2, color: '#fff' },
  heroStatLabel: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
  },

  bonusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  bonusIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  bonusSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },

  sectionLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.md - 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 11, height: 11, borderRadius: 3 },
  legendText: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },

  monthHead: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md - 2 },
  monthNav: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  monthSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  weekHeader: { flexDirection: 'row', marginBottom: 6 },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    ...TYPOGRAPHY.micro,
    color: COLORS.textLight,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCellWrap: { width: `${100 / 7}%`, padding: 2.5 },
  gridCell: {
    aspectRatio: 1,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellOpened: { backgroundColor: COLORS.primarySurface },
  gridCellActive: { backgroundColor: COLORS.primary },
  gridCellToday: { borderWidth: 2, borderColor: COLORS.accent },
  gridCellText: { fontSize: 12, fontWeight: '600', color: COLORS.textLight },

  milestoneNext: { ...TYPOGRAPHY.h4, color: COLORS.text, marginTop: 3 },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
  },
  milestoneIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneIconDone: { backgroundColor: COLORS.primary },
  milestoneName: { ...TYPOGRAPHY.bodyMed, color: COLORS.textMuted },
  milestoneDays: { ...TYPOGRAPHY.micro, color: COLORS.textLight, marginTop: 1 },

  badgeCount: { ...TYPOGRAPHY.h4, color: COLORS.text, marginTop: 3 },
  badgeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm + 2 },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSunken,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  badgeChipOn: { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primaryGlow },
  badgeChipText: { fontSize: 11.5, fontWeight: '600', color: COLORS.textLight },

  rulesTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: SPACING.sm + 2 },
  rule: { flexDirection: 'row', gap: SPACING.sm + 2, marginBottom: SPACING.sm },
  ruleText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, flex: 1 },
});
