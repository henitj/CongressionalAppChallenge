import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import Header from '../components/Header';
// 1. Updated to match your generic, global variables
import { LOCAL_TRAILS, Trail, discoverNearbyTrailFromGPS } from '../constants/austinTrails'; 
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

const TYPES = ['all', 'hike', 'bike', 'mixed'] as const;

export default function TrailsScreen() {
  const [filter, setFilter] = useState<(typeof TYPES)[number]>('all');
  
  // 2. Local state array managing dynamically discovered trails 
  const [localTrails, setLocalTrails] = useState<Trail[]>(LOCAL_TRAILS);
  const [loading, setLoading] = useState(false);

  // 3. Triggers the GPS location discovery and maps it to UI state
  const handleDiscover = async () => {
    setLoading(true);
    await discoverNearbyTrailFromGPS();
    // Copy reference so React hooks capture the mutation and re-render
    setLocalTrails([...LOCAL_TRAILS]);
    setLoading(false);
  };

  const trails =
    filter === 'all' ? localTrails : localTrails.filter((t) => t.type === filter);

  return (
    <View style={styles.container}>
      {/* 4. Swapped specific Austin text out for dynamic, universal app branding */}
      <Header title="Trail Explorer" subtitle="Find outdoor paths around you" />
      
      {/* 5. Interactive prompt to trigger Gemini search */}
      <Pressable 
        style={[styles.discoverBtn, loading && styles.disabledBtn]} 
        onPress={handleDiscover}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.discoverBtnText}>✨ Scan for Local Trails via AI</Text>
        )}
      </Pressable>

      <View style={styles.filters}>
        {TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setFilter(t)}
            style={[styles.chip, filter === t && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === t && { color: '#fff' }]}>
              {t.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* 6. Friendly placeholder view when list is completely empty */}
        {trails.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No trails loaded yet.</Text>
            <Text style={styles.emptySubtext}>Tap the button above to check your current coordinates for nearby paths!</Text>
          </View>
        ) : (
          trails.map((tr) => (
            <TrailCard key={tr.id} trail={tr} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function TrailCard({ trail }: { trail: Trail }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable style={styles.card} onPress={() => setOpen((o) => !o)}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.trailName}>{trail.name}</Text>
          <Text style={styles.trailMeta}>
            {trail.area} • {trail.distanceMiles} mi • {trail.difficulty}
          </Text>
        </View>
        <View style={[styles.badge, badgeColor(trail.type)]}>
          <Text style={styles.badgeText}>{trail.type.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.description}>{trail.description}</Text>
      {open && (
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Safety tips</Text>
          {trail.safetyTips.map((tip, i) => (
            <Text key={i} style={styles.tipText}>
              • {tip}
            </Text>
          ))}
        </View>
      )}
      <Text style={styles.toggle}>{open ? 'Hide safety ▲' : 'Show safety ▼'}</Text>
    </Pressable>
  );
}

function badgeColor(type: Trail['type']) {
  if (type === 'bike') return { backgroundColor: '#2980B9' };
  if (type === 'hike') return { backgroundColor: COLORS.primary };
  return { backgroundColor: COLORS.accent };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { ...TYPOGRAPHY.caption, color: COLORS.text, fontWeight: '700' },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  trailName: { ...TYPOGRAPHY.h3, color: COLORS.text },
  trailMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  description: { ...TYPOGRAPHY.body, color: COLORS.text, marginTop: SPACING.sm },
  tips: {
    backgroundColor: '#FFF4E0',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  tipsTitle: { ...TYPOGRAPHY.h3, color: COLORS.bark, marginBottom: 4 },
  tipText: { ...TYPOGRAPHY.small, color: COLORS.text, marginVertical: 1 },
  toggle: {
    marginTop: SPACING.sm,
    color: COLORS.primary,
    fontWeight: '700',
    textAlign: 'right',
  },
  // New layout styles added below
  discoverBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    margin: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  discoverBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});