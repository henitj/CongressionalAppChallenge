import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Alert, Switch, Share, Platform, } from 'react-native';
import Header from '../components/Header';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { useClub } from '../constants/ClubContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { useAuth } from '../context/AuthContext';

type LeaderTab = 'clubs' | 'my_club' | 'global';

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const { totalPoints, level } = useEcoPoints();
  const { myClub, joinedClubs, createClub, joinClub, leaveClub, lockClub, deleteClub, } = useClub();

  const [tab, setTab] = useState<LeaderTab>('clubs');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  // Create form state
  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [clubLocked, setClubLocked] = useState(false);
  const [creating, setCreating] = useState(false);

  // Join form state
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleCreate = async () => {
    if (!clubName.trim()) {
      Alert.alert('Name required', 'Please enter a club name.');
      return;
    }
    if (!user) return;
    setCreating(true);
    await createClub( clubName.trim(), clubDesc.trim(), clubLocked, user.name, user.id );
    setCreating(false);
    setShowCreate(false);
    setClubName('');
    setClubDesc('');
    setClubLocked(false);
    setTab('my_club');
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Code required', 'Please enter a club code.');
      return;
    }
    if (!user) return;
    setJoining(true);
    const result = await joinClub(joinCode.trim(), user.name, user.id);
    setJoining(false);
    if (!result) {
      Alert.alert(
        'Club not found',
        'No club with that code exists, or the club is locked.'
      );
      return;
    }
    setShowJoin(false);
    setJoinCode('');
    setTab('my_club');
  };

  const handleShare = async (code: string, name: string) => {
    try {
      await Share.share({
        message: `Join my EcoTrek club "${name}"! Use code: ${code} in the Leaderboard tab.`,
        title: 'Join my EcoTrek Club',
      });
    } catch (e) {
      console.warn('Share failed', e);
    }
  };

  const handleLock = (clubId: string, locked: boolean) => {
    Alert.alert(
      locked ? 'Lock club' : 'Unlock club',
      locked
        ? 'Locking will prevent new members from joining.'
        : 'Unlocking allows anyone with the code to join.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: locked ? 'Lock' : 'Unlock',
          onPress: () => lockClub(clubId, locked),
        },
      ]
    );
  };

  const handleDelete = (clubId: string) => {
    Alert.alert(
      'Delete club',
      'This will permanently delete your club and all member data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteClub(clubId),
        },
      ]
    );
  };

  // Global leaderboard mock — in production this would be a real API
  const globalBoard = [
    { rank: 1, name: 'Austin Hikers United', points: 48200, members: 24, trees: 312 },
    { rank: 2, name: 'Green Wheel Riders', points: 36750, members: 18, trees: 241 },
    { rank: 3, name: 'Barton Creek Crew', points: 29100, members: 15, trees: 198 },
    { rank: 4, name: 'Lady Bird Legends', points: 22400, members: 12, trees: 156 },
    { rank: 5, name: 'Greenbelt Guardians', points: 18900, members: 20, trees: 134 },
  ];

  return (
    <View style={styles.container}>
      <Header title="Leaderboard" subtitle="Clubs · Rankings · Compete" />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(
          [
            { key: 'clubs', label: 'My Clubs', icon: '👥' },
            { key: 'my_club', label: 'Manage', icon: '⚙️' },
            { key: 'global', label: 'Global', icon: '🌍' },
          ] as { key: LeaderTab; label: string; icon: string }[]
        ).map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text
              style={[
                styles.tabLabel,
                tab === t.key && styles.tabLabelActive,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ══ MY CLUBS TAB ══ */}
        {tab === 'clubs' && (
          <>
            {/* My stats card */}
            <View style={styles.myStatsCard}>
              <View style={styles.myStatsLeft}>
                <Text style={styles.myStatsName}>
                  {user?.name ?? 'Trekker'}
                </Text>
                <Text style={styles.myStatsLevel}>{level}</Text>
              </View>
              <View style={styles.myStatsRight}>
                <Text style={styles.myStatsPts}>
                  {totalPoints.toLocaleString()}
                </Text>
                <Text style={styles.myStatsPtsLabel}>EcoPoints</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <PrimaryButton
                title="Create Club"
                onPress={() => setShowCreate(true)}
                icon="➕"
                size="sm"
                style={{ flex: 1 }}
              />
              <View style={{ width: SPACING.sm }} />
              <PrimaryButton
                title="Join Club"
                onPress={() => setShowJoin(true)}
                variant="ghost"
                icon="🔑"
                size="sm"
                style={{ flex: 1 }}
              />
            </View>

            {/* Clubs list */}
            {joinedClubs.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyTitle}>No clubs yet</Text>
                <Text style={styles.emptyBody}>
                  Create a club with friends or family, or join one with a
                  club code to compete on the leaderboard.
                </Text>
              </View>
            ) : (
              joinedClubs.map((club) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  isOwner={club.ownerId === user?.id}
                  onShare={() => handleShare(club.code, club.name)}
                  onLeave={() => {
                    Alert.alert(
                      'Leave club',
                      `Leave "${club.name}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Leave',
                          style: 'destructive',
                          onPress: () => leaveClub(club.id),
                        },
                      ]
                    );
                  }}
                />
              ))
            )}
          </>
        )}

        {/* ══ MANAGE TAB ══ */}
        {tab === 'my_club' && (
          <>
            {!myClub ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyTitle}>
                  You haven't created a club
                </Text>
                <Text style={styles.emptyBody}>
                  Create a club to manage members, share your club code, and
                  lock or unlock access.
                </Text>
                <PrimaryButton
                  title="Create my club"
                  onPress={() => {
                    setTab('clubs');
                    setShowCreate(true);
                  }}
                  icon="➕"
                  style={{ marginTop: SPACING.md }}
                />
              </View>
            ) : (
              <>
                {/* Club header */}
                <View style={styles.manageHeader}>
                  <View style={styles.manageHeaderBg} />
                  <Text style={styles.manageName}>{myClub.name}</Text>
                  {myClub.description ? (
                    <Text style={styles.manageDesc}>
                      {myClub.description}
                    </Text>
                  ) : null}

                  {/* Code */}
                  <View style={styles.codeBox}>
                    <Text style={styles.codeLabel}>CLUB CODE</Text>
                    <Text style={styles.codeValue}>{myClub.code}</Text>
                    <Pressable
                      style={styles.shareCodeBtn}
                      onPress={() =>
                        handleShare(myClub.code, myClub.name)
                      }
                    >
                      <Text style={styles.shareCodeText}>
                        Share code 📤
                      </Text>
                    </Pressable>
                  </View>

                  {/* Stats */}
                  <View style={styles.manageStatsRow}>
                    <ManageStat
                      value={myClub.members.length.toString()}
                      label="Members"
                    />
                    <ManageStat
                      value={myClub.totalPoints.toLocaleString()}
                      label="Points"
                    />
                    <ManageStat
                      value={myClub.totalTrees.toString()}
                      label="Trees"
                    />
                  </View>
                </View>

                {/* Lock toggle */}
                <View style={styles.lockCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lockTitle}>
                      {myClub.isLocked ? '🔒 Club locked' : '🔓 Club open'}
                    </Text>
                    <Text style={styles.lockBody}>
                      {myClub.isLocked
                        ? 'New members cannot join without your approval.'
                        : 'Anyone with the code can join your club.'}
                    </Text>
                  </View>
                  <Switch
                    value={myClub.isLocked}
                    onValueChange={(val) => handleLock(myClub.id, val)}
                    trackColor={{
                      false: COLORS.border,
                      true: COLORS.primary,
                    }}
                    thumbColor={myClub.isLocked ? '#fff' : COLORS.textLight}
                  />
                </View>

                {/* Member leaderboard */}
                <Text style={styles.sectionTitle}>
                  Member leaderboard
                </Text>
                {myClub.members
                  .slice()
                  .sort((a, b) => b.points - a.points)
                  .map((member, i) => (
                    <MemberRow
                      key={member.id}
                      rank={i + 1}
                      member={member}
                      isMe={member.id === user?.id}
                    />
                  ))}

                {/* Danger zone */}
                <View style={styles.dangerZone}>
                  <Text style={styles.dangerTitle}>Danger zone</Text>
                  <PrimaryButton
                    title="Delete club"
                    onPress={() => handleDelete(myClub.id)}
                    variant="danger"
                    icon="🗑️"
                    size="sm"
                  />
                </View>
              </>
            )}
          </>
        )}

        {/* ══ GLOBAL TAB ══ */}
        {tab === 'global' && (
          <>
            <View style={styles.globalBanner}>
              <Text style={styles.globalBannerTitle}>
                🌍 Austin EcoTrek Rankings
              </Text>
              <Text style={styles.globalBannerSub}>
                Top clubs competing to grow Austin's urban forest
              </Text>
            </View>

            {globalBoard.map((entry) => (
              <View
                key={entry.rank}
                style={[
                  styles.globalRow,
                  entry.rank === 1 && styles.globalRowFirst,
                ]}
              >
                <View style={styles.globalRankWrap}>
                  <Text style={styles.globalRank}>
                    {entry.rank === 1
                      ? '🥇'
                      : entry.rank === 2
                      ? '🥈'
                      : entry.rank === 3
                      ? '🥉'
                      : `#${entry.rank}`}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.globalName}>{entry.name}</Text>
                  <Text style={styles.globalMeta}>
                    {entry.members} members · {entry.trees} 🌳 planted
                  </Text>
                </View>
                <Text style={styles.globalPts}>
                  {entry.points.toLocaleString()}
                  {'\n'}
                  <Text style={styles.globalPtsLabel}>pts</Text>
                </Text>
              </View>
            ))}

            <View style={styles.globalNote}>
              <Text style={styles.globalNoteText}>
                🏆 Global rankings update daily. Create a club and compete
                with clubs across Austin!
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Create club modal ── */}
      <Modal
        visible={showCreate}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreate(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCreate(false)}
        >
          <View
            style={styles.modalSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Create a Club</Text>
            <Text style={styles.modalSubtitle}>
              Invite friends and family to compete together
            </Text>

            <Text style={styles.fieldLabel}>Club name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Barton Creek Crew"
              placeholderTextColor={COLORS.textMuted}
              value={clubName}
              onChangeText={setClubName}
              maxLength={40}
            />

            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="What's your club about?"
              placeholderTextColor={COLORS.textMuted}
              value={clubDesc}
              onChangeText={setClubDesc}
              multiline
              maxLength={120}
            />

            <View style={styles.lockRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lockRowTitle}>
                  {clubLocked ? '🔒 Locked' : '🔓 Open'}
                </Text>
                <Text style={styles.lockRowSub}>
                  {clubLocked
                    ? 'Only invited members can join'
                    : 'Anyone with the code can join'}
                </Text>
              </View>
              <Switch
                value={clubLocked}
                onValueChange={setClubLocked}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={clubLocked ? '#fff' : COLORS.textLight}
              />
            </View>

            <PrimaryButton
              title={creating ? 'Creating…' : 'Create Club'}
              onPress={handleCreate}
              loading={creating}
              icon="🏆"
              style={{ marginTop: SPACING.md }}
            />

            <Pressable
              style={styles.modalCancel}
              onPress={() => setShowCreate(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ── Join club modal ── */}
      <Modal
        visible={showJoin}
        animationType="slide"
        transparent
        onRequestClose={() => setShowJoin(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowJoin(false)}
        >
          <View
            style={styles.modalSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Join a Club</Text>
            <Text style={styles.modalSubtitle}>
              Enter a 6-character club code to join
            </Text>

            <Text style={styles.fieldLabel}>Club code</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="ABC123"
              placeholderTextColor={COLORS.textMuted}
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
            />

            <PrimaryButton
              title={joining ? 'Joining…' : 'Join Club'}
              onPress={handleJoin}
              loading={joining}
              icon="🔑"
              style={{ marginTop: SPACING.md }}
            />

            <Pressable
              style={styles.modalCancel}
              onPress={() => setShowJoin(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Small components ──────────────────────────────────────────────────────────

function ClubCard({
  club,
  isOwner,
  onShare,
  onLeave,
}: {
  club: any;
  isOwner: boolean;
  onShare: () => void;
  onLeave: () => void;
}) {
  return (
    <View style={styles.clubCard}>
      <View style={styles.clubCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.clubName}>{club.name}</Text>
          {club.description ? (
            <Text style={styles.clubDesc}>{club.description}</Text>
          ) : null}
        </View>
        <View style={styles.clubStatusBadge}>
          <Text style={styles.clubStatusText}>
            {club.isLocked ? '🔒' : '🔓'}
          </Text>
        </View>
      </View>

      {/* Code */}
      <View style={styles.clubCodeRow}>
        <Text style={styles.clubCodeLabel}>Code: </Text>
        <Text style={styles.clubCodeValue}>{club.code}</Text>
        {isOwner && (
          <Pressable style={styles.clubShareBtn} onPress={onShare}>
            <Text style={styles.clubShareText}>Share 📤</Text>
          </Pressable>
        )}
      </View>

      {/* Stats */}
      <View style={styles.clubStatsRow}>
        <ClubStat value={club.members.length} label="Members" />
        <ClubStat
          value={club.totalPoints.toLocaleString()}
          label="Points"
        />
        <ClubStat value={club.totalTrees} label="Trees 🌳" />
      </View>

      {/* Top members */}
      <Text style={styles.clubMembersTitle}>Top members</Text>
      {club.members
        .slice()
        .sort((a: any, b: any) => b.points - a.points)
        .slice(0, 3)
        .map((m: any, i: number) => (
          <View key={m.id} style={styles.clubMemberRow}>
            <Text style={styles.clubMemberRank}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
            </Text>
            <Text style={styles.clubMemberName}>{m.name}</Text>
            <Text style={styles.clubMemberPts}>
              {m.points} pts
            </Text>
          </View>
        ))}

      {/* Actions */}
      <View style={styles.clubActions}>
        {!isOwner && (
          <Pressable style={styles.leaveBtn} onPress={onLeave}>
            <Text style={styles.leaveBtnText}>Leave club</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function MemberRow({
  rank,
  member,
  isMe,
}: {
  rank: number;
  member: any;
  isMe: boolean;
}) {
  return (
    <View style={[styles.memberRow, isMe && styles.memberRowMe]}>
      <Text style={styles.memberRank}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.memberName, isMe && { color: COLORS.primary }]}>
          {member.name} {isMe ? '(you)' : ''}
          {member.isOwner ? ' 👑' : ''}
        </Text>
        <Text style={styles.memberMeta}>
          {member.miles.toFixed(1)} mi · {member.trees} 🌳
        </Text>
      </View>
      <Text style={styles.memberPts}>{member.points} pts</Text>
    </View>
  );
}

function ManageStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.manageStatBox}>
      <Text style={styles.manageStatVal}>{value}</Text>
      <Text style={styles.manageStatLabel}>{label}</Text>
    </View>
  );
}

function ClubStat({ value, label }: { value: any; label: string }) {
  return (
    <View style={styles.clubStatBox}>
      <Text style={styles.clubStatVal}>{value}</Text>
      <Text style={styles.clubStatLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxxl },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  tabActive: {
    borderBottomWidth: 2.5,
    borderBottomColor: COLORS.primary,
  },
  tabIcon: { fontSize: 16 },
  tabLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.primary, fontWeight: '800' },

  // My stats
  myStatsCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  myStatsLeft: { flex: 1 },
  myStatsName: { ...TYPOGRAPHY.h3, color: '#fff' },
  myStatsLevel: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  myStatsRight: { alignItems: 'flex-end' },
  myStatsPts: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: -0.5,
  },
  myStatsPtsLabel: { ...TYPOGRAPHY.micro, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },

  // Action row
  actionRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },

  // Club card
  clubCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  clubCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  clubName: { ...TYPOGRAPHY.h3, color: COLORS.text },
  clubDesc: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  clubStatusBadge: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.pill,
    padding: 6,
  },
  clubStatusText: { fontSize: 16 },
  clubCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: 4,
  },
  clubCodeLabel: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  clubCodeValue: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
    flex: 1,
  },
  clubShareBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  clubShareText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  clubStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  clubStatBox: { alignItems: 'center' },
  clubStatVal: { ...TYPOGRAPHY.h3, color: COLORS.primary },
  clubStatLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },
  clubMembersTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
  },
  clubMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  clubMemberRank: { fontSize: 16, width: 28 },
  clubMemberName: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, flex: 1 },
  clubMemberPts: { ...TYPOGRAPHY.smallMed, color: COLORS.primary },
  clubActions: { marginTop: SPACING.sm },
  leaveBtn: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.dangerLight,
  },
  leaveBtnText: { color: COLORS.danger, fontWeight: '700' },

  // Manage
  manageHeader: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  manageHeaderBg: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  manageName: { ...TYPOGRAPHY.h1, color: '#fff', fontSize: 26, marginBottom: 4 },
  manageDesc: { ...TYPOGRAPHY.body, color: 'rgba(255,255,255,0.55)', marginBottom: SPACING.md },
  codeBox: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  codeLabel: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 6,
  },
  codeValue: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 6,
    marginBottom: SPACING.sm,
  },
  shareCodeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  shareCodeText: { color: '#fff', fontWeight: '700' },
  manageStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  manageStatBox: { alignItems: 'center' },
  manageStatVal: { fontSize: 24, fontWeight: '900', color: '#fff' },
  manageStatLabel: { ...TYPOGRAPHY.micro, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: 2 },
  lockCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  lockTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  lockBody: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },

  // Member rows
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  memberRowMe: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySurface,
  },
  memberRank: { fontSize: 20, width: 32 },
  memberName: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },
  memberMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  memberPts: { ...TYPOGRAPHY.h4, color: COLORS.primary },
  dangerZone: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.md,
  },
  dangerTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },

  // Global
  globalBanner: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  globalBannerTitle: { ...TYPOGRAPHY.h2, color: '#fff', textAlign: 'center' },
  globalBannerSub: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 4,
  },
  globalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  globalRowFirst: {
    borderColor: COLORS.accent,
    backgroundColor: '#FFFBEF',
  },
  globalRankWrap: { width: 40, alignItems: 'center' },
  globalRank: { fontSize: 22, fontWeight: '900' },
  globalName: { ...TYPOGRAPHY.h4, color: COLORS.text },
  globalMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  globalPts: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'right',
  },
  globalPtsLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '400' },
  globalNote: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
  },
  globalNoteText: { ...TYPOGRAPHY.body, color: COLORS.primaryDark, textAlign: 'center', lineHeight: 22 },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    ...SHADOWS.xl,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { ...TYPOGRAPHY.h2, color: COLORS.text, marginBottom: 4 },
  modalSubtitle: { ...TYPOGRAPHY.body, color: COLORS.textMuted, marginBottom: SPACING.lg },
  fieldLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    paddingHorizontal: SPACING.md,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  codeInput: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  lockRowTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  lockRowSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  modalCancel: {
    alignItems: 'center',
    padding: SPACING.md,
    marginTop: SPACING.xs,
  },
  modalCancelText: { color: COLORS.textMuted, fontWeight: '700' },

  // Empty
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.sm },
  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.xs },
  emptyBody: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});