import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Segmented, EmptyState, Pill, Divider, Banner } from '../components/ui';
import { RADIUS, SPACING, TREE_RULES, ColorPalette } from '../constants/theme';
import { useActivity } from '../context/ActivityContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { useSettings } from '../constants/SettingsContext';
import { TREES_DISCLAIMER } from '../services/trees';
import { computeRecords } from '../services/records';
import { useLogbook } from '../context/LogbookContext';
import { useTheme, Typography } from '../context/ThemeContext';

type Tab = 'activities' | 'forest' | 'records' | 'points';

export default function ImpactScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { history, totalMiles, totalTrees, totalActivities, uniqueTrailsCompleted, deleteActivity } =
    useActivity();
  const { history: pointHistory, totalPoints } = useEcoPoints();
  const { cleanupCount, litterCollected } = useLogbook();
  const { formatDistance, formatDistanceCompact, formatDistanceUnit } = useSettings();
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'activities');

  // Navigating here again with a different tab (from Profile, say) has to
  // switch the view. Initial state alone would ignore the second visit.
  const requestedTab: Tab | undefined = route.params?.tab;
  useEffect(() => {
    if (requestedTab) setTab(requestedTab);
  }, [requestedTab]);

  const records = useMemo(
    () => computeRecords(history, formatDistanceCompact, formatDistanceUnit()),
    [history, formatDistanceCompact, formatDistanceUnit]
  );

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
            <Summary value={formatDistanceCompact(totalMiles)} unit={formatDistanceUnit()} label="Distance" />
            <Summary value={String(totalTrees)} label="Trees" />
            <Summary value={String(totalActivities)} label="Activities" />
            <Summary value={String(uniqueTrailsCompleted)} label="Trails" />
          </View>
        </Card>

        <Segmented
          options={[
            { value: 'activities', label: 'Activities' },
            { value: 'forest', label: 'Forest' },
            { value: 'records', label: 'Records' },
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
                <Card key={a.id} onPress={() => navigation.navigate('ActivityDetail', { activityId: a.id })}>
                  <View style={styles.activityHead}>
                    <View style={[styles.activityIcon, !a.valid && styles.activityIconInvalid]}>
                      <Icon
                        name={a.type === 'bike' ? 'bike' : 'boot'}
                        size={18}
                        color={a.valid ? colors.primary : colors.textLight}
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
                      <Icon name="trash" size={16} color={colors.textLight} strokeWidth={1.8} />
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
                  <Icon name="tree" size={22} color={colors.primary} strokeWidth={1.9} />
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
                        <Icon name="leaf" size={16} color={colors.primary} strokeWidth={1.9} />
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

        {/* ── Records ─────────────────────────────────────────────────────── */}
        {tab === 'records' ? (
          records.length === 0 ? (
            <EmptyState
              icon="award"
              title="No records yet"
              message="Log an activity and your first personal bests appear here."
            />
          ) : (
            <>
              <Card padded={false}>
                {records.map((r, i) => (
                  <View key={r.id}>
                    {i > 0 ? <Divider style={{ marginLeft: 58 }} /> : null}
                    <Pressable
                      onPress={() =>
                        r.activityId
                          ? navigation.navigate('ActivityDetail', { activityId: r.activityId })
                          : undefined
                      }
                      disabled={!r.activityId}
                      style={({ pressed }) => [styles.recordRow, pressed && { opacity: 0.7 }]}
                    >
                      <View style={styles.recordIcon}>
                        <Icon name="award" size={16} color={colors.accentDark} strokeWidth={2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recordLabel}>{r.label}</Text>
                        <Text style={styles.recordDetail} numberOfLines={1}>
                          {r.detail}
                        </Text>
                      </View>
                      <Text style={styles.recordValue}>
                        {r.value}
                        {r.unit ? <Text style={styles.recordUnit}> {r.unit}</Text> : null}
                      </Text>
                      {r.activityId ? (
                        <Icon name="chevron-right" size={15} color={colors.textLight} />
                      ) : null}
                    </Pressable>
                  </View>
                ))}
              </Card>

              <Card>
                <Text style={styles.sectionLabel}>Field log</Text>
                <View style={styles.fieldStats}>
                  <FieldStat value={String(cleanupCount)} label="Cleanups" />
                  <FieldStat value={String(litterCollected)} label="Litter picked up" />
                </View>
              </Card>
            </>
          )
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
                          color={e.points >= 0 ? colors.primary : colors.danger}
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
                      <Text style={[styles.pointValue, e.points < 0 && { color: colors.danger }]}>
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
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
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

function FieldStat({ value, label }: { value: string; label: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldValue}>{value}</Text>
      <Text style={styles.fieldLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
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

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({

  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },

  summaryGrid: { flexDirection: 'row' },
  summaryItem: { flex: 1 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  summaryUnit: { ...t.micro, color: c.textMuted },
  summaryLabel: { ...t.micro, color: c.textMuted, textTransform: 'uppercase', marginTop: 2 },

  activityHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: c.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconInvalid: { backgroundColor: c.surfaceSunken },
  activityTitle: { ...t.h4, color: c.text },
  activityDate: { ...t.small, color: c.textMuted, marginTop: 1 },
  activityStats: {
    flexDirection: 'row',
    marginTop: SPACING.md - 2,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  miniValue: { ...t.h4, color: c.text },
  miniLabel: { ...t.micro, color: c.textMuted, textTransform: 'uppercase' },
  activityTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm + 2 },

  forestHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 2 },
  forestIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: c.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forestCount: { fontSize: 32, fontWeight: '700', color: c.text, letterSpacing: -0.4 },
  forestLabel: { ...t.small, color: c.textMuted },
  forestRule: { ...t.small, color: c.textSecondary },

  grantRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4, padding: SPACING.md - 3 },
  grantIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: c.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantSpecies: { ...t.bodyMed, color: c.text },
  grantMeta: { ...t.small, color: c.textMuted, marginTop: 1 },
  grantCount: { ...t.h4, color: c.primary },

  pointsTotal: { fontSize: 36, fontWeight: '700', color: c.text, letterSpacing: -0.45 },
  pointsLabel: { ...t.small, color: c.textMuted },

  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    paddingVertical: 13,
    paddingHorizontal: SPACING.md - 2,
  },
  recordIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordLabel: { ...t.bodyMed, color: c.text },
  recordDetail: { ...t.small, color: c.textMuted, marginTop: 1 },
  recordValue: { ...t.h4, color: c.accentDark },
  recordUnit: { ...t.micro, color: c.textMuted },

  sectionLabel: { ...t.overline, color: c.textMuted },
  fieldStats: { flexDirection: 'row', marginTop: SPACING.sm + 2 },
  fieldValue: { ...t.h2, color: c.text },
  fieldLabel: { ...t.micro, color: c.textMuted, textTransform: 'uppercase' },

  pointRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4, padding: SPACING.sm + 4 },
  pointIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointLabel: { ...t.bodyMed, color: c.text },
  pointDate: { ...t.micro, color: c.textMuted, marginTop: 1 },
  pointValue: { ...t.h4, color: c.primary },

  });
}
