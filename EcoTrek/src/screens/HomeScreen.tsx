import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import TreeIcon from '../components/TreeIcon';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, TREE_RULES } from '../constants/theme';
import { useActivity } from '../context/ActivityContext';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { totalMiles, totalTrees, history } = useActivity();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Trekker";
  const lastActivity = history[0];

  return (
    <View style={styles.container}>
      <Header title={"Hi, " + firstName} subtitle="Hike. Bike. Grow Austin." />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>Your forest</Text>
            <Text style={styles.heroValue}>{totalTrees}</Text>
            <Text style={styles.heroLabel}>trees planted with Veritree</Text>
            <Text style={styles.heroSub}>
              From {totalMiles.toFixed(1)} miles of Austin trails
            </Text>
          </View>
          <TreeIcon size={84} color="#fff" />
        </View>

        <View style={styles.row}>
          <StatCard label="Miles" value={totalMiles.toFixed(1)} unit="mi" />
          <View style={{ width: SPACING.sm }} />
          <StatCard label="Activities" value={history.length} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How it works</Text>
          <Bullet text={`Bike ${TREE_RULES.bikeMilesPerTree} mile → plant 1 tree`} />
          <Bullet text={`Hike ${TREE_RULES.hikeMilesPerTree} mile → plant 1 tree`} />
          <Bullet text="Trees are native species planted in Austin parks" />
          <Bullet text="Every planting is verified by Veritree" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Partner spotlight</Text>
          <Text style={styles.partner}>🌱 Veritree × EcoTrek</Text>
          <Text style={styles.bodyText}>
            Veritree provides verified, on-the-ground tree planting. Each
            EcoTrek mile triggers a request that is reforested by local
            partners and tracked with satellite + ground verification.
          </Text>
        </View>

        {lastActivity ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Last trek</Text>
            <Text style={styles.bodyText}>
              {lastActivity.type === 'bike' ? '🚴 Bike' : '🥾 Hike'} —{' '}
              {lastActivity.miles.toFixed(2)} mi · {lastActivity.trees} trees
              planted
            </Text>
            {lastActivity.receipt ? (
              <Text style={styles.receipt}>
                Receipt {lastActivity.receipt.receiptId} ·{' '}
                {lastActivity.receipt.treeSpecies}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ready to start?</Text>
            <Text style={styles.bodyText}>
              Head to the Track tab and hit start — we'll measure your distance
              and plant a tree for you when you finish.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
  },
  heroEyebrow: { color: '#D6F2DF', ...TYPOGRAPHY.caption, letterSpacing: 1, textTransform: 'uppercase' },
  heroValue: { color: '#fff', fontSize: 56, fontWeight: '900', lineHeight: 60 },
  heroLabel: { color: '#fff', ...TYPOGRAPHY.h3 },
  heroSub: { color: '#D6F2DF', marginTop: SPACING.xs },
  row: { flexDirection: 'row', marginBottom: SPACING.md },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.sm },
  partner: { ...TYPOGRAPHY.h2, color: COLORS.primary, marginBottom: SPACING.xs },
  bodyText: { ...TYPOGRAPHY.body, color: COLORS.text, lineHeight: 22 },
  receipt: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: SPACING.xs },
  bullet: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  bulletText: { ...TYPOGRAPHY.body, color: COLORS.text },
});
