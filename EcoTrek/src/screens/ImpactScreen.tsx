import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Segmented, EmptyState, Pill, Divider, Banner } from '../components/ui';
import { COLORS, RADIUS, SPACING, TREE_RULES, TYPOGRAPHY } from '../constants/theme';
import { useActivity } from '../context/ActivityContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { useSettings } from '../constants/SettingsContext';
import { TREES_DISCLAIMER } from '../services/trees';

type Tab = 'activities' | 'forest' | 'points';

export default function ImpactScreen() {
  const { history, totalMiles, totalTrees, totalActivities, uniqueTrailsCompleted, deleteActivity } =
    useActivity();
  const { history: pointHistory, totalPoints } = useEcoPoints();
  const { formatDistance, formatDistanceUnit } = useSettings();
  const [tab, setTab] = useState<Tab>('activities');

  const grants = useMemo(
    () => history.filter((a) => a.grant && a.trees > 0),
    [history]
  );

  const confirmDelete = (id: string) => {
    Alert.alert('Delete this activity?', 'It will be removed from your history and totals.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteActivity(id) },
    ]);
  };

  return (
    <Screen>
      <Header title="Impact" subtitle="Everything you have logged" back />

      <View style={styles.body}>
        {/* Summary */}
        <Card>
          <View style={styles.summaryGrid}>
            <Summary value={formatDistance(totalMiles)} unit={formatDistanceUnit()} label="Distance" />
            <Summary value={String(totalTrees)} label="Trees" />
            <Summary value={String(totalActivities)} label="Activities" />
            <Summary value={String(uniqueTrailsCompleted)} label="Trails" />
          </View>
        </Card>

        <Segmented
          options={[
            { value: 'activities', label: 'Activities' },
            { value: 'forest', label: 'Forest' },
            { value: 'points', label: 'Points' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />

        {/* ── Activities ──────────────────────────────────────────────────── */}
        {tab === 'activities' ? (
          history.length === 0 ? (
            <EmptyState
              icon="route"
              title="No activities yet"
              message="Head to the Track tab and log your first hike or ride."
            />
          ) : (
            <View style={{ gap: SPACING.sm }}>
              {history.map((a) => (
                <Card key={a.id}>
                  <View style={styles.activityHead}>
                    <View style={[styles.activityIcon, !a.valid && styles.activityIconInvalid]}>
                      <Icon
                        name={a.type === 'bike' ? 'bike' : 'boot'}
                        size={18}
                        color={a.valid ? COLORS.primary : COLORS.textLight}
                        strokeWidth={1.9}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {a.trailName ?? (a.type === 'bike' ? 'Bike ride' : 'Hike')}
                      </Text>
                      <Text style={styles.activityDate}>
                        {new Date(a.startedAt).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' · '}
                        {new Date(a.startedAt).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Pressable onPress={() => confirmDelete(a.id)} hitSlop={10}>
                      <Icon name="trash" size={16} color={COLORS.textLight} strokeWidth={1.8} />
                    </Pressable>
                  </View>

                  <View style={styles.activityStats}>
                    <MiniStat
                      value={`${formatDistance(a.miles)} ${formatDistanceUnit()}`}
                      label="Distance"
                    />
                    <MiniStat value={formatDuration(a.durationSec)} label="Time" />
                    <MiniStat value={`${a.avgMph}`} label="mph" />
                    <MiniStat value={String(a.trees)} label="Trees" />
                  </View>

                  {(a.trailCompleted || !a.valid || a.grant) ? (
                    <View style={styles.activityTags}>
                      {a.trailCompleted ? (
                        <Pill label="Trail completed" tone="primary" size="sm" icon="flag" />
                      ) : null}
                      {!a.valid ? (
                        <Pill label="Not counted" tone="warning" size="sm" icon="alert-circle" />
                      ) : null}
                      {a.grant ? <Pill label={a.grant.species} tone="neutral" size="sm" icon="leaf" /> : null}
                      {a.points > 0 ? <Pill label={`+${a.points} pts`} tone="accent" size="sm" /> : null}
                    </View>
                  ) : null}
                </Card>
              ))}
            </View>
          )
        ) : null}

        {/* ── Forest ──────────────────────────────────────────────────────── */}
        {tab === 'forest' ? (
          <>
            <Card>
              <View style={styles.forestHead}>
                <View style={styles.forestIcon}>
                  <Icon name="tree" size={22} color={COLORS.primary} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.forestCount}>{totalTrees}</Text>
                  <Text style={styles.forestLabel}>trees in your forest</Text>
                </View>
              </View>
              <Divider style={{ marginVertical: SPACING.md - 2 }} />
              <Text style={styles.forestRule}>
                1 tree per {TREE_RULES.hikeMilesPerTree} mile hiked · 1 per {TREE_RULES.bikeMilesPerTree}{' '}
                miles biked
              </Text>
            </Card>

            <Banner tone="neutral" icon="info" title="What these trees are" message={TREES_DISCLAIMER} />

            {grants.length === 0 ? (
              <EmptyState
                icon="leaf"
                title="No trees yet"
                message={`Hike ${TREE_RULES.hikeMilesPerTree} mile or bike ${TREE_RULES.bikeMilesPerTree} to earn your first.`}
              />
            ) : (
              <Card padded={false}>
                {grants.map((a, i) => (
                  <View key={a.id}>
                    {i > 0 ? <Divider style={{ marginLeft: 58 }} /> : null}
                    <View style={styles.grantRow}>
                      <View style={styles.grantIcon}>
                        <Icon name="leaf" size={16} color={COLORS.primary} strokeWidth={1.9} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.grantSpecies}>{a.grant!.species}</Text>
                        <Text style={styles.grantMeta}>
                          {new Date(a.startedAt).toLocaleDateString()} ·{' '}
                          {formatDistance(a.miles)} {formatDistanceUnit()}
                        </Text>
                      </View>
                      <Text style={styles.grantCount}>×{a.trees}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        ) : null}

        {/* ── Points ──────────────────────────────────────────────────────── */}
        {tab === 'points' ? (
          <>
            <Card>
              <Text style={styles.pointsTotal}>{totalPoints.toLocaleString()}</Text>
              <Text style={styles.pointsLabel}>EcoPoints earned</Text>
            </Card>

            {pointHistory.length === 0 ? (
              <EmptyState icon="star" title="No points yet" message="Points arrive as you log activities and finish challenges." />
            ) : (
              <Card padded={false}>
                {pointHistory.slice(0, 60).map((e, i) => (
                  <View key={e.id}>
                    {i > 0 ? <Divider style={{ marginLeft: 58 }} /> : null}
                    <View style={styles.pointRow}>
                      <View style={styles.pointIcon}>
                        <Icon
                          name={iconForAction(e.action)}
                          size={15}
                          color={e.points >= 0 ? COLORS.primary : COLORS.danger}
                          strokeWidth={1.9}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pointLabel} numberOfLines={1}>
                          {e.label}
                        </Text>
                        <Text style={styles.pointDate}>
                          {new Date(e.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                      <Text style={[styles.pointValue, e.points < 0 && { color: COLORS.danger }]}>
                        {e.points >= 0 ? '+' : ''}
                        {e.points}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function iconForAction(action: string): IconName {
  if (action.includes('hike')) return 'boot';
  if (action.includes('bike')) return 'bike';
  if (action.includes('tree')) return 'tree';
  if (action.includes('challenge')) return 'target';
  if (action.includes('trail')) return 'flag';
  if (action.includes('streak')) return 'flame';
  if (action.includes('login')) return 'calendar';
  if (action.includes('club')) return 'users';
  return 'star';
}

function Summary({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={styles.summaryItem}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={styles.summaryValue}>{value}</Text>
        {unit ? <Text style={styles.summaryUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },

  summaryGrid: { flexDirection: 'row' },
  summaryItem: { flex: 1 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  summaryUnit: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },
  summaryLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase', marginTop: 2 },

  activityHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconInvalid: { backgroundColor: COLORS.surfaceSunken },
  activityTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  activityDate: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  activityStats: {
    flexDirection: 'row',
    marginTop: SPACING.md - 2,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  miniValue: { ...TYPOGRAPHY.h4, color: COLORS.text },
  miniLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },
  activityTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm + 2 },

  forestHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 2 },
  forestIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forestCount: { fontSize: 32, fontWeight: '700', color: COLORS.text, letterSpacing: -0.4 },
  forestLabel: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  forestRule: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },

  grantRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4, padding: SPACING.md - 3 },
  grantIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantSpecies: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },
  grantMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  grantCount: { ...TYPOGRAPHY.h4, color: COLORS.primary },

  pointsTotal: { fontSize: 36, fontWeight: '700', color: COLORS.text, letterSpacing: -0.45 },
  pointsLabel: { ...TYPOGRAPHY.small, color: COLORS.textMuted },

  pointRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4, padding: SPACING.sm + 4 },
  pointIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointLabel: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },
  pointDate: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, marginTop: 1 },
  pointValue: { ...TYPOGRAPHY.h4, color: COLORS.primary },
});
