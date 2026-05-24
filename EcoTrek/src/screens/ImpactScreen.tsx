import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Header from '../components/Header';
import TreeIcon from '../components/TreeIcon';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActivity } from '../context/ActivityContext';

// Conservative real-world estimates per tree per year
const CO2_PER_TREE_LBS = 48;        // lbs CO2 sequestered
const OXYGEN_PER_TREE_LBS = 260;    // lbs O2 produced

export default function ImpactScreen() {
  const { history, totalMiles, totalTrees } = useActivity();
  const co2 = (totalTrees * CO2_PER_TREE_LBS).toLocaleString();
  const o2 = (totalTrees * OXYGEN_PER_TREE_LBS).toLocaleString();

  return (
    <View style={styles.container}>
      <Header title="Impact" subtitle="Veritree verified plantings" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <TreeIcon size={64} color="#fff" />
          <View style={{ marginLeft: SPACING.md, flex: 1 }}>
            <Text style={styles.bigNum}>{totalTrees}</Text>
            <Text style={styles.bigLbl}>trees planted in Austin</Text>
            <Text style={styles.sub}>
              from {totalMiles.toFixed(2)} miles on the trail
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <ImpactCard title="CO₂ / year" value={`${co2} lbs`} color="#1F8A4C" />
          <View style={{ width: SPACING.sm }} />
          <ImpactCard title="O₂ / year" value={`${o2} lbs`} color="#2980B9" />
        </View>

        <Text style={styles.section}>Activity history</Text>
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No treks yet. Track your first ride or hike to start growing
              Austin's canopy 🌳
            </Text>
          </View>
        ) : (
          history.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.cardTitle}>
                  {a.type === 'bike' ? '🚴 Bike' : '🥾 Hike'} ·{' '}
                  {a.miles.toFixed(2)} mi
                </Text>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{a.trees} 🌳</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>
                {new Date(a.startedAt).toLocaleString()} •{' '}
                {Math.round(a.durationSec / 60)} min
              </Text>
              {a.receipt ? (
                <Text style={styles.receipt}>
                  ✅ Veritree {a.receipt.receiptId} · {a.receipt.treeSpecies}
                </Text>
              ) : (
                <Text style={styles.receipt}>Keep going to unlock a tree.</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function ImpactCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <View style={[styles.impact, { borderTopColor: color }]}>
      <Text style={styles.impactTitle}>{title}</Text>
      <Text style={styles.impactVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  banner: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  bigNum: { color: '#fff', fontSize: 44, fontWeight: '900' },
  bigLbl: { color: '#fff', ...TYPOGRAPHY.h3 },
  sub: { color: '#B7D8C4', marginTop: 4 },
  row: { flexDirection: 'row', marginBottom: SPACING.md },
  impact: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderTopWidth: 4,
  },
  impactTitle: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  impactVal: { ...TYPOGRAPHY.h2, color: COLORS.text, marginTop: 4 },
  section: { ...TYPOGRAPHY.h3, color: COLORS.text, marginVertical: SPACING.md },
  empty: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.textMuted, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  cardMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  receipt: { ...TYPOGRAPHY.small, color: COLORS.primary, marginTop: 6, fontWeight: '600' },
  pill: {
    backgroundColor: '#EAF6EE',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pillText: { color: COLORS.primaryDark, fontWeight: '800' },
});
