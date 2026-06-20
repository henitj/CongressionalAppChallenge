import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import Header from '../components/Header';
import LiveMap from '../components/LiveMap';
import PrimaryButton from '../components/PrimaryButton';
import StatCard from '../components/StatCard';
import {
  COLORS,
  RADIUS,
  SPACING,
  TREE_RULES,
  TYPOGRAPHY,
  SHADOWS,
} from '../constants/theme';
import {
  Coord,
  getCurrentPosition,
  smoothDelta,
  startTracking,
  Subscription,
} from '../services/location';
import { computeTrees, useActivity } from '../context/ActivityContext';
import { useEcoPoints } from '../constants/EcoPointsContext';

type Mode = 'hike' | 'bike';

export default function TrackScreen() {
  const [mode, setMode] = useState<Mode>('bike');
  const [path, setPath] = useState<Coord[]>([]);
  const [current, setCurrent] = useState<Coord | undefined>(undefined);
  const [miles, setMiles] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [savingTrees, setSavingTrees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warmingUp, setWarmingUp] = useState(false);
  const [justFinished, setJustFinished] = useState<{
    miles: number;
    trees: number;
    points: number;
  } | null>(null);

  const startedAt = useRef<number | null>(null);
  const subRef = useRef<Subscription | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoordRef = useRef<Coord | undefined>(undefined);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { addActivity } = useActivity();
  const { addPoints } = useEcoPoints();

  // Drop pin on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pos = await getCurrentPosition();
      if (!cancelled && pos) setCurrent(pos);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subRef.current?.remove();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Pulse animation when tracking
  useEffect(() => {
    if (tracking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [tracking]);

  // Fade in result card
  useEffect(() => {
    if (justFinished) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [justFinished]);

  const start = async () => {
    setError(null);
    setJustFinished(null);
    setPath([]);
    setMiles(0);
    setElapsed(0);
    lastCoordRef.current = undefined;
    startedAt.current = Date.now();
    setTracking(true);
    setWarmingUp(true);

    tickRef.current = setInterval(() => {
      if (startedAt.current) {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      }
    }, 1000);

    subRef.current = await startTracking(
      (c) => {
        setWarmingUp(false);
        setCurrent(c);
        const delta = smoothDelta(lastCoordRef.current, c);
        if (delta > 0) {
          setMiles((m) => m + delta);
          setPath((prev) => [...prev, c]);
          lastCoordRef.current = c;
        } else if (!lastCoordRef.current) {
          setPath((prev) => (prev.length === 0 ? [c] : prev));
          lastCoordRef.current = c;
        }
      },
      {
        mode: 'gps',
        onError: (e) => setError(e.message),
      }
    );
  };

  const stop = async () => {
    setTracking(false);
    setWarmingUp(false);
    subRef.current?.remove();
    subRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (!startedAt.current) return;

    const endedAt = Date.now();
    const duration = Math.floor((endedAt - startedAt.current) / 1000);

    setSavingTrees(true);

    const result = await addActivity({
      type: mode,
      startedAt: startedAt.current,
      endedAt,
      miles,
      durationSec: duration,
      path,
    });

    // Award EcoPoints
    let totalPointsEarned = 0;
    const wholeMiles = Math.floor(miles);
    for (let i = 0; i < wholeMiles; i++) {
      const pts = await addPoints(mode === 'bike' ? 'bike_mile' : 'hike_mile');
      totalPointsEarned += pts;
    }
    for (let i = 0; i < result.trees; i++) {
      const pts = await addPoints('tree_planted');
      totalPointsEarned += pts;
    }
    const completionPts = await addPoints('trail_completed');
    totalPointsEarned += completionPts;

    setSavingTrees(false);
    startedAt.current = null;

    setJustFinished({
      miles: result.miles,
      trees: result.trees,
      points: totalPointsEarned,
    });
  };

  const pace =
    miles > 0.01 && elapsed > 0
      ? (elapsed / 60 / miles).toFixed(1)
      : '—';
  const mph =
    miles > 0.01 && elapsed > 0
      ? ((miles / elapsed) * 3600).toFixed(1)
      : '—';
  const trees = computeTrees(mode, miles);

  return (
    <View style={styles.container}>
      <Header title="Track" subtitle="Live trail recorder" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Mode selector ── */}
        <View style={styles.modeRow}>
          <ModeButton
            icon="🚴"
            label="Bike"
            desc={`1 tree / ${TREE_RULES.bikeMilesPerTree} mi`}
            active={mode === 'bike'}
            onPress={() => !tracking && setMode('bike')}
            disabled={tracking}
          />
          <View style={{ width: SPACING.sm }} />
          <ModeButton
            icon="🥾"
            label="Hike"
            desc={`1 tree / ${TREE_RULES.hikeMilesPerTree} mi`}
            active={mode === 'hike'}
            onPress={() => !tracking && setMode('hike')}
            disabled={tracking}
          />
        </View>

        {/* ── Map ── */}
        <View style={styles.mapWrap}>
          <LiveMap
            path={path}
            current={current}
            height={300}
            follow={tracking}
          />
          {/* Live tracking badge */}
          {tracking && (
            <Animated.View
              style={[
                styles.liveBadge,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </Animated.View>
          )}
        </View>

        {/* ── Warm up banner ── */}
        {warmingUp && (
          <View style={styles.warmupBanner}>
            <Text style={styles.warmupIcon}>📡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.warmupTitle}>Acquiring GPS signal</Text>
              <Text style={styles.warmupBody}>
                Stand still for a moment for the best accuracy.
              </Text>
            </View>
          </View>
        )}

        {/* ── Error banner ── */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Location error</Text>
              <Text style={styles.errorBody}>{error}</Text>
              <Text style={styles.errorHint}>
                {Platform.OS === 'web'
                  ? 'Allow location in your browser settings (🔒 icon in address bar).'
                  : 'Go to Settings → EcoTrek → Location → While Using the App.'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Stats grid ── */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Distance"
            value={miles.toFixed(2)}
            unit="mi"
            icon="📏"
            accent={COLORS.primary}
          />
          <View style={{ width: SPACING.sm }} />
          <StatCard
            label="Trees"
            value={trees}
            icon="🌳"
            accent={COLORS.accent}
          />
        </View>
        <View style={[styles.statsGrid, { marginTop: SPACING.sm }]}>
          <StatCard
            label="Time"
            value={formatDuration(elapsed)}
            icon="⏱"
            accent={COLORS.sky}
          />
          <View style={{ width: SPACING.sm }} />
          <StatCard
            label={mode === 'bike' ? 'Speed' : 'Pace'}
            value={mode === 'bike' ? mph : pace}
            unit={mode === 'bike' ? 'mph' : 'min/mi'}
            icon={mode === 'bike' ? '⚡' : '👟'}
            accent={COLORS.primaryLight}
          />
        </View>

        {/* ── Planting rule ── */}
        <View style={styles.ruleCard}>
          <View style={styles.ruleLeft}>
            <Text style={styles.ruleIcon}>
              {mode === 'bike' ? '🚴' : '🥾'}
            </Text>
            <View>
              <Text style={styles.ruleTitle}>Planting rule</Text>
              <Text style={styles.ruleBody}>
                {mode === 'bike'
                  ? `1 tree every ${TREE_RULES.bikeMilesPerTree} bike mile`
                  : `1 tree every ${TREE_RULES.hikeMilesPerTree} hiked mile`}
              </Text>
            </View>
          </View>
          <View style={styles.rulePoints}>
            <Text style={styles.rulePointsVal}>
              +{mode === 'bike' ? 8 : 10}
            </Text>
            <Text style={styles.rulePointsLabel}>pts/mi</Text>
          </View>
        </View>

        {/* ── CTA button ── */}
        {!tracking ? (
          <PrimaryButton
            title={
              savingTrees
                ? 'Planting trees…'
                : `Start ${mode === 'bike' ? 'bike ride' : 'hike'}`
            }
            onPress={start}
            loading={savingTrees}
            icon={mode === 'bike' ? '🚴' : '🥾'}
            size="lg"
            style={styles.ctaBtn}
          />
        ) : (
          <PrimaryButton
            title="Finish & plant trees"
            onPress={stop}
            variant="danger"
            icon="🌳"
            size="lg"
            style={styles.ctaBtn}
          />
        )}

        {/* ── Result card ── */}
        {justFinished && (
          <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultEmoji}>🎉</Text>
              <Text style={styles.resultTitle}>Trek complete!</Text>
            </View>

            <View style={styles.resultStats}>
              <ResultStat
                icon="📏"
                value={`${justFinished.miles.toFixed(2)} mi`}
                label="Distance"
              />
              <View style={styles.resultDivider} />
              <ResultStat
                icon="🌳"
                value={String(justFinished.trees)}
                label="Trees"
              />
              <View style={styles.resultDivider} />
              <ResultStat
                icon="⭐"
                value={`+${justFinished.points}`}
                label="EcoPoints"
              />
            </View>

            {justFinished.trees > 0 ? (
              <Text style={styles.resultMsg}>
                🌱 Your{' '}
                {justFinished.trees === 1 ? 'tree has' : 'trees have'} been
                scheduled for planting with Veritree in Austin, TX.
              </Text>
            ) : (
              <Text style={styles.resultMsg}>
                Keep going! You need a little more distance to unlock your
                next tree. 💪
              </Text>
            )}

            <Pressable
              style={styles.resultDismiss}
              onPress={() => setJustFinished(null)}
            >
              <Text style={styles.resultDismissText}>Dismiss</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Tips while tracking ── */}
        {tracking && (
          <View style={styles.trackingTips}>
            <Text style={styles.trackingTipsTitle}>
              💡 Tips while tracking
            </Text>
            <Text style={styles.trackingTip}>
              • Keep the app open for accurate GPS
            </Text>
            <Text style={styles.trackingTip}>
              • Screen can dim — tracking continues
            </Text>
            <Text style={styles.trackingTip}>
              • Hit Finish when you're done to plant your trees
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Small components ──────────────────────────────────────────────────────────

function ModeButton({
  icon,
  label,
  desc,
  active,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  desc: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.modeBtn,
        active && styles.modeBtnActive,
        disabled && { opacity: 0.6 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={styles.modeIcon}>{icon}</Text>
      <Text style={[styles.modeLabel, active && { color: '#fff' }]}>
        {label}
      </Text>
      <Text style={[styles.modeDesc, active && { color: 'rgba(255,255,255,0.7)' }]}>
        {desc}
      </Text>
    </Pressable>
  );
}

function ResultStat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.resultStatBox}>
      <Text style={styles.resultStatIcon}>{icon}</Text>
      <Text style={styles.resultStatVal}>{value}</Text>
      <Text style={styles.resultStatLabel}>{label}</Text>
    </View>
  );
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, '0')}:${r
      .toString()
      .padStart(2, '0')}`;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxxl },

  // Mode selector
  modeRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  modeBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  modeIcon: { fontSize: 28, marginBottom: 4 },
  modeLabel: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: 2,
  },
  modeDesc: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },

  // Map
  mapWrap: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
    position: 'relative',
  },
  liveBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    gap: 5,
    ...SHADOWS.sm,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },

  // Banners
  warmupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  warmupIcon: { fontSize: 24 },
  warmupTitle: { ...TYPOGRAPHY.h4, color: COLORS.warning },
  warmupBody: { ...TYPOGRAPHY.small, color: COLORS.text, marginTop: 2 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  errorIcon: { fontSize: 24 },
  errorTitle: { ...TYPOGRAPHY.h4, color: COLORS.danger },
  errorBody: {
    ...TYPOGRAPHY.small,
    color: COLORS.text,
    marginTop: 2,
  },
  errorHint: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Stats
  statsGrid: { flexDirection: 'row' },

  // Rule card
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primaryGlow,
  },
  ruleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  ruleIcon: { fontSize: 28 },
  ruleTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ruleBody: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, marginTop: 2 },
  rulePoints: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rulePointsVal: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  rulePointsLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
  },

  // CTA button
  ctaBtn: { marginBottom: SPACING.md },

  // Result card
  resultCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.xl,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  resultEmoji: { fontSize: 36 },
  resultTitle: {
    ...TYPOGRAPHY.h1,
    color: '#fff',
    fontSize: 26,
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  resultStatBox: { alignItems: 'center', gap: 4 },
  resultStatIcon: { fontSize: 22 },
  resultStatVal: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  resultStatLabel: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resultDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  resultMsg: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  resultDismiss: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  resultDismissText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    fontSize: 14,
  },

  // Tracking tips
  trackingTips: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  trackingTipsTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  trackingTip: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginBottom: 4,
    lineHeight: 20,
  },
});