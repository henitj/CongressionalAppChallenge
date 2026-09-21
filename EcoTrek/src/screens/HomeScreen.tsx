import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import AssistantFab from '../components/AssistantFab';
import ConditionsCard from '../components/ConditionsCard';
import StreakStrip from '../components/StreakStrip';
import { Screen, Card, Button, SectionHeader } from '../components/ui';
import { ColorPalette, RADIUS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useActivity } from '../context/ActivityContext';
import { useStreak } from '../context/StreakContext';
import { useProfile } from '../context/ProfileContext';
import { useSettings } from '../context/SettingsContext';
import { weekStart } from '../services/dates';
import { firstNameOf } from '../services/displayName';
import { useTheme, Typography } from '../context/ThemeContext';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { history } = useActivity();
  const { currentStreak } = useStreak();
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

  return (
    <View style={{ flex: 1 }}>
    <Screen>
      <Header
        title={firstName}
        subtitle={`Home · ${greeting} · ${new Date().toLocaleDateString(undefined, {
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

        <Card onPress={() => navigation.navigate('Streak')}>
          <View style={styles.panelHead}>
            <View style={styles.panelIcon}>
              <Icon name="flame" size={18} color={colors.primary} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.panelEyebrow} numberOfLines={1}>Weekly streak</Text>
              <Text style={styles.panelTitle} numberOfLines={1}>
                {currentStreak} week{currentStreak === 1 ? '' : 's'}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.primary} />
          </View>

          <StreakStrip compact style={{ marginTop: SPACING.md }} />

          <View style={styles.momentumRow}>
            <MiniInfo value={String(week.count)} label="Activities" styles={styles} />
            <MiniInfo value={String(week.trees)} label="Trees" styles={styles} />
            <MiniInfo
              value={`${formatDistance(week.miles)} ${formatDistanceUnit()}`}
              label="This week"
              styles={styles}
            />
          </View>


        </Card>

        <View>
          <SectionHeader title="Quick actions" />
          <View style={styles.quickGrid}>
            <QuickAction
              icon="tree"
              title="Impact"
              hint="Miles, trees and records"
              onPress={() => navigation.navigate('Impact')}
              styles={styles}
              colors={colors}
            />
            <QuickAction
              icon="clock"
              title="My walks"
              hint="Open your full history"
              onPress={() => navigation.navigate('History')}
              styles={styles}
              colors={colors}
            />
            <QuickAction
              icon="map"
              title="Trails"
              hint="Walks and rides near you"
              onPress={() => navigation.navigate('Trails')}
              styles={styles}
              colors={colors}
            />
            <QuickAction
              icon="target"
              title="Weekly goals"
              hint="See this week’s challenges"
              onPress={() => navigation.navigate('Challenges')}
              styles={styles}
              colors={colors}
            />
          </View>
        </View>

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
            <Card>
              <Text style={styles.emptyTitle}>You have not walked yet</Text>
              <Text style={styles.emptyText}>
                Tap Start when you are ready. Even one short walk is enough to begin.
              </Text>
            </Card>
          )}
        </View>
      </View>
    </Screen>

    {/* Floating AI chat — ask about trails, weather, anything hiking. */}
    <AssistantFab />
    </View>
  );
}

const QuickAction = React.memo(function QuickAction({
  icon,
  title,
  hint,
  onPress,
  styles,
  colors,
}: {
  icon: IconName;
  title: string;
  hint: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ColorPalette;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.72 }]}>
      <View style={styles.quickIcon}>
        <Icon name={icon} size={18} color={colors.primary} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickHint}>{hint}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
});

const MiniInfo = React.memo(function MiniInfo({
  value,
  label,
  styles,
}: {
  value: string;
  label: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={{ flexBasis: 100, flexGrow: 1, minWidth: 0 }}>
      <Text style={styles.miniValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.miniLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: SPACING.lg },

    panelHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 2 },
    panelIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.md,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    panelEyebrow: { ...t.overline, color: c.textMuted },
    panelTitle: { ...t.h3, color: c.text, marginTop: 1 },
    helperText: { ...t.small, color: c.textMuted, marginTop: SPACING.sm + 2 },
    momentumRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.md },
    miniValue: { ...t.h3, color: c.text },
    miniLabel: { ...t.micro, color: c.textMuted, textTransform: 'uppercase', marginTop: 2 },

    quickGrid: { gap: SPACING.sm },
    quickCard: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
      paddingVertical: SPACING.md, minHeight: 72,
      borderBottomWidth: 1, borderBottomColor: c.borderLight,
    },
    quickIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.md,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickTitle: { ...t.h4, color: c.text },
    quickHint: { ...t.small, color: c.textMuted, marginTop: 4 },

    lastRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    lastIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
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
