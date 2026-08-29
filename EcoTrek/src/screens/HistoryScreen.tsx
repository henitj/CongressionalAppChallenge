import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import { Screen, Card, Pill, EmptyState } from '../components/ui';

import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { useActivity, Activity } from '../context/ActivityContext';
import { useSettings } from '../constants/SettingsContext';
import { weekStart } from '../services/dates';
import { useTheme, Typography } from '../context/ThemeContext';

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { history } = useActivity();
  const { formatDistanceCompact, formatDistance, formatDistanceUnit } = useSettings();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const recent = history;
  const weekBegin = weekStart().getTime();
  const thisWeek = history.filter((a) => a.valid && a.startedAt >= weekBegin);
  const weekMiles = thisWeek.reduce((n, a) => n + a.miles, 0);

  return (
    <Screen>
      <Header title="My walks" subtitle="This week and every walk you have saved" back />

      <View style={styles.body}>
        <Card>
          <Text style={styles.weekLabel}>This week</Text>
          <Text style={styles.weekValue}>
            {formatDistanceCompact(weekMiles)} {formatDistanceUnit()}
            <Text style={styles.weekMeta}>
              {'  '}
              {thisWeek.length} walk{thisWeek.length === 1 ? '' : 's'}
            </Text>
          </Text>
        </Card>

        {recent.length === 0 ? (
          <EmptyState
            icon="activity"
            title="No walks yet"
            message="Finish your first walk or ride to see it here."
            action="Start walk"
            onAction={() => navigation.navigate('Tabs', { screen: 'Track' })}
          />
        ) : (
          <View style={{ gap: SPACING.md }}>
            {recent.map((activity) => (
              <ActivityHistoryCard
                key={activity.id}
                activity={activity}
                formatDistance={formatDistance}
                unit={formatDistanceUnit()}
                onPress={() => navigation.navigate('ActivityDetail', { activityId: activity.id })}
              />
            ))}

            <Pressable onPress={() => navigation.navigate('Recap')} style={styles.viewAll}>
              <Text style={styles.viewAllText}>Compare with last week</Text>
              <Icon name="arrow-right" size={16} color={colors.primary} strokeWidth={2} />
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}

function ActivityHistoryCard({
  activity,
  formatDistance,
  unit,
  onPress,
}: {
  activity: Activity;
  formatDistance: (m: number) => string;
  unit: string;
  onPress: () => void;
}) {
  const date = new Date(activity.startedAt);
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const durationMin = Math.floor(activity.durationSec / 60);
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  return (
    <Card onPress={onPress}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.typeIcon, activity.type === 'bike' ? styles.bikeIcon : styles.hikeIcon]}>
          <Icon
            name={activity.type === 'bike' ? 'bike' : 'boot'}
            size={18}
            color="#fff"
            strokeWidth={2}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {activity.trailName ?? (activity.type === 'bike' ? 'Bike ride' : 'Walk')}
          </Text>
          <Text style={styles.cardDate}>
            {dateStr} at {timeStr}
          </Text>
        </View>
        {activity.valid ? (
          <Pill label="Counted" tone="success" size="sm" icon="check" />
        ) : (
          <Pill label="Not counted" tone="danger" size="sm" icon="alert-circle" />
        )}
      </View>

      {/* Primary stats */}
      <View style={styles.statsRow}>
        <StatBlock value={`${formatDistance(activity.miles)} ${unit}`} label="Distance" />
        <StatBlock value={`${durationMin} min`} label="Duration" />
        <StatBlock value={`${activity.avgMph} mph`} label="Speed" />
      </View>

      {/* Secondary stats */}
      <View style={styles.detailsRow}>
        <DetailItem icon="zap" label={`${activity.calories || 0} cal`} />
        <DetailItem icon="tree" label={`${activity.trees} trees`} />
        <DetailItem icon="trending-up" label={`↑${activity.elevationGain || 0} ft`} />
        <DetailItem icon="trending-up" label={`↓${activity.elevationLoss || 0} ft`} />
      </View>

      {/* Trail completion badge */}
      {activity.trailCompleted ? (
        <View style={styles.completionBadge}>
          <Icon name="flag" size={14} color={colors.primary} strokeWidth={2} />
          <Text style={styles.completionText}>Trail completed!</Text>
        </View>
      ) : null}

      {/* Strike warnings */}
      {activity.strikeCount > 0 && activity.valid ? (
        <View style={styles.strikeWarning}>
          <Icon name="alert-triangle" size={14} color={colors.warning} strokeWidth={2} />
          <Text style={styles.strikeText}>
            {activity.strikeCount} speed warning{activity.strikeCount === 1 ? '' : 's'} recorded
          </Text>
        </View>
      ) : null}

      {/* Rejection reason */}
      {!activity.valid && activity.flagReason ? (
        <View style={styles.rejectionBox}>
          <Icon name="alert-circle" size={14} color={colors.danger} strokeWidth={2} />
          <Text style={styles.rejectionText}>
            Not counted: {activity.flagReason.replace(/_/g, ' ')}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DetailItem({ icon, label }: { icon: any; label: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={styles.detailItem}>
      <Icon name={icon} size={13} color={colors.textMuted} strokeWidth={2} />
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({

  body: { paddingHorizontal: SPACING.md },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  typeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hikeIcon: { backgroundColor: c.primary },
  bikeIcon: { backgroundColor: c.info },
  cardTitle: { ...t.h4, color: c.text },
  cardDate: { ...t.small, color: c.textMuted, marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  statBlock: { alignItems: 'center', flex: 1 },
  statValue: { ...t.h3, color: c.text },
  statLabel: { ...t.micro, color: c.textMuted, textTransform: 'uppercase', marginTop: 2 },

  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.sm + 4,
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailLabel: { ...t.small, color: c.textSecondary },

  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
    backgroundColor: c.successLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  completionText: { ...t.smallMed, color: c.primary },

  strikeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm + 4,
    backgroundColor: c.warningLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  strikeText: { ...t.small, color: c.warning },

  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
    backgroundColor: c.dangerLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  rejectionText: { ...t.small, color: c.danger, flex: 1 },

  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  viewAllText: { ...t.bodyMed, color: c.primary },
  weekLabel: { ...t.overline, color: c.textMuted },
  weekValue: { ...t.h1, color: c.text, marginTop: 4 },
  weekMeta: { ...t.small, color: c.textMuted, fontWeight: '500' },

  });
}
