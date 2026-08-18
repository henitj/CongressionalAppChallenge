import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import { Screen, Card, Pill, Divider, EmptyState } from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActivity, Activity } from '../context/ActivityContext';
import { useSettings } from '../constants/SettingsContext';

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { history } = useActivity();
  const { formatDistance, formatDistanceUnit } = useSettings();

  const recent = history.slice(0, 5);

  return (
    <Screen>
      <Header title="Activity History" subtitle="Last 5 activities" back />

      <View style={styles.body}>
        {recent.length === 0 ? (
          <EmptyState
            icon="activity"
            title="No activities yet"
            message="Complete your first hike or ride to see it here."
            action="Start tracking"
            onAction={() => navigation.navigate('Track')}
          />
        ) : (
          <View style={{ gap: SPACING.md }}>
            {recent.map((activity, index) => (
              <ActivityHistoryCard
                key={activity.id}
                activity={activity}
                formatDistance={formatDistance}
                unit={formatDistanceUnit()}
                onPress={() => navigation.navigate('ActivityDetail', { activityId: activity.id })}
              />
            ))}

            {history.length > 5 ? (
              <Pressable
                onPress={() => navigation.navigate('Impact', { tab: 'history' })}
                style={styles.viewAll}
              >
                <Text style={styles.viewAllText}>View all {history.length} activities</Text>
                <Icon name="arrow-right" size={16} color={COLORS.primary} strokeWidth={2} />
              </Pressable>
            ) : null}
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
  const avgPace = activity.durationSec > 0 && activity.miles > 0
    ? (activity.durationSec / 60 / activity.miles).toFixed(1)
    : '—';

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
            {activity.trailName ?? (activity.type === 'bike' ? 'Bike Ride' : 'Hike')}
          </Text>
          <Text style={styles.cardDate}>
            {dateStr} at {timeStr}
          </Text>
        </View>
        {activity.valid ? (
          <Pill label="Valid" tone="success" size="sm" icon="check" />
        ) : (
          <Pill label="Flagged" tone="danger" size="sm" icon="alert-circle" />
        )}
      </View>

      {/* Primary stats */}
      <View style={styles.statsRow}>
        <StatBlock value={`${formatDistance(activity.miles)} ${unit}`} label="Distance" />
        <StatBlock value={`${durationMin} min`} label="Duration" />
        <StatBlock value={`${activity.avgMph} mph`} label="Avg Speed" />
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
          <Icon name="flag" size={14} color={COLORS.primary} strokeWidth={2} />
          <Text style={styles.completionText}>Trail completed!</Text>
        </View>
      ) : null}

      {/* Strike warnings */}
      {activity.strikeCount > 0 && activity.valid ? (
        <View style={styles.strikeWarning}>
          <Icon name="alert-triangle" size={14} color={COLORS.warning} strokeWidth={2} />
          <Text style={styles.strikeText}>
            {activity.strikeCount} speed warning{activity.strikeCount === 1 ? '' : 's'} recorded
          </Text>
        </View>
      ) : null}

      {/* Rejection reason */}
      {!activity.valid && activity.flagReason ? (
        <View style={styles.rejectionBox}>
          <Icon name="alert-circle" size={14} color={COLORS.danger} strokeWidth={2} />
          <Text style={styles.rejectionText}>
            Not counted: {activity.flagReason.replace(/_/g, ' ')}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DetailItem({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.detailItem}>
      <Icon name={icon} size={13} color={COLORS.textMuted} strokeWidth={2} />
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  typeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hikeIcon: { backgroundColor: COLORS.primary },
  bikeIcon: { backgroundColor: COLORS.info },
  cardTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  cardDate: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  statBlock: { alignItems: 'center', flex: 1 },
  statValue: { ...TYPOGRAPHY.h3, color: COLORS.text },
  statLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase', marginTop: 2 },

  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.sm + 4,
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailLabel: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },

  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
    backgroundColor: COLORS.successLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  completionText: { ...TYPOGRAPHY.smallMed, color: COLORS.primary },

  strikeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm + 4,
    backgroundColor: COLORS.warningLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  strikeText: { ...TYPOGRAPHY.small, color: COLORS.warning },

  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
    backgroundColor: COLORS.dangerLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  rejectionText: { ...TYPOGRAPHY.small, color: COLORS.danger, flex: 1 },

  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  viewAllText: { ...TYPOGRAPHY.bodyMed, color: COLORS.primary },
});
