import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import LiveMap from '../components/LiveMap';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Button, Pill, Segmented, Banner, Sheet } from '../components/ui';

import { COLORS, RADIUS, SPACING, TREE_RULES, TYPOGRAPHY } from '../constants/theme';
import {
  Coord,
  getCurrentPosition,
  smoothDelta,
  startTracking,
  Subscription,
} from '../services/location';
import { computeTrees, useActivity } from '../context/ActivityContext';
import { useSettings } from '../constants/SettingsContext';
import { useApp } from '../context/AppContext';
import { useWeather } from '../context/WeatherContext';
import { detectCurrentTrail } from '../services/trailDetection';
import { FLAG_MESSAGES } from '../services/trailDetection';
import { LEVEL_META } from '../services/weather';
import { Trail } from '../constants/austinTrails';

type Mode = 'hike' | 'bike';

type FinishResult = {
  miles: number;
  trees: number;
  points: number;
  trailName: string | null;
  trailCompleted: boolean;
  rejected: boolean;
  rejectionReason: string | null;
};

export default function TrackScreen() {
  const navigation = useNavigation<any>();
  const { addActivity } = useActivity();
  const { formatDistance, formatDistanceUnit } = useSettings();
  const { permission, requestLocation, trails } = useApp();
  const { report } = useWeather();

  const [mode, setMode] = useState<Mode>('hike');
  const [path, setPath] = useState<Coord[]>([]);
  const [current, setCurrent] = useState<Coord | undefined>();
  const [miles, setMiles] = useState(0);
  const [tracking, setTracking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [showWeatherWarning, setShowWeatherWarning] = useState(false);

  const subRef = useRef<Subscription | null>(null);
  const lastRef = useRef<Coord | undefined>(undefined);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  /* ── Drop an initial pin ───────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      const c = await getCurrentPosition();
      if (c) setCurrent(c);
    })();
  }, []);

  /* ── Timer ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!tracking || paused || !startedAt) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(t);
  }, [tracking, paused, startedAt]);

  /* ── Clean up on unmount ───────────────────────────────────────────────── */
  useEffect(() => () => subRef.current?.remove(), []);

  const nearbyTrail: Trail | null = useMemo(
    () => detectCurrentTrail(current, trails.length ? trails : undefined),
    [current, trails]
  );

  const trees = computeTrees(mode, miles);
  const perTree = mode === 'bike' ? TREE_RULES.bikeMilesPerTree : TREE_RULES.hikeMilesPerTree;
  const toNextTree = Math.max(0, (trees + 1) * perTree - miles);

  /* ── Start / stop ──────────────────────────────────────────────────────── */
  const beginTracking = useCallback(async () => {
    const coords = await requestLocation();
    if (!coords && Platform.OS !== 'web') {
      Alert.alert(
        'Location needed',
        'EcoTrek measures your distance from GPS. Turn on location access for EcoTrek in your phone settings to track an activity.',
        [{ text: 'OK' }]
      );
      return;
    }

    setPath([]);
    setMiles(0);
    setElapsed(0);
    setResult(null);
    lastRef.current = undefined;
    const now = Date.now();
    setStartedAt(now);
    setTracking(true);
    setPaused(false);

    subRef.current = await startTracking(
      (coord) => {
        if (pausedRef.current) return;
        const delta = smoothDelta(lastRef.current, coord);
        if (delta > 0) setMiles((m) => m + delta);
        lastRef.current = coord;
        setCurrent(coord);
        setPath((p) => [...p, coord]);
      },
      {
        mode: 'gps',
        onError: (err) => {
          console.warn('[track]', err);
        },
      }
    );
  }, [requestLocation]);

  const handleStart = useCallback(() => {
    // Hard stop on genuinely dangerous conditions — the user can still
    // override, but they have to read why first.
    if (report && report.level === 'danger') {
      setShowWeatherWarning(true);
      return;
    }
    beginTracking();
  }, [report, beginTracking]);

  const handleFinish = useCallback(async () => {
    if (!startedAt) return;
    subRef.current?.remove();
    subRef.current = null;
    setTracking(false);
    setPaused(false);
    setSaving(true);

    try {
      const res = await addActivity({
        type: mode,
        startedAt,
        endedAt: Date.now(),
        miles,
        durationSec: elapsed,
        path,
      });
      setResult({
        miles,
        trees: res.treesAwarded,
        points: res.pointsAwarded,
        trailName: res.trailName,
        trailCompleted: res.trailCompleted,
        rejected: res.rejected,
        rejectionReason: res.rejectionReason,
      });
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Something went wrong saving that activity.');
    } finally {
      setSaving(false);
      setStartedAt(null);
    }
  }, [startedAt, mode, miles, elapsed, path, addActivity]);

  const handleDiscard = () => {
    Alert.alert('Discard this activity?', 'Your distance so far will not be saved.', [
      { text: 'Keep tracking', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          subRef.current?.remove();
          subRef.current = null;
          setTracking(false);
          setPaused(false);
          setPath([]);
          setMiles(0);
          setElapsed(0);
          setStartedAt(null);
        },
      },
    ]);
  };

  return (
    <Screen>
      <Header
        title="Track"
        subtitle={tracking ? (paused ? 'Paused' : 'Recording') : 'Ready'}
        actions={[{ icon: 'shield', onPress: () => navigation.navigate('Safety'), label: 'Safety' }]}
      />

      <View style={styles.body}>
        {/* Weather gate */}
        {report && report.level !== 'good' && !tracking ? (
          <Banner
            tone={report.level === 'danger' ? 'danger' : report.level === 'warning' ? 'warning' : 'info'}
            icon={report.level === 'danger' ? 'alert-triangle' : 'info'}
            title={report.headline}
            message={report.summary}
            onPress={() => navigation.navigate('Conditions')}
          />
        ) : null}

        {/* Mode */}
        {!tracking && !result ? (
          <Segmented
            options={[
              { value: 'hike', label: 'Hike', icon: 'boot' },
              { value: 'bike', label: 'Bike', icon: 'bike' },
            ]}
            value={mode}
            onChange={(v) => setMode(v as Mode)}
          />
        ) : null}

        {/* Live numbers */}
        <Card style={styles.statsCard}>
          <View style={styles.primaryStat}>
            <Text style={styles.distanceValue}>{formatDistance(miles)}</Text>
            <Text style={styles.distanceUnit}>{formatDistanceUnit()}</Text>
          </View>

          <View style={styles.secondaryStats}>
            <SmallStat icon="clock" value={formatTime(elapsed)} label="Time" />
            <SmallStat
              icon="trending-up"
              value={elapsed > 0 ? (miles / (elapsed / 3600)).toFixed(1) : '0.0'}
              label="mph"
            />
            <SmallStat icon="tree" value={String(trees)} label="Trees" />
          </View>

          {!result ? (
            <View style={styles.nextTree}>
              <Icon name="leaf" size={13} color={COLORS.primary} strokeWidth={2} />
              <Text style={styles.nextTreeText}>
                {formatDistance(toNextTree)} {formatDistanceUnit()} to your next tree
              </Text>
            </View>
          ) : null}
        </Card>

        {/* Trail detection */}
        {nearbyTrail && !result ? (
          <Card tone="sunken">
            <View style={styles.detectRow}>
              <View style={styles.detectIcon}>
                <Icon name="map-pin" size={16} color={COLORS.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detectLabel}>Trail detected</Text>
                <Text style={styles.detectName} numberOfLines={1}>
                  {nearbyTrail.name}
                </Text>
              </View>
              <Pill label={`${nearbyTrail.distanceMiles} mi`} tone="neutral" size="sm" />
            </View>
            {tracking ? (
              <Text style={styles.detectHint}>
                Cover {(nearbyTrail.distanceMiles * 0.7).toFixed(1)} mi to log this as a completion.
              </Text>
            ) : null}
          </Card>
        ) : null}

        {/* Map */}
        <View style={styles.mapWrap}>
          <LiveMap path={path} current={current} height={240} follow={tracking && !paused} />
        </View>

        {/* Controls */}
        {result ? (
          <ResultCard
            result={result}
            formatDistance={formatDistance}
            unit={formatDistanceUnit()}
            onDone={() => {
              setResult(null);
              setPath([]);
              setMiles(0);
              setElapsed(0);
            }}
            onViewImpact={() => navigation.navigate('Impact')}
          />
        ) : tracking ? (
          <View style={styles.controls}>
            <Button
              label={paused ? 'Resume' : 'Pause'}
              icon={paused ? 'play' : 'pause'}
              variant="secondary"
              onPress={() => setPaused((p) => !p)}
              style={{ flex: 1 }}
            />
            <Button
              label="Finish"
              icon="stop"
              onPress={handleFinish}
              loading={saving}
              style={{ flex: 1.4 }}
            />
          </View>
        ) : (
          <View style={{ gap: SPACING.sm }}>
            <Button
              label={`Start ${mode === 'bike' ? 'ride' : 'hike'}`}
              icon="play"
              size="lg"
              full
              onPress={handleStart}
            />
            {permission === 'denied' ? (
              <Text style={styles.permissionNote}>
                Location access is off, so distance cannot be measured. Enable it in your phone's
                settings for EcoTrek.
              </Text>
            ) : null}
          </View>
        )}

        {tracking ? (
          <Pressable onPress={handleDiscard} style={styles.discard}>
            <Text style={styles.discardText}>Discard activity</Text>
          </Pressable>
        ) : null}

        {/* How trees work */}
        {!tracking && !result ? (
          <Card tone="sunken">
            <Text style={styles.explainTitle}>How trees are earned</Text>
            <Text style={styles.explainText}>
              1 tree per {TREE_RULES.hikeMilesPerTree} mile hiked, 1 per {TREE_RULES.bikeMilesPerTree}{' '}
              miles biked. Trees are a symbolic measure of your effort inside EcoTrek — they are not
              real trees planted on your behalf.
            </Text>
          </Card>
        ) : null}
      </View>

      {/* Danger override */}
      <Sheet
        visible={showWeatherWarning}
        onClose={() => setShowWeatherWarning(false)}
        title={report ? report.headline : 'Dangerous conditions'}
        subtitle={report ? LEVEL_META[report.level].label : undefined}
      >
        <View style={{ gap: SPACING.md }}>
          {report?.advisories.slice(0, 3).map((a) => (
            <View key={a.id} style={styles.warnRow}>
              <Icon name={a.icon as IconName} size={18} color={COLORS.danger} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.warnTitle}>{a.title}</Text>
                <Text style={styles.warnDetail}>{a.detail}</Text>
              </View>
            </View>
          ))}

          {report?.bestWindow ? (
            <Banner
              tone="info"
              icon="clock"
              title={`Try ${report.bestWindow} instead`}
              message="Lowest-risk window in the next 14 hours."
            />
          ) : null}

          <Button
            label="Not today"
            full
            onPress={() => setShowWeatherWarning(false)}
          />
          <Button
            label="I understand the risk, start anyway"
            variant="ghost"
            tone={COLORS.textMuted}
            full
            onPress={() => {
              setShowWeatherWarning(false);
              beginTracking();
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

function ResultCard({
  result,
  formatDistance,
  unit,
  onDone,
  onViewImpact,
}: {
  result: FinishResult;
  formatDistance: (m: number) => string;
  unit: string;
  onDone: () => void;
  onViewImpact: () => void;
}) {
  if (result.rejected) {
    return (
      <Card style={{ borderColor: '#EBD9B8', backgroundColor: COLORS.warningLight }}>
        <View style={styles.resultHead}>
          <Icon name="alert-circle" size={20} color={COLORS.warning} strokeWidth={2} />
          <Text style={styles.resultTitle}>Not counted</Text>
        </View>
        <Text style={styles.resultText}>
          {FLAG_MESSAGES[result.rejectionReason ?? ''] ??
            'This activity did not pass our checks and was not counted.'}
        </Text>
        <Button label="OK" variant="secondary" full onPress={onDone} style={{ marginTop: SPACING.md - 2 }} />
      </Card>
    );
  }

  return (
    <Card style={{ borderColor: COLORS.primaryGlow, backgroundColor: COLORS.primarySurface }}>
      <View style={styles.resultHead}>
        <Icon name="check-circle" size={20} color={COLORS.primary} strokeWidth={2} />
        <Text style={styles.resultTitle}>Activity saved</Text>
      </View>

      <View style={styles.resultStats}>
        <View style={styles.resultStat}>
          <Text style={styles.resultValue}>
            {formatDistance(result.miles)}
            <Text style={styles.resultUnit}> {unit}</Text>
          </Text>
          <Text style={styles.resultLabel}>Distance</Text>
        </View>
        <View style={styles.resultStat}>
          <Text style={styles.resultValue}>{result.trees}</Text>
          <Text style={styles.resultLabel}>Trees</Text>
        </View>
        <View style={styles.resultStat}>
          <Text style={styles.resultValue}>+{result.points}</Text>
          <Text style={styles.resultLabel}>Points</Text>
        </View>
      </View>

      {result.trailCompleted && result.trailName ? (
        <View style={styles.trailBadge}>
          <Icon name="flag" size={14} color={COLORS.primary} strokeWidth={2.1} />
          <Text style={styles.trailBadgeText}>Completed {result.trailName}</Text>
        </View>
      ) : result.trailName ? (
        <Text style={styles.resultText}>Logged on {result.trailName}.</Text>
      ) : null}

      <View style={[styles.controls, { marginTop: SPACING.md - 2 }]}>
        <Button label="Done" variant="secondary" onPress={onDone} style={{ flex: 1 }} />
        <Button label="View impact" onPress={onViewImpact} style={{ flex: 1 }} iconRight="arrow-right" />
      </View>
    </Card>
  );
}

function SmallStat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.smallStat}>
      <Icon name={icon} size={14} color={COLORS.textMuted} strokeWidth={1.9} />
      <Text style={styles.smallStatValue}>{value}</Text>
      <Text style={styles.smallStatLabel}>{label}</Text>
    </View>
  );
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },

  statsCard: { alignItems: 'center', gap: SPACING.md - 2 },
  primaryStat: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  distanceValue: { fontSize: 56, fontWeight: '700', color: COLORS.text, letterSpacing: -2.5 },
  distanceUnit: { ...TYPOGRAPHY.h2, color: COLORS.textMuted, fontWeight: '600' },
  secondaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    paddingTop: SPACING.md - 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  smallStat: { alignItems: 'center', gap: 3 },
  smallStatValue: { ...TYPOGRAPHY.h3, color: COLORS.text },
  smallStatLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },
  nextTree: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nextTreeText: { ...TYPOGRAPHY.small, color: COLORS.primary, fontWeight: '500' },

  detectRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
  detectIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },
  detectName: { ...TYPOGRAPHY.h4, color: COLORS.text },
  detectHint: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: SPACING.sm },

  mapWrap: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  controls: { flexDirection: 'row', gap: SPACING.sm },
  discard: { alignSelf: 'center', padding: SPACING.sm },
  discardText: { ...TYPOGRAPHY.small, color: COLORS.textMuted, textDecorationLine: 'underline' },
  permissionNote: { ...TYPOGRAPHY.small, color: COLORS.textMuted, textAlign: 'center' },

  resultHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  resultTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  resultText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginTop: SPACING.sm },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  resultStat: { alignItems: 'center', flex: 1 },
  resultValue: { ...TYPOGRAPHY.h1, color: COLORS.text },
  resultUnit: { ...TYPOGRAPHY.h4, color: COLORS.textMuted },
  resultLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },
  trailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md - 2,
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  trailBadgeText: { ...TYPOGRAPHY.smallMed, color: COLORS.primary },

  warnRow: { flexDirection: 'row', gap: SPACING.sm + 2, alignItems: 'flex-start' },
  warnTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  warnDetail: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginTop: 2 },

  explainTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: 4 },
  explainText: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
});
