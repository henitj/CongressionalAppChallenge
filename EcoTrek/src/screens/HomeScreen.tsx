import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import ConditionsCard from '../components/ConditionsCard';
import { Screen, Card, Button } from '../components/ui';
import { ColorPalette, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useActivity } from '../context/ActivityContext';
import { useStreak } from '../context/StreakContext';
import { useProfile } from '../context/ProfileContext';
import { useSettings } from '../constants/SettingsContext';
import { weekStart } from '../services/dates';
import { firstNameOf } from '../services/displayName';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { history } = useActivity();
  const { currentStreak } = useStreak();
  const { formatDistance, formatDistanceUnit } = useSettings();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const week = useMemo(() => {
    const since = weekStart().getTime();
    const thisWeek = history.filter((a) => a.valid && a.startedAt >= since);
    const miles = thisWeek.reduce((n, a) => n + a.miles, 0);
    const trees = thisWeek.reduce((n, a) => n + (a.trees ?? 0), 0);
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
        <ConditionsCard />

        {week.count > 0 ? (
          <View>
            <Text style={[styles.section, typography.h3, { color: colors.text }]}>This week</Text>
            <Card tone="sunken">
              <View style={styles.weekRow}>
                <WeekStat
                  value={formatDistance(week.miles)}
                  unit={formatDistanceUnit()}
                  label="Distance"
                />
                <WeekStat value={String(week.trees)} label="Trees" />
                <WeekStat value={String(currentStreak)} label="Wk streak" />
              </View>
            </Card>
          </View>
        ) : null}

        <View>
          <Text style={[styles.section, typography.h3, { color: colors.text }]}>Your last walk</Text>
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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lastTitle, typography.h4]} numberOfLines={1}>
                    {last.trailName ?? (last.type === 'bike' ? 'Bike ride' : 'Walk')}
                  </Text>
                  <Text style={[styles.lastMeta, typography.small]}>
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
              <Text style={[styles.emptyTitle, typography.h4]}>You have not walked yet</Text>
              <Text style={[styles.emptyText, typography.body]}>
                Tap the Start tab when you are ready — that is all there is to it.
              </Text>
            </Card>
          )}
          <Button
            label="See all walks"
            variant="ghost"
            onPress={() => navigation.navigate('History')}
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
          />
        </View>
      </View>
    </Screen>
  );
}

// Colors and type come from the theme at render time; this holds geometry.
function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: SPACING.lg },
    section: { marginBottom: SPACING.sm },
    lastRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    lastIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lastTitle: { color: c.text },
    lastMeta: { color: c.textMuted, marginTop: 3 },
    emptyTitle: { color: c.text },
    emptyText: { color: c.textMuted, marginTop: 4 },

    weekRow: { flexDirection: 'row' },
    weekStat: { flex: 1, alignItems: 'center', gap: 2 },
    weekValue: { color: c.text },
    weekUnit: { color: c.textMuted },
    weekLabel: { color: c.textMuted, marginTop: 2 },
  });
}

function WeekStat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.weekStat}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Text style={[styles.weekValue, typography.h3]}>{value}</Text>
        {unit ? <Text style={[styles.weekUnit, typography.small]}>{unit}</Text> : null}
      </View>
      <Text style={[styles.weekLabel, typography.overline]}>{label}</Text>
    </View>
  );
}
