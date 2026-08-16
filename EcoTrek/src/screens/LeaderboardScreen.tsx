import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Switch,
  Share,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import {
  Screen,
  Card,
  Button,
  Pill,
  Segmented,
  Sheet,
  EmptyState,
  Banner,
  Avatar,
  Divider,
  ProgressBar,
} from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Club, sortedMembers, useClub } from '../constants/ClubContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../constants/SettingsContext';

type Tab = 'my_club' | 'discover' | 'ranking';

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const {
    myClub,
    allClubs,
    myMember,
    myRank,
    localOnly,
    syncing,
    createClub,
    joinClub,
    leaveClub,
    lockClub,
    deleteClub,
    refresh,
  } = useClub();
  const { formatDistance, formatDistanceUnit } = useSettings();

  const [tab, setTab] = useState<Tab>(myClub ? 'my_club' : 'discover');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locked, setLocked] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicClubs = useMemo(
    () => allClubs.filter((c) => c.isPublic && c.id !== myClub?.id),
    [allClubs, myClub?.id]
  );

  const handleCreate = async () => {
    if (name.trim().length < 3) {
      setError('Give your club a name of at least 3 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createClub({ name, description, isLocked: locked });
      setShowCreate(false);
      setName('');
      setDescription('');
      setLocked(false);
      setTab('my_club');
    } catch (e: any) {
      setError(e?.message ?? 'Could not create that club.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    setBusy(true);
    setError(null);
    try {
      await joinClub(code);
      setShowJoin(false);
      setCode('');
      setTab('my_club');
    } catch (e: any) {
      setError(e?.message ?? 'Could not join that club.');
    } finally {
      setBusy(false);
    }
  };

  const confirmLeave = () => {
    Alert.alert('Leave this club?', 'Your contribution stays with the club, but you will drop off the roster.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveClub().then(() => setTab('discover')) },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert('Delete this club?', 'This removes it for every member. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteClub().then(() => setTab('discover')) },
    ]);
  };

  const shareCode = async () => {
    if (!myClub) return;
    await Share.share({
      message: `Join my EcoTrek club "${myClub.name}" — use code ${myClub.code} in the app.`,
    });
  };

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={COLORS.textMuted} />
      }
    >
      <Header
        title="Clubs"
        subtitle={myClub ? myClub.name : 'Team up'}
        actions={
          myClub
            ? [{ icon: 'share', onPress: shareCode, label: 'Share club code' }]
            : [{ icon: 'plus', onPress: () => setShowCreate(true), label: 'Create club' }]
        }
      />

      <View style={styles.body}>
        <Segmented
          options={[
            { value: 'my_club', label: 'My club' },
            { value: 'discover', label: 'Discover' },
            { value: 'ranking', label: 'Ranking' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />

        {/* ── MY CLUB ─────────────────────────────────────────────────────── */}
        {tab === 'my_club' ? (
          myClub ? (
            <>
              {/* Club header */}
              <Card tone="dark" style={styles.clubHeader}>
                <View style={styles.clubHeaderTop}>
                  <View style={styles.clubBadge}>
                    <Icon name="users" size={20} color="#fff" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clubTitle} numberOfLines={1}>
                      {myClub.name}
                    </Text>
                    <Text style={styles.clubSub} numberOfLines={2}>
                      {myClub.description || `${myClub.members.length} members`}
                    </Text>
                  </View>
                  {myClub.isLocked ? <Pill label="Locked" tone="dark" size="sm" icon="lock" /> : null}
                </View>

                <View style={styles.clubStats}>
                  <DarkStat value={myClub.totalPoints.toLocaleString()} label="Points" />
                  <DarkStat value={String(myClub.totalTrees)} label="Trees" />
                  <DarkStat
                    value={formatDistance(myClub.totalMiles)}
                    label={formatDistanceUnit()}
                  />
                  <DarkStat value={String(myClub.members.length)} label="Members" />
                </View>

                <Pressable onPress={shareCode} style={styles.codeRow}>
                  <View>
                    <Text style={styles.codeLabel}>Invite code</Text>
                    <Text style={styles.codeValue}>{myClub.code}</Text>
                  </View>
                  <View style={styles.codeShare}>
                    <Icon name="share" size={15} color="#fff" strokeWidth={2} />
                    <Text style={styles.codeShareText}>Share</Text>
                  </View>
                </Pressable>
              </Card>

              {/* Your contribution */}
              {myMember ? (
                <Card>
                  <View style={styles.contribHead}>
                    <Text style={styles.sectionLabel}>Your contribution</Text>
                    {myRank ? (
                      <Pill
                        label={`#${myRank} of ${myClub.members.length}`}
                        tone={myRank === 1 ? 'accent' : 'neutral'}
                        size="sm"
                        icon={myRank === 1 ? 'crown' : undefined}
                      />
                    ) : null}
                  </View>
                  <View style={styles.contribStats}>
                    <ContribStat value={myMember.points.toLocaleString()} label="Points" />
                    <ContribStat value={String(myMember.trees)} label="Trees" />
                    <ContribStat
                      value={formatDistance(myMember.miles)}
                      label={formatDistanceUnit()}
                    />
                  </View>
                  <ProgressBar
                    percent={
                      myClub.totalPoints > 0 ? (myMember.points / myClub.totalPoints) * 100 : 0
                    }
                    style={{ marginTop: SPACING.md - 4 }}
                  />
                  <Text style={styles.contribShare}>
                    {myClub.totalPoints > 0
                      ? `${Math.round((myMember.points / myClub.totalPoints) * 100)}% of the club's total`
                      : 'Be the first to put points on the board'}
                  </Text>
                </Card>
              ) : null}

              {/* Roster */}
              <View>
                <Text style={styles.sectionTitle}>Roster</Text>
                <Card padded={false}>
                  {sortedMembers(myClub).map((m, i) => {
                    const isMe = m.id === user?.id;
                    const topPoints = sortedMembers(myClub)[0]?.points || 1;
                    return (
                      <View key={m.id}>
                        {i > 0 ? <Divider style={{ marginLeft: 60 }} /> : null}
                        <View style={[styles.memberRow, isMe && styles.memberRowMe]}>
                          <RankBadge rank={i + 1} />
                          <Avatar name={m.name} uri={m.avatarUrl} size={34} />
                          <View style={{ flex: 1 }}>
                            <View style={styles.memberNameRow}>
                              <Text style={styles.memberName} numberOfLines={1}>
                                {m.name}
                                {isMe ? ' (you)' : ''}
                              </Text>
                              {m.role === 'owner' ? (
                                <Icon name="crown" size={13} color={COLORS.accent} strokeWidth={2} />
                              ) : null}
                            </View>
                            <View style={styles.memberBarTrack}>
                              <View
                                style={[
                                  styles.memberBarFill,
                                  { width: `${Math.max(3, (m.points / topPoints) * 100)}%` },
                                ]}
                              />
                            </View>
                          </View>
                          <View style={styles.memberStats}>
                            <Text style={styles.memberPoints}>{m.points.toLocaleString()}</Text>
                            <Text style={styles.memberSub}>
                              {m.trees} trees · {formatDistance(m.miles)} {formatDistanceUnit()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </View>

              {/* Owner controls */}
              {myClub.ownerId === user?.id ? (
                <Card>
                  <Text style={styles.sectionLabel}>Club settings</Text>
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settingTitle}>Lock to new members</Text>
                      <Text style={styles.settingSub}>
                        Nobody new can join with the code while this is on.
                      </Text>
                    </View>
                    <Switch
                      value={myClub.isLocked}
                      onValueChange={lockClub}
                      trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                      thumbColor="#fff"
                    />
                  </View>
                  <Divider style={{ marginVertical: SPACING.sm + 2 }} />
                  <Pressable onPress={confirmDelete} style={styles.dangerRow}>
                    <Icon name="trash" size={16} color={COLORS.danger} strokeWidth={1.9} />
                    <Text style={styles.dangerText}>Delete club</Text>
                  </Pressable>
                </Card>
              ) : null}

              <Pressable onPress={confirmLeave} style={styles.leaveBtn}>
                <Text style={styles.leaveText}>Leave club</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Card style={styles.ctaCard}>
                <View style={styles.ctaIcon}>
                  <Icon name="users" size={24} color={COLORS.primary} strokeWidth={1.8} />
                </View>
                <Text style={styles.ctaTitle}>You are not in a club</Text>
                <Text style={styles.ctaText}>
                  Clubs pool everyone's miles, trees and challenge points into one score. Start one
                  for your school, team or friend group.
                </Text>
                <View style={styles.ctaButtons}>
                  <Button
                    label="Join with code"
                    variant="secondary"
                    icon="plus"
                    onPress={() => setShowJoin(true)}
                    style={{ flex: 1 }}
                  />
                  <Button label="Create club" icon="users" onPress={() => setShowCreate(true)} style={{ flex: 1 }} />
                </View>
              </Card>

              <Card tone="sunken">
                <Text style={styles.explainTitle}>How club scoring works</Text>
                <Rule icon="activity" text="Every mile you log adds points to your club." />
                <Rule icon="target" text="Every weekly challenge you finish adds its points too." />
                <Rule icon="tree" text="Trees you earn count toward the club's forest." />
                <Rule icon="crown" text="The roster ranks members by points contributed." />
              </Card>
            </>
          )
        ) : null}

        {/* ── DISCOVER ────────────────────────────────────────────────────── */}
        {tab === 'discover' ? (
          <>
            <View style={styles.discoverActions}>
              <Button
                label="Join with code"
                variant="secondary"
                icon="plus"
                onPress={() => setShowJoin(true)}
                style={{ flex: 1 }}
              />
              <Button
                label="Create"
                icon="users"
                onPress={() => setShowCreate(true)}
                style={{ flex: 1 }}
                disabled={!!myClub}
              />
            </View>

            {localOnly ? (
              <Banner
                tone="neutral"
                icon="info"
                title="Clubs are on this device"
                message="Connect the backend and clubs sync across phones, so your friends see the same roster."
              />
            ) : null}

            {publicClubs.length === 0 ? (
              <EmptyState
                icon="users"
                title="No clubs yet"
                message="Be the first. Create one and share the code with your team."
                action="Create a club"
                onAction={() => setShowCreate(true)}
              />
            ) : (
              <View style={{ gap: SPACING.sm }}>
                {publicClubs.map((c) => (
                  <ClubRow key={c.id} club={c} disabled={!!myClub} onJoin={() => setShowJoin(true)} />
                ))}
              </View>
            )}
          </>
        ) : null}

        {/* ── RANKING ─────────────────────────────────────────────────────── */}
        {tab === 'ranking' ? (
          allClubs.length === 0 ? (
            <EmptyState
              icon="trending-up"
              title="Nothing to rank yet"
              message="Once clubs start logging miles they will appear here, ordered by total points."
            />
          ) : (
            <>
              {localOnly ? (
                <Banner
                  tone="neutral"
                  icon="info"
                  title="Local ranking"
                  message="These are the clubs on this device. Connect the backend for a live global board."
                />
              ) : null}
              <Card padded={false}>
                {allClubs.map((c, i) => (
                  <View key={c.id}>
                    {i > 0 ? <Divider style={{ marginLeft: 60 }} /> : null}
                    <View style={[styles.rankRow, c.id === myClub?.id && styles.memberRowMe]}>
                      <RankBadge rank={i + 1} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rankName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.rankMeta}>
                          {c.members.length} member{c.members.length === 1 ? '' : 's'} · {c.totalTrees} trees
                        </Text>
                      </View>
                      <Text style={styles.rankPoints}>{c.totalPoints.toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )
        ) : null}
      </View>

      {/* ── Create sheet ──────────────────────────────────────────────────── */}
      <Sheet
        visible={showCreate}
        onClose={() => {
          setShowCreate(false);
          setError(null);
        }}
        title="Create a club"
        subtitle="You will get a six-character code to share"
      >
        <View style={{ gap: SPACING.md }}>
          <Field label="Club name" value={name} onChange={setName} placeholder="Austin High Trekkers" maxLength={40} />
          <Field
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="What is this club about?"
            multiline
            maxLength={140}
          />
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Lock immediately</Text>
              <Text style={styles.settingSub}>Nobody can join until you unlock it.</Text>
            </View>
            <Switch
              value={locked}
              onValueChange={setLocked}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor="#fff"
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Create club" full loading={busy} onPress={handleCreate} />
        </View>
      </Sheet>

      {/* ── Join sheet ────────────────────────────────────────────────────── */}
      <Sheet
        visible={showJoin}
        onClose={() => {
          setShowJoin(false);
          setError(null);
        }}
        title="Join a club"
        subtitle="Ask a member for their six-character code"
      >
        <View style={{ gap: SPACING.md }}>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            style={styles.codeInput}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Join club" full loading={busy} onPress={handleJoin} disabled={code.length < 4} />
        </View>
      </Sheet>
    </Screen>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────────── */

function ClubRow({ club, disabled, onJoin }: { club: Club; disabled: boolean; onJoin: () => void }) {
  return (
    <Card>
      <View style={styles.discoverRow}>
        <View style={styles.discoverIcon}>
          <Icon name="users" size={18} color={COLORS.primary} strokeWidth={1.9} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.discoverName} numberOfLines={1}>
            {club.name}
          </Text>
          <Text style={styles.discoverDesc} numberOfLines={2}>
            {club.description || 'No description yet.'}
          </Text>
          <View style={styles.discoverMeta}>
            <Pill label={`${club.members.length} members`} tone="neutral" size="sm" />
            <Pill label={`${club.totalPoints.toLocaleString()} pts`} tone="primary" size="sm" />
            {club.isLocked ? <Pill label="Locked" tone="warning" size="sm" icon="lock" /> : null}
          </View>
        </View>
      </View>
      {!disabled && !club.isLocked ? (
        <Button
          label="Join with code"
          variant="secondary"
          size="sm"
          onPress={onJoin}
          style={{ marginTop: SPACING.sm + 2 }}
        />
      ) : null}
    </Card>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const top = rank <= 3;
  const bg = rank === 1 ? COLORS.accent : rank === 2 ? '#9AA5A0' : rank === 3 ? '#B98A5E' : COLORS.surfaceSunken;
  return (
    <View style={[styles.rankBadge, { backgroundColor: top ? bg : COLORS.surfaceSunken }]}>
      <Text style={[styles.rankBadgeText, top && { color: '#fff' }]}>{rank}</Text>
    </View>
  );
}

function DarkStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.darkStatValue}>{value}</Text>
      <Text style={styles.darkStatLabel}>{label}</Text>
    </View>
  );
}

function ContribStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.contribValue}>{value}</Text>
      <Text style={styles.contribLabel}>{label}</Text>
    </View>
  );
}

function Rule({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.rule}>
      <Icon name={icon} size={15} color={COLORS.textMuted} strokeWidth={1.9} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        multiline={multiline}
        maxLength={maxLength}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },

  clubHeader: { gap: SPACING.md, padding: SPACING.md },
  clubHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  clubBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubTitle: { ...TYPOGRAPHY.h2, color: '#fff' },
  clubSub: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  clubStats: {
    flexDirection: 'row',
    paddingTop: SPACING.md - 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  darkStatValue: { ...TYPOGRAPHY.h3, color: '#fff' },
  darkStatLabel: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
  },
  codeLabel: { ...TYPOGRAPHY.micro, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' },
  codeValue: { ...TYPOGRAPHY.h2, color: '#fff', letterSpacing: 3, marginTop: 2 },
  codeShare: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  codeShareText: { ...TYPOGRAPHY.smallMed, color: '#fff' },

  sectionLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.sm + 2 },

  contribHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contribStats: { flexDirection: 'row', marginTop: SPACING.sm + 2 },
  contribValue: { ...TYPOGRAPHY.h2, color: COLORS.text },
  contribLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },
  contribShare: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 6 },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    padding: SPACING.md - 3,
  },
  memberRowMe: { backgroundColor: COLORS.primarySurface },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memberName: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, flexShrink: 1 },
  memberBarTrack: {
    height: 4,
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: 2,
    marginTop: 5,
    overflow: 'hidden',
  },
  memberBarFill: { height: '100%', backgroundColor: COLORS.primaryLight, borderRadius: 2 },
  memberStats: { alignItems: 'flex-end' },
  memberPoints: { ...TYPOGRAPHY.h4, color: COLORS.text },
  memberSub: { fontSize: 10.5, color: COLORS.textMuted, marginTop: 1 },

  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    padding: SPACING.md - 3,
  },
  rankName: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },
  rankMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  rankPoints: { ...TYPOGRAPHY.h4, color: COLORS.primary },

  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: { ...TYPOGRAPHY.smallMed, color: COLORS.textSecondary, fontSize: 12 },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm + 2,
  },
  settingTitle: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },
  settingSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },

  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dangerText: { ...TYPOGRAPHY.bodyMed, color: COLORS.danger },

  leaveBtn: { alignSelf: 'center', padding: SPACING.sm },
  leaveText: { ...TYPOGRAPHY.small, color: COLORS.textMuted, textDecorationLine: 'underline' },

  ctaCard: { alignItems: 'center', paddingVertical: SPACING.lg },
  ctaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md - 2,
  },
  ctaTitle: { ...TYPOGRAPHY.h2, color: COLORS.text },
  ctaText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
  },
  ctaButtons: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg, alignSelf: 'stretch' },

  discoverActions: { flexDirection: 'row', gap: SPACING.sm },
  discoverRow: { flexDirection: 'row', gap: SPACING.sm + 4 },
  discoverIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverName: { ...TYPOGRAPHY.h4, color: COLORS.text },
  discoverDesc: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  discoverMeta: { flexDirection: 'row', gap: 6, marginTop: SPACING.sm },

  explainTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: SPACING.sm + 2 },
  rule: { flexDirection: 'row', gap: SPACING.sm + 2, marginBottom: SPACING.sm },
  ruleText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, flex: 1 },

  fieldLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  input: {
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: 12,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  inputMultiline: { minHeight: 78, textAlignVertical: 'top' },
  codeInput: {
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 16,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 8,
    color: COLORS.text,
  },
  error: { ...TYPOGRAPHY.small, color: COLORS.danger },
});
