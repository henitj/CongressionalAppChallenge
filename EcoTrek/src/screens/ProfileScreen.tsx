import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import StreakStrip from '../components/StreakStrip';
import { Screen, Card, Pill, SectionHeader, Avatar, Divider, ProgressBar, Sheet, Button } from '../components/ui';

import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useActivity } from '../context/ActivityContext';
import { useStreak } from '../context/StreakContext';
import { useEcoPoints, Badge } from '../constants/EcoPointsContext';
import { useSettings } from '../constants/SettingsContext';
import { useClub, sortedMembers } from '../constants/ClubContext';
import { useProfile } from '../context/ProfileContext';
import { fullNameOf } from '../services/displayName';
import { chooseAvatarAction, pickAndStoreAvatarPhoto } from '../services/avatar';
import ShareCard from '../components/ShareCard';
import { useTheme, Typography } from '../context/ThemeContext';

export default function ProfileScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const navigation = useNavigation<any>();
  const { user, signOut, updateUser } = useAuth();
  const { totalMiles, totalTrees, uniqueTrailsCompleted } = useActivity();
  const { currentStreak, longestStreak, totalActiveWeeks, availableFreezes } = useStreak();
  const { totalPoints, level, progressPercent, nextLevelPoints, badges, unlockedBadges } =
    useEcoPoints();
  const { formatDistanceCompact: formatDistance, formatDistanceUnit } = useSettings();
  const { myClub, myRank, clubsLeading } = useClub();
  const { profile, setProfile, updateWeight, setAvatar } = useProfile();

  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showWeightEditor, setShowWeightEditor] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const displayName = fullNameOf(profile, user?.name);

  const memberSince = useMemo(() => {
    const ts = myClub?.members.find((m) => m.id === user?.id)?.joinedAt;
    return ts ? new Date(ts) : null;
  }, [myClub, user?.id]);

  const shareImpact = () => setShowShare(true);

  const avatarUri = profile.avatarUri ?? user?.picture ?? null;

  const openNameEditor = () => {
    setEditFirst(profile.firstName);
    setEditLast(profile.lastName);
    setShowNameEditor(true);
  };

  const handleSaveName = async () => {
    const first = editFirst.trim();
    const last = editLast.trim();
    if (!first) return;
    await setProfile({ firstName: first, lastName: last });
    const full = `${first} ${last}`.trim();
    await updateUser({ name: full });
    setShowNameEditor(false);
  };

  const changePhoto = () => {
    chooseAvatarAction(!!profile.avatarUri, async (choice) => {
      if (choice === null) return;
      if (choice === 'remove') {
        await setAvatar(null);
        return;
      }
      const stored = await pickAndStoreAvatarPhoto(choice, profile.avatarUri);
      if (stored) await setAvatar(stored);
    });
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
        back
        hideAvatar
        actions={[{ icon: 'sliders', onPress: () => navigation.navigate('Settings'), label: 'Settings' }]}
      />

      <View style={styles.body}>
        {/* Impact card */}
        <Card tone="dark" style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <Pressable
              onPress={changePhoto}
              style={styles.avatarWrap}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={profile.avatarUri ? 'Change your photo' : 'Add your photo'}
            >
              <Avatar name={displayName} uri={avatarUri} size={62} ring="rgba(255,255,255,0.18)" />
              <View style={styles.avatarChip}>
                <Icon name="camera" size={12} color="#fff" strokeWidth={2.2} />
              </View>
            </Pressable>
            <Pressable
              style={{ flex: 1 }}
              onPress={openNameEditor}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit your name"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.impactName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Icon name="pencil" size={14} color="rgba(255,255,255,0.55)" strokeWidth={2} />
              </View>
              <View style={styles.levelRow}>
                <Icon name="award" size={13} color={colors.primaryGlow} strokeWidth={2} />
                <Text style={styles.impactLevel}>{level}</Text>
              </View>
              {profile.age > 0 ? (
                <Text style={styles.profileMeta}>
                  {profile.age} yrs · {Math.floor(profile.heightInches / 12)}'{profile.heightInches % 12}" · {profile.weightPounds} lbs
                </Text>
              ) : null}
            </Pressable>
          </View>

          <View style={styles.levelProgress}>
            <View style={styles.levelProgressLabels}>
              <Text style={styles.levelProgressText}>{totalPoints.toLocaleString()} pts</Text>
              <Text style={styles.levelProgressText}>{nextLevelPoints.toLocaleString()}</Text>
            </View>
            <ProgressBar
              percent={progressPercent}
              color={colors.primaryGlow}
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

        <ShareCard
          visible={showShare}
          onClose={() => setShowShare(false)}
          name={displayName}
          miles={formatDistance(totalMiles)}
          unit={formatDistanceUnit()}
          trees={totalTrees}
          streak={currentStreak}
          level={level}
          trails={uniqueTrailsCompleted}
          avatarUri={avatarUri}
        />

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
              <Icon name="activity" size={18} color={colors.textMuted} strokeWidth={1.9} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.h4, color: colors.textSecondary }}>Track your weight</Text>
                <Text style={{ ...typography.small, color: colors.textMuted, marginTop: 2 }}>
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
                      <Icon name="crown" size={18} color={colors.accentDark} strokeWidth={2} />
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
                    <Icon name="chevron-right" size={17} color={colors.textLight} />
                  </Card>
                );
              })}
            </View>
          </View>
        ) : myClub ? (
          <Card onPress={() => navigation.navigate('Clubs')}>
            <View style={styles.clubRow}>
              <View style={styles.clubIcon}>
                <Icon name="users" size={17} color={colors.primary} strokeWidth={1.9} />
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
              <Icon name="chevron-right" size={17} color={colors.textLight} />
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
              <LegendItem color={colors.primary} label="Active" />
              <LegendItem color={colors.accent} label="Frozen" />
              <LegendItem color={colors.surfaceSunken} border={colors.border} label="Missed" />
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
                    color={b.unlocked ? colors.primary : colors.textLight}
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

        <Pressable onPress={confirmSignOut} style={styles.signOut}>
          <Icon name="log-out" size={16} color={colors.textMuted} strokeWidth={1.9} />
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
                color={selectedBadge.unlocked ? colors.primary : colors.textLight}
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
              placeholderTextColor={colors.textLight}
              style={styles.input}
            />
          </View>
          <Button label="Save" full onPress={handleUpdateWeight} />
        </View>
      </Sheet>

      {/* Name editor */}
      <Sheet
        visible={showNameEditor}
        onClose={() => setShowNameEditor(false)}
        title="Edit your name"
        subtitle="Shown on your home screen and shared card"
      >
        <View style={{ gap: SPACING.md }}>
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>First name</Text>
            <TextInput
              value={editFirst}
              onChangeText={setEditFirst}
              placeholder="Jane"
              placeholderTextColor={colors.textLight}
              maxLength={30}
              style={styles.input}
              accessibilityLabel="First name"
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>Last name</Text>
            <TextInput
              value={editLast}
              onChangeText={setEditLast}
              placeholder="Doe"
              placeholderTextColor={colors.textLight}
              maxLength={30}
              style={styles.input}
              accessibilityLabel="Last name"
            />
          </View>
          <Button label="Save" full disabled={!editFirst.trim()} onPress={handleSaveName} />
        </View>
      </Sheet>
    </Screen>
  );
}

function WeightGraph({ data }: { data: { date: number; weight: number }[] }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
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
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
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
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Icon name={icon} size={15} color={highlight ? colors.accent : colors.textMuted} strokeWidth={2} />
      <Text style={styles.streakStatValue}>{value}</Text>
      <Text style={styles.streakStatLabel}>{label}</Text>
    </View>
  );
}

function LegendItem({ color, border, label }: { color: string; border?: string; label: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
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

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({

  body: { paddingHorizontal: SPACING.md, gap: SPACING.md + 2 },

  impactCard: { padding: SPACING.md + 2, gap: SPACING.md },
  impactHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 2 },
  avatarWrap: { position: 'relative' },
  avatarChip: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: c.primary,
    borderWidth: 2,
    borderColor: c.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactName: { ...t.h1, color: '#fff' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  impactLevel: { ...t.smallMed, color: c.primaryGlow },
  profileMeta: { ...t.micro, color: 'rgba(255,255,255,0.45)', marginTop: 4 },

  levelProgress: { gap: 5 },
  levelProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  levelProgressText: { ...t.micro, color: 'rgba(255,255,255,0.55)' },

  impactStats: {
    flexDirection: 'row',
    paddingTop: SPACING.md - 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  impactStatValue: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  impactStatUnit: { ...t.micro, color: 'rgba(255,255,255,0.6)' },
  impactStatLabel: {
    ...t.micro,
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
  shareBarText: { ...t.smallMed, color: '#fff' },

  weightHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weightTitle: { ...t.h4, color: c.text },
  weightSub: { ...t.small, color: c.textMuted, marginTop: SPACING.sm },

  graphContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  graphBar: { flex: 1, alignItems: 'center' },
  graphBarFill: {
    width: '70%',
    backgroundColor: c.primaryLight,
    borderRadius: 3,
    minHeight: 4,
  },
  graphBarCurrent: { backgroundColor: c.primary },
  graphLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  graphLabel: { ...t.micro, color: c.textMuted },

  leadCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  crownWrap: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: c.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadTitle: { ...t.h4, color: c.text },
  leadSub: { ...t.small, color: c.textMuted, marginTop: 1 },

  clubRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  clubIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: c.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubName: { ...t.h4, color: c.text },
  clubMeta: { ...t.small, color: c.textMuted, marginTop: 1 },

  streakStats: { flexDirection: 'row' },
  streakStatValue: { ...t.h1, color: c.text },
  streakStatLabel: { ...t.micro, color: c.textMuted, textTransform: 'uppercase' },
  streakCaption: { ...t.overline, color: c.textMuted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginTop: SPACING.md - 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 11, height: 11, borderRadius: 6 },
  legendText: { ...t.micro, color: c.textMuted },

  badgeSummary: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  badgeCount: { ...t.h1, color: c.text },
  badgeCountTotal: { ...t.h3, color: c.textLight, fontWeight: '500' },
  badgeCountLabel: { ...t.small, color: c.textMuted },
  badgePreviewRow: { flexDirection: 'row', gap: SPACING.sm },
  badgePreview: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  badgeUnlocked: { backgroundColor: c.primarySurface, borderColor: c.primaryGlow },
  badgeName: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  badgeNameUnlocked: { color: c.primary },
  badgeLarge: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.xl,
    backgroundColor: c.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLargeUnlocked: { backgroundColor: c.primarySurface },
  badgeDesc: { ...t.body, color: c.textSecondary, textAlign: 'center' },

  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: SPACING.md - 2,
  },
  signOutText: { ...t.bodyMed, color: c.textMuted },

  fieldLabel: { ...t.overline, color: c.textMuted },
  input: {
    backgroundColor: c.surfaceSunken,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: 13,
    ...t.body,
    color: c.text,
  },

  });
}
