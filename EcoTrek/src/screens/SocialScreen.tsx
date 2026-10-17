import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import Header from '../components/Header';
import { Screen, Card, Button, EmptyState } from '../components/ui';
import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { AUSTIN_TRAILS, type Trail } from '../constants/austinTrails';
import { useApp } from '../context/AppContext';
import { useActivity } from '../context/ActivityContext';
import { useLogbook } from '../context/LogbookContext';
import { useProfile } from '../context/ProfileContext';
import { useSocial } from '../context/SocialContext';
import { useTreeGrowth } from '../context/TreeGrowthContext';
import { useTheme, Typography } from '../context/ThemeContext';
import { shareText } from '../services/share';
import { shareCalendarEvent } from '../services/calendar';
import { cancelHikeReminder, scheduleHikeReminder } from '../services/notifications';
import {
  cleanText,
  cleanupPiecesInWindow,
  encodeChallengeResult,
  encodeFriendChallenge,
  encodeHikePlan,
  encodeRsvp,
  encodeSapling,
  makeId,
  milesInWindow,
  FRIEND_CHALLENGE_POINTS,
  type ChallengeMetric,
  type FriendChallenge,
  type HikePlan,
} from '../services/social';

function shareLinkFor(param: string, code: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/social?${param}=${encodeURIComponent(code)}`;
  }
  return `ecotrek://social?${param}=${encodeURIComponent(code)}`;
}

function fmtWhen(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function SocialScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { trails } = useApp();
  const { history } = useActivity();
  const { cleanups } = useLogbook();
  const { profile } = useProfile();
  const social = useSocial();
  const tree = useTreeGrowth();

  const hostName = cleanText(profile.firstName || 'Me', 40) || 'Me';
  const trailOptions: Trail[] = useMemo(() => trails.slice(0, 12), [trails]);

  // ---- plan a hike form ----
  // Keep the chosen trail OBJECT, not just an id: when live trails replace
  // the bundled list mid-session, an id-only selection silently pointed at a
  // different trail. The object the user tapped is the one we plan.
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  useEffect(() => {
    setSelectedTrail((prev) => {
      if (prev && trailOptions.some((t) => t.id === prev.id)) return prev;
      return trailOptions[0] ?? prev;
    });
  }, [trailOptions]);

  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  // ---- challenge form ----
  const [metric, setMetric] = useState<ChallengeMetric>('miles');
  const [targetMiles, setTargetMiles] = useState(5);
  const [targetPieces, setTargetPieces] = useState(25);
  const [challengeDays, setChallengeDays] = useState(7);
  // ---- import ----
  const [importText, setImportText] = useState('');
  const [feedback, setFeedback] = useState('');
  const importedRef = useRef<string>('');

  // Arriving from a trail's "Plan a hike here" button preselects that trail.
  useEffect(() => {
    const wanted = typeof route.params?.trailId === 'string' ? route.params.trailId : '';
    if (!wanted) return;
    const match = [...trails, ...AUSTIN_TRAILS].find((t) => t.id === wanted);
    if (match) setSelectedTrail(match);
    navigation.setParams({ trailId: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.trailId]);

  const tryImport = (text: string): boolean => {
    const plan = social.importPlanCode(text);
    if (plan) {
      setFeedback(`You're invited: ${plan.trailName}, ${fmtWhen(plan.startsAt)}. Tap I'm in below, then send your RSVP back!`);
      return true;
    }
    const challenge = social.importChallengeCode(text);
    if (challenge) {
      setFeedback(`${challenge.fromName} challenged you: ${challenge.title}. Accept it below!`);
      return true;
    }
    const resultName = social.applyResultCode(text);
    if (resultName) {
      setFeedback(`🎉 ${resultName} sent their result — check your challenge below!`);
      return true;
    }
    const rsvpName = social.applyRsvpCode(text);
    if (rsvpName) {
      setFeedback(`${rsvpName}'s RSVP is saved on your hike plan below.`);
      return true;
    }
    const sapling = social.importSaplingCode(text);
    if (sapling) {
      setFeedback(`🌱 ${sapling.fromName} passed you a sapling! Plant it below.`);
      return true;
    }
    return false;
  };

  // Deep-link / shared-link import: /social?plan=…&challenge=…&result=… etc.
  useEffect(() => {
    const keys = ['plan', 'challenge', 'result', 'rsvp', 'sapling'] as const;
    for (const key of keys) {
      const value = typeof route.params?.[key] === 'string' ? route.params[key] : '';
      if (value && importedRef.current !== `${key}:${value}`) {
        importedRef.current = `${key}:${value}`;
        tryImport(value);
        navigation.setParams({ [key]: undefined });
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.plan, route.params?.challenge, route.params?.result, route.params?.rsvp, route.params?.sapling]);

  const createPlan = async () => {
    const trail = selectedTrail;
    if (!trail) { setFeedback('Find nearby trails first, then choose one to plan with friends.'); return; }
    const startsAt = new Date(`${date}T${time}:00`).getTime();
    if (!Number.isFinite(startsAt) || startsAt < Date.now() - 3600000) {
      setFeedback('Pick a day and time in the future for your hike.');
      return;
    }
    const base = {
      id: makeId('plan', Date.now()),
      trailId: trail.id,
      trailName: trail.name,
      area: trail.area,
      startsAt,
      durationMin: 120,
      notes: cleanText(notes, 140),
      hostName,
      createdAt: Date.now(),
    };
    const plan: HikePlan = { ...base, mine: true, rsvp: 'in', guests: [] };
    social.addPlan(plan);
    scheduleHikeReminder(plan.id, plan.trailName, plan.startsAt).catch(() => {});
    const code = encodeHikePlan(base);
    setFeedback('Hike planned! Share the invite so friends can join.');
    await shareText(
      `🥾 Hike invite! ${hostName} planned ${trail.name} (${trail.area}) on ${fmtWhen(startsAt)}.${base.notes ? ` ${base.notes}` : ''}\nOpen it in EcoTrek: ${shareLinkFor('plan', code)}\nOr paste this code in EcoTrek → Friends & plans: ${code}`,
      'EcoTrek hike invite'
    );
  };

  const sharePlan = (plan: HikePlan) => {
    const code = encodeHikePlan(plan);
    shareText(
      `🥾 Hike invite! ${plan.hostName} planned ${plan.trailName} (${plan.area}) on ${fmtWhen(plan.startsAt)}.${plan.notes ? ` ${plan.notes}` : ''}\nOpen it in EcoTrek: ${shareLinkFor('plan', code)}\nOr paste this code in EcoTrek → Friends & plans: ${code}`,
      'EcoTrek hike invite'
    );
  };

  const shareRsvp = (plan: HikePlan) => {
    if (!plan.rsvp) return;
    const code = encodeRsvp({ planId: plan.id, name: hostName, status: plan.rsvp });
    shareText(
      `${plan.rsvp === 'in' ? '✅ I\'m in' : '❌ I can\'t make it'} for ${plan.trailName} on ${fmtWhen(plan.startsAt)} — ${hostName}\nSave my reply in EcoTrek: ${shareLinkFor('rsvp', code)}\nOr paste this code in EcoTrek → Friends & plans: ${code}`,
      'EcoTrek RSVP'
    );
  };

  const createChallenge = async () => {
    const now = Date.now();
    const isCleanup = metric === 'cleanup';
    const target = isCleanup ? targetPieces : targetMiles;
    const base = {
      id: makeId('challenge', now),
      title: isCleanup
        ? `Pick up ${target} pieces of litter in ${challengeDays} days`
        : `Walk ${target} miles in ${challengeDays} days`,
      metric,
      targetMiles: target,
      deadline: now + challengeDays * 86400000,
      fromName: hostName,
      createdAt: now,
    };
    const challenge: FriendChallenge = { ...base, mine: true, acceptedAt: now, completedAt: null, friendResult: null };
    social.addChallenge(challenge);
    const code = encodeFriendChallenge(base);
    setFeedback('Challenge created — send it to a friend!');
    await shareText(
      `${isCleanup ? '🧹' : '🌲'} ${hostName} challenged you on EcoTrek: ${base.title} (by ${fmtWhen(base.deadline)}). Finish it and send your result back!\nOpen it in EcoTrek: ${shareLinkFor('challenge', code)}\nOr paste this code in EcoTrek → Friends & plans: ${code}`,
      'EcoTrek challenge'
    );
  };

  const shareChallenge = (c: FriendChallenge) => {
    const code = encodeFriendChallenge(c);
    shareText(
      `${c.metric === 'cleanup' ? '🧹' : '🌲'} ${c.fromName} challenged you on EcoTrek: ${c.title} (by ${fmtWhen(c.deadline)}).\nOpen it in EcoTrek: ${shareLinkFor('challenge', code)}\nOr paste this code in EcoTrek → Friends & plans: ${code}`,
      'EcoTrek challenge'
    );
  };

  const shareResult = (c: FriendChallenge, amount: number, completed: boolean) => {
    const code = encodeChallengeResult({ challengeId: c.id, name: hostName, amount, completed, at: Date.now() });
    shareText(
      `${completed ? '🎉 I finished' : 'Here\'s my progress on'} your EcoTrek challenge "${c.title}": ${amount} ${c.metric === 'cleanup' ? 'pieces picked up' : 'miles'} — ${hostName}\nSee it in EcoTrek: ${shareLinkFor('result', code)}\nOr paste this code in EcoTrek → Friends & plans: ${code}`,
      'EcoTrek challenge result'
    );
  };

  const shareSapling = async () => {
    const gift = {
      id: makeId('sapling', Date.now()),
      fromName: hostName,
      stageName: tree.stage.name,
      imageIndex: tree.imageIndex,
      createdAt: Date.now(),
    };
    const code = encodeSapling(gift);
    setFeedback('Sapling ready — send it to a friend!');
    await shareText(
      `🌱 ${hostName} is passing you a sapling from their EcoTrek tree, now at ${gift.stageName}! Plant it and it’ll give your own tree a head start.\nOpen it in EcoTrek: ${shareLinkFor('sapling', code)}\nOr paste this code in EcoTrek → Friends & plans: ${code}`,
      'EcoTrek sapling'
    );
  };

  const doImport = () => {
    const text = importText.trim();
    if (!text) return;
    if (tryImport(text)) setImportText('');
    else setFeedback('That code does not look right — check it and try again.');
  };

  const challengeProgress = (c: FriendChallenge): number => {
    const from = c.acceptedAt ?? c.createdAt;
    // The window ENDS at the deadline — miles after it never counted, and
    // the previous version kept counting past it.
    const to = c.deadline;
    return c.metric === 'cleanup'
      ? cleanupPiecesInWindow(cleanups, from, to)
      : milesInWindow(history, from, to);
  };

  return (
    <Screen>
      <Header title="Friends & plans" subtitle="No account or server needed — links do the work" back />
      <View style={styles.body}>
        {feedback ? <Text style={styles.feedback} accessibilityLiveRegion="polite">{feedback}</Text> : null}

        {/* -------- Plan a hike -------- */}
        <Card style={{ gap: SPACING.sm }}>
          <Text style={styles.cardTitle}>🥾 Plan a hike</Text>
          <Text style={styles.label}>Trail</Text>
          {trailOptions.length === 0 ? (
            <Text style={styles.hint}>Find trails near you before planning a hike with friends.</Text>
          ) : null}
          <View style={styles.chips}>
            {trailOptions.map((t) => (
              <Pressable key={t.id} onPress={() => setSelectedTrail(t)} style={[styles.chip, selectedTrail?.id === t.id && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: selectedTrail?.id === t.id }}>
                <Text style={[styles.chipText, selectedTrail?.id === t.id && styles.chipTextActive]} numberOfLines={1}>{t.name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Day (YYYY-MM-DD)</Text>
              <TextInput value={date} onChangeText={setDate} style={styles.input} accessibilityLabel="Hike day, year month day" autoCapitalize="none" />
            </View>
            <View style={{ width: 110 }}>
              <Text style={styles.label}>Time (HH:MM)</Text>
              <TextInput value={time} onChangeText={setTime} style={styles.input} accessibilityLabel="Hike time, hours minutes" autoCapitalize="none" />
            </View>
          </View>
          <TextInput value={notes} onChangeText={(v) => setNotes(v.slice(0, 140))} placeholder="Anything friends should know? (optional)" placeholderTextColor={colors.textLight} style={styles.input} accessibilityLabel="Notes for friends" />
          <Button label="Create hike & share invite" icon="share" full onPress={createPlan} />
        </Card>

        {/* -------- My plans -------- */}
        <Text style={styles.sectionTitle}>My hike plans</Text>
        {social.plans.length === 0 ? (
          <EmptyState icon="calendar" title="No hikes planned yet" message="Plan one above, or paste a friend's invite code below." />
        ) : social.plans.map((plan) => (
          <Card key={plan.id} style={{ gap: SPACING.sm }}>
            <View style={styles.rowBetween}>
              <Text style={styles.planName} numberOfLines={2}>{plan.trailName}</Text>
              <Text style={styles.planWhen}>{fmtWhen(plan.startsAt)}</Text>
            </View>
            <Text style={styles.hint}>{plan.area} · planned by {plan.mine ? 'you' : plan.hostName}{plan.notes ? ` · ${plan.notes}` : ''}</Text>
            {(plan.guests ?? []).length > 0 ? (
              <Text style={styles.hint}>
                Replies: {(plan.guests ?? []).map((g) => `${g.status === 'in' ? '✅' : '❌'} ${g.name}`).join(' · ')}
              </Text>
            ) : null}
            <View style={styles.chips}>
              <Pressable onPress={() => { social.setRsvp(plan.id, 'in'); scheduleHikeReminder(plan.id, plan.trailName, plan.startsAt).catch(() => {}); }} style={[styles.chip, plan.rsvp === 'in' && styles.chipActive]} accessibilityRole="button" accessibilityLabel={`I'm in for ${plan.trailName}`}>
                <Text style={[styles.chipText, plan.rsvp === 'in' && styles.chipTextActive]}>✅ I'm in</Text>
              </Pressable>
              <Pressable onPress={() => social.setRsvp(plan.id, 'out')} style={[styles.chip, plan.rsvp === 'out' && styles.chipOut]} accessibilityRole="button" accessibilityLabel={`I'm out for ${plan.trailName}`}>
                <Text style={[styles.chipText, plan.rsvp === 'out' && styles.chipTextActive]}>❌ I'm out</Text>
              </Pressable>
            </View>
            <View style={styles.rowButtons}>
              <Button label="Add to calendar" icon="calendar" size="sm" variant="secondary" onPress={() => shareCalendarEvent(plan)} />
              <Button label="Share invite" icon="share" size="sm" variant="secondary" onPress={() => sharePlan(plan)} />
              {!plan.mine && plan.rsvp ? (
                <Button label="Send RSVP to host" icon="check" size="sm" variant="secondary" onPress={() => shareRsvp(plan)} />
              ) : null}
              <Button label="Delete" size="sm" variant="ghost" onPress={() => { cancelHikeReminder(plan.id).catch(() => {}); social.deletePlan(plan.id); }} />
            </View>
          </Card>
        ))}

        {/* -------- Challenge a friend -------- */}
        <Card style={{ gap: SPACING.sm }}>
          <Text style={styles.cardTitle}>🌲 Challenge a friend</Text>
          <Text style={styles.label}>Challenge type</Text>
          <View style={styles.chips}>
            <Pressable onPress={() => setMetric('miles')} style={[styles.chip, metric === 'miles' && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: metric === 'miles' }}>
              <Text style={[styles.chipText, metric === 'miles' && styles.chipTextActive]}>🥾 Walk miles</Text>
            </Pressable>
            <Pressable onPress={() => setMetric('cleanup')} style={[styles.chip, metric === 'cleanup' && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: metric === 'cleanup' }}>
              <Text style={[styles.chipText, metric === 'cleanup' && styles.chipTextActive]}>🧹 Trail cleanup</Text>
            </Pressable>
          </View>
          {metric === 'miles' ? (
            <>
              <Text style={styles.label}>Distance</Text>
              <View style={styles.chips}>
                {[3, 5, 10, 20].map((m) => (
                  <Pressable key={m} onPress={() => setTargetMiles(m)} style={[styles.chip, targetMiles === m && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: targetMiles === m }}>
                    <Text style={[styles.chipText, targetMiles === m && styles.chipTextActive]}>{m} miles</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.label}>Litter to pick up</Text>
              <View style={styles.chips}>
                {[10, 25, 50, 100].map((n) => (
                  <Pressable key={n} onPress={() => setTargetPieces(n)} style={[styles.chip, targetPieces === n && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: targetPieces === n }}>
                    <Text style={[styles.chipText, targetPieces === n && styles.chipTextActive]}>{n} pieces</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.hint}>Counted from cleanups logged in EcoTrek (the app asks after walks, or log one from a trail). Pieces after the deadline don't count.</Text>
            </>
          )}
          <Text style={styles.label}>Time limit</Text>
          <View style={styles.chips}>
            {[3, 7, 14].map((d) => (
              <Pressable key={d} onPress={() => setChallengeDays(d)} style={[styles.chip, challengeDays === d && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: challengeDays === d }}>
                <Text style={[styles.chipText, challengeDays === d && styles.chipTextActive]}>{d} days</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Create challenge & share" icon="target" full onPress={createChallenge} />
          <Text style={styles.hint}>Your friend opens the link, accepts, and their own EcoTrek {metric === 'cleanup' ? 'cleanups' : 'miles'} count. When they finish they send a result code back so you can see they did it. Finishing earns {FRIEND_CHALLENGE_POINTS} EcoPoints — codes can't fake progress or points.</Text>
        </Card>

        {/* -------- Challenges list -------- */}
        <Text style={styles.sectionTitle}>Challenges</Text>
        {social.challenges.length === 0 ? (
          <EmptyState icon="target" title="No challenges yet" message="Create one above, or paste a friend's challenge code below." />
        ) : social.challenges.map((c) => {
          const amount = challengeProgress(c);
          const expired = Date.now() > c.deadline && !c.completedAt;
          const done = c.completedAt != null || amount >= c.targetMiles;
          const pct = Math.min(100, Math.round((amount / c.targetMiles) * 100));
          const unit = c.metric === 'cleanup' ? 'pieces' : 'mi';
          return (
            <Card key={c.id} style={{ gap: SPACING.sm }}>
              <View style={styles.rowBetween}>
                <Text style={styles.planName} numberOfLines={2}>{c.metric === 'cleanup' ? '🧹 ' : ''}{c.title}</Text>
                <Text style={styles.planWhen}>{c.mine ? 'Sent by you' : `From ${c.fromName}`}</Text>
              </View>
              <Text style={styles.hint}>
                {amount} / {c.targetMiles} {unit} · by {fmtWhen(c.deadline)}
                {c.completedAt ? ' · Completed 🎉' : expired ? ' · Time is up' : ''}
              </Text>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
              {c.friendResult ? (
                <Text style={styles.feedback}>
                  {c.friendResult.completed ? '🎉' : '📩'} {c.friendResult.name}: {c.friendResult.amount} {unit}{c.friendResult.completed ? ' — finished it!' : ' so far'}
                </Text>
              ) : null}
              <View style={styles.rowButtons}>
                {!c.acceptedAt && !c.mine ? (
                  <Button label="Accept challenge" icon="check" size="sm" onPress={() => social.acceptChallenge(c.id)} />
                ) : null}
                {done && !c.completedAt && !expired ? (
                  <Button label={`Finish & claim ${FRIEND_CHALLENGE_POINTS} pts`} icon="gift" size="sm" onPress={async () => { if (await social.completeChallenge(c.id)) setFeedback(`Challenge complete! +${FRIEND_CHALLENGE_POINTS} EcoPoints. Now share your result!`); }} />
                ) : null}
                {!c.mine && c.acceptedAt ? (
                  <Button label="Share result with challenger" icon="share" size="sm" variant="secondary" onPress={() => shareResult(c, amount, done)} />
                ) : null}
                {c.mine ? (
                  <Button label="Share / re-send" icon="share" size="sm" variant="secondary" onPress={() => shareChallenge(c)} />
                ) : null}
                <Button label="Delete" size="sm" variant="ghost" onPress={() => social.deleteChallenge(c.id)} />
              </View>
            </Card>
          );
        })}

        {/* -------- Pass the sapling -------- */}
        <Card style={{ gap: SPACING.sm }}>
          <Text style={styles.cardTitle}>🌱 Pass the sapling</Text>
          <Text style={styles.hint}>
            Send a friend a sapling from your tree at {tree.stage.name}.
            When they plant it, their own tree gets a 4-week head start — and yours keeps growing untouched.
          </Text>
          <Button label="Share a sapling" icon="share" full variant="secondary" onPress={shareSapling} />
          {social.saplings.map((s) => (
            <View key={s.id} style={styles.rowBetween}>
              <Text style={styles.hint}>🌱 From {s.fromName} · {s.stageName}{s.planted ? ' · Planted 🎉' : ''}</Text>
              {!s.planted ? (
                <Button
                  label="Plant it"
                  size="sm"
                  onPress={async () => {
                    await tree.developerAdvanceTree(4);
                    social.markSaplingPlanted(s.id);
                    setFeedback(`🌱 Planted ${s.fromName}'s sapling — your tree got a 4-week head start!`);
                  }}
                />
              ) : null}
            </View>
          ))}
        </Card>

        {/* -------- Import -------- */}
        <Card style={{ gap: SPACING.sm }}>
          <Text style={styles.cardTitle}>📥 Got a code from a friend?</Text>
          <TextInput value={importText} onChangeText={setImportText} placeholder="Paste a hike, challenge, result, RSVP or sapling code / link" placeholderTextColor={colors.textLight} style={styles.input} accessibilityLabel="Paste a hike or challenge code" autoCapitalize="none" multiline />
          <Button label="Add it" icon="plus" full variant="secondary" onPress={doImport} />
        </Card>
      </View>
    </Screen>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.lg },
    feedback: { ...t.smallMed, color: c.primary },
    cardTitle: { ...t.h3, color: c.text },
    sectionTitle: { ...t.h3, color: c.text, marginTop: SPACING.xs },
    label: { ...t.overline, color: c.textMuted },
    hint: { ...t.small, color: c.textMuted },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.pill, backgroundColor: c.surfaceSunken, maxWidth: '100%' },
    chipActive: { backgroundColor: c.primary },
    chipOut: { backgroundColor: c.danger },
    chipText: { ...t.smallMed, color: c.textSecondary },
    chipTextActive: { color: '#fff' },
    rowInputs: { flexDirection: 'row', gap: SPACING.sm },
    input: { backgroundColor: c.surfaceSunken, borderRadius: RADIUS.md, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 11, ...t.body, color: c.text },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, alignItems: 'flex-start' },
    planName: { ...t.h4, color: c.text, flex: 1 },
    planWhen: { ...t.smallMed, color: c.primary },
    rowButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: c.surfaceSunken, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: c.primary, borderRadius: 4 },
  });
}
