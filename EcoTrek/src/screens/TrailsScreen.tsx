import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
  FlatList,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import Header from '../components/Header';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { getCurrentPosition, Coord } from '../services/location';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Trail = {
  id: string;
  name: string;
  type: 'hike' | 'bike' | 'mixed';
  distanceMiles: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  area: string;
  description: string;
  safetyTips: string[];
  imageUrl?: string;
  rating?: number;
  petFriendly?: boolean;
  familyFriendly?: boolean;
  strollerFriendly?: boolean;
  restroomsAvailable?: boolean;
  waterStations?: boolean;
  elevationGain?: string;
  estimatedTime?: string;
  plants?: string[];
  animals?: string[];
  ecoPoints?: number;
};

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

// ─── Gemini helpers ───────────────────────────────────────────────────────────
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/` +
  `gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

async function geminiChat(
  history: ChatMessage[],
  userText: string,
  systemPrompt: string
): Promise<string> {
  const contents = [
    ...history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: userText }] },
  ];

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
  };

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    'Sorry, I could not generate a response.'
  );
}

async function fetchNearbyTrails(coord: Coord): Promise<Trail[]> {
  const prompt = `
You are an expert Austin, TX trail guide. The user is at latitude ${coord.latitude}, longitude ${coord.longitude}.

Return a JSON array of exactly 8 trails near this location in Austin, TX. Each trail must have ALL of these fields:
{
  "id": "unique string",
  "name": "Trail Name",
  "type": "hike" | "bike" | "mixed",
  "distanceMiles": number,
  "difficulty": "Easy" | "Moderate" | "Hard",
  "area": "neighborhood or park name",
  "description": "2 sentence engaging description",
  "safetyTips": ["tip1", "tip2", "tip3"],
  "rating": number between 3.5 and 5.0,
  "petFriendly": boolean,
  "familyFriendly": boolean,
  "strollerFriendly": boolean,
  "restroomsAvailable": boolean,
  "waterStations": boolean,
  "elevationGain": "X ft",
  "estimatedTime": "X-Y hours",
  "plants": ["plant1", "plant2", "plant3", "plant4"],
  "animals": ["animal1", "animal2", "animal3"],
  "ecoPoints": number between 10 and 50
}

Sort by proximity to the user's coordinates. Return ONLY the raw JSON array, no markdown, no explanation.
`;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as Trail[];
}

// ─── Trail image map (placeholder images per type) ───────────────────────────
const TRAIL_IMAGES: Record<Trail['type'], string> = {
  hike: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80',
  bike: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&q=80',
  mixed: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80',
};

const DIFFICULTY_COLORS: Record<Trail['difficulty'], string> = {
  Easy: '#1F8A4C',
  Moderate: '#E67E22',
  Hard: '#C0392B',
};

const FILTERS = ['all', 'hike', 'bike', 'mixed'] as const;

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TrailsScreen() {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [location, setLocation] = useState<Coord | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [chatTrail, setChatTrail] = useState<Trail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load location + trails on mount
  useEffect(() => {
    loadTrails();
  }, []);

  const loadTrails = async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      const coord = pos ?? {
        latitude: 30.2672,
        longitude: -97.7431,
        timestamp: Date.now(),
      };
      setLocation(coord);
      const fetched = await fetchNearbyTrails(coord);
      setTrails(fetched);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load trails');
    } finally {
      setLoading(false);
    }
  };

  const filtered =
    filter === 'all' ? trails : trails.filter((t) => t.type === filter);

  return (
    <View style={styles.container}>
      <Header title="Nearby Trails" subtitle="Explore. Learn. Protect." />

      {/* Filter chips */}
      <View style={styles.filterBar}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f && { color: '#fff' }]}>
              {f === 'all' ? '🗺 ALL' : f === 'hike' ? '🥾 HIKE' : f === 'bike' ? '🚴 BIKE' : '✨ MIXED'}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={loadTrails} style={styles.refreshBtn}>
          <Text style={{ fontSize: 16 }}>🔄</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            🌿 Finding trails near you with AI…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Pressable onPress={loadTrails} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TrailCard
              trail={item}
              onPress={() => setSelectedTrail(item)}
              onChat={() => setChatTrail(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No trails found. Pull to refresh.</Text>
            </View>
          }
        />
      )}

      {/* Trail detail modal */}
      {selectedTrail && (
        <TrailDetailModal
          trail={selectedTrail}
          onClose={() => setSelectedTrail(null)}
          onChat={() => {
            setSelectedTrail(null);
            setChatTrail(selectedTrail);
          }}
        />
      )}

      {/* Gemini chat modal */}
      {chatTrail && (
        <GeminiChatModal
          trail={chatTrail}
          onClose={() => setChatTrail(null)}
        />
      )}
    </View>
  );
}

// ─── Trail Card ───────────────────────────────────────────────────────────────
function TrailCard({
  trail,
  onPress,
  onChat,
}: {
  trail: Trail;
  onPress: () => void;
  onChat: () => void;
}) {
  const imgUri = trail.imageUrl ?? TRAIL_IMAGES[trail.type];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Left image */}
      <Image source={{ uri: imgUri }} style={styles.cardImg} />

      {/* Content */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {trail.name}
        </Text>
        <Text style={styles.cardMeta}>
          📍 {trail.area} · {trail.distanceMiles} mi
        </Text>

        {/* Badges row */}
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.diffBadge,
              { backgroundColor: DIFFICULTY_COLORS[trail.difficulty] },
            ]}
          >
            <Text style={styles.badgeText}>{trail.difficulty}</Text>
          </View>
          {trail.petFriendly && (
            <Text style={styles.tagEmoji}>🐾</Text>
          )}
          {trail.familyFriendly && (
            <Text style={styles.tagEmoji}>👨‍👩‍👧</Text>
          )}
          {trail.restroomsAvailable && (
            <Text style={styles.tagEmoji}>🚻</Text>
          )}
        </View>

        <Text style={styles.cardDesc} numberOfLines={2}>
          {trail.description}
        </Text>

        {/* EcoPoints */}
        {trail.ecoPoints !== undefined && (
          <Text style={styles.ecoPoints}>
            🌱 {trail.ecoPoints} EcoPoints
          </Text>
        )}
      </View>

      {/* Gemini button */}
      <Pressable
        style={styles.geminiBtn}
        onPress={(e) => {
          e.stopPropagation?.();
          onChat();
        }}
        hitSlop={8}
      >
        <Text style={styles.geminiIcon}>✨</Text>
        <Text style={styles.geminiLabel}>AI</Text>
      </Pressable>
    </Pressable>
  );
}

// ─── Trail Detail Modal ───────────────────────────────────────────────────────
function TrailDetailModal({
  trail,
  onClose,
  onChat,
}: {
  trail: Trail;
  onClose: () => void;
  onChat: () => void;
}) {
  const imgUri = trail.imageUrl ?? TRAIL_IMAGES[trail.type];

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.detailScroll} bounces>
        {/* Hero image */}
        <Image source={{ uri: imgUri }} style={styles.detailImg} />

        {/* Close button */}
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>✕</Text>
        </Pressable>

        <View style={styles.detailContent}>
          {/* Title + rating */}
          <View style={styles.detailTitleRow}>
            <Text style={styles.detailTitle}>{trail.name}</Text>
            {trail.rating && (
              <Text style={styles.rating}>⭐ {trail.rating.toFixed(1)}</Text>
            )}
          </View>

          <Text style={styles.detailArea}>📍 {trail.area}</Text>

          {/* Quick stats */}
          <View style={styles.statsGrid}>
            <StatPill icon="📏" label={`${trail.distanceMiles} mi`} />
            <StatPill
              icon="💪"
              label={trail.difficulty}
              color={DIFFICULTY_COLORS[trail.difficulty]}
            />
            {trail.elevationGain && (
              <StatPill icon="⛰️" label={trail.elevationGain} />
            )}
            {trail.estimatedTime && (
              <StatPill icon="⏱" label={trail.estimatedTime} />
            )}
          </View>

          {/* Amenities */}
          <View style={styles.amenitiesRow}>
            <AmenityBadge label="🐾 Pet friendly" active={!!trail.petFriendly} />
            <AmenityBadge label="👨‍👩‍👧 Family" active={!!trail.familyFriendly} />
            <AmenityBadge label="🛒 Stroller" active={!!trail.strollerFriendly} />
            <AmenityBadge label="🚻 Restrooms" active={!!trail.restroomsAvailable} />
            <AmenityBadge label="💧 Water" active={!!trail.waterStations} />
          </View>

          {/* Description */}
          <SectionTitle title="About this trail" />
          <Text style={styles.detailDesc}>{trail.description}</Text>

          {/* Plants */}
          {trail.plants && trail.plants.length > 0 && (
            <>
              <SectionTitle title="🌿 Plants found here" />
              <View style={styles.tagWrap}>
                {trail.plants.map((p) => (
                  <View key={p} style={styles.natureTag}>
                    <Text style={styles.natureTagText}>{p}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Animals */}
          {trail.animals && trail.animals.length > 0 && (
            <>
              <SectionTitle title="🦎 Animals spotted here" />
              <View style={styles.tagWrap}>
                {trail.animals.map((a) => (
                  <View key={a} style={[styles.natureTag, { backgroundColor: '#FFF4E0' }]}>
                    <Text style={[styles.natureTagText, { color: COLORS.bark }]}>
                      {a}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Safety tips */}
          {trail.safetyTips && trail.safetyTips.length > 0 && (
            <>
              <SectionTitle title="🛡️ Safety tips" />
              {trail.safetyTips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </>
          )}

          {/* EcoPoints */}
          {trail.ecoPoints !== undefined && (
            <View style={styles.ecoBox}>
              <Text style={styles.ecoBoxTitle}>🌱 Complete this trail</Text>
              <Text style={styles.ecoBoxPoints}>
                Earn {trail.ecoPoints} EcoPoints
              </Text>
            </View>
          )}

          {/* Ask AI button */}
          <Pressable style={styles.askAiBtn} onPress={onChat}>
            <Text style={styles.askAiIcon}>✨</Text>
            <Text style={styles.askAiText}>Ask AI about this trail</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Modal>
  );
}

// ─── Gemini Chat Modal ─────────────────────────────────────────────────────────
function GeminiChatModal({
  trail,
  onClose,
}: {
  trail: Trail;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const systemPrompt = `
You are EcoTrek AI — a friendly, knowledgeable nature guide for the trail "${trail.name}" 
in ${trail.area}, Austin TX. 

Trail facts:
- Distance: ${trail.distanceMiles} miles
- Difficulty: ${trail.difficulty}
- Type: ${trail.type}
- Pet friendly: ${trail.petFriendly ? 'Yes' : 'No'}
- Family friendly: ${trail.familyFriendly ? 'Yes' : 'No'}
- Plants found: ${trail.plants?.join(', ') ?? 'Various native species'}
- Animals spotted: ${trail.animals?.join(', ') ?? 'Various wildlife'}
- Safety tips: ${trail.safetyTips?.join('; ') ?? 'Standard trail safety'}

Answer questions about this trail, local wildlife, plants, safety, best times to visit, 
what to bring, and environmental conservation. Be encouraging, educational, and concise.
Use emojis sparingly to keep responses friendly.
`;

  const SUGGESTIONS = [
    'Best time to visit?',
    'What wildlife might I see?',
    'Is it good for beginners?',
    'What should I bring?',
    'Tell me about the plants here',
    'Is it kid friendly?',
  ];

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: ChatMessage = { role: 'user', text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setBusy(true);

    try {
      const reply = await geminiChat(messages, text.trim(), systemPrompt);
      setMessages((m) => [...m, { role: 'model', text: reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: 'model', text: `⚠️ ${e.message}` },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.chatContainer}>
        {/* Header */}
        <View style={styles.chatHeader}>
          <View>
            <Text style={styles.chatTitle}>✨ AI Trail Guide</Text>
            <Text style={styles.chatSubtitle}>{trail.name}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.chatClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatMessages}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.lg }}
        >
          {/* Welcome */}
          {messages.length === 0 && (
            <View style={styles.welcomeBox}>
              <Text style={styles.welcomeText}>
                👋 Hi! I'm your AI guide for{' '}
                <Text style={{ fontWeight: '700' }}>{trail.name}</Text>. Ask me
                anything about this trail!
              </Text>
              <View style={styles.suggestionsWrap}>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    style={styles.suggestion}
                    onPress={() => send(s)}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                m.role === 'user' ? styles.bubbleUser : styles.bubbleModel,
              ]}
            >
              {m.role === 'model' && (
                <Text style={styles.bubbleLabel}>✨ EcoTrek AI</Text>
              )}
              <Text
                style={[
                  styles.bubbleText,
                  m.role === 'user' && { color: '#fff' },
                ]}
              >
                {m.text}
              </Text>
            </View>
          ))}

          {busy && (
            <View style={styles.bubbleModel}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.typingText}>EcoTrek AI is thinking…</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            placeholder="Ask about this trail…"
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            editable={!busy}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, busy && { opacity: 0.5 }]}
            onPress={() => send(input)}
            disabled={busy}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={[styles.statPill, color ? { backgroundColor: color } : null]}>
      <Text style={[styles.statPillText, color ? { color: '#fff' } : null]}>
        {icon} {label}
      </Text>
    </View>
  );
}

function AmenityBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={[styles.amenity, !active && styles.amenityInactive]}>
      <Text style={[styles.amenityText, !active && styles.amenityTextInactive]}>
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Filter bar
  filterBar: {
    flexDirection: 'row',
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { ...TYPOGRAPHY.caption, color: COLORS.text, fontWeight: '700' },
  refreshBtn: { marginLeft: 'auto', padding: 6 },

  // Loading / error
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { ...TYPOGRAPHY.body, color: COLORS.textMuted, marginTop: SPACING.sm },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  errorText: { color: COLORS.danger, ...TYPOGRAPHY.body, textAlign: 'center', marginBottom: SPACING.md },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
  retryText: { color: '#fff', fontWeight: '700' },

  // List
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  emptyBox: { alignItems: 'center', padding: SPACING.xl },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.textMuted },

  // Trail card
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardImg: { width: 100, height: 120 },
  cardBody: { flex: 1, padding: SPACING.sm },
  cardName: { ...TYPOGRAPHY.h3, color: COLORS.text, fontSize: 15 },
  cardMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 4 },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  tagEmoji: { fontSize: 14 },
  cardDesc: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 4, lineHeight: 17 },
  ecoPoints: { ...TYPOGRAPHY.caption, color: COLORS.primary, fontWeight: '700', marginTop: 4 },
  geminiBtn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF6EE',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  geminiIcon: { fontSize: 18 },
  geminiLabel: { fontSize: 9, color: COLORS.primary, fontWeight: '700' },

  // Detail modal
  detailScroll: { flex: 1, backgroundColor: COLORS.background },
  detailImg: { width: '100%', height: 220 },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: '#fff', fontWeight: '900', fontSize: 16 },
  detailContent: { padding: SPACING.md },
  detailTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailTitle: { ...TYPOGRAPHY.h1, color: COLORS.text, flex: 1 },
  rating: { ...TYPOGRAPHY.h3, color: COLORS.accent },
  detailArea: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginBottom: SPACING.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  statPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: '#EAF6EE',
  },
  statPillText: { fontWeight: '700', fontSize: 13, color: COLORS.primaryDark },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  amenity: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: '#EAF6EE',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  amenityInactive: { backgroundColor: '#F4F4F4', borderColor: COLORS.border },
  amenityText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  amenityTextInactive: { color: COLORS.textMuted },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  detailDesc: { ...TYPOGRAPHY.body, color: COLORS.text, lineHeight: 22 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  natureTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: '#EAF6EE',
  },
  natureTagText: { fontSize: 13, color: COLORS.primaryDark, fontWeight: '600' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 7,
    marginRight: SPACING.sm,
  },
  tipText: { ...TYPOGRAPHY.body, color: COLORS.text, flex: 1 },
  ecoBox: {
    backgroundColor: '#EAF6EE',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  ecoBoxTitle: { ...TYPOGRAPHY.h3, color: COLORS.primaryDark },
  ecoBoxPoints: { ...TYPOGRAPHY.h1, color: COLORS.primary, marginTop: 4 },
  askAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.pill,
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    gap: 8,
  },
  askAiIcon: { fontSize: 20 },
  askAiText: { color: '#fff', ...TYPOGRAPHY.h3 },

  // Chat modal
  chatContainer: { flex: 1, backgroundColor: COLORS.background },
  chatHeader: {
    backgroundColor: COLORS.primaryDark,
    padding: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 56 : SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: { ...TYPOGRAPHY.h2, color: '#fff' },
  chatSubtitle: { ...TYPOGRAPHY.small, color: '#B7D8C4', marginTop: 2 },
  chatClose: { padding: 8 },
  chatMessages: { flex: 1 },
  welcomeBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  welcomeText: { ...TYPOGRAPHY.body, color: COLORS.text, lineHeight: 22 },
  suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.sm },
  suggestion: {
    backgroundColor: '#EAF6EE',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  suggestionText: { color: COLORS.primaryDark, fontWeight: '600', fontSize: 13 },
  bubble: {
    maxWidth: '85%',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleModel: {
    backgroundColor: COLORS.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleLabel: { ...TYPOGRAPHY.caption, color: COLORS.primary, fontWeight: '700', marginBottom: 4 },
  bubbleText: { ...TYPOGRAPHY.body, color: COLORS.text, lineHeight: 22 },
  typingText: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 4 },
  chatInputRow: {
    flexDirection: 'row',
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'flex-end',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
});