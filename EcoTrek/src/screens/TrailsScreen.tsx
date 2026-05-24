import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Header from '../components/Header';
import { AUSTIN_TRAILS, Trail } from '../constants/austinTrails';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

const TYPES = ['all', 'hike', 'bike', 'mixed'] as const;

export default function TrailsScreen() {
  const [filter, setFilter] = useState<(typeof TYPES)[number]>('all');
  const trails =
    filter === 'all' ? AUSTIN_TRAILS : AUSTIN_TRAILS.filter((t) => t.type === filter);

  return (
    <View style={styles.container}>
      <Header title="Austin Trails" subtitle="Curated green spaces" />
      <View style={styles.filters}>
        {TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setFilter(t)}
            style={[styles.chip, filter === t && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, filter === t && { color: '#fff' }]}
            >
              {t.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {trails.map((tr) => (
          <TrailCard key={tr.id} trail={tr} />
        ))}
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
});
