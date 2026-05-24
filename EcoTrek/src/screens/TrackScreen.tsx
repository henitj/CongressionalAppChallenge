import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import Header from '../components/Header';
import LiveMap from '../components/LiveMap';
import PrimaryButton from '../components/PrimaryButton';
import StatCard from '../components/StatCard';
import { COLORS, RADIUS, SPACING, TREE_RULES, TYPOGRAPHY } from '../constants/theme';
import {
  Coord,
  getCurrentPosition,
  smoothDelta,
  startTracking,
  Subscription,
} from '../services/location';
import { computeTrees, useActivity } from '../context/ActivityContext';

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

  const startedAt = useRef<number | null>(null);
  const subRef = useRef<Subscription | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoordRef = useRef<Coord | undefined>(undefined);

  const { addActivity } = useActivity();

  // Drop the user's pin on the map immediately when the screen mounts
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

  // Cleanup
  useEffect(() => {
    return () => {
      subRef.current?.remove();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const start = async () => {
    setError(null);
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
        // accumulate only the smoothed delta — protects against GPS jitter
        const delta = smoothDelta(lastCoordRef.current, c);
        if (delta > 0) {
          setMiles((m) => m + delta);
          setPath((prev) => [...prev, c]);
          lastCoordRef.current = c;
        } else if (!lastCoordRef.current) {
          // seed the first point so we have a polyline anchor
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
    setSavingTrees(false);

    const msg =
      result.trees > 0
        ? `Nice! ${result.miles.toFixed(2)} mi tracked and ${result.trees} tree${
            result.trees > 1 ? 's' : ''
          } scheduled for planting with Veritree (${result.receipt?.treeSpecies}).`
        : `You logged ${result.miles.toFixed(
            2
          )} mi. Keep going to unlock your next tree!`;

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      window.alert(msg);
    } else {
      Alert.alert('Activity complete', msg);
    }

    startedAt.current = null;
  };

  const pace =
    miles > 0.01 && elapsed > 0 ? (elapsed / 60 / miles).toFixed(1) : '—';
  const mph = miles > 0.01 && elapsed > 0 ? ((miles / elapsed) * 3600).toFixed(1) : '—';
  const trees = computeTrees(mode, miles);

  return (
    <View style={styles.container}>
      <Header title="Track" subtitle="Live trail recorder" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.modeRow}>
          <ModePill
            label="🚴 Bike"
            active={mode === 'bike'}
            onPress={() => !tracking && setMode('bike')}
          />
          <ModePill
            label="🥾 Hike"
            active={mode === 'hike'}
            onPress={() => !tracking && setMode('hike')}
          />
        </View>

        <LiveMap path={path} current={current} height={280} follow={tracking} />

        {warmingUp && (
          <View style={styles.warmupBanner}>
            <Text style={styles.warmupText}>
              📡 Acquiring GPS… stand still for a moment for the best fix.
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <Text style={styles.errorHint}>
              {Platform.OS === 'web'
                ? 'Make sure your browser has location permission for this page (look for the 🔒 icon in the address bar).'
                : 'Open Settings → EcoTrek → Location and choose "While Using the App".'}
            </Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <StatCard label="Distance" value={miles.toFixed(2)} unit="mi" />
          <View style={{ width: SPACING.sm }} />
          <StatCard label="Trees" value={trees} accent={COLORS.primary} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Time" value={formatDuration(elapsed)} />
          <View style={{ width: SPACING.sm }} />
          <StatCard label={mode === 'bike' ? 'mph' : 'min/mi'} value={mode === 'bike' ? mph : pace} />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Planting rule</Text>
          <Text style={styles.infoText}>
            {mode === 'bike'
              ? `1 tree planted every ${TREE_RULES.bikeMilesPerTree} bike mile`
              : `1 tree planted every ${TREE_RULES.hikeMilesPerTree} hiked mile`}
          </Text>
        </View>

        {!tracking ? (
          <PrimaryButton
            title={savingTrees ? 'Planting…' : `Start ${mode === 'bike' ? 'ride' : 'hike'}`}
            onPress={start}
            loading={savingTrees}
          />
        ) : (
          <PrimaryButton title="Stop & plant trees" onPress={stop} variant="danger" />
        )}
      </ScrollView>
    </View>
  );
}

function ModePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        active && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
      ]}
    >
      <Text style={[styles.pillText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  modeRow: { flexDirection: 'row', marginBottom: SPACING.md },
  pill: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  pillText: { ...TYPOGRAPHY.h3, color: COLORS.text },
  statsRow: { flexDirection: 'row', marginTop: SPACING.md },
  infoBox: {
    backgroundColor: '#EAF6EE',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.md,
  },
  infoTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoText: { ...TYPOGRAPHY.body, color: COLORS.text, marginTop: 4 },
  warmupBanner: {
    backgroundColor: '#FFF4E0',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  warmupText: { color: COLORS.bark, fontWeight: '600', textAlign: 'center' },
  errorBanner: {
    backgroundColor: '#FDECEA',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  errorText: { color: COLORS.danger, fontWeight: '700' },
  errorHint: { color: COLORS.text, fontSize: 12, marginTop: 4 },
});
