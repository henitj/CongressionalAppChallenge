import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import Header from '../components/Header';
import TreeIcon from '../components/TreeIcon';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { useActivity } from '../constants/ActivityContext';
import { useEcoPoints } from '../constants/EcoPointsContext';

const CO2_PER_TREE_LBS = 48;
const OXYGEN_PER_TREE_LBS = 260;

type Tab = 'impact' | 'points' | 'badges' | 'history';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'impact', icon: '🌍', label: 'Impact' },
  { key: 'points', icon: '⭐', label: 'Points' },
  { key: 'badges', icon: '🏅', label: 'Badges' },
  { key: 'history', icon: '📋', label: 'History' },
];

export default function ImpactScreen() {
  const { history, totalMiles, totalTrees } = useActivity();
  const {
    totalPoints,
    level,
    progressPercent,
    nextLevelPoints,
    badges,
    history: pointHistory,
  } = useEcoPoints();

  const [tab, setTab] = useState<Tab>('impact');

  const co2 = (totalTrees * CO2_PER_TREE_LBS).toLocaleString();
  const o2 = (totalTrees * OXYGEN_PER_TREE_LBS).toLocaleString();
  const unlockedBadges = badges.filter((b) => b.unlocked).length;

  return (
    <View style={styles.container}>
      <Header title="My Impact" subtitle="Verified environmental footprint" />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text
              style={[
                styles.tabLabel,
                tab === t.key && styles.tabLabelActive,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ══ IMPACT TAB ══ */}
        {tab === 'impact' && (
          <>
            {/* Banner */}
            <View style={styles.banner}>
              <View style={styles.bannerBg} />
              <View style={styles.bannerContent}>
                <TreeIcon size={52} color="rgba(255,255,255,0.85)" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerNum}>{totalTrees}</Text>
                  <Text style={styles.bannerLabel}>
                    trees planted in Austin
                  </Text>
                  <Text style={styles.bannerSub}>
                    across {totalMiles.toFixed(2)} miles of trails
                  </Text>
                </View>
              </View>
              <View style={styles.veritreeBadge}>
                <Text style={styles.veritreeText}>
                  ✅ Verified by Veritree
                </Text>
              </View>
            </View>

            {/* Impact metrics */}
            <View style={styles.metricsRow}>
              <MetricCard
                icon="🌿"
                title="CO₂ / year"
                value={co2}
                unit="lbs"
                color={COLORS.primary}
              />
              <View style={{ width: SPACING.sm }} />
              <MetricCard
                icon="💨"
                title="O₂ / year"
                value={o2}
                unit="lbs"
                color={COLORS.sky}
              />
            </View>

            {/* Equivalencies */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>What your trees mean</Text>
              <EquivRow
                icon="🚗"
                text={`Equal to removing ${(totalTrees * 0.4).toFixed(
                  1
                )} cars from the road for a year`}
              />
              <EquivRow
                icon="🏠"
                text={`Provides clean air for ${(totalTrees * 2).toFixed(
                  0
                )} homes annually`}
              />
              <EquivRow
                icon="🦋"
                text={`Habitat for ${(totalTrees * 50).toLocaleString()} species of wildlife`}
              />
              <EquivRow
                icon="🌡️"
                text={`Reduces urban heat by up to ${(
                  totalTrees * 0.5
                ).toFixed(1)}°F in surrounding areas`}
              />
            </View>

            {/* Activity history */}
            <Text style={styles.sectionTitle}>Activity history</Text>
            {history.length === 0 ? (
              <EmptyCard
                icon="🌱"
                title="No treks yet"
                body="Track your first hike or bike ride to start growing Austin's canopy."
              />
            ) : (
              history.map((a) => (
                <View key={a.id} style={styles.actCard}>
                  <View style={styles.actLeft}>
                    <View style={styles.actTypeIcon}>
                      <Text style={{ fontSize: 24 }}>
                        {a.type === 'bike' ? '🚴' : '🥾'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.actType}>
                        {a.type === 'bike' ? 'Bike Ride' : 'Hike'}
                      </Text>
                      <Text style={styles.actDate}>
                        {new Date(a.startedAt).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actRight}>
                    <View style={styles.treePill}>
                      <Text style={styles.treePillText}>
                        {a.trees} 🌳
                      </Text>
                    </View>
                    <Text style={styles.actMiles}>
                      {a.miles.toFixed(2)} mi
                    </Text>
                  </View>
                  {a.receipt && (
                    <View style={styles.receiptBadge}>
                      <Text style={styles.receiptText}>
                        ✅ Veritree · {a.receipt.treeSpecies} ·{' '}
                        {a.receipt.receiptId}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {/* ══ POINTS TAB ══ */}
        {tab === 'points' && (
          <>
            {/* Level hero */}
            <View style={styles.levelHero}>
              <View style={styles.levelHeroBg} />
              <Text style={styles.levelHeroLabel}>CURRENT LEVEL</Text>
              <Text style={styles.levelHeroName}>{level}</Text>
              <Text style={styles.levelHeroPoints}>
                {totalPoints.toLocaleString()}{' '}
                <Text style={styles.levelHeroPtLabel}>EcoPoints</Text>
              </Text>
              <View style={styles.levelProgressTrack}>
                <View
                  style={[
                    styles.levelProgressFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
              <Text style={styles.levelProgressCaption}>
                {nextLevelPoints - totalPoints > 0
                  ? `${(
                      nextLevelPoints - totalPoints
                    ).toLocaleString()} points to next level`
                  : '🎉 Maximum level reached!'}
              </Text>
            </View>

            {/* Earn table */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>How to earn EcoPoints</Text>
              {[
                { icon: '🥾', action: 'Hike 1 mile', pts: 10 },
                { icon: '🚴', action: 'Bike 1 mile', pts: 8 },
                { icon: '🌳', action: 'Tree planted', pts: 15 },
                { icon: '🌿', action: 'Plant identified', pts: 5 },
                { icon: '📸', action: 'Photo uploaded', pts: 3 },
                { icon: '✅', action: 'Trail completed', pts: 20 },
                { icon: '🧹', action: 'Cleanup crew', pts: 25 },
                { icon: '🏆', action: 'Challenge done', pts: 50 },
              ].map((item, i) => (
                <View
                  key={item.action}
                  style={[
                    styles.earnRow,
                    i === 7 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Text style={styles.earnIcon}>{item.icon}</Text>
                  <Text style={styles.earnAction}>{item.action}</Text>
                  <View style={styles.ptsBadge}>
                    <Text style={styles.ptsText}>+{item.pts}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Recent events */}
            <Text style={styles.sectionTitle}>Recent earnings</Text>
            {pointHistory.length === 0 ? (
              <EmptyCard
                icon="⭐"
                title="No points yet"
                body="Start trekking to earn your first EcoPoints!"
              />
            ) : (
              pointHistory.slice(0, 20).map((e) => (
                <View key={e.id} style={styles.eventCard}>
                  <View>
                    <Text style={styles.eventLabel}>{e.label}</Text>
                    <Text style={styles.eventTime}>
                      {new Date(e.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.eventPtsBadge}>
                    <Text style={styles.eventPtsText}>+{e.points}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* ══ BADGES TAB ══ */}
        {tab === 'badges' && (
          <>
            <View style={styles.badgeSummaryCard}>
              <View style={styles.badgeSummaryLeft}>
                <Text style={styles.badgeSummaryNum}>
                  {unlockedBadges}
                  <Text style={styles.badgeSummaryTotal}>
                    /{badges.length}
                  </Text>
                </Text>
                <Text style={styles.badgeSummaryLabel}>
                  badges unlocked
                </Text>
              </View>
              <View style={styles.badgeSummaryRight}>
                <View style={styles.badgeProgressTrack}>
                  <View
                    style={[
                      styles.badgeProgressFill,
                      {
                        width: `${(unlockedBadges / badges.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.badgeSummaryPct}>
                  {Math.round((unlockedBadges / badges.length) * 100)}%
                  complete
                </Text>
              </View>
            </View>

            <View style={styles.badgeGrid}>
              {badges.map((b) => (
                <View
                  key={b.id}
                  style={[
                    styles.badgeCard,
                    b.unlocked && styles.badgeCardUnlocked,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeIcon,
                      !b.unlocked && styles.badgeIconLocked,
                    ]}
                  >
                    {b.unlocked ? b.icon : '🔒'}
                  </Text>
                  <Text
                    style={[
                      styles.badgeName,
                      !b.unlocked && { color: COLORS.textLight },
                    ]}
                  >
                    {b.name}
                  </Text>
                  <Text style={styles.badgeDesc}>{b.description}</Text>
                  {b.unlockedAt && (
                    <View style={styles.badgeUnlockedTag}>
                      <Text style={styles.badgeUnlockedText}>
                        {new Date(b.unlockedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* ══ HISTORY TAB ══ */}
        {tab === 'history' && (
          <>
            {/* Summary strip */}
            <View style={styles.historySummary}>
              <HistSummaryItem
                value={history.length.toString()}
                label="Treks"
              />
              <View style={styles.histDivider} />
              <HistSummaryItem
                value={totalMiles.toFixed(1)}
                label="Miles"
              />
              <View style={styles.histDivider} />
              <HistSummaryItem
                value={totalTrees.toString()}
                label="Trees"
              />
              <View style={styles.histDivider} />
              <HistSummaryItem
                value={totalPoints.toLocaleString()}
                label="Points"
              />
            </View>

            {history.length === 0 ? (
              <EmptyCard
                icon="📋"
                title="No activities yet"
                body="Your trek history will appear here once you start tracking."
              />
            ) : (
              history.map((a) => (
                <View key={a.id} style={styles.histCard}>
                  <View style={styles.histCardHeader}>
                    <View style={styles.histTypeIcon}>
                      <Text style={{ fontSize: 22 }}>
                        {a.type === 'bike' ? '🚴' : '🥾'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.histTypeName}>
                        {a.type === 'bike' ? 'Bike Ride' : 'Hike'}
                      </Text>
                      <Text style={styles.histDate}>
                        {new Date(a.startedAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.histTreePill}>
                      <Text style={styles.histTreeText}>
                        {a.trees} 🌳
                      </Text>
                    </View>
                  </View>

                  <View style={styles.histStatsRow}>
                    <HistStat
                      icon="📏"
                      value={`${a.miles.toFixed(2)} mi`}
                      label="Distance"
                    />
                    <HistStat
                      icon="⏱"
                      value={`${Math.round(a.durationSec / 60)} min`}
                      label="Duration"
                    />
                    <HistStat
                      icon="⚡"
                      value={`${Math.round(
                        (a.miles / (a.durationSec / 3600)) * 10
                      ) / 10} mph`}
                      label="Avg Speed"
                    />
                  </View>

                  {a.receipt && (
                    <View style={styles.histReceipt}>
                      <Text style={styles.histReceiptText}>
                        ✅ {a.receipt.treeSpecies} planted ·{' '}
                        {a.receipt.receiptId}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Small components ──────────────────────────────────────────────────────────

function MetricCard({
  icon,
  title,
  value,
  unit,
  color,
}: {
  icon: string;
  title: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={[styles.metricCard, { borderTopColor: color }]}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
    </View>
  );
}

function EquivRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.equivRow}>
      <View style={styles.equivIconWrap}>
        <Text style={styles.equivIcon}>{icon}</Text>
      </View>
      <Text style={styles.equivText}>{text}</Text>
    </View>
  );
}

function EmptyCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function HistStat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.histStatBox}>
      <Text style={styles.histStatIcon}>{icon}</Text>
      <Text style={styles.histStatVal}>{value}</Text>
      <Text style={styles.histStatLabel}>{label}</Text>
    </View>
  );
}

function HistSummaryItem({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.histSummaryItem}>
      <Text style={styles.histSummaryVal}>{value}</Text>
      <Text style={styles.histSummaryLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxxl },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  tabActive: {
    borderBottomWidth: 2.5,
    borderBottomColor: COLORS.primary,
  },
  tabIcon: { fontSize: 16 },
  tabLabel: {
    ...TYPOGRAPHY.micro,
    color: COLORS.textMuted,
    letterSpacing: 0.3,
  },
  tabLabelActive: { color: COLORS.primary, fontWeight: '800' },

  // Banner
  banner: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.lg,
  },
  bannerBg: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  bannerNum: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
  },
  bannerLabel: { ...TYPOGRAPHY.h3, color: '#fff' },
  bannerSub: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  veritreeBadge: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    margin: SPACING.md,
    marginTop: 0,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  veritreeText: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.55)',
  },

  // Metrics
  metricsRow: { flexDirection: 'row', marginBottom: SPACING.md },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderTopWidth: 3,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  metricIcon: { fontSize: 28, marginBottom: 4 },
  metricTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metricValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  metricUnit: { ...TYPOGRAPHY.small, color: COLORS.textMuted },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },

  // Equiv
  equivRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  equivIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equivIcon: { fontSize: 18 },
  equivText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
    lineHeight: 21,
  },

  // Activity cards
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  actCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  actLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  actTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actType: { ...TYPOGRAPHY.h4, color: COLORS.text },
  actDate: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  actRight: { position: 'absolute', top: SPACING.md, right: SPACING.md, alignItems: 'flex-end', gap: 4 },
  treePill: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  treePillText: {
    color: COLORS.primaryDark,
    fontWeight: '800',
    fontSize: 13,
  },
  actMiles: { ...TYPOGRAPHY.small, color: COLORS.textMuted, fontWeight: '600' },
  receiptBadge: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  receiptText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Level hero
  levelHero: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  levelHeroBg: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  levelHeroLabel: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  levelHeroName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  levelHeroPoints: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: -1,
    marginBottom: SPACING.md,
  },
  levelHeroPtLabel: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  levelProgressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  levelProgressCaption: {
    ...TYPOGRAPHY.small,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },

  // Earn rows
  earnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  earnIcon: { fontSize: 20, width: 28 },
  earnAction: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, flex: 1 },
  ptsBadge: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
  },
  ptsText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },

  // Event cards
  eventCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  eventLabel: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },
  eventTime: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  eventPtsBadge: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  eventPtsText: { color: COLORS.primary, fontWeight: '900', fontSize: 16 },

  // Badges
  badgeSummaryCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    ...SHADOWS.lg,
  },
  badgeSummaryLeft: {},
  badgeSummaryNum: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  badgeSummaryTotal: { fontSize: 28, color: 'rgba(255,255,255,0.4)' },
  badgeSummaryLabel: { ...TYPOGRAPHY.body, color: 'rgba(255,255,255,0.55)' },
  badgeSummaryRight: { flex: 1 },
  badgeProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  badgeSummaryPct: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.4)' },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badgeCard: {
    width: '47.5%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  badgeCardUnlocked: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.primarySurface,
  },
  badgeIcon: { fontSize: 40, marginBottom: 8 },
  badgeIconLocked: { opacity: 0.4 },
  badgeName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDesc: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  badgeUnlockedTag: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  badgeUnlockedText: {
    ...TYPOGRAPHY.micro,
    color: '#fff',
    letterSpacing: 0.5,
  },

  // History
  historySummary: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  histSummaryItem: { alignItems: 'center' },
  histSummaryVal: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  histSummaryLabel: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  histDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  histCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  histCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  histTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  histTypeName: { ...TYPOGRAPHY.h3, color: COLORS.text },
  histDate: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  histTreePill: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginLeft: 'auto',
  },
  histTreeText: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 14 },
  histStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  histStatBox: { alignItems: 'center', gap: 2 },
  histStatIcon: { fontSize: 16 },
  histStatVal: { ...TYPOGRAPHY.h4, color: COLORS.primary },
  histStatLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },
  histReceipt: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  histReceiptText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Empty
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.sm },
  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.xs },
  emptyBody: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});