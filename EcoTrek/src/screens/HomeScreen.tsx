import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Image,
} from 'react-native';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import TreeIcon from '../components/TreeIcon';
import {
  COLORS,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  TREE_RULES,
  SHADOWS,
} from '../constants/theme';
import { useActivity } from '../context/ActivityContext';
import { useAuth } from '../context/AuthContext';
import { useEcoPoints } from '../constants/EcoPointsContext';

export default function HomeScreen() {
  const { totalMiles, totalTrees, history } = useActivity();
  const { user } = useAuth();
  const { totalPoints, level, progressPercent, nextLevelPoints } =
    useEcoPoints();

  const firstName = user?.name?.split(' ')[0] ?? 'Trekker';
  const lastActivity = history[0];

  // Animate in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const timeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      <Header
        title={`${timeOfDay()}, ${firstName}`}
        subtitle="Explore · Learn · Protect"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Hero forest card ── */}
          <View style={styles.hero}>
            {/* Background pattern */}
            <View style={styles.heroBg} />

            <View style={styles.heroContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>YOUR FOREST</Text>
                <Text style={styles.heroValue}>{totalTrees}</Text>
                <Text style={styles.heroLabel}>
                  {totalTrees === 1 ? 'tree planted' : 'trees planted'}
                </Text>
                <Text style={styles.heroSub}>
                  via {totalMiles.toFixed(1)} mi of Austin trails
                </Text>

                {/* Mini progress bar */}
                <View style={styles.heroProgress}>
                  <View
                    style={[
                      styles.heroProgressBar,
                      {
                        width: `${Math.min(
                          ((totalTrees % 10) / 10) * 100,
                          100
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.heroProgressLabel}>
                  {10 - (totalTrees % 10)} trees to next milestone
                </Text>
              </View>

              <View style={styles.heroIcon}>
                <TreeIcon size={72} color="rgba(255,255,255,0.9)" />
              </View>
            </View>

            {/* Veritree badge */}
            <View style={styles.veritreeBadge}>
              <Text style={styles.veritreeText}>✅ Verified by Veritree</Text>
            </View>
          </View>

          {/* ── EcoPoints card ── */}
          <View style={styles.ecoCard}>
            <View style={styles.ecoCardTop}>
              <View>
                <Text style={styles.ecoLabel}>ECOPOINTS</Text>
                <Text style={styles.ecoValue}>
                  {totalPoints.toLocaleString()}
                </Text>
              </View>
              <View style={styles.ecoLevelBadge}>
                <Text style={styles.ecoLevelText}>{level}</Text>
              </View>
            </View>

            {/* Progress */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.progressCaption}>
              {nextLevelPoints - totalPoints > 0
                ? `${(
                    nextLevelPoints - totalPoints
                  ).toLocaleString()} pts to next level`
                : '🎉 Max level reached!'}
            </Text>
          </View>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            <StatCard
              label="Miles"
              value={totalMiles.toFixed(1)}
              unit="mi"
              icon="🗺️"
              accent={COLORS.primary}
            />
            <View style={{ width: SPACING.sm }} />
            <StatCard
              label="Treks"
              value={history.length}
              icon="🥾"
              accent={COLORS.sky}
            />
            <View style={{ width: SPACING.sm }} />
            <StatCard
              label="Trees"
              value={totalTrees}
              icon="🌳"
              accent={COLORS.accent}
            />
          </View>

          {/* ── Quick actions ── */}
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actionsGrid}>
            <ActionCard
              icon="🥾"
              label="Start Hike"
              color={COLORS.primary}
              desc="Log your trail"
            />
            <ActionCard
              icon="🗺️"
              label="Find Trails"
              color={COLORS.sky}
              desc="Nearby spots"
            />
            <ActionCard
              icon="✨"
              label="AI Guide"
              color={COLORS.accent}
              desc="Ask anything"
            />
            <ActionCard
              icon="🌍"
              label="My Impact"
              color={COLORS.primaryMid}
              desc="See your stats"
            />
          </View>

          {/* ── Last activity ── */}
          {lastActivity ? (
            <>
              <Text style={styles.sectionTitle}>Last trek</Text>
              <View style={styles.lastActivityCard}>
                <View style={styles.lastActLeft}>
                  <View style={styles.lastActIcon}>
                    <Text style={{ fontSize: 28 }}>
                      {lastActivity.type === 'bike' ? '🚴' : '🥾'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.lastActType}>
                      {lastActivity.type === 'bike'
                        ? 'Bike Ride'
                        : 'Hike'}
                    </Text>
                    <Text style={styles.lastActDate}>
                      {new Date(lastActivity.startedAt).toLocaleDateString(
                        'en-US',
                        {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        }
                      )}
                    </Text>
                  </View>
                </View>
                <View style={styles.lastActStats}>
                  <LastActStat
                    value={lastActivity.miles.toFixed(2)}
                    label="miles"
                  />
                  <LastActStat
                    value={String(lastActivity.trees)}
                    label="trees"
                  />
                  <LastActStat
                    value={`${Math.round(lastActivity.durationSec / 60)}m`}
                    label="time"
                  />
                </View>
                {lastActivity.receipt && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptText}>
                      ✅ {lastActivity.receipt.treeSpecies} ·{' '}
                      {lastActivity.receipt.receiptId}
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Get started</Text>
              <View style={styles.getStartedCard}>
                <Text style={styles.getStartedEmoji}>🚀</Text>
                <Text style={styles.getStartedTitle}>
                  Your first trek awaits
                </Text>
                <Text style={styles.getStartedBody}>
                  Head to the Track tab, hit start, and we'll measure your
                  distance and plant real trees when you finish.
                </Text>
                <View style={styles.getStartedSteps}>
                  <Step num="1" text="Choose hike or bike" />
                  <Step num="2" text="Hit start and explore" />
                  <Step num="3" text="Finish to plant trees" />
                </View>
              </View>
            </>
          )}

          {/* ── How it works ── */}
          <Text style={styles.sectionTitle}>How EcoTrek works</Text>
          <View style={styles.howCard}>
            <HowRow
              icon="🥾"
              title={`Hike ${TREE_RULES.hikeMilesPerTree} mi`}
              desc="Plant 1 native tree"
            />
            <View style={styles.howDivider} />
            <HowRow
              icon="🚴"
              title={`Bike ${TREE_RULES.bikeMilesPerTree} mi`}
              desc="Plant 1 native tree"
            />
            <View style={styles.howDivider} />
            <HowRow
              icon="✅"
              title="Veritree verified"
              desc="Every planting tracked"
            />
            <View style={styles.howDivider} />
            <HowRow
              icon="✨"
              title="AI nature guide"
              desc="Learn on every trail"
            />
          </View>

          {/* ── Partner card ── */}
          <View style={styles.partnerCard}>
            <View style={styles.partnerBadge}>
              <Text style={styles.partnerBadgeText}>PARTNER</Text>
            </View>
            <Text style={styles.partnerName}>🌱 Veritree × EcoTrek</Text>
            <Text style={styles.partnerBody}>
              Veritree provides satellite-verified, on-the-ground tree planting
              with local partners. Every EcoTrek mile creates a real,
              permanent impact on Austin's urban canopy.
            </Text>
          </View>

          {/* ── Did you know ── */}
          <View style={styles.factCard}>
            <Text style={styles.factEyebrow}>DID YOU KNOW?</Text>
            <Text style={styles.factText}>
              🌳 A single mature Texas Live Oak absorbs up to{' '}
              <Text style={styles.factHighlight}>48 lbs of CO₂</Text> per year
              and supports over{' '}
              <Text style={styles.factHighlight}>500 species</Text> of wildlife.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

function ActionCard({
  icon,
  label,
  color,
  desc,
}: {
  icon: string;
  label: string;
  color: string;
  desc: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      <View
        style={[styles.actionIconWrap, { backgroundColor: color + '18' }]}
      >
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionDesc}>{desc}</Text>
    </Pressable>
  );
}

function LastActStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.lastActStatBox}>
      <Text style={styles.lastActStatVal}>{value}</Text>
      <Text style={styles.lastActStatLabel}>{label}</Text>
    </View>
  );
}

function Step({ num, text }: { num: string; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{num}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function HowRow({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <View style={styles.howRow}>
      <Text style={styles.howIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.howTitle}>{title}</Text>
        <Text style={styles.howDesc}>{desc}</Text>
      </View>
      <Text style={styles.howArrow}>›</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  // Hero
  hero: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.primaryDark,
    marginBottom: SPACING.md,
    ...SHADOWS.lg,
  },
  heroBg: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  heroEyebrow: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginBottom: SPACING.xs,
  },
  heroValue: {
    fontSize: 64,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
    lineHeight: 68,
  },
  heroLabel: {
    ...TYPOGRAPHY.h3,
    color: '#fff',
    marginTop: 2,
  },
  heroSub: {
    ...TYPOGRAPHY.small,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
  heroProgress: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginTop: SPACING.md,
    overflow: 'hidden',
    width: '90%',
  },
  heroProgressBar: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  heroProgressLabel: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  heroIcon: {
    opacity: 0.9,
  },
  veritreeBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  veritreeText: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },

  // EcoPoints card
  ecoCard: {
    backgroundColor: COLORS.primaryMid,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  ecoCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ecoLabel: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  ecoValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  ecoLevelBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  ecoLevelText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  progressCaption: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 6,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },

  // Section title
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },

  // Quick actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionCard: {
    width: '47.5%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  actionIcon: { fontSize: 22 },
  actionLabel: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: 2 },
  actionDesc: { ...TYPOGRAPHY.small, color: COLORS.textMuted },

  // Last activity
  lastActivityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  lastActLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  lastActIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastActType: { ...TYPOGRAPHY.h3, color: COLORS.text },
  lastActDate: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  lastActStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  lastActStatBox: { alignItems: 'center' },
  lastActStatVal: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontSize: 20,
  },
  lastActStatLabel: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  receiptRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  receiptText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Get started
  getStartedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  getStartedEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  getStartedTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  getStartedBody: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  getStartedSteps: { width: '100%', gap: SPACING.sm },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 13,
  },
  stepText: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },

  // How it works
  howCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  howIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  howTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  howDesc: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  howArrow: { color: COLORS.textLight, fontSize: 22 },
  howDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.md,
  },

  // Partner card
  partnerCard: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
  },
  partnerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.sm,
  },
  partnerBadgeText: {
    ...TYPOGRAPHY.micro,
    color: '#fff',
    letterSpacing: 1,
  },
  partnerName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primaryDark,
    marginBottom: SPACING.xs,
  },
  partnerBody: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 23,
  },

  // Fact card
  factCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  factEyebrow: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginBottom: SPACING.xs,
  },
  factText: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
  },
  factHighlight: {
    color: COLORS.accent,
    fontWeight: '700',
  },
});