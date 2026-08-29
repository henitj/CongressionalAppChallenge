import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import ConditionsCard from '../components/ConditionsCard';
import StreakStrip from '../components/StreakStrip';
import { Screen, Card, Button, Pill, ProgressBar, SectionHeader } from '../components/ui';
import { ColorPalette, RADIUS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useActivity } from '../context/ActivityContext';
import { useStreak } from '../context/StreakContext';
import { useProfile } from '../context/ProfileContext';
import { useChallenges } from '../context/ChallengeContext';
import { useClub } from '../constants/ClubContext';
import { useSettings } from '../constants/SettingsContext';
import { weekStart } from '../services/dates';
import { firstNameOf } from '../services/displayName';
import { useTheme, Typography } from '../context/ThemeContext';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { history } = useActivity();
  const { currentStreak } = useStreak();
  const { challenges, completedCount, totalCount, timeLeftLabel } = useChallenges();
  const { myClub, activeGoal } = useClub();
  const { formatDistance, formatDistanceUnit } = useSettings();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const week = useMemo(() => {
    const since = weekStart().getTime();
    const thisWeek = history.filter((activity) => activity.valid && activity.startedAt >= since);
    const miles = thisWeek.reduce((sum, activity) => sum + activity.miles, 0);
    const trees = thisWeek.reduce((sum, activity) => sum + (activity.trees ?? 0), 0);
    return { miles, trees, count: thisWeek.length };
  }, [history]);

  const firstName = firstNameOf(profile.firstName, user?.name);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const last = history[0];
  const nextChallenge = useMemo(
    () => challenges.find((challenge) => !challenge.completed) ?? null,
    [challenges]
  );
  const challengePercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const challengeMessage = nextChallenge
    ? nextChallenge.kind === 'auto'
      ? `${nextChallenge.title} · ${Math.min(nextChallenge.progress, nextChallenge.target ?? 1)} of ${nextChallenge.target ?? 1}`
      : nextChallenge.title
    : 'All five challenges are done for the week';

  const clubMessage = myClub
    ? activeGoal
      ? activeGoal.metAt
        ? `${myClub.name} already hit this week's goal.`
        : `${myClub.name} is chasing ${activeGoal.target} ${goalLabel(activeGoal.metric)}.`
      : `${myClub.name} is ready for more miles this week.`
    : 'Walk solo or join a club later — your progress still counts.';

  return (
    <Screen>
      <Header
        title={firstName}
        subtitle={`${greeting} · ${new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })}`}
      />

      <View style={styles.body}>
        <Button
          label="Start a walk"
          icon="play"
          size="lg"
          full
          onPress={() => navigation.navigate('Track')}
        />

        <ConditionsCard />

        <Card>
          <View style={styles.panelHead}>
            <View style={styles.panelIcon}>
              <Icon name="flame" size={18} color={colors.primary} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.panelEyebrow}>Weekly momentum</Text>
              <Text style={styles.panelTitle} numberOfLines={1}>
                {currentStreak} week streak
              </Text>
            </View>
            <Pill label={timeLeftLabel} tone="neutral" size="sm" icon="clock" />
          </View>

          <StreakStrip compact style={{ marginTop: SPACING.sm + 2 }} />

          <View style={styles.momentumRow}>
            <MiniInfo value={String(week.count)} label="Activities" />
            <MiniInfo value={String(week.trees)} label="Trees" />
            <MiniInfo value={`${completedCount}/${totalCount}`} label="Challenges" />
          </View>

          <ProgressBar percent={challengePercent} style={{ marginTop: SPACING.sm + 2 }} />
          <Text style={styles.helperText}>{challengeMessage}</Text>
        </Card>

        <View>
          <SectionHeader title="Quick actions" />
          <View style={styles.quickGrid}>
            <QuickAction
              icon="tree"
              title="Impact"
              hint="Miles, trees and records"
              onPress={() => navigation.navigate('Impact')}
            />
            <QuickAction
              icon="clock"
              title="My walks"
              hint="Open your full history"
              onPress={() => navigation.navigate('History')}
            />
            <QuickAction
              icon="map"
              title="Trails"
              hint="Browse Austin routes"
              onPress={() => navigation.navigate('Trails')}
            />
            <QuickAction
              icon="target"
              title="Weekly goals"
              hint="See this week’s challenges"
              onPress={() => navigation.navigate('Challenges')}
            />
          </View>
        </View>

        <Card tone="sunken">
            <View style={styles.panelHead}>
              <View style={styles.panelIcon}>
                <Icon name={myClub ? 'users' : 'target'} size={18} color={colors.primary} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.panelEyebrow}>{myClub ? 'Club update' : 'Keep going'}</Text>
                <Text style={styles.panelTitle} numberOfLines={1}>
                  {myClub ? myClub.name : 'Pick a goal for the week'}
                </Text>
              </View>
            </View>

            <Text style={styles.helperText}>{myClub ? clubMessage : challengeMessage}</Text>

            {myClub && activeGoal ? (
              <ProgressBar
                percent={(activeGoal.progress / activeGoal.target) * 100}
                color={activeGoal.metAt ? colors.primary : colors.accent}
                style={{ marginTop: SPACING.sm + 2 }}
              />
            ) : null}

            <View style={styles.inlineButtons}>
              <Button
                label={myClub ? 'Open club' : 'Open challenges'}
                variant="ghost"
                iconRight="arrow-right"
                onPress={() => navigation.navigate(myClub ? 'Clubs' : 'Challenges')}
              />
              {!myClub ? (
                <Button
                  label="Browse clubs"
                  variant="secondary"
                  size="sm"
                  onPress={() => navigation.navigate('Clubs')}
                />
              ) : null}
            </View>
          </Card>

        <View>
          <SectionHeader title="Your last walk" action="See all" onAction={() => navigation.navigate('History')} />
          {last ? (
            <Card onPress={() => navigation.navigate('ActivityDetail', { activityId: last.id })}>
              <View style={styles.lastRow}>
                <View style={styles.lastIcon}>
                  <Icon
                    name={last.type === 'bike' ? 'bike' : 'boot'}
                    size={20}
                    color={colors.primary}
                    strokeWidth={1.9}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.lastTitle} numberOfLines={1}>
                    {last.trailName ?? (last.type === 'bike' ? 'Bike ride' : 'Walk')}
                  </Text>
                  <Text style={styles.lastMeta} numberOfLines={2}>
                    {new Date(last.startedAt).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' · '}
                    {formatDistance(last.miles)} {formatDistanceUnit()}
                    {' · '}
                    {Math.max(1, Math.round(last.durationSec / 60))} min
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.textLight} />
              </View>
            </Card>
          ) : (
            <Card tone="sunken">
              <Text style={styles.emptyTitle}>You have not walked yet</Text>
              <Text style={styles.emptyText}>
                Tap Start when you are ready. Even one short walk is enough to begin.
              </Text>
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}

function QuickAction({
  icon,
  title,
  hint,
  onPress,
}: {
  icon: IconName;
  title: string;
  hint: string;
  onPress: () => void;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.72 }]}>
      <View style={styles.quickIcon}>
        <Icon name={icon} size={18} color={colors.primary} strokeWidth={1.9} />
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickHint}>{hint}</Text>
    </Pressable>
  );
}

function MiniInfo({ value, label }: { value: string; label: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={styles.miniValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.miniLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function goalLabel(metric: 'miles' | 'points' | 'trees' | 'activities') {
  switch (metric) {
    case 'miles':
      return 'miles';
    case 'points':
      return 'points';
    case 'trees':
      return 'trees';
    default:
      return 'activities';
  }
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: SPACING.md },

    panelHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
    panelIcon: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.md,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    panelEyebrow: { ...t.overline, color: c.textMuted },
    panelTitle: { ...t.h3, color: c.text, marginTop: 1 },
    helperText: { ...t.small, color: c.textMuted, marginTop: SPACING.sm },
    momentumRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md - 2 },
    miniValue: { ...t.h3, color: c.text },
    miniLabel: { ...t.micro, color: c.textMuted, textTransform: 'uppercase' },

    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    quickCard: {
      flexBasis: '46%',
      flexGrow: 1,
      flexShrink: 1,
      backgroundColor: c.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: SPACING.md,
      minHeight: 118,
      justifyContent: 'space-between',
    },
    quickIcon: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.sm + 2,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickTitle: { ...t.h4, color: c.text, marginTop: SPACING.sm },
    quickHint: { ...t.small, color: c.textMuted, marginTop: 4 },

    inlineButtons: {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: SPACING.sm,
      marginTop: SPACING.sm + 2,
    },

    lastRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    lastIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lastTitle: { ...t.h4, color: c.text },
    lastMeta: { ...t.small, color: c.textMuted, marginTop: 3 },
    emptyTitle: { ...t.h4, color: c.text },
    emptyText: { ...t.body, color: c.textMuted, marginTop: 4 },
  });
}
