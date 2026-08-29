import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, AppState, AppStateStatus, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LiveMap from '../components/LiveMap';
import Icon, { IconName } from '../components/Icon';
import { Button } from '../components/ui';

import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { openFeedbackForm } from '../constants/feedback';
import {
  Coord,
  getCurrentPosition,
  instantMph,
  smoothDelta,
  startTracking,
  Subscription,
} from '../services/location';
import { computeTrees, useActivity } from '../context/ActivityContext';
import { useSettings } from '../constants/SettingsContext';
import { useApp } from '../context/AppContext';
import { detectCurrentTrail } from '../services/trailDetection';
import { Trail } from '../constants/austinTrails';
import { useProfile, estimateCalories } from '../context/ProfileContext';
import { useWeather } from '../context/WeatherContext';
import { useTheme, Typography } from '../context/ThemeContext';

type Mode = 'hike' | 'bike';

const SPEED_LIMITS: Record<Mode, number> = { hike: 20, bike: 30 };

export default function ActiveTrackingScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mode: Mode = route.params?.mode ?? 'hike';
  const { formatDistance, formatDistanceUnit, formatTemp } = useSettings();
  const { trails } = useApp();
  const { profile } = useProfile();
  const { addActivity, totalActivities } = useActivity();

  const [path, setPath] = useState<Coord[]>([]);
  const [current, setCurrent] = useState<Coord | undefined>();
  const [miles, setMiles] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [currentMph, setCurrentMph] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [elevationLoss, setElevationLoss] = useState(0);
  const [showSpeedAlert, setShowSpeedAlert] = useState(false);
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showRest, setShowRest] = useState(false);

  const subRef = useRef<Subscription | null>(null);
  const lastRef = useRef<Coord | undefined>(undefined);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const pausedTotalRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const strikesRef = useRef(0);

  const nearbyTrail: Trail | null = useMemo(
    () => detectCurrentTrail(current, trails.length ? trails : undefined),
    [current, trails]
  );

  const trees = computeTrees(mode, miles);
  const speedLimit = SPEED_LIMITS[mode];
  const avgMph = elapsed > 0 ? miles / (elapsed / 3600) : 0;
  const calories = estimateCalories(mode, elapsed, avgMph, profile);
  const { report } = useWeather();

  useEffect(() => {
    if (!paused && elapsed >= 25 * 60 && !showRest) setShowRest(true);
  }, [elapsed, paused, showRest]);

  const call911 = () => {
    Alert.alert(
      'Call 911?',
      'This will start an emergency call. Only continue if you need help right now.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', style: 'destructive', onPress: () => Linking.openURL('tel:911') },
      ]
    );
  };

  const togglePause = () => {
    setPaused((p) => {
      if (!p) {
        pausedAtRef.current = Date.now();
        return true;
      }
      if (pausedAtRef.current) {
        pausedTotalRef.current += Date.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      return false;
    });
  };

  // Timer — pause must not keep adding seconds.
  useEffect(() => {
    if (paused) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - startedAt - pausedTotalRef.current) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [paused, startedAt]);

  // Handle app state — keep tracking but show indicator
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsBackgrounded(state === 'background' || state === 'inactive');
    });
    return () => sub.remove();
  }, []);

  // Start tracking immediately
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const coords = await getCurrentPosition();
      if (!cancelled && coords) {
        setCurrent(coords);
        lastRef.current = coords;
      }

      subRef.current = await startTracking(
        (coord) => {
          if (pausedRef.current) return;

          // Calculate instant speed
          const mph = instantMph(lastRef.current, coord);
          setCurrentMph(mph);

          // Speed limit check
          if (mph > speedLimit && lastRef.current) {
            strikesRef.current += 1;
            if (strikesRef.current >= 3) setShowSpeedAlert(true);
          }

          // Track elevation
          if (lastRef.current?.altitude != null && coord.altitude != null) {
            const diff = (coord.altitude - lastRef.current.altitude) * 3.28084;
            if (diff > 1) setElevationGain((g) => g + diff);
            else if (diff < -1) setElevationLoss((l) => l + Math.abs(diff));
          }

          const delta = smoothDelta(lastRef.current, coord);
          if (delta > 0) setMiles((m) => m + delta);
          lastRef.current = coord;
          setCurrent(coord);
          setPath((p) => [...p, coord]);
        },
        {
          onError: (err) => console.warn('[track]', err),
          allowBackground: true,
        }
      );
    })();

    return () => {
      cancelled = true;
      subRef.current?.remove();
    };
  }, [speedLimit]);

  const handleFinish = useCallback(async () => {
    subRef.current?.remove();
    subRef.current = null;
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
        calories,
        elevationGain: Math.round(elevationGain),
        elevationLoss: Math.round(elevationLoss),
        trailName: res.trailName,
        trailCompleted: res.trailCompleted,
        rejected: res.rejected,
        rejectionReason: res.rejectionReason,
        durationSec: elapsed,
        activityNumber: totalActivities + 1,
        kind: mode,
      });
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Something went wrong saving that activity.');
    } finally {
      setSaving(false);
    }
  }, [addActivity, mode, startedAt, miles, elapsed, path, calories, elevationGain, elevationLoss, totalActivities]);

  const handleDiscard = () => {
    Alert.alert('Discard this activity?', 'Your progress will not be saved.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          subRef.current?.remove();
          navigation.goBack();
        },
      },
    ]);
  };

  // Show results screen after activity is saved
  if (result) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <View style={styles.resultContainer}>
            <Icon
              name={result.rejected ? 'alert-circle' : 'check-circle'}
              size={64}
              color={result.rejected ? colors.warning : colors.primary}
              strokeWidth={1.5}
            />
            <Text style={styles.resultTitle}>
              {result.rejected
                ? 'This one did not count'
                : celebrationTitle(result.activityNumber, result.kind)}
            </Text>
            
            {result.rejected ? (
              <Text style={styles.resultSubtitle}>
                {result.rejectionReason === 'too_short'
                  ? 'That was under a minute, so we did not save the miles.'
                  : result.rejectionReason === 'speed_too_high'
                  ? 'The speed was too high for a walk or ride, so it was not counted.'
                  : result.rejectionReason === 'too_many_strikes'
                  ? 'There were too many speed warnings, so it was not counted.'
                  : 'It did not look like a walk or ride, so it was not counted.'}
              </Text>
            ) : (
              <Text style={styles.resultSubtitle}>
                {celebrationBody(result.activityNumber, result.kind)}
              </Text>
            )}

            <View style={styles.resultStats}>
              <ResultStat label="Distance" value={`${formatDistance(result.miles)} ${formatDistanceUnit()}`} />
              <ResultStat label="Time" value={formatTime(result.durationSec)} />
              <ResultStat label="Trees" value={String(result.trees)} icon="tree" />
              <ResultStat label="Points" value={`+${result.points}`} icon="star" />
              <ResultStat label="Calories" value={String(result.calories)} icon="zap" />
              <ResultStat label="Elevation" value={`${result.elevationGain} ft`} icon="trending-up" />
            </View>

            {result.trailCompleted && (
              <View style={styles.trailCompleteBadge}>
                <Icon name="flag" size={18} color={colors.primary} strokeWidth={2} />
                <Text style={styles.trailCompleteText}>
                  Completed {result.trailName}!
                </Text>
              </View>
            )}

            <View style={styles.resultButtons}>
              {!result.rejected ? (
                <Button
                  label="Give feedback"
                  icon="star"
                  variant="secondary"
                  size="lg"
                  full
                  onPress={openFeedbackForm}
                  style={{ marginBottom: SPACING.sm }}
                />
              ) : null}
              <Button
                label="Done"
                size="lg"
                full
                onPress={() => navigation.goBack()}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Top bar — Stop lives here, big and within thumb reach, so ending
            a hike never depends on scrolling or remembering where Finish is. */}
        <View style={styles.topBar}>
          <Pressable onPress={handleDiscard} style={styles.backBtn} hitSlop={12} accessibilityLabel="Discard activity">
            <Icon name="x" size={20} color="#fff" strokeWidth={2.2} />
          </Pressable>
          <View style={styles.topCenter}>
            <View style={styles.recordingDot} />
            <Text style={styles.topLabel} numberOfLines={1}>
              {paused ? 'Paused' : isBackgrounded ? 'Recording in background' : 'Recording'}
            </Text>
          </View>
          <View style={styles.topActions}>
            <Pressable
              onPress={togglePause}
              style={styles.pauseBtn}
              hitSlop={8}
              accessibilityLabel={paused ? 'Resume' : 'Pause'}
            >
              <Icon name={paused ? 'play' : 'pause'} size={18} color="#fff" strokeWidth={2} />
            </Pressable>
            <Pressable
              onPress={handleFinish}
              disabled={saving}
              style={({ pressed }) => [styles.stopBtn, pressed && { opacity: 0.85 }]}
              accessibilityLabel="Stop and save"
              accessibilityRole="button"
            >
              <Icon name="stop" size={15} color="#fff" strokeWidth={2} filled />
              <Text style={styles.stopLabel}>Stop</Text>
            </Pressable>
          </View>
        </View>

        {/* Map — takes up the top half */}
        <View style={styles.mapContainer}>
          <LiveMap path={path} current={current} height={280} follow={!paused} />
          
          {/* Trail detection overlay */}
          {nearbyTrail ? (
            <View style={styles.trailBadge}>
              <Icon name="map-pin" size={14} color={colors.primary} strokeWidth={2} />
              <Text style={styles.trailBadgeText} numberOfLines={1}>
                {nearbyTrail.name}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.helpRow}>
          <Pressable
            onPress={call911}
            style={styles.helpIconBtn}
            accessibilityLabel="Call 911"
          >
            <Icon name="alert-triangle" size={18} color={colors.danger} strokeWidth={2} />
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        {showRest ? (
          <View style={styles.restBanner}>
            <Icon name="clock" size={18} color={colors.accentDark} strokeWidth={2} />
            <Text style={styles.restText}>
              You have been out for {Math.floor(elapsed / 60)} minutes
              {report ? ` · it is ${formatTemp(report.tempF)}` : ''}. Want a sit-down?
            </Text>
            <Pressable onPress={() => setShowRest(false)} hitSlop={10} accessibilityLabel="Dismiss rest reminder">
              <Icon name="x" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {/* Stats panel */}
        <View style={styles.statsPanel}>
          {/* Primary stat: distance */}
          <View style={styles.primaryRow}>
            <Text style={styles.distanceValue}>{formatDistance(miles)}</Text>
            <Text style={styles.distanceUnit}>{formatDistanceUnit()}</Text>
          </View>

          {/* Speed — with warning indicator */}
          <View style={styles.speedRow}>
            <View style={styles.speedBlock}>
              <Text style={[
                styles.speedValue,
                currentMph > speedLimit && styles.speedOverLimit
              ]}>
                {currentMph.toFixed(1)}
              </Text>
              <Text style={styles.speedLabel}>mph now</Text>
              {currentMph > speedLimit ? (
                <View style={styles.speedWarning}>
                  <Icon name="alert-triangle" size={12} color={colors.danger} strokeWidth={2} />
                  <Text style={styles.speedWarningText}>Over {speedLimit} mph limit</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.speedDivider} />
            <View style={styles.speedBlock}>
              <Text style={styles.speedValue}>{avgMph.toFixed(1)}</Text>
              <Text style={styles.speedLabel}>avg mph</Text>
            </View>
          </View>

          {/* Secondary stats grid */}
          <View style={styles.statsGrid}>
            <StatBox icon="clock" value={formatTime(elapsed)} label="Time" />
            <StatBox icon="trending-up" value={`${Math.round(elevationGain)}`} label="Gain (ft)" />
            <StatBox icon="trending-up" value={`${Math.round(elevationLoss)}`} label="Loss (ft)" iconColor={colors.textMuted} />
            <StatBox icon="zap" value={String(calories)} label="Calories" />
            <StatBox icon="tree" value={String(trees)} label="Trees" />
          </View>

          {/* Speed alert modal — 3 strikes */}
          {showSpeedAlert ? (
            <View style={styles.alertOverlay}>
              <View style={styles.alertBox}>
                <Icon name="alert-circle" size={32} color={colors.danger} strokeWidth={2} />
                <Text style={styles.alertTitle}>Activity paused</Text>
                <Text style={styles.alertText}>
                  We detected several moments where your speed exceeded what's expected for{' '}
                  {mode === 'hike' ? 'hiking' : 'biking'}. For fairness, this activity may not be counted toward your totals.
                </Text>
                <Text style={styles.alertSubtext}>
                  Speed limit: {speedLimit} mph for {mode === 'hike' ? 'hiking' : 'biking'}
                </Text>
                <View style={styles.alertButtons}>
                  <Button
                    label="End activity"
                    onPress={handleFinish}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Continue"
                    variant="secondary"
                    onPress={() => setShowSpeedAlert(false)}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {/* Finish button */}
          <View style={styles.finishRow}>
            <Button
              label={mode === 'bike' ? 'Finish ride' : 'Finish walk'}
              icon="stop"
              size="lg"
              full
              loading={saving}
              disabled={saving}
              onPress={handleFinish}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function StatBox({ icon, value, label, iconColor }: { icon: IconName; value: string; label: string; iconColor?: string }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={styles.statBox}>
      <Icon name={icon} size={14} color={iconColor ?? colors.primary} strokeWidth={2} />
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

function ordinal(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function celebrationTitle(n: number, kind: Mode) {
  const word = kind === 'bike' ? 'ride' : 'hike';
  if (n === 1) return `Congratulations on your first ${word}!`;
  if (n === 100) return `Congratulations on your 100th ${word}!`;
  if (n === 1000) return `Congratulations on your 1,000th ${word}!`;
  if (n > 1 && n % 100 === 0) return `Congratulations on your ${ordinal(n)} ${word}!`;
  return `Congratulations on your ${word}!`;
}

function celebrationBody(n: number, kind: Mode) {
  const word = kind === 'bike' ? 'ride' : 'hike';
  if (n === 1) return 'You finished your first one. That is the hardest.';
  if (n === 100 || n === 1000) return `That is ${ordinal(n)} ${word} in the book. Incredible.`;
  return 'Nice work out there.';
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ResultStat({ label, value, icon }: { label: string; value: string; icon?: IconName }) {
  const { colors, typography } = useTheme();
  const resultStyles = useMemo(() => makeResultStyles(colors, typography), [colors, typography]);
  return (
    <View style={resultStyles.stat}>
      {icon && <Icon name={icon} size={20} color={colors.primary} strokeWidth={2} />}
      <Text style={resultStyles.statValue}>{value}</Text>
      <Text style={resultStyles.statLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({

  root: { flex: 1, backgroundColor: c.primaryDark },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: SPACING.xs },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4444',
  },
  topLabel: { ...t.bodyMed, color: '#fff' },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pauseBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The one-tap exit. Red on purpose — it is the "I am done" control and it
  // should be the easiest thing on this screen to find.
  stopBtn: {
    minHeight: 48,
    paddingHorizontal: SPACING.md + 2,
    paddingRight: SPACING.md + 4,
    borderRadius: RADIUS.pill,
    backgroundColor: '#E5484D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stopLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },

  mapContainer: {
    height: 280,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trailBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    maxWidth: '80%',
  },
  trailBadgeText: { ...t.smallMed, color: c.primary },

  statsPanel: {
    flex: 1,
    backgroundColor: c.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },

  primaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, justifyContent: 'center' },
  distanceValue: { ...t.metricLg, color: c.text },
  distanceUnit: { ...t.h3, color: c.textMuted },

  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceSunken,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.lg,
  },
  speedBlock: { alignItems: 'center', flex: 1 },
  speedValue: { fontSize: 32, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  speedOverLimit: { color: c.danger },
  speedLabel: { ...t.micro, color: c.textMuted, textTransform: 'uppercase' },
  speedDivider: { width: 1, height: 40, backgroundColor: c.border },
  speedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  speedWarningText: { fontSize: 10, color: c.danger, fontWeight: '600' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statBox: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.surfaceSunken,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xs,
  },
  statBoxValue: { ...t.h3, color: c.text },
  statBoxLabel: { ...t.micro, color: c.textMuted },

  alertOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  alertBox: {
    backgroundColor: c.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
    maxWidth: 360,
  },
  alertTitle: { ...t.h2, color: c.text },
  alertText: { ...t.body, color: c.textSecondary, textAlign: 'center' },
  alertSubtext: { ...t.small, color: c.textMuted, textAlign: 'center' },
  alertButtons: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },

  helpRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
  helpIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: c.warningLight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
  },
  restText: { ...t.small, color: c.text, flex: 1 },
  finishRow: { paddingBottom: SPACING.md },

  resultContainer: {
    flex: 1,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  resultTitle: {
    ...t.h1,
    color: c.text,
  },
  resultSubtitle: {
    ...t.body,
    color: c.textMuted,
    textAlign: 'center',
  },
  resultStats: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: SPACING.md,
  },
  trailCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: c.primarySurface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  trailCompleteText: {
    ...t.bodyMed,
    color: c.primary,
  },
  resultButtons: {
    width: '100%',
    marginTop: SPACING.md,
  },

  });
}

function makeResultStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({

  stat: {
    alignItems: 'center',
    gap: SPACING.xs,
    minWidth: 100,
  },
  statValue: {
    ...t.h2,
    color: c.text,
  },
  statLabel: {
    ...t.small,
    color: c.textMuted,
  },

  });
}
