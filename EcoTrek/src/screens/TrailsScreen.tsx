import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Image,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import Header from '../components/Header';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { getCurrentPosition, Coord } from '../services/location';
import { Trail, fetchNearbyTrails } from '../constants/austinTrails';

// ─── UI Styling Helpers ─────────────────────────────────────────────────────────
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

// ─── Main Screen Component ────────────────────────────────────────────────────
export default function TrailsScreen() {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [location, setLocation] = useState<Coord | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      Alert.alert('Error', e.message ?? 'Failed to load trails');
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
            🌿 Finding trails near you...
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
        />
      )}
    </View>
  );
}

// ─── Trail Card Component ─────────────────────────────────────────────────────
function TrailCard({
  trail,
  onPress,
}: {
  trail: Trail;
  onPress: () => void;
}) {
  const imgUri = trail.imageUrl ?? TRAIL_IMAGES[trail.type];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: imgUri }} style={styles.cardImg} />

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {trail.name}
        </Text>
        <Text style={styles.cardMeta}>
          📍 {trail.area} · {trail.distanceMiles} mi
        </Text>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.diffBadge,
              { backgroundColor: DIFFICULTY_COLORS[trail.difficulty] },
            ]}
          >
            <Text style={styles.badgeText}>{trail.difficulty}</Text>
          </View>
          {trail.petFriendly && <Text style={styles.tagEmoji}>🐾</Text>}
          {trail.familyFriendly && <Text style={styles.tagEmoji}>👨‍👩‍👧</Text>}
          {trail.restroomsAvailable && <Text style={styles.tagEmoji}>🚻</Text>}
        </View>

        <Text style={styles.cardDesc} numberOfLines={2}>
          {trail.description}
        </Text>

        {trail.ecoPoints !== undefined && (
          <Text style={styles.ecoPoints}>🌱 {trail.ecoPoints} EcoPoints</Text>
        )}
      </View>
    </Pressable>
  );
}

// ─── Trail Detail Modal Component ─────────────────────────────────────────────
function TrailDetailModal({
  trail,
  onClose,
}: {
  trail: Trail;
  onClose: () => void;
}) {
  const imgUri = trail.imageUrl ?? TRAIL_IMAGES[trail.type];

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.detailScroll} bounces>
        <Image source={{ uri: imgUri }} style={styles.detailImg} />

        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeTxt}>✕</Text>
        </Pressable>

        <View style={styles.detailContent}>
          <View style={styles.detailTitleRow}>
            <Text style={styles.detailTitle}>{trail.name}</Text>
            {trail.rating && (
              <Text style={styles.rating}>⭐ {trail.rating.toFixed(1)}</Text>
            )}
          </View>

          <Text style={styles.detailArea}>📍 {trail.area}</Text>

          <View style={styles.statsGrid}>
            <StatPill icon="📏" label={`${trail.distanceMiles} mi`} />
            <StatPill
              icon="💪"
              label={trail.difficulty}
              color={DIFFICULTY_COLORS[trail.difficulty]}
            />
            {trail.elevationGain && <StatPill icon="⛰️" label={trail.elevationGain} />}
            {trail.estimatedTime && <StatPill icon="⏱" label={trail.estimatedTime} />}
          </View>

          <View style={styles.amenitiesRow}>
            <AmenityBadge label="🐾 Pet friendly" active={!!trail.petFriendly} />
            <AmenityBadge label="👨‍👩‍👧 Family" active={!!trail.familyFriendly} />
            <AmenityBadge label="🛒 Stroller" active={!!trail.strollerFriendly} />
            <AmenityBadge label="🚻 Restrooms" active={!!trail.restroomsAvailable} />
            <AmenityBadge label="💧 Water" active={!!trail.waterStations} />
          </View>

          <SectionTitle title="About this trail" />
          <Text style={styles.detailDesc}>{trail.description}</Text>

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

          {trail.animals && trail.animals.length > 0 && (
            <>
              <SectionTitle title="🦎 Animals spotted here" />
              <View style={styles.tagWrap}>
                {trail.animals.map((a) => (
                  <View key={a} style={[styles.natureTag, { backgroundColor: '#FFF4E0' }]}>
                    <Text style={[styles.natureTagText, { color: COLORS.bark }]}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

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

          {trail.ecoPoints !== undefined && (
            <View style={styles.ecoBox}>
              <Text style={styles.ecoBoxTitle}>🌱 Complete this trail</Text>
              <Text style={styles.ecoBoxPoints}>Earn {trail.ecoPoints} EcoPoints</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}

// ─── Presentation Helpers ──────────────────────────────────────────────────────
function StatPill({ icon, label, color }: { icon: string; label: string; color?: string }) {
  return (
    <View style={[styles.statPill, color ? { backgroundColor: color } : null]}>
      <Text style={[styles.statPillText, color ? { color: '#fff' } : null]}>
        {icon} {label}
      </Text>
    </View>
  );
}

type AmenityProps = { label: string; active: boolean };
function AmenityBadge({ label, active }: AmenityProps) {
  return (
    <View style={[styles.amenity, !active && styles.amenityInactive]}>
      <Text style={[styles.amenityText, !active && styles.amenityTextInactive]}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  emptyBox: { alignItems: 'center', padding: SPACING.xl },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.textMuted },
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
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.pill },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  tagEmoji: { fontSize: 14 },
  cardDesc: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 4, lineHeight: 17 },
  ecoPoints: { ...TYPOGRAPHY.caption, color: COLORS.primary, fontWeight: '700', marginTop: 4 },
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
  detailTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  detailTitle: { ...TYPOGRAPHY.h1, color: COLORS.text, flex: 1 },
  rating: { ...TYPOGRAPHY.h3, color: COLORS.accent },
  detailArea: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginBottom: SPACING.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  statPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: '#EAF6EE' },
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
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: SPACING.md, marginBottom: SPACING.xs },
  detailDesc: { ...TYPOGRAPHY.body, color: COLORS.text, lineHeight: 22 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  natureTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: '#EAF6EE' },
  natureTagText: { fontSize: 13, color: COLORS.primaryDark, fontWeight: '600' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 7, marginRight: SPACING.sm },
  tipText: { ...TYPOGRAPHY.body, color: COLORS.text, flex: 1 },
  ecoBox: { backgroundColor: '#EAF6EE', borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md, marginBottom: SPACING.xl, alignItems: 'center' },
  ecoBoxTitle: { ...TYPOGRAPHY.h3, color: COLORS.primaryDark },
  ecoBoxPoints: { ...TYPOGRAPHY.h1, color: COLORS.primary, marginTop: 4 },
});