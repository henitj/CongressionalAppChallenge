import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import { Card, Pill } from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Trail } from '../constants/austinTrails';
import { useApp } from '../context/AppContext';
import { useWeather } from '../context/WeatherContext';
import { useActivity } from '../context/ActivityContext';
import {
  answerQuestion,
  AssistantContext,
  STARTER_QUESTIONS,
} from '../services/assistant';
import { api, isBackendConfigured, ROUTES } from '../services/api';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  trails?: Trail[];
  /** True while an AI upgrade of this answer is still in flight. */
  upgrading?: boolean;
};

export default function AssistantScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { trails, coords } = useApp();
  const { report } = useWeather();
  const { history } = useActivity();

  const initialTrail: Trail | null = route.params?.trail ?? null;

  const [messages, setMessages] = useState<Message[]>(() =>
    initialTrail
      ? [
          {
            id: 'seed',
            role: 'assistant',
            text: `Ask me anything about the ${initialTrail.name}, or about any other trail in the app.`,
          },
        ]
      : []
  );
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  // The trail the conversation is currently about. This is what makes
  // "is it dog friendly?" work without repeating the trail name.
  const focusRef = useRef<Trail | null>(initialTrail);
  const scrollRef = useRef<ScrollView>(null);

  const completedTrailIds = useMemo(
    () => new Set(history.filter((a) => a.trailCompleted && a.trailId).map((a) => a.trailId!)),
    [history]
  );

  const buildContext = useCallback(
    (): AssistantContext => ({
      trails,
      weather: report,
      completedTrailIds,
      userCoords: coords,
      focus: focusRef.current,
    }),
    [trails, report, completedTrailIds, coords]
  );

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || thinking) return;

      const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: question };
      setInput('');
      setThinking(true);

      // Answer locally first — instant, offline, and never wrong about the data.
      const ctx = buildContext();
      const local = answerQuestion(question, ctx);
      if (local.trail) focusRef.current = local.trail;

      const answerId = `a-${Date.now()}`;
      const canUpgrade = isBackendConfigured();

      setMessages((m) => [
        ...m,
        userMsg,
        {
          id: answerId,
          role: 'assistant',
          text: local.text,
          trails: local.results,
          upgrading: canUpgrade,
        },
      ]);
      setThinking(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

      // If a backend with a model key is configured, ask it for a better
      // phrasing of the same grounded facts and swap the text in.
      if (canUpgrade) {
        const subject = local.trail ?? focusRef.current;
        const res = await api.post<{ text: string }>(ROUTES.assistant, {
          question,
          context: {
            trail: subject
              ? {
                  name: subject.name,
                  area: subject.area,
                  distanceMiles: subject.distanceMiles,
                  difficulty: subject.difficulty,
                  type: subject.type,
                  elevationGainFt: subject.elevationGainFt,
                  estimatedMinutes: subject.estimatedMinutes,
                  petFriendly: subject.petFriendly,
                  familyFriendly: subject.familyFriendly,
                  strollerFriendly: subject.strollerFriendly,
                  restroomsAvailable: subject.restroomsAvailable,
                  waterStations: subject.waterStations,
                  safetyTips: subject.safetyTips,
                  plants: subject.plants,
                  animals: subject.animals,
                  description: subject.description,
                }
              : null,
            allTrails: trails.map((t) => ({
              name: t.name,
              miles: t.distanceMiles,
              difficulty: t.difficulty,
              type: t.type,
              dogs: t.petFriendly,
              family: t.familyFriendly,
            })),
            weather: report
              ? {
                  tempF: report.tempF,
                  feelsLikeF: report.feelsLikeF,
                  condition: report.condition,
                  level: report.level,
                  headline: report.headline,
                  advisories: report.advisories.slice(0, 3).map((a) => a.title),
                }
              : null,
          },
        });

        setMessages((m) =>
          m.map((msg) =>
            msg.id === answerId
              ? { ...msg, text: res.ok && res.data?.text ? res.data.text : msg.text, upgrading: false }
              : msg
          )
        );
      }
    },
    [thinking, buildContext, trails, report]
  );

  const showStarters = messages.filter((m) => m.role === 'user').length === 0;

  return (
    <View style={styles.root}>
      <Header title="Trail assistant" subtitle="Ask about any Austin trail" back />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showStarters ? (
            <View style={styles.intro}>
              <View style={styles.introIcon}>
                <Icon name="help-circle" size={24} color={COLORS.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.introTitle}>What do you want to know?</Text>
              <Text style={styles.introText}>
                I know every trail in this app — distances, difficulty, dogs, water, restrooms,
                climbing, what grows there, and what the weather is doing right now.
              </Text>
              <Text style={styles.introHint}>
                Name a trail once and I will remember it, so you can just ask "is it shaded?" next.
              </Text>

              <View style={styles.starters}>
                {STARTER_QUESTIONS.map((q) => (
                  <Pressable key={q} onPress={() => send(q)} style={styles.starter}>
                    <Text style={styles.starterText}>{q}</Text>
                    <Icon name="arrow-right" size={13} color={COLORS.primary} strokeWidth={2.1} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {messages.map((m) =>
            m.role === 'user' ? (
              <View key={m.id} style={styles.userRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{m.text}</Text>
                </View>
              </View>
            ) : (
              <View key={m.id} style={styles.assistantRow}>
                <View style={styles.assistantAvatar}>
                  <Icon name="leaf" size={14} color={COLORS.primary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, gap: SPACING.sm }}>
                  <View style={styles.assistantBubble}>
                    <Text style={styles.assistantText}>{m.text}</Text>
                    {m.upgrading ? (
                      <View style={styles.upgrading}>
                        <ActivityIndicator size="small" color={COLORS.textLight} />
                        <Text style={styles.upgradingText}>Checking for more detail…</Text>
                      </View>
                    ) : null}
                  </View>

                  {m.trails && m.trails.length > 0 ? (
                    <View style={{ gap: SPACING.sm }}>
                      {m.trails.map((t) => (
                        <Card
                          key={t.id}
                          onPress={() => navigation.navigate('Trails', { focusTrailId: t.id })}
                          style={styles.trailCard}
                        >
                          <View style={styles.trailIcon}>
                            <Icon
                              name={t.type === 'bike' ? 'bike' : t.type === 'hike' ? 'boot' : 'route'}
                              size={16}
                              color={COLORS.primary}
                              strokeWidth={1.9}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.trailName} numberOfLines={1}>
                              {t.name}
                            </Text>
                            <View style={styles.trailTags}>
                              <Pill label={`${t.distanceMiles} mi`} tone="neutral" size="sm" />
                              <Pill label={t.difficulty} tone="neutral" size="sm" />
                            </View>
                          </View>
                          <Icon name="chevron-right" size={16} color={COLORS.textLight} />
                        </Card>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            )
          )}

          {thinking ? (
            <View style={styles.assistantRow}>
              <View style={styles.assistantAvatar}>
                <Icon name="leaf" size={14} color={COLORS.primary} strokeWidth={2} />
              </View>
              <View style={styles.assistantBubble}>
                <ActivityIndicator size="small" color={COLORS.textMuted} />
              </View>
            </View>
          ) : null}

          {/* Follow-up chips for the most recent answer */}
          {!showStarters && !thinking ? <FollowUps onPick={send} /> : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about a trail…"
            placeholderTextColor={COLORS.textLight}
            style={styles.input}
            multiline
            maxLength={200}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            blurOnSubmit
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim()}
            style={[styles.sendBtn, !input.trim() && { opacity: 0.35 }]}
            accessibilityLabel="Send question"
          >
            <Icon name="arrow-right" size={18} color="#fff" strokeWidth={2.3} />
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          Answers come from the trail data in this app. Conditions still change — check before you go.
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

function FollowUps({ onPick }: { onPick: (q: string) => void }) {
  const options = [
    'Is it dog friendly?',
    'Is there water?',
    'How much climbing?',
    'Is it safe right now?',
  ];
  return (
    <View style={styles.followUps}>
      {options.map((q) => (
        <Pressable key={q} onPress={() => onPick(q)} style={styles.followUp}>
          <Text style={styles.followUpText}>{q}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.lg, gap: SPACING.md },

  intro: { alignItems: 'center', paddingVertical: SPACING.lg },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md - 2,
  },
  introTitle: { ...TYPOGRAPHY.h2, color: COLORS.text },
  introText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
  },
  introHint: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
    maxWidth: 320,
    fontStyle: 'italic',
  },
  starters: { alignSelf: 'stretch', gap: SPACING.sm, marginTop: SPACING.lg },
  starter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    paddingHorizontal: SPACING.md - 2,
  },
  starterText: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, flex: 1 },

  userRow: { alignItems: 'flex-end' },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.xs,
    paddingVertical: 11,
    paddingHorizontal: SPACING.md - 2,
    maxWidth: '85%',
  },
  userText: { ...TYPOGRAPHY.body, color: '#fff' },

  assistantRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  assistantBubble: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    borderTopLeftRadius: RADIUS.xs,
    padding: SPACING.md - 2,
    flexShrink: 1,
  },
  assistantText: { ...TYPOGRAPHY.body, color: COLORS.text },
  upgrading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  upgradingText: { ...TYPOGRAPHY.micro, color: COLORS.textLight },

  trailCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
  trailIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailName: { ...TYPOGRAPHY.h4, color: COLORS.text },
  trailTags: { flexDirection: 'row', gap: 5, marginTop: 4 },

  followUps: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 36 },
  followUp: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followUpText: { ...TYPOGRAPHY.small, color: COLORS.primary, fontWeight: '500' },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md - 2,
    paddingTop: 11,
    paddingBottom: 11,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimer: {
    ...TYPOGRAPHY.micro,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
});
