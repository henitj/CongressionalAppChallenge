import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  AppState,
  AppStateStatus,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { alert } from '../services/alert';

import LiveMap from '../components/LiveMap';
import CleanupSheet from '../components/CleanupSheet';
import Confetti from '../components/Confetti';
import TrailRatingSheet from '../components/TrailRatingSheet';
import Icon, { IconName } from '../components/Icon';
import { Button } from '../components/ui';

import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { getCurrentPosition, startTracking, Subscription } from '../services/location';
import { advanceTrack, Coord, EMPTY_TRACK, TrackState } from '../services/geo';
import { computeTrees, useActivity } from '../context/ActivityContext';
import { useSettings } from '../context/SettingsContext';
import { useEcoPoints } from '../context/EcoPointsContext';
import { useClub } from '../context/ClubContext';
import {
  cleanupBonusPoints,
  cleanupBonusSeconds,
  MAX_CLEANUP_POINTS,
  shouldAskCleanupAfterTrail,
} from '../services/cleanup';
import { useApp } from '../context/AppContext';
import { detectCurrentTrail } from '../services/trailDetection';
import { Trail } from '../constants/austinTrails';
import { useProfile, estimateCalories } from '../context/ProfileContext';
import { useWeather } from '../context/WeatherContext';
import { useTheme, Typography } from '../context/ThemeContext';

type Mode = 'hike' | 'bike';

const SPEED_LIMITS: Record<Mode, number> = { hike: 20, bike: 30 };

export default function ActiveTrackingScreen() {
  const { colors, typography, fontScale } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const wide = windowWidth > windowHeight && (windowWidth >= 840 || windowHeight < 520);
  const compactLandscape = wide && windowWidth < 840;
  const mode: Mode = route.params?.mode ?? 'hike';
  const { formatDistance, formatDistanceUnit, formatTemp } = useSettings();
  const { trails, coords, requestLocation } = useApp();
  const { profile } = useProfile();
  const { award } = useEcoPoints();
  const { myClub, contribute } = useClub();
  const { addActivity, totalActivities } = useActivity();

  // Two thirds map, one third controls; horizontal on wide screens. The
  // controls scroll independently so expanded stats never cover the route.
  const [path, setPath] = useState<Coord[]>([]);
  const [current, setCurrent] = useState<Coord | undefined>(() => coords ? { ...coords, timestamp: Date.now() } : undefined);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsAttempt, setGpsAttempt] = useState(0);
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
  const [showCleanup, setShowCleanup] = useState(false);
  const [showTrailRating, setShowTrailRating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [confettiDone, setConfettiDone] = useState(false);

  const subRef = useRef<Subscription | null>(null);
  const stoppedRef = useRef(false);
  // Filter state for the GPS stream: anchor point, distance, and altitude.
  const trackRef = useRef<TrackState>(EMPTY_TRACK);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const pausedTotalRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const strikesRef = useRef(0);
  const finishInFlightRef = useRef(false);

  // Ending the walk always wins. If the GPS watch is still starting, it is
  // removed as soon as it arrives instead of recording behind the summary.
  const stopTracking = useCallback(() => {
    stoppedRef.current = true;
    subRef.current?.remove();
    subRef.current = null;
  }, []);

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

  const togglePause = () => {
    if (!paused) {
      pausedAtRef.current = Date.now();
      setPaused(true);
      return;
    }
    if (pausedAtRef.current) {
      pausedTotalRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    // Distance walked while paused is not counted, so resume from a new anchor.
    trackRef.current = { ...trackRef.current, anchor: null, elevationRef: null };
    setCurrentMph(0);
    setPaused(false);
  };

  // Timer — pause must not keep adding seconds.
  useEffect(() => {
    if (paused || result || saving) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - startedAt - pausedTotalRef.current) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [paused, startedAt, result, saving]);

  // Handle app state — keep tracking but show indicator
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsBackgrounded(state === 'background' || state === 'inactive');
    });
    return () => sub.remove();
  }, []);

  // Start the watch and one-shot lookup together. A cold GPS fix must not
  // delay the watch (or block the map) for another eight seconds.
  useEffect(() => {
    let cancelled = false;
    let liveFix = false;
    stoppedRef.current = false;
    setGpsError(null);
    getCurrentPosition().then((point) => {
      if (!cancelled && !stoppedRef.current && !liveFix && point) setCurrent(point);
    });
    startTracking((coord) => {
      if (cancelled || stoppedRef.current || pausedRef.current) return;
      const step = advanceTrack(trackRef.current, coord);
      trackRef.current = step.state;
      if (step.status === 'ignored') return;
      liveFix = true;
      setGpsError(null);
      setCurrent(step.point ?? coord);
      if (step.status === 'still' || !step.point) {
        setCurrentMph(0);
        return;
      }
      setCurrentMph(step.mph);
      setPath((p) => [...p, step.point as Coord]);
      setMiles(step.state.miles);
      setElevationGain(step.state.gainFt);
      setElevationLoss(step.state.lossFt);
      if (step.status === 'moved' && step.mph > speedLimit) {
        strikesRef.current += 1;
        if (strikesRef.current >= 3) setShowSpeedAlert(true);
      }
    }, {
      onError: (error) => {
        if (!cancelled && !stoppedRef.current) setGpsError(error.message || 'No GPS fix. Check location permissions.');
      },
      allowBackground: true,
    }).then((sub) => {
      if (cancelled || stoppedRef.current) sub.remove();
      else subRef.current = sub;
    }).catch(() => {
      if (!cancelled && !stoppedRef.current) setGpsError('GPS could not start. Check location permissions and retry.');
    });
    return () => {
      cancelled = true;
      stopTracking();
    };
  }, [speedLimit, stopTracking, gpsAttempt]);

  const retryGps = async () => {
    const point = await requestLocation({ explain: true });
    if (point) {
      setCurrent({ ...point, timestamp: Date.now() });
      setGpsAttempt((n) => n + 1);
    }
  };

  const handleFinish = useCallback(async () => {
    if (finishInFlightRef.current) return;
    finishInFlightRef.current = true;
    stopTracking();
    setSaving(true);
    setConfettiDone(false);

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
        trailId: res.trailId,
        trailName: res.trailName,
        trailCompleted: res.trailCompleted,
        rejected: res.rejected,
        rejectionReason: res.rejectionReason,
        durationSec: elapsed,
        activityNumber: totalActivities + 1,
        kind: mode,
        cleanupPieces: 0,
        cleanupPoints: 0,
        cleanupSeconds: 0,
      });

      // The cleanup question, at the one moment it makes sense to ask: the
      // walk is over, it was long enough to have passed some litter, and it
      // actually counted. Feedback comes after that, as a popup — not a
      // button buried on the summary.
      // Every valid trail ends with the honesty question. Do not gate it on
      // duration: a short named route still deserves the same chance to leave
      // the trail cleaner than you found it. Feedback lives under More.
      if (shouldAskCleanupAfterTrail(res.rejected)) setShowCleanup(true);
    } catch (e: any) {
      alert('Could not save', e?.message ?? 'Something went wrong saving that activity.');
      setGpsAttempt((n) => n + 1);
    } finally {
      finishInFlightRef.current = false;
      setSaving(false);
    }
  }, [addActivity, stopTracking, mode, startedAt, miles, elapsed, path, calories, elevationGain, elevationLoss, totalActivities]);

  /**
   * Answering the cleanup question: the pieces are already logged by the
   * sheet, so this is the reward half — bonus points, credited minutes, and
   * a line on the summary so it is visible that it counted.
   */
  const handleCleanupLogged = useCallback(
    async (pieces: number) => {
      if (pieces <= 0) return;
      const bonus = cleanupBonusPoints(pieces);
      const extraSeconds = cleanupBonusSeconds(pieces);
      await award('cleanup', {
        points: bonus,
        label: `Picked up ${pieces} piece${pieces === 1 ? '' : 's'} of litter`,
      });
      // Cleanup points count for the user's club as well as their personal
      // total. That makes the honesty policy meaningful in club competition.
      if (myClub) {
        await contribute({ points: bonus, trees: 0, miles: 0, activities: 0 });
      }
      setResult((prev: any) =>
        prev
          ? {
              ...prev,
              cleanupPieces: prev.cleanupPieces + pieces,
              cleanupPoints: prev.cleanupPoints + bonus,
              cleanupSeconds: prev.cleanupSeconds + extraSeconds,
              points: prev.points + bonus,
            }
          : prev
      );
    },
    [award, contribute, myClub]
  );

  const handleDiscard = () => {
    alert('Discard this activity?', 'Your progress will not be saved.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          stopTracking();
          navigation.goBack();
        },
      },
    ]);
  };

  // Show results screen after activity is saved
  if (result) {
    // A mile or more under your own power is worth a celebration. Rejected
    // activities and sub-mile hops get the quiet summary instead. The
    // confetti unmounts itself once the burst has finished falling.
    const celebrate = !result.rejected && result.miles >= 1 && !confettiDone;
    return (
      <View style={[styles.root, { backgroundColor: colors.surface }]}>
        {celebrate ? <Confetti onFinish={() => setConfettiDone(true)} /> : null}
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.resultScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.resultContainer}>
              <Icon
                name={result.rejected ? 'alert-circle' : 'check-circle'}
                size={64}
                color={result.rejected ? colors.warning : colors.primary}
                strokeWidth={1.5}
              />
              <Text style={[styles.resultTitle, { textAlign: 'center' }]}>
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
                <ResultStat
                  label="Time"
                  value={formatTime(result.durationSec)}
                />
                <ResultStat label="Trees" value={String(result.trees)} icon="tree" />
                <ResultStat label="Points" value={`+${result.points}`} icon="star" />
                <ResultStat label="Calories" value={String(result.calories)} icon="zap" />
                <ResultStat label="Elevation" value={`${result.elevationGain} ft`} icon="trending-up" />
              </View>

              {result.cleanupPieces > 0 ? (
                <View style={styles.cleanupSummary}>
                  <Icon name="trash" size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.cleanupSummaryText} numberOfLines={2}>
                    {result.cleanupPieces} piece{result.cleanupPieces === 1 ? '' : 's'} of litter
                    picked up · +{result.cleanupPoints} points
                    {result.cleanupSeconds >= 60
                      ? ` · +${Math.round(result.cleanupSeconds / 60)} min credited`
                      : ''}
                  </Text>
                </View>
              ) : null}

              {result.trailCompleted && (
                <View style={styles.trailCompleteBadge}>
                  <Icon name="flag" size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.trailCompleteText} numberOfLines={2}>
                    Completed {result.trailName}!
                  </Text>
                </View>
              )}

              <View style={styles.resultButtons}>
                {/* Said no first, then remembered the can by the bench. */}
                {!result.rejected &&
                result.cleanupPieces === 0 ? (
                  <Button
                    label="I picked up litter"
                    icon="trash"
                    variant="secondary"
                    size="lg"
                    full
                    onPress={() => setShowCleanup(true)}
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
          </ScrollView>

          {/* The trash question appears after every valid trail. It never
              blocks the result: "None this time" closes it honestly. */}
          <CleanupSheet
            visible={showCleanup}
            onClose={() => {
              setShowCleanup(false);
              if (result.trailCompleted && result.trailId) setShowTrailRating(true);
            }}
            title="How many pieces of trash do you pick up?"
            subtitle={`Nice ${result.kind === 'bike' ? 'ride' : 'walk'} — earn up to ${MAX_CLEANUP_POINTS} cleanup points`}
            allowNone
            onLogged={handleCleanupLogged}
          />
          <TrailRatingSheet
            visible={showTrailRating}
            trailId={result.trailId}
            trailName={result.trailName}
            onClose={() => setShowTrailRating(false)}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={handleDiscard} style={styles.backBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Discard activity">
            <Icon name="x" size={20} color={colors.text} strokeWidth={2} />
          </Pressable>
          <View style={styles.topCenter}>
            <View style={[styles.recordingDot, paused && { backgroundColor: colors.textMuted }]} />
            <Text style={styles.topLabel} numberOfLines={1}>
              {paused ? 'Paused' : isBackgrounded ? 'Tracking in background' : mode === 'bike' ? 'Tracking ride' : 'Tracking walk'}
            </Text>
          </View>
          <Pressable onPress={retryGps} accessibilityRole="button" accessibilityLabel="Check GPS connection" style={styles.gpsBadge}>
            <Icon name="map-pin" size={14} color={gpsError ? colors.warning : colors.primary} />
            <Text style={[styles.gpsLabel, gpsError && { color: colors.warning }]}>
              {gpsError ? 'Retry GPS' : current ? 'GPS on' : 'Finding GPS'}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.trackingLayout, wide && { flexDirection: 'row' }]}>
          <View testID="tracking-map-area" style={[styles.mapContainer, wide && { marginRight: 0, flex: 2.5 }]}>
            <LiveMap path={path} current={current} height="100%" follow={!paused} />
            {nearbyTrail ? (
              <View style={styles.trailBadge} pointerEvents="none">
                <Icon name="map-pin" size={14} color={colors.primary} />
                <Text style={styles.trailBadgeText} numberOfLines={1}>{nearbyTrail.name}</Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.statsPanel, { minHeight: wide ? 0 : Math.min(Math.round(200 * Math.min(fontScale, 1.4)), Math.max(100, Math.floor((windowHeight - 68) / 3))) }, wide && { maxWidth: 400, margin: 12, borderRadius: 24 }]}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.metricsScroll} showsVerticalScrollIndicator={false}>
              <View style={[styles.mainMetrics, compactLandscape && { flexDirection: 'column', alignItems: 'stretch', gap: 4 }]}>
                <View style={[styles.mainMetric, compactLandscape && { flex: 0, flexDirection: 'row', justifyContent: 'space-between' }]}>
                  <Text style={styles.metricValue} numberOfLines={1}>{formatDistance(miles)}</Text>
                  <Text style={styles.metricLabel}>{formatDistanceUnit()}</Text>
                </View>
                {!compactLandscape ? <View style={styles.metricDivider} /> : null}
                <View style={[styles.mainMetric, compactLandscape && { flex: 0, flexDirection: 'row', justifyContent: 'space-between' }]}>
                  <Text style={styles.metricValue} numberOfLines={1}>{formatTime(elapsed)}</Text>
                  <Text style={styles.metricLabel}>Time</Text>
                </View>
                {!compactLandscape ? <View style={styles.metricDivider} /> : null}
                <View style={[styles.mainMetric, compactLandscape && { flex: 0, flexDirection: 'row', justifyContent: 'space-between' }]}>
                  <Text style={styles.metricValue} numberOfLines={1}>{trees}</Text>
                  <Text style={styles.metricLabel}>Trees</Text>
                </View>
              </View>
              {gpsError ? (
                <Pressable onPress={retryGps} accessibilityRole="button" style={styles.gpsWarning}>
                  <Icon name="alert-circle" size={16} color={colors.warning} />
                  <Text style={styles.gpsWarningText}>{gpsError} Tap to retry GPS.</Text>
                </Pressable>
              ) : null}
              {showRest ? (
                <Pressable style={styles.gpsWarning} onPress={() => setShowRest(false)} accessibilityRole="button" accessibilityLabel="Dismiss rest reminder">
                  <Icon name="clock" size={16} color={colors.accentDark} />
                  <Text style={styles.gpsWarningText}>
                    {Math.floor(elapsed / 60)} minutes outside{report ? ` · ${formatTemp(report.tempF)}` : ''}. Time for a breather?
                  </Text>
                  <Icon name="x" size={14} color={colors.textMuted} />
                </Pressable>
              ) : null}
              <Pressable onPress={() => setShowDetails((shown) => !shown)} style={styles.detailsToggle} accessibilityRole="button" accessibilityState={{ expanded: showDetails }}>
                <Text style={styles.detailsLabel}>{showDetails ? 'Hide details' : 'Speed, elevation & calories'}</Text>
                <Icon name={showDetails ? 'chevron-down' : 'chevron-right'} size={16} color={colors.textMuted} />
              </Pressable>
              {showDetails ? (
                <View style={styles.statsGrid}>
                  <StatBox icon="activity" value={currentMph.toFixed(1)} label="mph now" iconColor={currentMph > speedLimit ? colors.danger : colors.primary} />
                  <StatBox icon="activity" value={avgMph.toFixed(1)} label="avg mph" />
                  <StatBox icon="zap" value={String(calories)} label="Calories" />
                  <StatBox icon="trending-up" value={String(Math.round(elevationGain))} label="Gain (ft)" />
                  <StatBox icon="trending-up" value={String(Math.round(elevationLoss))} label="Loss (ft)" />
                </View>
              ) : null}
            </ScrollView>
            <View style={[styles.trackingButtons, compactLandscape && { flexDirection: 'column' }]}>
              <Pressable onPress={togglePause} disabled={saving} style={styles.pauseControl} accessibilityRole="button" accessibilityLabel={paused ? 'Resume' : 'Pause'}>
                <Icon name={paused ? 'play' : 'pause'} size={20} color={colors.primary} />
                <Text style={styles.pauseLabel}>{paused ? 'Resume' : 'Pause'}</Text>
              </Pressable>
              <Button label={mode === 'bike' ? 'Stop and save ride' : 'Stop and save walk'} icon="stop" size="md" loading={saving} disabled={saving} onPress={handleFinish} style={{ flex: 1 }} />
            </View>
          </View>
        </View>

        {/* Speed alert — 3 strikes. Covers the whole screen so it cannot be
            scrolled past or missed. */}
        {showSpeedAlert ? (
          <View style={styles.alertOverlay}>
            <View style={styles.alertBox}>
              <Icon name="alert-circle" size={32} color={colors.danger} strokeWidth={2} />
              <Text style={styles.alertTitle}>Speed warning</Text>
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
      <Text style={styles.statBoxValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statBoxLabel} numberOfLines={1}>{label}</Text>
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
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  return (
    <View style={styles.resultStat}>
      {icon && <Icon name={icon} size={20} color={colors.primary} strokeWidth={2} />}
      <Text style={styles.resultStatValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.resultStatLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({

  root: { flex: 1, backgroundColor: c.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 56,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.surfaceSunken,
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
  topLabel: { flexShrink: 1, ...t.smallMed, color: c.text },
  trackingLayout: { flex: 1, minHeight: 0 },
  mapContainer: { flex: 2, minHeight: 140, marginHorizontal: 12, marginBottom: 12, borderRadius: 22, overflow: 'hidden' },
  gpsBadge: { flexDirection: 'row', gap: 4, alignItems: 'center', minHeight: 40, paddingLeft: 6 },
  gpsLabel: { ...t.micro, color: c.primary },
  mainMetrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  mainMetric: { flex: 1, alignItems: 'center', gap: 5, minWidth: 0 },
  metricValue: { ...t.h2, color: c.text, fontVariant: ['tabular-nums'] },
  metricLabel: { ...t.micro, color: c.textMuted },
  metricDivider: { width: 1, height: 28, backgroundColor: c.borderLight },
  metricsScroll: { gap: 6, paddingBottom: 6 },
  detailsToggle: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  detailsLabel: { ...t.micro, color: c.textMuted, textAlign: 'center' },
  trackingButtons: { flexDirection: 'row', alignItems: 'stretch', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.borderLight },
  pauseControl: { minWidth: 64, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8, backgroundColor: c.primarySurface, borderRadius: 14 },
  pauseLabel: { ...t.micro, color: c.primary },
  gpsWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.warningLight, borderRadius: 10, padding: 9 },
  gpsWarningText: { ...t.micro, fontWeight: '400', lineHeight: 18, color: c.textSecondary, flex: 1 },
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
    flex: 1, minHeight: 200, backgroundColor: c.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },

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
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  statBoxValue: { ...t.h3, color: c.text },
  statBoxLabel: { ...t.micro, color: c.textMuted },

  alertOverlay: {
    ...StyleSheet.absoluteFill,
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

  resultScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  resultContainer: {
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  cleanupSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: c.primarySurface,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  cleanupSummaryText: { ...t.smallMed, color: c.primary, flex: 1 },
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
    flexShrink: 1,
    ...t.bodyMed,
    color: c.primary,
  },
  resultButtons: {
    width: '100%',
    marginTop: SPACING.md,
  },
  resultStat: { alignItems: 'center', gap: SPACING.xs, minWidth: 100 },
  resultStatValue: { ...t.h2, color: c.text },
  resultStatLabel: { ...t.small, color: c.textMuted },

  });
}
