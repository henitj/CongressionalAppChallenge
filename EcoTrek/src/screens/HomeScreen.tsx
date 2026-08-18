import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import StreakStrip from '../components/StreakStrip';
import ConditionsCard from '../components/ConditionsCard';
import ChallengeItem from '../components/ChallengeItem';
import { Screen, Card, SectionHeader, Pill, ProgressBar, Button } from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useActivity } from '../context/ActivityContext';
import { useStreak } from '../context/StreakContext';
import { useChallenges } from '../context/ChallengeContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { useSettings } from '../constants/SettingsContext';
import { useClub } from '../constants/ClubContext';
import { useWeather } from '../context/WeatherContext';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { totalMiles, totalTrees, totalActivities, history } = useActivity();
  const { currentStreak, longestStreak, activeThisWeek } = useStreak();
  const { challenges, completedCount, totalCount, timeLeftLabel, completeChallenge } =
    useChallenges();
  const { totalPoints, level, progressPercent, nextLevelPoints } = useEcoPoints();
  const { formatDistance, formatDistanceCompact, formatDistanceUnit } = useSettings();
  const { myClub, myRank } = useClub();
  const { refresh: refreshWeather, loading: weatherLoading } = useWeather();

  const firstName = user?.name?.split(' ')[0] ?? 'Trekker';
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const nextUp = challenges.find((c) => !c.completed);
  const recent = history.slice(0, 3);
  const pointsToNext = Math.max(0, nextLevelPoints - totalPoints);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={weatherLoading} onRefresh={() => refreshWeather(true)} tintColor={COLORS.textMuted} />
      }
    >
      <Header
        title={`${greeting}, ${firstName}`}
        subtitle={new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })}
        actions={[{ icon: 'sliders', onPress: () => navigation.navigate('Settings'), label: 'Settings' }]}
      />

      <View style={styles.body}>
        {/* Conditions first */}
        <ConditionsCard />

        {/* Quick actions — big, easy to tap */}
        <View style={styles.quickRow}>
          <QuickAction
            icon="play"
            label="Start Activity"
            onPress={() => navigation.navigate('Track')}
            large
          />
          <QuickAction
            icon="map"
            label="Find Trail"
            onPress={() => navigation.navigate('Trails')}
          />
          <QuickAction
            icon="clock"
            label="History"
            hint={`${history.length}`}
            onPress={() => navigation.navigate('History')}
          />
        </View>

        {/* Weekly streak */}
        <Card onPress={() => navigation.navigate('Streak')}>
          <View style={styles.streakHead}>
            <View style={styles.streakLeft}>
              <View style={styles.flameWrap}>
                <Icon
                  name="flame"
                  size={20}
                  color={currentStreak > 0 ? COLORS.accent : COLORS.textLight}
                  strokeWidth={2}
                />
              </View>
              <View>
                <Text style={styles.streakValue}>
                  {currentStreak}
                  <Text style={styles.streakUnit}> week{currentStreak === 1 ? '' : 's'}</Text>
                </Text>
                <Text style={styles.streakCaption}>
                  {currentStreak === 0
                    ? 'Start a weekly streak today'
                    : activeThisWeek
                    ? 'Active this week — keep it up!'
                    : 'Log an activity this week to continue'}
                </Text>
              </View>
            </View>
            <View style={styles.streakRight}>
              <Pill
                label={`Best ${longestStreak}`}
                tone={currentStreak >= longestStreak && currentStreak > 0 ? 'accent' : 'neutral'}
                size="sm"
              />
              <Icon name="chevron-right" size={16} color={COLORS.textLight} />
            </View>
          </View>

          <StreakStrip style={{ marginTop: SPACING.md - 2 }} />

          {!activeThisWeek ? (
            <Pressable style={styles.streakNudge} onPress={() => navigation.navigate('Track')}>
              <Icon name="navigation" size={14} color={COLORS.primary} strokeWidth={2} />
              <Text style={styles.streakNudgeText}>
                Log any activity this week to keep your streak alive
              </Text>
              <Icon name="chevron-right" size={14} color={COLORS.primary} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </Card>

        {/* This week's challenges */}
        <View>
          <SectionHeader
            title="This week"
            action="See all"
            onAction={() => navigation.navigate('Challenges')}
          />
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <View style={styles.challengeHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeProgress}>
                  {completedCount} of {totalCount} done
                </Text>
                <ProgressBar
                  percent={(completedCount / totalCount) * 100}
                  style={{ marginTop: 6 }}
                />
              </View>
              <Pill label={timeLeftLabel} tone="neutral" size="sm" icon="clock" />
            </View>

            {nextUp ? (
              <View style={{ padding: SPACING.md - 4, paddingTop: 0 }}>
                <ChallengeItem challenge={nextUp} onComplete={completeChallenge} />
              </View>
            ) : (
              <View style={styles.allDone}>
                <Icon name="check-circle" size={20} color={COLORS.primary} strokeWidth={2} />
                <Text style={styles.allDoneText}>
                  All done! New challenges drop Monday.
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Your totals */}
        <View>
          <SectionHeader title="Your totals" action="Details" onAction={() => navigation.navigate('Impact')} />
          <View style={styles.tileRow}>
            <MetricTile
              icon="activity"
              value={formatDistanceCompact(totalMiles)}
              unit={formatDistanceUnit()}
              label="Distance"
            />
            <MetricTile icon="tree" value={String(totalTrees)} label="Trees earned" />
          </View>
          <View style={[styles.tileRow, { marginTop: SPACING.sm }]}>
            <MetricTile icon="route" value={String(totalActivities)} label="Activities" />
            <MetricTile icon="star" value={totalPoints.toLocaleString()} label="EcoPoints" />
          </View>
        </View>

        {/* Level */}
        <Card>
          <View style={styles.levelRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.levelLabel}>Current level</Text>
              <Text style={styles.levelName}>{level}</Text>
            </View>
            <Text style={styles.levelPoints}>{pointsToNext.toLocaleString()} to next</Text>
          </View>
          <ProgressBar percent={progressPercent} style={{ marginTop: SPACING.sm + 2 }} />
        </Card>

        {/* Club */}
        {myClub ? (
          <Card onPress={() => navigation.navigate('Clubs')}>
            <View style={styles.clubRow}>
              <View style={styles.clubIcon}>
                <Icon name="users" size={18} color={COLORS.primary} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clubName} numberOfLines={1}>
                  {myClub.name}
                </Text>
                <Text style={styles.clubMeta}>
                  {myClub.totalPoints.toLocaleString()} pts · {myClub.members.length} member
                  {myClub.members.length === 1 ? '' : 's'}
                  {myRank ? ` · you're #${myRank}` : ''}
                </Text>
              </View>
              {myRank === 1 ? <Pill label="1st" tone="accent" size="sm" icon="crown" /> : null}
              <Icon name="chevron-right" size={17} color={COLORS.textLight} />
            </View>
          </Card>
        ) : (
          <Card tone="sunken">
            <View style={styles.emptyClub}>
              <Icon name="users" size={20} color={COLORS.textMuted} strokeWidth={1.8} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyClubTitle}>Not in a club yet</Text>
                <Text style={styles.emptyClubText}>
                  Join with a code from a friend to compete together.
                </Text>
              </View>
            </View>
            <Button
              label="Join a club"
              variant="secondary"
              size="sm"
              icon="plus"
              onPress={() => navigation.navigate('Clubs')}
              style={{ marginTop: SPACING.sm + 2 }}
            />
          </Card>
        )}

        {/* Recent activity */}
        {recent.length > 0 ? (
          <View>
            <SectionHeader title="Recent" action="All" onAction={() => navigation.navigate('History')} />
            <Card padded={false}>
              {recent.map((a, i) => (
                <View key={a.id}>
                  {i > 0 ? <View style={styles.sep} /> : null}
                  <Pressable
                    onPress={() => navigation.navigate('ActivityDetail', { activityId: a.id })}
                    style={({ pressed }) => [styles.activityRow, pressed && { opacity: 0.7 }]}
                  >
                    <View style={styles.activityIcon}>
                      <Icon
                        name={a.type === 'bike' ? 'bike' : 'boot'}
                        size={17}
                        color={a.valid ? COLORS.primary : COLORS.textLight}
                        strokeWidth={1.9}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {a.trailName ?? (a.type === 'bike' ? 'Bike ride' : 'Hike')}
                      </Text>
                      <Text style={styles.activityMeta}>
                        {new Date(a.startedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' · '}
                        {formatDistance(a.miles)} {formatDistanceUnit()}
                        {a.trailCompleted ? ' · completed' : ''}
                      </Text>
                    </View>
                    {a.trees > 0 ? (
                      <View style={styles.treeCount}>
                        <Icon name="tree" size={13} color={COLORS.primary} strokeWidth={2} />
                        <Text style={styles.treeCountText}>{a.trees}</Text>
                      </View>
                    ) : null}
                    <Icon name="chevron-right" size={15} color={COLORS.textLight} />
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        ) : (
          <Card tone="sunken">
            <View style={styles.emptyClub}>
              <Icon name="navigation" size={20} color={COLORS.textMuted} strokeWidth={1.8} />
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyClubTitle}>No activities yet</Text>
                <Text style={styles.emptyClubText}>
                  Every mile you hike earns a tree. Every three you bike earns one.
                </Text>
              </View>
            </View>
            <Button
              label="Start tracking"
              size="sm"
              icon="play"
              onPress={() => navigation.navigate('Track')}
              style={{ marginTop: SPACING.sm + 2 }}
            />
          </Card>
        )}
      </View>
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  hint,
  onPress,
  large,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
  large?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        pressed && { opacity: 0.75 },
        large && styles.quickActionLarge,
      ]}
      accessibilityLabel={label}
    >
      <View style={[styles.quickIcon, large && styles.quickIconLarge]}>
        <Icon name={icon} size={large ? 20 : 18} color={large ? '#fff' : COLORS.primary} strokeWidth={1.9} />
      </View>
      <Text style={[styles.quickLabel, large && styles.quickLabelLarge]}>{label}</Text>
      {hint ? <Text style={styles.quickHint}>{hint}</Text> : null}
    </Pressable>
  );
}

function MetricTile({
  icon,
  value,
  unit,
  label,
}: {
  icon: IconName;
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <View style={styles.metricTile}>
      <Icon name={icon} size={16} color={COLORS.textMuted} strokeWidth={1.9} />
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md + 2 },

  quickRow: { flexDirection: 'row', gap: SPACING.sm },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
  },
  quickActionLarge: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md + 4,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconLarge: { backgroundColor: 'rgba(255,255,255,0.2)' },
  quickLabel: { ...TYPOGRAPHY.smallMed, color: COLORS.text },
  quickLabelLarge: { color: '#fff' },
  quickHint: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },

  streakHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
  flameWrap: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakValue: { ...TYPOGRAPHY.h2, color: COLORS.text },
  streakUnit: { ...TYPOGRAPHY.h4, color: COLORS.textMuted, fontWeight: '500' },
  streakCaption: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  streakNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: SPACING.md - 2,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  streakNudgeText: { ...TYPOGRAPHY.small, color: COLORS.primary, flex: 1, fontWeight: '500' },

  challengeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  challengeProgress: { ...TYPOGRAPHY.h4, color: COLORS.text },
  allDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  allDoneText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, flex: 1 },

  tileRow: { flexDirection: 'row', gap: SPACING.sm },
  metricTile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: 5,
  },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  metricValue: { fontSize: 26, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  metricUnit: { ...TYPOGRAPHY.smallMed, color: COLORS.textMuted },
  metricLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },

  levelRow: { flexDirection: 'row', alignItems: 'flex-end' },
  levelLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  levelName: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: 1 },
  levelPoints: { ...TYPOGRAPHY.small, color: COLORS.textMuted },

  clubRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  clubIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubName: { ...TYPOGRAPHY.h4, color: COLORS.text },
  clubMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },

  emptyClub: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  emptyClubTitle: { ...TYPOGRAPHY.h4, color: COLORS.textSecondary },
  emptyClubText: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },

  sep: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 62 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    padding: SPACING.md,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },
  activityMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  treeCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  treeCountText: { ...TYPOGRAPHY.smallMed, color: COLORS.primary },
});
