import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import Header from '../components/Header';
import LiveMap from '../components/LiveMap';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Pill, Button, Divider, EmptyState, Banner } from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActivity } from '../context/ActivityContext';
import { useSettings } from '../constants/SettingsContext';
import { getTrailById } from '../constants/austinTrails';
import { FLAG_MESSAGES } from '../services/trailDetection';
import { shareText } from '../services/share';

/**
 * A single activity, including the route it drew.
 *
 * The full GPS path was already being stored for every activity and never
 * shown — this is where it finally gets used.
 */
export default function ActivityDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { history, deleteActivity } = useActivity();
  const { formatDistance, formatDistanceCompact, formatDistanceUnit } = useSettings();

  const activityId: string | undefined = route.params?.activityId;
  const activity = useMemo(
    () => history.find((a) => a.id === activityId) ?? null,
    [history, activityId]
  );

  const trail = activity?.trailId ? getTrailById(activity.trailId) : undefined;

  /**
   * Per-mile splits, derived from the stored path. The path is thinned to 400
   * points on save, which is plenty for splits but means the final partial
   * mile can be slightly rough — so it is labelled as partial rather than
   * presented as a clean split.
   */
  const splits = useMemo(() => {
    if (!activity || activity.path.length < 2) return [];

    const out: { mile: number; seconds: number; partial: boolean }[] = [];
    let covered = 0;
    let markStart = activity.path[0].timestamp;
    let nextMark = 1;

    for (let i = 1; i < activity.path.length; i++) {
      const a = activity.path[i - 1];
      const b = activity.path[i];
      const R = 3958.8;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(b.latitude - a.latitude);
      const dLon = toRad(b.longitude - a.longitude);
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
      covered += 2 * R * Math.asin(Math.sqrt(h));

      while (covered >= nextMark) {
        out.push({
          mile: nextMark,
          seconds: Math.max(1, Math.round((b.timestamp - markStart) / 1000)),
          partial: false,
        });
        markStart = b.timestamp;
        nextMark += 1;
      }
    }

    const remainder = covered - (nextMark - 1);
    if (remainder > 0.15 && out.length > 0) {
      out.push({
        mile: nextMark,
        seconds: Math.max(
          1,
          Math.round((activity.path[activity.path.length - 1].timestamp - markStart) / 1000)
        ),
        partial: true,
      });
    }

    return out.slice(0, 30);
  }, [activity]);

  if (!activity) {
    return (
      <Screen scroll={false}>
        <Header title="Activity" back />
        <EmptyState
          icon="route"
          title="Activity not found"
          message="It may have been deleted."
          action="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const started = new Date(activity.startedAt);
  const paceMinPerMile = activity.miles > 0 ? activity.durationSec / 60 / activity.miles : 0;

  const confirmDelete = () => {
    Alert.alert('Delete this activity?', 'It is removed from your history and your totals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteActivity(activity.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const share = () => {
    shareText(
      `${activity.type === 'bike' ? 'I rode' : 'I walked'} ${formatDistanceCompact(activity.miles)} ` +
        `${formatDistanceUnit()}${trail ? ` on the ${trail.name}` : ''} in ${formatDuration(activity.durationSec)}` +
        `${activity.trees > 0 ? `, and earned ${activity.trees} tree${activity.trees === 1 ? '' : 's'}` : ''}. ` +
        `Tracked with EcoTrek.`
    );
  };

  return (
    <Screen>
      <Header
        title={activity.type === 'bike' ? 'Bike ride' : 'Walk'}
        subtitle={started.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
        back
        actions={[{ icon: 'share', onPress: share, label: 'Share activity' }]}
      />

      <View style={styles.body}>
        {!activity.valid ? (
          <Banner
            tone="warning"
            icon="alert-circle"
            title="This one did not count"
            message={
              FLAG_MESSAGES[activity.flagReason ?? ''] ??
              'It did not pass our plausibility checks, so it is excluded from your totals.'
            }
          />
        ) : null}

        {/* Route */}
        {activity.path.length > 1 ? (
          <View style={styles.mapWrap}>
            <LiveMap path={activity.path} current={activity.path[activity.path.length - 1]} height={260} follow={false} />
          </View>
        ) : (
          <Card tone="sunken">
            <View style={styles.noRoute}>
              <Icon name="map" size={18} color={COLORS.textMuted} strokeWidth={1.8} />
              <Text style={styles.noRouteText}>No route was recorded for this activity.</Text>
            </View>
          </Card>
        )}

        {/* Headline numbers */}
        <Card>
          <View style={styles.headline}>
            <Text style={styles.headlineValue}>{formatDistance(activity.miles)}</Text>
            <Text style={styles.headlineUnit}>{formatDistanceUnit()}</Text>
          </View>
          <View style={styles.statRow}>
            <Stat icon="clock" value={formatDuration(activity.durationSec)} label="Duration" />
            <Stat
              icon="trending-up"
              value={paceMinPerMile > 0 ? formatPace(paceMinPerMile) : '—'}
              label={`Pace /${formatDistanceUnit()}`}
            />
            <Stat icon="activity" value={`${activity.avgMph}`} label="Avg mph" />
            <Stat icon="tree" value={String(activity.trees)} label="Trees" />
          </View>
        </Card>

        {/* Trail + tags */}
        {trail || activity.points > 0 ? (
          <Card>
            {trail ? (
              <>
                <Text style={styles.sectionLabel}>Trail</Text>
                <Text style={styles.trailName}>{trail.name}</Text>
                <Text style={styles.trailMeta}>
                  {trail.area} · {formatDistanceCompact(trail.distanceMiles)} {formatDistanceUnit()} ·{' '}
                  {trail.difficulty}
                </Text>
                {activity.coveragePercent != null ? (
                  <Text style={styles.coverage}>
                    You covered about {Math.round(activity.coveragePercent)}% of its length.
                  </Text>
                ) : null}
              </>
            ) : null}

            <View style={styles.tags}>
              {activity.trailCompleted ? (
                <Pill label="Trail completed" tone="primary" size="sm" icon="flag" />
              ) : null}
              {activity.grant ? (
                <Pill label={activity.grant.species} tone="neutral" size="sm" icon="leaf" />
              ) : null}
              {activity.points > 0 ? (
                <Pill label={`+${activity.points} points`} tone="accent" size="sm" />
              ) : null}
            </View>

            {trail ? (
              <Button
                label="View trail"
                variant="secondary"
                size="sm"
                iconRight="chevron-right"
                style={{ marginTop: SPACING.md - 2 }}
                onPress={() => navigation.navigate('Trails', { focusTrailId: trail.id })}
              />
            ) : null}
          </Card>
        ) : null}

        {/* Splits */}
        {splits.length > 1 ? (
          <View>
            <Text style={styles.sectionTitle}>Splits</Text>
            <Card padded={false}>
              {splits.map((s, i) => {
                const fastest = Math.min(...splits.filter((x) => !x.partial).map((x) => x.seconds));
                const width = Math.max(8, (fastest / s.seconds) * 100);
                return (
                  <View key={s.mile}>
                    {i > 0 ? <Divider style={{ marginLeft: 52 }} /> : null}
                    <View style={styles.splitRow}>
                      <Text style={styles.splitMile}>
                        {s.partial ? '·' : s.mile}
                      </Text>
                      <View style={styles.splitBarTrack}>
                        <View style={[styles.splitBarFill, { width: `${width}%` }]} />
                      </View>
                      <Text style={styles.splitTime}>
                        {formatDuration(s.seconds)}
                        {s.partial ? ' (partial)' : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        ) : null}

        {/* Timing */}
        <Card padded={false}>
          <DetailRow
            icon="play"
            label="Started"
            value={started.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          />
          <Divider style={{ marginLeft: 58 }} />
          <DetailRow
            icon="stop"
            label="Finished"
            value={new Date(activity.endedAt).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          />
          <Divider style={{ marginLeft: 58 }} />
          <DetailRow icon="map-pin" label="GPS points" value={String(activity.path.length)} />
        </Card>

        <Button label="Delete activity" variant="ghost" tone={COLORS.danger} icon="trash" full onPress={confirmDelete} />
      </View>
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Icon name={icon} size={14} color={COLORS.textMuted} strokeWidth={1.9} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Icon name={icon} size={15} color={COLORS.textMuted} strokeWidth={1.9} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function formatPace(minutesPerMile: number): string {
  const m = Math.floor(minutesPerMile);
  const s = Math.round((minutesPerMile - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },

  mapWrap: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noRoute: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
  noRouteText: { ...TYPOGRAPHY.small, color: COLORS.textMuted, flex: 1 },

  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  headlineValue: { fontSize: 44, fontWeight: '700', color: COLORS.text, letterSpacing: -0.6 },
  headlineUnit: { ...TYPOGRAPHY.h3, color: COLORS.textMuted },
  statRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  statValue: { ...TYPOGRAPHY.h4, color: COLORS.text },
  statLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },

  sectionLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.sm + 2 },
  trailName: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: 3 },
  trailMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  coverage: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginTop: SPACING.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm + 2 },

  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    paddingVertical: 11,
    paddingHorizontal: SPACING.md - 2,
  },
  splitMile: { ...TYPOGRAPHY.smallMed, color: COLORS.textMuted, width: 20 },
  splitBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceSunken,
    overflow: 'hidden',
  },
  splitBarFill: { height: '100%', backgroundColor: COLORS.primaryLight, borderRadius: 3 },
  splitTime: { ...TYPOGRAPHY.smallMed, color: COLORS.text, minWidth: 78, textAlign: 'right' },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md - 2,
  },
  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { ...TYPOGRAPHY.bodyMed, color: COLORS.textSecondary, flex: 1 },
  detailValue: { ...TYPOGRAPHY.h4, color: COLORS.text },
});
