import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import Icon from '../components/Icon';
import ConditionsCard from '../components/ConditionsCard';
import { Screen, Button } from '../components/ui';
import { ColorPalette, RADIUS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useActivity } from '../context/ActivityContext';
import { useStreak } from '../context/StreakContext';
import { useProfile } from '../context/ProfileContext';
import { useSettings } from '../context/SettingsContext';
import { useOptionalTreeGrowth } from '../context/TreeGrowthContext';
import { weekStart } from '../services/dates';
import { firstNameOf } from '../services/displayName';
import { useTheme, type Typography } from '../context/ThemeContext';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { history } = useActivity();
  const { currentStreak } = useStreak();
  const tree = useOptionalTreeGrowth();
  const { formatDistance, formatDistanceUnit } = useSettings();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const week = useMemo(() => {
    const since = weekStart().getTime();
    const activities = history.filter((activity) => activity.valid && activity.startedAt >= since);
    return { miles: activities.reduce((sum, activity) => sum + activity.miles, 0), count: activities.length };
  }, [history]);
  const firstName = firstNameOf(profile.firstName, user?.name);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const last = history[0];

  return (
    <Screen>
      <Header title="Home" subtitle={`${greeting}, ${firstName}`} />
      <View style={styles.body}>
        <View style={styles.invitation}>
          <Text style={styles.invitationTitle}>A little time outside.</Text>
          <Text style={styles.invitationCopy}>A walk, a ride, a breath of fresh air. Go at your own pace.</Text>
          <Button label="Start a walk" icon="arrow-right" size="lg" full onPress={() => navigation.navigate('Track')} />
          <Pressable onPress={() => navigation.navigate('Trails')} style={styles.explore} accessibilityRole="button" accessibilityLabel="Explore trails">
            <Icon name="map" size={17} color={colors.primary} />
            <Text style={styles.link}>Explore trails</Text>
            <Icon name="chevron-right" size={15} color={colors.primary} />
          </Pressable>
        </View>

        <ConditionsCard compact />

        <View style={styles.weekRow}>
          <Pressable onPress={() => navigation.navigate('History')} style={{ flex: 1, gap: 4 }} accessibilityRole="button" accessibilityLabel="View this week’s activities">
            <Text style={styles.eyebrow}>This week</Text>
            <Text style={styles.weekCopy}>{week.count ? `${week.count} outing${week.count === 1 ? '' : 's'} · ${formatDistance(week.miles)} ${formatDistanceUnit()}` : 'A fresh week. A new little beginning.'}</Text>
          </Pressable>
          {currentStreak > 0 ? <Pressable onPress={() => navigation.navigate('Streak')} style={styles.streak} accessibilityRole="button" accessibilityLabel="Your weekly streak">
            <Icon name="flame" size={16} color={colors.primary} />
            <Text style={styles.link}>{currentStreak} wk</Text>
          </Pressable> : null}
        </View>

        <Pressable onPress={() => navigation.navigate('Tree')} style={({ pressed }) => [styles.tree, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel="Your tree">
          <View style={styles.treeIcon}><Icon name="leaf" size={27} color={colors.primary} strokeWidth={1.5} /></View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={styles.rowTitle}>Your tree</Text>
            <Text style={styles.rowHint}>{tree ? `${tree.stage.name} · ${tree.growthWeeks} cared-for week${tree.growthWeeks === 1 ? '' : 's'}` : 'A little care, week by week.'}</Text>
          </View>
          <Icon name="chevron-right" size={19} color={colors.primary} />
        </Pressable>

        {last ? <View style={{ gap: 12 }}>
          <View style={styles.sectionHead}>
            <Text style={styles.eyebrow}>Last outing</Text>
            <Pressable onPress={() => navigation.navigate('History')} hitSlop={8} accessibilityRole="button" accessibilityLabel="See all walks"><Text style={styles.link}>See all</Text></Pressable>
          </View>
          <Pressable onPress={() => navigation.navigate('ActivityDetail', { activityId: last.id })} style={styles.last} accessibilityRole="button">
            <Icon name={last.type === 'bike' ? 'bike' : 'boot'} size={21} color={colors.primary} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{last.trailName ?? (last.type === 'bike' ? 'Bike ride' : 'Walk')}</Text>
              <Text style={styles.rowHint}>{formatDistance(last.miles)} {formatDistanceUnit()} · {Math.max(1, Math.round(last.durationSec / 60))} min</Text>
            </View>
            <Icon name="chevron-right" size={17} color={colors.textMuted} />
          </Pressable>
        </View> : null}
      </View>
    </Screen>
  );
}
function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: 24 },
    invitation: { padding: 22, borderRadius: RADIUS.xl, backgroundColor: c.primarySurface, gap: 17 },
    invitationTitle: { ...t.h2, color: c.text, letterSpacing: -0.5 },
    invitationCopy: { ...t.body, color: c.textSecondary, lineHeight: Math.max(24, t.body.lineHeight ?? 24) },
    explore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 36 },
    link: { ...t.smallMed, color: c.primary },
    eyebrow: { ...t.smallMed, color: c.textMuted },
    weekRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 5 },
    weekCopy: { ...t.small, color: c.text, lineHeight: Math.max(22, t.small.lineHeight ?? 22) },
    streak: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44 },
    tree: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: RADIUS.xl, backgroundColor: c.surface },
    treeIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.primarySurface, justifyContent: 'center', alignItems: 'center' },
    rowTitle: { ...t.h4, color: c.text },
    rowHint: { ...t.small, color: c.textMuted },
    sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5 },
    last: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 16, borderRadius: RADIUS.lg, backgroundColor: c.surface },
  });
}
