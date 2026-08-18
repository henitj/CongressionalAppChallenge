import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import StreakStrip from '../components/StreakStrip';
import { Screen, Card, Pill, SectionHeader, Avatar, Divider, ProgressBar, Sheet, Button } from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useActivity } from '../context/ActivityContext';
import { useStreak } from '../context/StreakContext';
import { useChallenges } from '../context/ChallengeContext';
import { useEcoPoints, Badge } from '../constants/EcoPointsContext';
import { useSettings } from '../constants/SettingsContext';
import { useClub, sortedMembers } from '../constants/ClubContext';
import { useProfile } from '../context/ProfileContext';
import { fullNameOf } from '../services/displayName';
import { shareText } from '../services/share';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const { totalMiles, totalTrees, totalActivities, uniqueTrailsCompleted, totalCalories } = useActivity();
  const { currentStreak, longestStreak, totalActiveWeeks, availableFreezes } = useStreak();
  const { lifetimeCompleted } = useChallenges();
  const { totalPoints, level, progressPercent, nextLevelPoints, badges, unlockedBadges } =
    useEcoPoints();
  const { formatDistanceCompact: formatDistance, formatDistanceUnit } = useSettings();
  const { myClub, myRank, clubsLeading } = useClub();
  const { profile, updateWeight } = useProfile();

  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showWeightEditor, setShowWeightEditor] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const displayName = fullNameOf(profile, user?.name);

  const memberSince = useMemo(() => {
    const ts = myClub?.members.find((m) => m.id === user?.id)?.joinedAt;
    return ts ? new Date(ts) : null;
  }, [myClub, user?.id]);

  const shareImpact = async () => {
    const lines = [
      "I'm using EcoTrek to walk and bike more.",
      '',
      'My progress:',
      `• ${formatDistance(totalMiles)} ${formatDistanceUnit()} covered`,
      `• ${totalTrees} tree${totalTrees === 1 ? '' : 's'} earned`,
      `• ${totalPoints.toLocaleString()} EcoPoints · ${level}`,
      currentStreak > 0 ? `• ${currentStreak}-week streak` : null,
      uniqueTrailsCompleted > 0 ? `• ${uniqueTrailsCompleted} trails completed` : null,
      '',
      'Want to join me?',
    ].filter(Boolean) as string[];

    await shareText(lines.join('\n'), `${displayName}'s EcoTrek progress`);
  };

  const handleUpdateWeight = async () => {
    const w = parseInt(newWeight);
    if (w > 0 && w < 1000) {
      await updateWeight(w);
      setShowWeightEditor(false);
      setNewWeight('');
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
        actions={[{ icon: 'sliders', onPress: () => navigation.navigate('Settings'), label: 'Settings' }]}
      />

      <View style={styles.body}>
        {/* Impact card */}
        <Card tone="dark" style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <Avatar name={displayName} uri={user?.picture} size={62} ring="rgba(255,255,255,0.18)" />
            <View style={{ flex: 1 }}>
              <Text style={styles.impactName} numberOfLines={2}>
                {displayName}
              </Text>
              <View style={styles.levelRow}>
                <Icon name="award" size={13} color={COLORS.primaryGlow} strokeWidth={2} />
                <Text style={styles.impactLevel}>{level}</Text>
              </View>
              {profile.age > 0 ? (
                <Text style={styles.profileMeta}>
                  {profile.age} yrs · {Math.floor(profile.heightInches / 12)}'{profile.heightInches % 12}" · {profile.weightPounds} lbs
                </Text>
              ) : null}
            </View>
          </View>

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

          <View style={styles.impactStats}>
            <ImpactStat value={formatDistance(totalMiles)} unit={formatDistanceUnit()} label="Covered" />
            <ImpactStat value={String(totalTrees)} label="Trees" />
            <ImpactStat value={String(currentStreak)} label="Wk streak" />
            <ImpactStat value={String(uniqueTrailsCompleted)} label="Trails" />
          </View>

          <Button
            label="Share my progress"
            icon="share"
            variant="secondary"
            size="lg"
            full
            onPress={shareImpact}
          />
        </Card>

        {/* Weight tracking */}
        {profile.weightHistory.length > 0 ? (
          <Card>
            <View style={styles.weightHead}>
              <Text style={styles.weightTitle}>Weight tracking</Text>
              <Button
                label="Update"
                variant="secondary"
                size="sm"
                onPress={() => {
                  setNewWeight(String(profile.weightPounds));
                  setShowWeightEditor(true);
                }}
              />
            </View>
            <WeightGraph data={profile.weightHistory} />
            <Text style={styles.weightSub}>
              Current: {profile.weightPounds} lbs · {profile.weightHistory.length} entries
            </Text>
          </Card>
        ) : profile.weightPounds > 0 ? (
          <Card tone="sunken">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 }}>
              <Icon name="activity" size={18} color={COLORS.textMuted} strokeWidth={1.9} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...TYPOGRAPHY.h4, color: COLORS.textSecondary }}>Track your weight</Text>
                <Text style={{ ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 }}>
                  Update your weight regularly to see trends over time.
                </Text>
              </View>
            </View>
            <Button
              label="Log weight"
              variant="secondary"
              size="sm"
              onPress={() => {
                setNewWeight(String(profile.weightPounds));
                setShowWeightEditor(true);
              }}
              style={{ marginTop: SPACING.sm + 2 }}
            />
          </Card>
        ) : null}

        {/* Clubs */}
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

        {/* Streak */}
        <View>
          <SectionHeader
            title="Weekly streak"
            action="Full streak"
            onAction={() => navigation.navigate('Streak')}
          />
          <Card onPress={() => navigation.navigate('Streak')}>
            <View style={styles.streakStats}>
              <StreakStat value={currentStreak} label="Current" icon="flame" highlight />
              <StreakStat value={longestStreak} label="Longest" icon="trending-up" />
              <StreakStat value={totalActiveWeeks} label="Active weeks" icon="calendar" />
              <StreakStat value={availableFreezes} label="Freezes" icon="shield" />
            </View>
            <Divider style={{ marginVertical: SPACING.md - 2 }} />
            <Text style={styles.streakCaption}>Last 8 weeks</Text>
            <StreakStrip style={{ marginTop: SPACING.sm + 2 }} />
            <View style={styles.legend}>
              <LegendItem color={COLORS.primary} label="Active" />
              <LegendItem color={COLORS.accent} label="Frozen" />
              <LegendItem color={COLORS.surfaceSunken} border={COLORS.border} label="Missed" />
            </View>
          </Card>
        </View>

        {/* Badges — 3-up preview, full list lives on its own page */}
        <View>
          <SectionHeader
            title="Badges"
            action="See all"
            onAction={() => navigation.navigate('Badges')}
          />
          <Card>
            <View style={styles.badgeSummary}>
              <Text style={styles.badgeCount}>
                {unlockedBadges.length}
                <Text style={styles.badgeCountTotal}> / {badges.length}</Text>
              </Text>
              <Text style={styles.badgeCountLabel}>earned</Text>
            </View>
            <ProgressBar
              percent={badges.length ? (unlockedBadges.length / badges.length) * 100 : 0}
              style={{ marginTop: SPACING.sm, marginBottom: SPACING.md }}
              height={10}
            />
            <View style={styles.badgePreviewRow}>
              {(unlockedBadges.length ? unlockedBadges : badges).slice(0, 3).map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => setSelectedBadge(b)}
                  style={[styles.badgePreview, b.unlocked && styles.badgeUnlocked]}
                  accessibilityLabel={b.name}
                >
                  <Icon
                    name={b.icon}
                    size={26}
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
            <Button
              label="See all badges"
              variant="secondary"
              full
              iconRight="chevron-right"
              onPress={() => navigation.navigate('Badges')}
              style={{ marginTop: SPACING.md }}
            />
          </Card>
        </View>

        {/* Lifetime numbers */}
        <View>
          <SectionHeader title="Lifetime" action="Full history" onAction={() => navigation.navigate('History')} />
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
            <StatRow icon="zap" label="Calories burned" value={totalCalories.toLocaleString()} />
            <Divider style={{ marginLeft: 58 }} />
            <StatRow icon="star" label="EcoPoints" value={totalPoints.toLocaleString()} />
          </Card>
        </View>

        {/* Links */}
        <Card padded={false}>
          <LinkRow icon="clock" label="Activity history" onPress={() => navigation.navigate('History')} />
          <Divider style={{ marginLeft: 58 }} />
          <LinkRow icon="calendar" label="Weekly streak" onPress={() => navigation.navigate('Streak')} />
          <Divider style={{ marginLeft: 58 }} />
          <LinkRow icon="target" label="Weekly challenges" onPress={() => navigation.navigate('Challenges')} />
          <Divider style={{ marginLeft: 58 }} />
          <LinkRow icon="award" label="Badges" onPress={() => navigation.navigate('Badges')} />
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

      {/* Weight editor */}
      <Sheet
        visible={showWeightEditor}
        onClose={() => setShowWeightEditor(false)}
        title="Update weight"
        subtitle="Track your weight over time"
      >
        <View style={{ gap: SPACING.md }}>
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>Weight (lbs)</Text>
            <TextInput
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="number-pad"
              placeholder="155"
              placeholderTextColor={COLORS.textLight}
              style={styles.input}
            />
          </View>
          <Button label="Save" full onPress={handleUpdateWeight} />
        </View>
      </Sheet>
    </Screen>
  );
}

function WeightGraph({ data }: { data: { date: number; weight: number }[] }) {
  if (data.length < 2) return null;

  const weights = data.map((d) => d.weight);
  const min = Math.min(...weights) - 2;
  const max = Math.max(...weights) + 2;
  const range = max - min || 1;
  const height = 80;

  return (
    <View style={{ height, marginTop: SPACING.sm }}>
      <View style={[styles.graphContainer, { height }]}>
        {data.map((d, i) => {
          const barHeight = ((d.weight - min) / range) * (height - 20);
          return (
            <View key={d.date} style={styles.graphBar}>
              <View
                style={[
                  styles.graphBarFill,
                  { height: Math.max(4, barHeight) },
                  i === data.length - 1 && styles.graphBarCurrent,
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.graphLabels}>
        <Text style={styles.graphLabel}>{Math.round(min)} lbs</Text>
        <Text style={styles.graphLabel}>{Math.round(max)} lbs</Text>
      </View>
    </View>
  );
}

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

function StreakStat({ value, label, icon, highlight }: { value: number; label: string; icon: IconName; highlight?: boolean }) {
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
  profileMeta: { ...TYPOGRAPHY.micro, color: 'rgba(255,255,255,0.45)', marginTop: 4 },

  levelProgress: { gap: 5 },
  levelProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  levelProgressText: { ...TYPOGRAPHY.micro, color: 'rgba(255,255,255,0.55)' },

  impactStats: {
    flexDirection: 'row',
    paddingTop: SPACING.md - 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  impactStatValue: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
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

  weightHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weightTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  weightSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: SPACING.sm },

  graphContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  graphBar: { flex: 1, alignItems: 'center' },
  graphBarFill: {
    width: '70%',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 3,
    minHeight: 4,
  },
  graphBarCurrent: { backgroundColor: COLORS.primary },
  graphLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  graphLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },

  leadCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  crownWrap: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
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
    borderRadius: RADIUS.md,
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
  legendSwatch: { width: 11, height: 11, borderRadius: 6 },
  legendText: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },

  badgeSummary: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  badgeCount: { ...TYPOGRAPHY.h1, color: COLORS.text },
  badgeCountTotal: { ...TYPOGRAPHY.h3, color: COLORS.textLight, fontWeight: '500' },
  badgeCountLabel: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  badgePreviewRow: { flexDirection: 'row', gap: SPACING.sm },
  badgePreview: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  badgeUnlocked: { backgroundColor: COLORS.primarySurface, borderColor: COLORS.primaryGlow },
  badgeName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
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

  fieldLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  input: {
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: 13,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
});
