import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import Header from '../components/Header';
import { Screen, Card, Button, EmptyState } from '../components/ui';
import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { AUSTIN_TRAILS, type Trail } from '../constants/austinTrails';
import { useApp } from '../context/AppContext';
import { useActivity } from '../context/ActivityContext';
import { useProfile } from '../context/ProfileContext';
import { useSocial } from '../context/SocialContext';
import { useTheme, Typography } from '../context/ThemeContext';
import { shareText } from '../services/share';
import { shareCalendarEvent } from '../services/calendar';
import { cancelHikeReminder, scheduleHikeReminder } from '../services/notifications';
import {
  cleanText,
  encodeFriendChallenge,
  encodeHikePlan,
  makeId,
  milesInWindow,
  FRIEND_CHALLENGE_POINTS,
  type FriendChallenge,
  type HikePlan,
} from '../services/social';

function shareLinkFor(param: 'plan' | 'challenge', code: string): string {
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
  const { profile } = useProfile();
  const social = useSocial();

  const hostName = cleanText(profile.firstName || 'Me', 40) || 'Me';
  const trailOptions: Trail[] = (trails.length ? trails : AUSTIN_TRAILS).slice(0, 12);

  // ---- plan a hike form ----
  const [trailId, setTrailId] = useState<string>('');
  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  // ---- challenge form ----
  const [targetMiles, setTargetMiles] = useState(5);
  const [challengeDays, setChallengeDays] = useState(7);
  // ---- import ----
  const [importText, setImportText] = useState('');
  const [feedback, setFeedback] = useState('');
  const importedRef = useRef<string>('');

  useEffect(() => {
    if (!trailId && trailOptions.length) setTrailId(trailOptions[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailOptions.length]);

  // Arriving from a trail's "Plan a hike here" button preselects that trail.
  useEffect(() => {
    const wanted = typeof route.params?.trailId === 'string' ? route.params.trailId : '';
    if (wanted && trailOptions.some((t) => t.id === wanted)) {
      setTrailId(wanted);
      navigation.setParams({ trailId: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.trailId, trailOptions.length]);

  // Deep-link / shared-link import: /social?plan=… or ?challenge=…
  useEffect(() => {
    const planCode = typeof route.params?.plan === 'string' ? route.params.plan : '';
    const challengeCode = typeof route.params?.challenge === 'string' ? route.params.challenge : '';
    const key = planCode || challengeCode;
    if (!key || importedRef.current === key) return;
    importedRef.current = key;
    if (planCode) {
      const plan = social.importPlanCode(planCode);
      setFeedback(plan ? `You're invited: ${plan.trailName}, ${fmtWhen(plan.startsAt)}. Tap I'm in below!` : 'That hike link looks invalid or expired.');
    } else {
      const c = social.importChallengeCode(challengeCode);
      setFeedback(c ? `${c.fromName} challenged you: ${c.title}. Accept it below!` : 'That challenge link looks invalid or expired.');
    }
    navigation.setParams({ plan: undefined, challenge: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.plan, route.params?.challenge]);

  const createPlan = async () => {
    const trail = trailOptions.find((t) => t.id === trailId) ?? trailOptions[0];
    if (!trail) return;
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
    const plan: HikePlan = { ...base, mine: true, rsvp: 'in' };
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

  const createChallenge = async () => {
    const now = Date.now();
    const base = {
      id: makeId('challenge', now),
      title: `Walk ${targetMiles} miles in ${challengeDays} days`,
      targetMiles,
      deadline: now + challengeDays * 86400000,
      fromName: hostName,
      createdAt: now,
    };
    const challenge: FriendChallenge = { ...base, mine: true, acceptedAt: now, completedAt: null };
    social.addChallenge(challenge);
    const code = encodeFriendChallenge(base);
    setFeedback('Challenge created — send it to a friend!');
    await shareText(
      `🌲 ${hostName} challenged you on EcoTrek: ${base.title} (by ${fmtWhen(base.deadline)}). Winner earns ${FRIEND_CHALLENGE_POINTS} EcoPoints.\nOpen it in EcoTrek: ${shareLinkFor('challenge', code)}\nOr paste this code in EcoTrek → Friends & plans: ${code}`,
      'EcoTrek challenge'
    );
  };

  const shareChallenge = (c: FriendChallenge) => {
    const code = encodeFriendChallenge(c);
    shareText(
      `🌲 ${c.fromName} challenged you on EcoTrek: ${c.title} (by ${fmtWhen(c.deadline)}).\nOpen it in EcoTrek: ${shareLinkFor('challenge', code)}\nOr paste this code in EcoTrek → Friends & plans: ${code}`,
      'EcoTrek challenge'
    );
  };

  const doImport = () => {
    const text = importText.trim();
    if (!text) return;
    const asPlan = social.importPlanCode(text);
    if (asPlan) {
      setFeedback(`Hike added: ${asPlan.trailName}, ${fmtWhen(asPlan.startsAt)}. Tap I'm in!`);
      setImportText('');
      return;
    }
    const asChallenge = social.importChallengeCode(text);
    if (asChallenge) {
      setFeedback(`Challenge added from ${asChallenge.fromName}: ${asChallenge.title}. Accept it below!`);
      setImportText('');
      return;
    }
    setFeedback('That code does not look right — check it and try again.');
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
          <View style={styles.chips}>
            {trailOptions.map((t) => (
              <Pressable key={t.id} onPress={() => setTrailId(t.id)} style={[styles.chip, trailId === t.id && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: trailId === t.id }}>
                <Text style={[styles.chipText, trailId === t.id && styles.chipTextActive]} numberOfLines={1}>{t.name}</Text>
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
            <View style={styles.chips}>
              <Pressable onPress={() => social.setRsvp(plan.id, 'in')} style={[styles.chip, plan.rsvp === 'in' && styles.chipActive]} accessibilityRole="button" accessibilityLabel={`I'm in for ${plan.trailName}`}>
                <Text style={[styles.chipText, plan.rsvp === 'in' && styles.chipTextActive]}>✅ I'm in</Text>
              </Pressable>
              <Pressable onPress={() => social.setRsvp(plan.id, 'out')} style={[styles.chip, plan.rsvp === 'out' && styles.chipOut]} accessibilityRole="button" accessibilityLabel={`I'm out for ${plan.trailName}`}>
                <Text style={[styles.chipText, plan.rsvp === 'out' && styles.chipTextActive]}>❌ I'm out</Text>
              </Pressable>
            </View>
            <View style={styles.rowButtons}>
              <Button label="Add to calendar" icon="calendar" size="sm" variant="secondary" onPress={() => shareCalendarEvent(plan)} />
              <Button label="Share invite" icon="share" size="sm" variant="secondary" onPress={() => sharePlan(plan)} />
              <Button label="Directions" icon="navigation" size="sm" variant="secondary" onPress={() => navigation.navigate('Trails')} />
              <Button label="Delete" size="sm" variant="ghost" onPress={() => { cancelHikeReminder(plan.id).catch(() => {}); social.deletePlan(plan.id); }} />
            </View>
          </Card>
        ))}

        {/* -------- Challenge a friend -------- */}
        <Card style={{ gap: SPACING.sm }}>
          <Text style={styles.cardTitle}>🌲 Challenge a friend</Text>
          <Text style={styles.label}>Distance</Text>
          <View style={styles.chips}>
            {[3, 5, 10, 20].map((m) => (
              <Pressable key={m} onPress={() => setTargetMiles(m)} style={[styles.chip, targetMiles === m && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: targetMiles === m }}>
                <Text style={[styles.chipText, targetMiles === m && styles.chipTextActive]}>{m} miles</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Time limit</Text>
          <View style={styles.chips}>
            {[3, 7, 14].map((d) => (
              <Pressable key={d} onPress={() => setChallengeDays(d)} style={[styles.chip, challengeDays === d && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: challengeDays === d }}>
                <Text style={[styles.chipText, challengeDays === d && styles.chipTextActive]}>{d} days</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Create challenge & share" icon="target" full onPress={createChallenge} />
          <Text style={styles.hint}>Your friend opens the link, accepts, and their own EcoTrek miles count. Finishing earns {FRIEND_CHALLENGE_POINTS} EcoPoints — codes can't fake miles or points.</Text>
        </Card>

        {/* -------- Challenges list -------- */}
        <Text style={styles.sectionTitle}>Challenges</Text>
        {social.challenges.length === 0 ? (
          <EmptyState icon="target" title="No challenges yet" message="Create one above, or paste a friend's challenge code below." />
        ) : social.challenges.map((c) => {
          const from = c.acceptedAt ?? c.createdAt;
          const miles = milesInWindow(history, from, Math.max(c.deadline, from));
          const done = c.completedAt != null || miles >= c.targetMiles;
          const pct = Math.min(100, Math.round((miles / c.targetMiles) * 100));
          return (
            <Card key={c.id} style={{ gap: SPACING.sm }}>
              <View style={styles.rowBetween}>
                <Text style={styles.planName} numberOfLines={2}>{c.title}</Text>
                <Text style={styles.planWhen}>{c.mine ? 'Sent by you' : `From ${c.fromName}`}</Text>
              </View>
              <Text style={styles.hint}>{miles} / {c.targetMiles} mi · by {fmtWhen(c.deadline)}{c.completedAt ? ' · Completed 🎉' : ''}</Text>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
              <View style={styles.rowButtons}>
                {!c.acceptedAt && !c.mine ? (
                  <Button label="Accept challenge" icon="check" size="sm" onPress={() => social.acceptChallenge(c.id)} />
                ) : null}
                {done && !c.completedAt ? (
                  <Button label={`Finish & claim ${FRIEND_CHALLENGE_POINTS} pts`} icon="gift" size="sm" onPress={async () => { if (await social.completeChallenge(c.id)) setFeedback(`Challenge complete! +${FRIEND_CHALLENGE_POINTS} EcoPoints.`); }} />
                ) : null}
                {!c.mine || true ? (
                  <Button label="Share / re-send" icon="share" size="sm" variant="secondary" onPress={() => shareChallenge(c)} />
                ) : null}
                <Button label="Delete" size="sm" variant="ghost" onPress={() => social.deleteChallenge(c.id)} />
              </View>
            </Card>
          );
        })}

        {/* -------- Import -------- */}
        <Card style={{ gap: SPACING.sm }}>
          <Text style={styles.cardTitle}>📥 Got a code from a friend?</Text>
          <TextInput value={importText} onChangeText={setImportText} placeholder="Paste a hike or challenge code / link" placeholderTextColor={colors.textLight} style={styles.input} accessibilityLabel="Paste a hike or challenge code" autoCapitalize="none" multiline />
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
