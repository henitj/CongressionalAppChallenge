import React, { useState } from 'react';
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
import {
  Club,
  GOAL_METRIC_LABEL,
  GOAL_PRESETS,
  GoalMetric,
  LEADERBOARD_SIZE,
  MAX_MEMBER_CAP,
  MEMBER_CAP_OPTIONS,
  MIN_MEMBER_CAP,
  sortedMembers,
  useClub,
} from '../constants/ClubContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../constants/SettingsContext';
import { useActivity } from '../context/ActivityContext';

type Tab = 'my_club' | 'ranking';

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const {
    myClub,
    topClubs,
    myClubRanking,
    totalClubs,
    myMember,
    myRank,
    localOnly,
    syncing,
    createClub,
    joinClub,
    leaveClub,
    lockClub,
    setMaxMembers,
    setGoal,
    clearGoal,
    activeGoal,
    deleteClub,
    refresh,
  } = useClub();
  const { formatDistanceCompact: formatDistance, formatDistanceUnit } = useSettings();
  const { totalActivities } = useActivity();

  const [tab, setTab] = useState<Tab>(myClub ? 'my_club' : 'ranking');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showCap, setShowCap] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [goalMetric, setGoalMetric] = useState<GoalMetric>('miles');
  const [goalTarget, setGoalTarget] = useState(25);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locked, setLocked] = useState(false);
  const [cap, setCap] = useState(50);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Explainers earn their keep for the first few sessions, then get out of
  // the way. Nobody needs to be told how scoring works on their tenth visit.
  const showBasics = totalActivities < 3;

  const resetSheets = () => {
    setError(null);
    setShowCreate(false);
    setShowJoin(false);
    setShowCap(false);
    setShowGoal(false);
  };

  const handleCreate = async () => {
    if (name.trim().length < 3) {
      setError('Give your club a name of at least 3 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createClub({ name, description, isLocked: locked, maxMembers: cap });
      resetSheets();
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
      resetSheets();
      setCode('');
      setTab('my_club');
    } catch (e: any) {
      setError(e?.message ?? 'Could not join that club.');
    } finally {
      setBusy(false);
    }
  };

  const confirmLeave = () => {
    Alert.alert('Leave this club?', 'Your contribution stays with the club, but you drop off the roster.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveClub().then(() => setTab('ranking')) },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert('Delete this club?', 'This removes it for every member. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteClub().then(() => setTab('ranking')) },
    ]);
  };

  const shareCode = async () => {
    if (!myClub) return;
    await Share.share({
      message: `Join my EcoTrek club "${myClub.name}" — enter code ${myClub.code} in the app.`,
    });
  };

  const spotsLeft = myClub ? myClub.maxMembers - myClub.members.length : 0;

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
            { value: 'ranking', label: 'World top 10' },
          ]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />

        {/* ══ MY CLUB ══════════════════════════════════════════════════════ */}
        {tab === 'my_club' ? (
          myClub ? (
            <>
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
                      {myClub.description || 'No description yet.'}
                    </Text>
                  </View>
                  {myClub.isLocked ? <Pill label="Locked" tone="dark" size="sm" icon="lock" /> : null}
                </View>

                {myClubRanking ? (
                  <View style={styles.worldRank}>
                    <Icon name="globe" size={14} color={COLORS.primaryGlow} strokeWidth={2} />
                    <Text style={styles.worldRankText}>
                      Ranked #{myClubRanking.rank} of {totalClubs} club
                      {totalClubs === 1 ? '' : 's'}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.clubStats}>
                  <DarkStat value={myClub.totalPoints.toLocaleString()} label="Points" />
                  <DarkStat value={String(myClub.totalTrees)} label="Trees" />
                  <DarkStat value={formatDistance(myClub.totalMiles)} label={formatDistanceUnit()} />
                  <DarkStat
                    value={`${myClub.members.length}/${myClub.maxMembers}`}
                    label="Members"
                  />
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

              {/* Weekly goal */}
              {activeGoal ? (
                <Card>
                  <View style={styles.goalHead}>
                    <View style={[styles.goalIcon, !!activeGoal.metAt && styles.goalIconMet]}>
                      <Icon
                        name={activeGoal.metAt ? 'check' : 'target'}
                        size={17}
                        color={activeGoal.metAt ? '#fff' : COLORS.primary}
                        strokeWidth={activeGoal.metAt ? 2.6 : 2}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionLabel}>This week's goal</Text>
                      <Text style={styles.goalTitle}>
                        {activeGoal.target} {GOAL_METRIC_LABEL[activeGoal.metric]}
                      </Text>
                    </View>
                    {activeGoal.metAt ? <Pill label="Met" tone="primary" size="sm" icon="check" /> : null}
                  </View>

                  <ProgressBar
                    percent={(activeGoal.progress / activeGoal.target) * 100}
                    color={activeGoal.metAt ? COLORS.primary : COLORS.accent}
                    style={{ marginTop: SPACING.md - 2 }}
                  />
                  <Text style={styles.goalProgress}>
                    {activeGoal.metAt
                      ? `Goal met together. Everyone who contributed earned a bonus.`
                      : `${formatGoalValue(activeGoal.progress)} of ${activeGoal.target} — ${formatGoalValue(
                          Math.max(0, activeGoal.target - activeGoal.progress)
                        )} to go`}
                  </Text>

                  {myClub.ownerId === user?.id ? (
                    <View style={styles.goalActions}>
                      <Button
                        label="Change goal"
                        variant="secondary"
                        size="sm"
                        style={{ flex: 1 }}
                        onPress={() => {
                          setGoalMetric(activeGoal.metric);
                          setGoalTarget(activeGoal.target);
                          setShowGoal(true);
                        }}
                      />
                      <Button
                        label="Remove"
                        variant="ghost"
                        tone={COLORS.textMuted}
                        size="sm"
                        onPress={clearGoal}
                      />
                    </View>
                  ) : null}
                </Card>
              ) : myClub.ownerId === user?.id ? (
                <Card tone="sunken">
                  <View style={styles.goalEmpty}>
                    <Icon name="target" size={18} color={COLORS.textMuted} strokeWidth={1.9} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalEmptyTitle}>No weekly goal set</Text>
                      <Text style={styles.goalEmptyText}>
                        Give the club one number to chase together. It resets every Monday.
                      </Text>
                    </View>
                  </View>
                  <Button
                    label="Set a goal"
                    icon="target"
                    size="sm"
                    style={{ marginTop: SPACING.sm + 2 }}
                    onPress={() => setShowGoal(true)}
                  />
                </Card>
              ) : null}

              {/* Capacity */}
              <Card>
                <View style={styles.capRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionLabel}>Capacity</Text>
                    <Text style={styles.capValue}>
                      {myClub.members.length} of {myClub.maxMembers} spots taken
                    </Text>
                  </View>
                  {myClub.ownerId === user?.id ? (
                    <Button
                      label="Change"
                      variant="secondary"
                      size="sm"
                      onPress={() => {
                        setCap(myClub.maxMembers);
                        setShowCap(true);
                      }}
                    />
                  ) : null}
                </View>
                <ProgressBar
                  percent={(myClub.members.length / myClub.maxMembers) * 100}
                  color={spotsLeft <= 2 ? COLORS.warning : COLORS.primary}
                  style={{ marginTop: SPACING.sm + 2 }}
                />
                <Text style={styles.capHint}>
                  {spotsLeft > 0
                    ? `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`
                    : 'Full — nobody else can join until the cap goes up.'}
                </Text>
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
                    <ContribStat value={formatDistance(myMember.miles)} label={formatDistanceUnit()} />
                  </View>
                  <ProgressBar
                    percent={myClub.totalPoints > 0 ? (myMember.points / myClub.totalPoints) * 100 : 0}
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
                  {sortedMembers(myClub).map((m, i, arr) => {
                    const isMe = m.id === user?.id;
                    const top = arr[0]?.points || 1;
                    return (
                      <View key={m.id}>
                        {i > 0 ? <Divider style={{ marginLeft: 60 }} /> : null}
                        <View style={[styles.memberRow, isMe && styles.rowHighlight]}>
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
                                  { width: `${Math.max(3, (m.points / top) * 100)}%` },
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
                        The code stops working while this is on.
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
                  Clubs are invite-only. Get a six-character code from a member, or start your own
                  and hand the code out.
                </Text>
                <View style={styles.ctaButtons}>
                  <Button
                    label="Enter a code"
                    icon="lock"
                    onPress={() => setShowJoin(true)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Create club"
                    variant="secondary"
                    icon="plus"
                    onPress={() => setShowCreate(true)}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>

              {showBasics ? (
                <Card tone="sunken">
                  <Text style={styles.explainTitle}>How club scoring works</Text>
                  <Rule icon="activity" text="Every mile you log adds points to your club." />
                  <Rule icon="target" text="Every weekly challenge you finish adds its points too." />
                  <Rule icon="tree" text="Trees you earn count toward the club's forest." />
                  <Rule icon="crown" text="The roster ranks members by points contributed." />
                </Card>
              ) : null}
            </>
          )
        ) : null}

        {/* ══ WORLD TOP 10 ═════════════════════════════════════════════════ */}
        {tab === 'ranking' ? (
          <>
            {localOnly ? (
              <Banner
                tone="neutral"
                icon="info"
                title="Ranking is device-only right now"
                message="These are the clubs on this phone. Connect the backend and this becomes a live worldwide board."
              />
            ) : null}

            {topClubs.length === 0 ? (
              <EmptyState
                icon="trending-up"
                title="No clubs on the board yet"
                message="Nothing is ranked until a club logs its first miles. Create one and put yourself at number one."
                action="Create a club"
                onAction={() => setShowCreate(true)}
              />
            ) : (
              <>
                <View style={styles.rankHeader}>
                  <Text style={styles.sectionTitle}>Top {LEADERBOARD_SIZE} worldwide</Text>
                  <Text style={styles.rankCount}>
                    {totalClubs} club{totalClubs === 1 ? '' : 's'} competing
                  </Text>
                </View>

                <Card padded={false}>
                  {topClubs.map(({ rank, club }, i) => (
                    <View key={club.id}>
                      {i > 0 ? <Divider style={{ marginLeft: 60 }} /> : null}
                      <ClubRankRow
                        rank={rank}
                        club={club}
                        isMine={club.id === myClub?.id}
                        formatDistance={formatDistance}
                        unit={formatDistanceUnit()}
                      />
                    </View>
                  ))}
                </Card>

                {/* Your club, pinned below when it misses the top ten */}
                {myClubRanking && myClubRanking.rank > LEADERBOARD_SIZE ? (
                  <View>
                    <Text style={styles.yourPositionLabel}>Your position</Text>
                    <Card padded={false}>
                      <ClubRankRow
                        rank={myClubRanking.rank}
                        club={myClubRanking.club}
                        isMine
                        formatDistance={formatDistance}
                        unit={formatDistanceUnit()}
                      />
                    </Card>
                    <Text style={styles.gapHint}>
                      {(() => {
                        const above = topClubs[LEADERBOARD_SIZE - 1];
                        const gap = above
                          ? above.club.totalPoints - myClubRanking.club.totalPoints
                          : 0;
                        return gap > 0
                          ? `${gap.toLocaleString()} points from breaking into the top ten.`
                          : 'You are on the edge of the top ten.';
                      })()}
                    </Text>
                  </View>
                ) : null}

                {!myClub ? (
                  <Card tone="sunken">
                    <Text style={styles.explainTitle}>Not competing yet</Text>
                    <Text style={styles.explainBody}>
                      Join a club with a code, or start one, and your miles start counting toward a
                      place on this board.
                    </Text>
                    <View style={styles.ctaButtons}>
                      <Button
                        label="Enter a code"
                        icon="lock"
                        size="sm"
                        onPress={() => setShowJoin(true)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        label="Create"
                        variant="secondary"
                        size="sm"
                        onPress={() => setShowCreate(true)}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </Card>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </View>

      {/* ── Create ────────────────────────────────────────────────────────── */}
      <Sheet
        visible={showCreate}
        onClose={resetSheets}
        title="Create a club"
        subtitle="You get a six-character code to hand out"
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

          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>Member limit</Text>
            <View style={styles.capOptions}>
              {MEMBER_CAP_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setCap(n)}
                  style={[styles.capChip, cap === n && styles.capChipOn]}
                >
                  <Text style={[styles.capChipText, cap === n && styles.capChipTextOn]}>{n}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldHint}>
              You can change this later. Anywhere from {MIN_MEMBER_CAP} to {MAX_MEMBER_CAP}.
            </Text>
          </View>

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

      {/* ── Join ──────────────────────────────────────────────────────────── */}
      <Sheet
        visible={showJoin}
        onClose={resetSheets}
        title="Enter a club code"
        subtitle="Clubs are invite-only — you need the code"
      >
        <View style={{ gap: SPACING.md }}>
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="ABC123"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            style={styles.codeInput}
          />
          <Text style={styles.fieldHint}>
            Six characters, no lookalikes — there is no letter O or I, only zero-free digits.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Join club" full loading={busy} onPress={handleJoin} disabled={code.length < 6} />
        </View>
      </Sheet>

      {/* ── Weekly goal ───────────────────────────────────────────────────── */}
      <Sheet
        visible={showGoal}
        onClose={resetSheets}
        title="Weekly club goal"
        subtitle="One shared target. Resets Monday."
      >
        <View style={{ gap: SPACING.md }}>
          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>What are you chasing?</Text>
            <View style={styles.capOptions}>
              {(Object.keys(GOAL_PRESETS) as GoalMetric[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    setGoalMetric(m);
                    setGoalTarget(GOAL_PRESETS[m][1]);
                  }}
                  style={[styles.capChip, goalMetric === m && styles.capChipOn]}
                >
                  <Text style={[styles.capChipText, goalMetric === m && styles.capChipTextOn]}>
                    {GOAL_METRIC_LABEL[m]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>Target</Text>
            <View style={styles.capOptions}>
              {GOAL_PRESETS[goalMetric].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setGoalTarget(n)}
                  style={[styles.capChip, goalTarget === n && styles.capChipOn]}
                >
                  <Text style={[styles.capChipText, goalTarget === n && styles.capChipTextOn]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={String(goalTarget)}
              onChangeText={(t) => setGoalTarget(Number(t.replace(/[^0-9]/g, '')) || 0)}
              keyboardType="number-pad"
              maxLength={5}
              style={styles.input}
            />
            <Text style={styles.fieldHint}>
              Everyone's contributions add up. Whoever crosses the line, the whole club gets credit.
            </Text>
          </View>

          <Button
            label="Set goal"
            full
            disabled={goalTarget < 1}
            onPress={async () => {
              await setGoal(goalMetric, goalTarget);
              resetSheets();
            }}
          />
        </View>
      </Sheet>

      {/* ── Capacity ──────────────────────────────────────────────────────── */}
      <Sheet
        visible={showCap}
        onClose={resetSheets}
        title="Member limit"
        subtitle={myClub ? `${myClub.members.length} members right now` : undefined}
      >
        <View style={{ gap: SPACING.md }}>
          <View style={styles.capOptions}>
            {MEMBER_CAP_OPTIONS.map((n) => {
              const tooSmall = !!myClub && n < myClub.members.length;
              return (
                <Pressable
                  key={n}
                  onPress={() => !tooSmall && setCap(n)}
                  disabled={tooSmall}
                  style={[styles.capChip, cap === n && styles.capChipOn, tooSmall && { opacity: 0.35 }]}
                >
                  <Text style={[styles.capChipText, cap === n && styles.capChipTextOn]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>Or set an exact number</Text>
            <TextInput
              value={String(cap)}
              onChangeText={(t) => setCap(Number(t.replace(/[^0-9]/g, '')) || 0)}
              keyboardType="number-pad"
              maxLength={3}
              style={styles.input}
            />
            <Text style={styles.fieldHint}>
              Between {MIN_MEMBER_CAP} and {MAX_MEMBER_CAP}. It cannot go below the number of
              people already in the club.
            </Text>
          </View>

          <Button
            label="Save limit"
            full
            onPress={async () => {
              await setMaxMembers(cap);
              resetSheets();
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

/* ── Pieces ───────────────────────────────────────────────────────────────── */

function ClubRankRow({
  rank,
  club,
  isMine,
  formatDistance,
  unit,
}: {
  rank: number;
  club: Club;
  isMine: boolean;
  formatDistance: (m: number) => string;
  unit: string;
}) {
  return (
    <View style={[styles.rankRow, isMine && styles.rowHighlight]}>
      <RankBadge rank={rank} />
      <View style={{ flex: 1 }}>
        <View style={styles.rankNameRow}>
          <Text style={styles.rankName} numberOfLines={1}>
            {club.name}
          </Text>
          {isMine ? <Pill label="You" tone="primary" size="sm" /> : null}
        </View>
        <Text style={styles.rankMeta}>
          {club.members.length} member{club.members.length === 1 ? '' : 's'} · {club.totalTrees} trees ·{' '}
          {formatDistance(club.totalMiles)} {unit}
        </Text>
      </View>
      <Text style={styles.rankPoints}>{club.totalPoints.toLocaleString()}</Text>
    </View>
  );
}

/** Goal progress can be fractional for miles but never for counts. */
function formatGoalValue(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(1)));
}

function RankBadge({ rank }: { rank: number }) {
  const top = rank <= 3;
  const bg =
    rank === 1
      ? COLORS.accent
      : rank === 2
      ? COLORS.medalSilver
      : rank === 3
      ? COLORS.medalBronze
      : COLORS.surfaceSunken;
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

  worldRank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  worldRankText: { ...TYPOGRAPHY.smallMed, color: COLORS.primaryGlow },

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

  goalHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  goalIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconMet: { backgroundColor: COLORS.primary },
  goalTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: 1 },
  goalProgress: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 6 },
  goalActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md - 2 },
  goalEmpty: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  goalEmptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.textSecondary },
  goalEmptyText: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },

  capRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  capValue: { ...TYPOGRAPHY.h4, color: COLORS.text, marginTop: 2 },
  capHint: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 6 },
  capOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  capChip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSunken,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  capChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  capChipText: { ...TYPOGRAPHY.smallMed, color: COLORS.textSecondary },
  capChipTextOn: { color: '#fff' },

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
  rowHighlight: { backgroundColor: COLORS.primarySurface },
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

  rankHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  rankCount: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    padding: SPACING.md - 3,
  },
  rankNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankName: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, flexShrink: 1 },
  rankMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  rankPoints: { ...TYPOGRAPHY.h4, color: COLORS.primary },
  yourPositionLabel: {
    ...TYPOGRAPHY.overline,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  gapHint: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: SPACING.sm },

  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: { ...TYPOGRAPHY.smallMed, color: COLORS.textSecondary, fontSize: 12 },

  settingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.sm + 2 },
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
    maxWidth: 320,
  },
  ctaButtons: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg, alignSelf: 'stretch' },

  explainTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: SPACING.sm + 2 },
  explainBody: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
  rule: { flexDirection: 'row', gap: SPACING.sm + 2, marginBottom: SPACING.sm },
  ruleText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, flex: 1 },

  fieldLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  fieldHint: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
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
