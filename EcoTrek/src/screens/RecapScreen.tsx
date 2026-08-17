import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Pill, Button, Divider, EmptyState } from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActivity } from '../context/ActivityContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { useStreak } from '../context/StreakContext';
import { useLogbook } from '../context/LogbookContext';
import { useChallenges } from '../context/ChallengeContext';
import { useSettings } from '../constants/SettingsContext';
import { buildRecap, lastWeekStart, RecapMetric } from '../services/recap';
import { weekKey } from '../services/dates';
import { computeRecords } from '../services/records';

/**
 * Last week, summarised.
 *
 * Comparisons are the point — a bare "12 miles" says nothing, "12 miles, up
 * from 7" says you are building something. Records are shown alongside because
 * a recap is the natural moment to notice you beat one.
 */
export default function RecapScreen() {
  const navigation = useNavigation<any>();
  const { history } = useActivity();
  const { history: pointHistory } = useEcoPoints();
  const { days } = useStreak();
  const { sightingsInRange, cleanupsInRange } = useLogbook();
  const { lifetimeCompleted, completedInWeek } = useChallenges();
  const { formatDistanceCompact, formatDistanceUnit } = useSettings();

  const weekStartMs = useMemo(() => lastWeekStart().getTime(), []);

  const recap = useMemo(() => {
    const activeDays: Record<string, boolean> = {};
    for (const [key, rec] of Object.entries(days)) {
      activeDays[key] = rec.activities > 0;
    }

    return buildRecap({
      activities: history,
      points: pointHistory,
      activeDays,
      challengesCompleted: completedInWeek(weekKey(new Date(weekStartMs))),
      sightings: sightingsInRange(weekStartMs, weekStartMs + 7 * 86400000),
      cleanups: cleanupsInRange(weekStartMs, weekStartMs + 7 * 86400000),
      weekStartMs,
    });
  }, [history, pointHistory, days, sightingsInRange, cleanupsInRange, completedInWeek, weekStartMs]);

  const records = useMemo(
    () => computeRecords(history, formatDistanceCompact, formatDistanceUnit()),
    [history, formatDistanceCompact, formatDistanceUnit]
  );

  /** Records set during the recap week are the ones worth calling out. */
  const freshRecords = useMemo(() => {
    const weekEnd = weekStartMs + 7 * 86400000;
    const idsInWeek = new Set(
      history.filter((a) => a.startedAt >= weekStartMs && a.startedAt < weekEnd).map((a) => a.id)
    );
    return records.filter((r) => r.activityId && idsInWeek.has(r.activityId));
  }, [records, history, weekStartMs]);

  const share = () => {
    Share.share({
      message:
        `My EcoTrek week (${recap.rangeLabel}):\n` +
        `${recap.miles} mi · ${recap.activities} activities · ${recap.trees} trees · ${recap.points} points\n` +
        `Out on ${recap.activeDays} of 7 days.`,
    });
  };

  return (
    <Screen>
      <Header
        title="Last week"
        subtitle={recap.rangeLabel}
        back
        actions={recap.empty ? [] : [{ icon: 'share', onPress: share, label: 'Share recap' }]}
      />

      <View style={styles.body}>
        {recap.empty ? (
          <EmptyState
            icon="calendar"
            title="Nothing logged last week"
            message="No judgement. Start something this week and the recap will have plenty to say."
            action="Track an activity"
            onAction={() => navigation.navigate('Tabs', { screen: 'Track' })}
          />
        ) : (
          <>
            <Card tone="dark" style={styles.hero}>
              <Text style={styles.heroLabel}>{recap.rangeLabel}</Text>
              <Text style={styles.heroHeadline}>{recap.headline}</Text>

              <View style={styles.heroStats}>
                <HeroStat
                  value={formatDistanceCompact(recap.miles)}
                  unit={formatDistanceUnit()}
                  label="Distance"
                />
                <HeroStat value={String(recap.activities)} label="Activities" />
                <HeroStat value={String(recap.trees)} label="Trees" />
                <HeroStat value={`${recap.activeDays}/7`} label="Days out" />
              </View>
            </Card>

            {/* Week on week */}
            <View>
              <Text style={styles.sectionTitle}>Compared with the week before</Text>
              <Card padded={false}>
                {recap.metrics.map((m, i) => (
                  <View key={m.label}>
                    {i > 0 ? <Divider style={{ marginLeft: SPACING.md }} /> : null}
                    <MetricRow metric={m} />
                  </View>
                ))}
              </Card>
            </View>

            {/* Extras */}
            {recap.trailsCompleted > 0 ||
            recap.sightings > 0 ||
            recap.cleanups > 0 ||
            recap.challengesCompleted > 0 ? (
              <Card>
                <Text style={styles.sectionLabel}>Also last week</Text>
                <View style={styles.extras}>
                  {recap.trailsCompleted > 0 ? (
                    <Extra
                      icon="flag"
                      value={recap.trailsCompleted}
                      label={`trail${recap.trailsCompleted === 1 ? '' : 's'} completed`}
                    />
                  ) : null}
                  {recap.sightings > 0 ? (
                    <Extra
                      icon="eye"
                      value={recap.sightings}
                      label={`species logged`}
                    />
                  ) : null}
                  {recap.challengesCompleted > 0 ? (
                    <Extra
                      icon="target"
                      value={recap.challengesCompleted}
                      label={`challenge${recap.challengesCompleted === 1 ? '' : 's'} finished`}
                    />
                  ) : null}
                  {recap.cleanups > 0 ? (
                    <Extra
                      icon="trash"
                      value={recap.cleanups}
                      label={`cleanup${recap.cleanups === 1 ? '' : 's'}`}
                    />
                  ) : null}
                </View>
              </Card>
            ) : null}

            {/* Records set that week */}
            {freshRecords.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>Records you set</Text>
                <View style={{ gap: SPACING.sm }}>
                  {freshRecords.map((r) => (
                    <Card key={r.id} style={styles.recordCard}>
                      <View style={styles.recordIcon}>
                        <Icon name="award" size={17} color={COLORS.accentDark} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recordLabel}>{r.label}</Text>
                        <Text style={styles.recordDetail}>{r.detail}</Text>
                      </View>
                      <Text style={styles.recordValue}>
                        {r.value}
                        {r.unit ? <Text style={styles.recordUnit}> {r.unit}</Text> : null}
                      </Text>
                    </Card>
                  ))}
                </View>
              </View>
            ) : null}

            <Button
              label="See all records"
              variant="secondary"
              iconRight="chevron-right"
              full
              onPress={() => navigation.navigate('Impact', { tab: 'records' })}
            />
          </>
        )}

        <Card tone="sunken">
          <Text style={styles.aboutTitle}>About this recap</Text>
          <Text style={styles.aboutText}>
            It covers Monday to Sunday of the week just gone, and compares it with the seven days
            before that. Turn on notifications and it arrives on Sunday evening.
          </Text>
          <Pill
            label={`${lifetimeCompleted} challenges finished all time`}
            tone="neutral"
            size="sm"
            icon="target"
            style={{ marginTop: SPACING.sm + 2 }}
          />
        </Card>
      </View>
    </Screen>
  );
}

function HeroStat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={styles.heroStatValue}>{value}</Text>
        {unit ? <Text style={styles.heroStatUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function MetricRow({ metric }: { metric: RecapMetric }) {
  const up = metric.changePercent != null && metric.changePercent > 0;

  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={styles.metricValue}>{formatMetric(metric.value)}</Text>
      <View style={styles.metricChange}>
        {metric.changePercent == null ? (
          <Pill label="New" tone="primary" size="sm" />
        ) : metric.changePercent === 0 ? (
          <Text style={styles.metricFlat}>same</Text>
        ) : (
          <>
            <Icon
              name={up ? 'trending-up' : 'chevron-down'}
              size={13}
              color={up ? COLORS.primary : COLORS.textMuted}
              strokeWidth={2.2}
            />
            <Text style={[styles.metricDelta, up && { color: COLORS.primary }]}>
              {Math.abs(metric.changePercent)}%
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

function Extra({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  return (
    <View style={styles.extra}>
      <Icon name={icon} size={15} color={COLORS.primary} strokeWidth={1.9} />
      <Text style={styles.extraValue}>{value}</Text>
      <Text style={styles.extraLabel}>{label}</Text>
    </View>
  );
}

function formatMetric(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1)));
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },

  hero: { padding: SPACING.md + 2, gap: SPACING.md },
  heroLabel: { ...TYPOGRAPHY.overline, color: 'rgba(255,255,255,0.5)' },
  heroHeadline: { ...TYPOGRAPHY.h1, color: '#fff', marginTop: -6 },
  heroStats: {
    flexDirection: 'row',
    paddingTop: SPACING.md - 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  heroStatValue: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  heroStatUnit: { ...TYPOGRAPHY.micro, color: 'rgba(255,255,255,0.6)' },
  heroStatLabel: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginTop: 2,
  },

  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.sm + 2 },
  sectionLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },

  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  metricLabel: { ...TYPOGRAPHY.bodyMed, color: COLORS.textSecondary, flex: 1 },
  metricValue: { ...TYPOGRAPHY.h4, color: COLORS.text, minWidth: 52, textAlign: 'right' },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 64,
    justifyContent: 'flex-end',
  },
  metricDelta: { ...TYPOGRAPHY.smallMed, color: COLORS.textMuted },
  metricFlat: { ...TYPOGRAPHY.small, color: COLORS.textLight },

  extras: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.sm + 2 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  extraValue: { ...TYPOGRAPHY.h4, color: COLORS.text },
  extraLabel: { ...TYPOGRAPHY.small, color: COLORS.textMuted },

  recordCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordLabel: { ...TYPOGRAPHY.h4, color: COLORS.text },
  recordDetail: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  recordValue: { ...TYPOGRAPHY.h3, color: COLORS.accentDark },
  recordUnit: { ...TYPOGRAPHY.small, color: COLORS.textMuted },

  aboutTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: 4 },
  aboutText: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
});
