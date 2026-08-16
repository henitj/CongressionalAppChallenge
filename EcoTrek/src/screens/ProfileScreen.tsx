import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import StreakStrip from '../components/StreakStrip';
import { Screen, Card, Button, Pill, SectionHeader, Avatar, Divider, ProgressBar, Sheet } from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useActivity } from '../context/ActivityContext';
import { useStreak } from '../context/StreakContext';
import { useChallenges } from '../context/ChallengeContext';
import { useEcoPoints, Badge } from '../constants/EcoPointsContext';
import { useSettings } from '../constants/SettingsContext';
import { useClub, sortedMembers } from '../constants/ClubContext';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const { totalMiles, totalTrees, totalActivities, uniqueTrailsCompleted } = useActivity();
  const { currentStreak, longestStreak, totalActiveDays } = useStreak();
  const { lifetimeCompleted } = useChallenges();
  const { totalPoints, level, levelIndex, progressPercent, nextLevelPoints, badges, unlockedBadges } =
    useEcoPoints();
  const { formatDistance, formatDistanceUnit } = useSettings();
  const { myClub, myRank, clubsLeading } = useClub();

  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const memberSince = useMemo(() => {
    const ts = myClub?.members.find((m) => m.id === user?.id)?.joinedAt;
    return ts ? new Date(ts) : null;
  }, [myClub, user?.id]);

  const shareImpact = async () => {
    const lines = [
      `${user?.name ?? 'I'} on EcoTrek`,
      '',
      `${formatDistance(totalMiles)} ${formatDistanceUnit()} covered under my own power`,
      `${totalTrees} trees earned`,
      `${totalPoints.toLocaleString()} EcoPoints · ${level}`,
      currentStreak > 0 ? `${currentStreak}-day streak` : null,
      uniqueTrailsCompleted > 0 ? `${uniqueTrailsCompleted} trails completed` : null,
      clubsLeading.length > 0 ? `#1 in ${clubsLeading.map((c) => c.name).join(', ')}` : null,
      '',
      'Tracking hikes and rides with EcoTrek.',
    ].filter(Boolean);

    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      /* user cancelled */
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'Your progress stays saved on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen>
      <Header
        title="Profile"
        hideAvatar
        actions={[
          { icon: 'share', onPress: shareImpact, label: 'Share impact' },
          { icon: 'sliders', onPress: () => navigation.navigate('Settings'), label: 'Settings' },
        ]}
      />

      <View style={styles.body}>
        {/* ── The impact card ─────────────────────────────────────────────── */}
        <Card tone="dark" style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <Avatar name={user?.name} uri={user?.picture} size={62} ring="rgba(255,255,255,0.18)" />
            <View style={{ flex: 1 }}>
              <Text style={styles.impactName} numberOfLines={1}>
                {user?.name ?? 'Trekker'}
              </Text>
              <View style={styles.levelRow}>
                <Icon name="award" size={13} color={COLORS.primaryGlow} strokeWidth={2} />
                <Text style={styles.impactLevel}>{level}</Text>
              </View>
              {user?.provider === 'guest' ? (
                <Text style={styles.guestNote}>Guest account — data stays on this device</Text>
              ) : null}
            </View>
          </View>

          {/* Level progress */}
          <View style={styles.levelProgress}>
            <View style={styles.levelProgressLabels}>
              <Text style={styles.levelProgressText}>{totalPoints.toLocaleString()} pts</Text>
              <Text style={styles.levelProgressText}>{nextLevelPoints.toLocaleString()}</Text>
            </View>
            <ProgressBar
              percent={progressPercent}
              color={COLORS.primaryGlow}
              track="rgba(255,255,255,0.14)"
              height={6}
            />
          </View>

          {/* Headline stats */}
          <View style={styles.impactStats}>
            <ImpactStat value={formatDistance(totalMiles)} unit={formatDistanceUnit()} label="Covered" />
            <ImpactStat value={String(totalTrees)} label="Trees" />
            <ImpactStat value={String(currentStreak)} label="Day streak" />
            <ImpactStat value={String(uniqueTrailsCompleted)} label="Trails" />
          </View>

          <Pressable onPress={shareImpact} style={styles.shareBar}>
            <Icon name="share" size={15} color="#fff" strokeWidth={2} />
            <Text style={styles.shareBarText}>Share my impact</Text>
          </Pressable>
        </Card>

        {/* ── Clubs you lead ──────────────────────────────────────────────── */}
        {clubsLeading.length > 0 ? (
          <View>
            <SectionHeader title="Leading" />
            <View style={{ gap: SPACING.sm }}>
              {clubsLeading.map((c) => {
                const members = sortedMembers(c);
                const me = members[0];
                const second = members[1];
                const lead = second ? me.points - second.points : me.points;
                return (
                  <Card key={c.id} style={styles.leadCard} onPress={() => navigation.navigate('Clubs')}>
                    <View style={styles.crownWrap}>
                      <Icon name="crown" size={18} color={COLORS.accentDark} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.leadTitle} numberOfLines={1}>
                        #1 in {c.name}
                      </Text>
                      <Text style={styles.leadSub}>
                        {me.points.toLocaleString()} pts
                        {second ? ` · ${lead.toLocaleString()} ahead of second` : ' · unopposed so far'}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={17} color={COLORS.textLight} />
                  </Card>
                );
              })}
            </View>
          </View>
        ) : myClub ? (
          <Card onPress={() => navigation.navigate('Clubs')}>
            <View style={styles.clubRow}>
              <View style={styles.clubIcon}>
                <Icon name="users" size={17} color={COLORS.primary} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clubName} numberOfLines={1}>
                  {myClub.name}
                </Text>
                <Text style={styles.clubMeta}>
                  Ranked #{myRank} of {myClub.members.length}
                  {memberSince
                    ? ` · since ${memberSince.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
                    : ''}
                </Text>
              </View>
              <Icon name="chevron-right" size={17} color={COLORS.textLight} />
            </View>
          </Card>
        ) : null}

        {/* ── Streak ──────────────────────────────────────────────────────── */}
        <View>
          <SectionHeader title="Consistency" />
          <Card>
            <View style={styles.streakStats}>
              <StreakStat value={currentStreak} label="Current streak" icon="flame" highlight />
              <StreakStat value={longestStreak} label="Longest" icon="trending-up" />
              <StreakStat value={totalActiveDays} label="Active days" icon="calendar" />
            </View>
            <Divider style={{ marginVertical: SPACING.md - 2 }} />
            <Text style={styles.streakCaption}>Last 14 days</Text>
            <StreakStrip days={14} compact style={{ marginTop: SPACING.sm + 2 }} />
            <View style={styles.legend}>
              <LegendItem color={COLORS.primary} label="Logged an activity" />
              <LegendItem color={COLORS.primarySurface} border={COLORS.primaryGlow} label="Opened app" />
              <LegendItem color={COLORS.surfaceSunken} border={COLORS.border} label="Missed" />
            </View>
          </Card>
        </View>

        {/* ── Accomplishments ─────────────────────────────────────────────── */}
        <View>
          <SectionHeader title="Accomplishments" />
          <Card>
            <View style={styles.badgeSummary}>
              <Text style={styles.badgeCount}>
                {unlockedBadges.length}
                <Text style={styles.badgeCountTotal}> / {badges.length}</Text>
              </Text>
              <Text style={styles.badgeCountLabel}>badges unlocked</Text>
            </View>
            <ProgressBar
              percent={(unlockedBadges.length / badges.length) * 100}
              style={{ marginTop: SPACING.sm, marginBottom: SPACING.md }}
            />
            <View style={styles.badgeGrid}>
              {badges.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => setSelectedBadge(b)}
                  style={[styles.badge, b.unlocked && styles.badgeUnlocked]}
                >
                  <Icon
                    name={b.icon}
                    size={20}
                    color={b.unlocked ? COLORS.primary : COLORS.textLight}
                    strokeWidth={1.9}
                  />
                  <Text
                    style={[styles.badgeName, b.unlocked && styles.badgeNameUnlocked]}
                    numberOfLines={2}
                  >
                    {b.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        {/* ── Lifetime numbers ────────────────────────────────────────────── */}
        <View>
          <SectionHeader title="Lifetime" action="Full history" onAction={() => navigation.navigate('Impact')} />
          <Card padded={false}>
            <StatRow icon="activity" label="Total distance" value={`${formatDistance(totalMiles)} ${formatDistanceUnit()}`} />
            <Divider style={{ marginLeft: 58 }} />
            <StatRow icon="route" label="Activities logged" value={String(totalActivities)} />
            <Divider style={{ marginLeft: 58 }} />
            <StatRow icon="tree" label="Trees earned" value={String(totalTrees)} />
            <Divider style={{ marginLeft: 58 }} />
            <StatRow icon="flag" label="Trails completed" value={String(uniqueTrailsCompleted)} />
            <Divider style={{ marginLeft: 58 }} />
            <StatRow icon="target" label="Challenges finished" value={String(lifetimeCompleted)} />
            <Divider style={{ marginLeft: 58 }} />
            <StatRow icon="star" label="EcoPoints" value={totalPoints.toLocaleString()} />
          </Card>
        </View>

        {/* ── Links ───────────────────────────────────────────────────────── */}
        <Card padded={false}>
          <LinkRow icon="target" label="Weekly challenges" onPress={() => navigation.navigate('Challenges')} />
          <Divider style={{ marginLeft: 58 }} />
          <LinkRow icon="shield" label="Trail safety" onPress={() => navigation.navigate('Safety')} />
          <Divider style={{ marginLeft: 58 }} />
          <LinkRow icon="sliders" label="Settings" onPress={() => navigation.navigate('Settings')} />
        </Card>

        <Pressable onPress={confirmSignOut} style={styles.signOut}>
          <Icon name="log-out" size={16} color={COLORS.textMuted} strokeWidth={1.9} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      {/* Badge detail */}
      <Sheet
        visible={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        title={selectedBadge?.name ?? ''}
        subtitle={selectedBadge?.unlocked ? 'Unlocked' : 'Locked'}
      >
        {selectedBadge ? (
          <View style={{ alignItems: 'center', gap: SPACING.md, paddingBottom: SPACING.md }}>
            <View style={[styles.badgeLarge, selectedBadge.unlocked && styles.badgeLargeUnlocked]}>
              <Icon
                name={selectedBadge.icon}
                size={38}
                color={selectedBadge.unlocked ? COLORS.primary : COLORS.textLight}
                strokeWidth={1.7}
              />
            </View>
            <Text style={styles.badgeDesc}>{selectedBadge.description}</Text>
            {selectedBadge.unlocked && selectedBadge.unlockedAt ? (
              <Pill
                label={`Earned ${new Date(selectedBadge.unlockedAt).toLocaleDateString()}`}
                tone="primary"
                size="sm"
              />
            ) : (
              <Pill label="Not yet earned" tone="neutral" size="sm" />
            )}
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────────── */

function ImpactStat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={styles.impactStatValue}>{value}</Text>
        {unit ? <Text style={styles.impactStatUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.impactStatLabel}>{label}</Text>
    </View>
  );
}

function StreakStat({
  value,
  label,
  icon,
  highlight,
}: {
  value: number;
  label: string;
  icon: IconName;
  highlight?: boolean;
}) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Icon name={icon} size={15} color={highlight ? COLORS.accent : COLORS.textMuted} strokeWidth={2} />
      <Text style={styles.streakStatValue}>{value}</Text>
      <Text style={styles.streakStatLabel}>{label}</Text>
    </View>
  );
}

function LegendItem({ color, border, label }: { color: string; border?: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          { backgroundColor: color, borderColor: border ?? color, borderWidth: border ? 1.5 : 0 },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function StatRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <View style={styles.statRowIcon}>
        <Icon name={icon} size={16} color={COLORS.textMuted} strokeWidth={1.9} />
      </View>
      <Text style={styles.statRowLabel}>{label}</Text>
      <Text style={styles.statRowValue}>{value}</Text>
    </View>
  );
}

function LinkRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.statRow, pressed && { opacity: 0.7 }]}>
      <View style={styles.statRowIcon}>
        <Icon name={icon} size={16} color={COLORS.primary} strokeWidth={1.9} />
      </View>
      <Text style={[styles.statRowLabel, { flex: 1 }]}>{label}</Text>
      <Icon name="chevron-right" size={17} color={COLORS.textLight} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md + 2 },

  impactCard: { padding: SPACING.md + 2, gap: SPACING.md },
  impactHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 2 },
  impactName: { ...TYPOGRAPHY.h1, color: '#fff' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  impactLevel: { ...TYPOGRAPHY.smallMed, color: COLORS.primaryGlow },
  guestNote: { ...TYPOGRAPHY.micro, color: 'rgba(255,255,255,0.45)', marginTop: 4 },

  levelProgress: { gap: 5 },
  levelProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  levelProgressText: { ...TYPOGRAPHY.micro, color: 'rgba(255,255,255,0.55)' },

  impactStats: {
    flexDirection: 'row',
    paddingTop: SPACING.md - 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  impactStatValue: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.8 },
  impactStatUnit: { ...TYPOGRAPHY.micro, color: 'rgba(255,255,255,0.6)' },
  impactStatLabel: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginTop: 2,
  },

  shareBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.11)',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  shareBarText: { ...TYPOGRAPHY.smallMed, color: '#fff' },

  leadCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  crownWrap: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  leadSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },

  clubRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  clubIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubName: { ...TYPOGRAPHY.h4, color: COLORS.text },
  clubMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },

  streakStats: { flexDirection: 'row' },
  streakStatValue: { ...TYPOGRAPHY.h1, color: COLORS.text },
  streakStatLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },
  streakCaption: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.md - 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 11, height: 11, borderRadius: 3 },
  legendText: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },

  badgeSummary: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  badgeCount: { ...TYPOGRAPHY.h1, color: COLORS.text },
  badgeCountTotal: { ...TYPOGRAPHY.h3, color: COLORS.textLight, fontWeight: '500' },
  badgeCountLabel: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  badge: {
    width: '30.6%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 6,
  },
  badgeUnlocked: { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primaryGlow },
  badgeName: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 13,
  },
  badgeNameUnlocked: { color: COLORS.primary },
  badgeLarge: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLargeUnlocked: { backgroundColor: COLORS.primarySurface },
  badgeDesc: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center' },

  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    paddingVertical: 13,
    paddingHorizontal: SPACING.md - 2,
  },
  statRowIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRowLabel: { ...TYPOGRAPHY.bodyMed, color: COLORS.textSecondary, flex: 1 },
  statRowValue: { ...TYPOGRAPHY.h4, color: COLORS.text },

  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: SPACING.md - 2,
  },
  signOutText: { ...TYPOGRAPHY.bodyMed, color: COLORS.textMuted },
});
