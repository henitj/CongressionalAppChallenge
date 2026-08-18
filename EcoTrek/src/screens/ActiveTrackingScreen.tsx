import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, AppState, AppStateStatus, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LiveMap from '../components/LiveMap';
import Icon, { IconName } from '../components/Icon';
import { Button } from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
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

type Mode = 'hike' | 'bike';

const SPEED_LIMITS: Record<Mode, number> = { hike: 20, bike: 30 };

export default function ActiveTrackingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mode: Mode = route.params?.mode ?? 'hike';
  const { formatDistance, formatDistanceUnit, formatTemp } = useSettings();
  const { trails } = useApp();
  const { profile } = useProfile();
  const { addActivity } = useActivity();

  const [path, setPath] = useState<Coord[]>([]);
  const [current, setCurrent] = useState<Coord | undefined>();
  const [miles, setMiles] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [currentMph, setCurrentMph] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [elevationLoss, setElevationLoss] = useState(0);
  const [speedWarnings, setSpeedWarnings] = useState(0);
  const [showSpeedAlert, setShowSpeedAlert] = useState(false);
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showRest, setShowRest] = useState(false);

  const subRef = useRef<Subscription | null>(null);
  const lastRef = useRef<Coord | undefined>(undefined);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

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

  const textContact = () => {
    const phone = (profile.emergencyPhone ?? '').replace(/[^\d+]/g, '');
    if (!phone) {
      Alert.alert(
        'No contact saved',
        'Add a name and phone number in Settings so we can text them for you.'
      );
      return;
    }
    const where = nearbyTrail?.name ?? 'a walk';
    const body = encodeURIComponent(
      `Hi${profile.emergencyName ? ` ${profile.emergencyName}` : ''}, I am on ${where} with EcoTrek. I wanted you to know where I am.`
    );
    Linking.openURL(`sms:${phone}?body=${body}`).catch(() =>
      Alert.alert('Could not open Messages', 'Try sending a text yourself.')
    );
  };

  // Timer
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
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
            setSpeedWarnings((prev) => {
              const next = prev + 1;
              if (next >= 3 && !showSpeedAlert) {
                setShowSpeedAlert(true);
              }
              return next;
            });
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
      });
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Something went wrong saving that activity.');
    } finally {
      setSaving(false);
    }
  }, [addActivity, mode, startedAt, miles, elapsed, path, calories, elevationGain, elevationLoss]);

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
              color={result.rejected ? COLORS.warning : COLORS.primary}
              strokeWidth={1.5}
            />
            <Text style={styles.resultTitle}>
              {result.rejected ? 'Activity Flagged' : 'Activity Complete!'}
            </Text>
            
            {result.rejected ? (
              <Text style={styles.resultSubtitle}>
                {result.rejectionReason === 'too_short'
                  ? 'Activity was under a minute'
                  : result.rejectionReason === 'speed_too_high'
                  ? 'Average speed exceeded the limit'
                  : result.rejectionReason === 'too_many_strikes'
                  ? 'Too many speed violations'
                  : 'Activity did not meet validation requirements'}
              </Text>
            ) : (
              <Text style={styles.resultSubtitle}>Great work out there!</Text>
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
                <Icon name="flag" size={18} color={COLORS.primary} strokeWidth={2} />
                <Text style={styles.trailCompleteText}>
                  Completed {result.trailName}!
                </Text>
              </View>
            )}

            <View style={styles.resultButtons}>
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
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={handleDiscard} style={styles.backBtn} hitSlop={12}>
            <Icon name="x" size={20} color="#fff" strokeWidth={2.2} />
          </Pressable>
          <View style={styles.topCenter}>
            <View style={styles.recordingDot} />
            <Text style={styles.topLabel}>
              {paused ? 'Paused' : isBackgrounded ? 'Recording in background' : 'Recording'}
            </Text>
          </View>
          <Pressable onPress={() => setPaused((p) => !p)} style={styles.pauseBtn} hitSlop={8}>
            <Icon name={paused ? 'play' : 'pause'} size={18} color="#fff" strokeWidth={2} />
          </Pressable>
        </View>

        {/* Map — takes up the top half */}
        <View style={styles.mapContainer}>
          <LiveMap path={path} current={current} height={280} follow={!paused} />
          
          {/* Trail detection overlay */}
          {nearbyTrail ? (
            <View style={styles.trailBadge}>
              <Icon name="map-pin" size={14} color={COLORS.primary} strokeWidth={2} />
              <Text style={styles.trailBadgeText} numberOfLines={1}>
                {nearbyTrail.name}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.helpRow}>
          <Pressable
            onPress={() => Linking.openURL('tel:911')}
            style={styles.helpBtn}
            accessibilityLabel="Call 911"
          >
            <Icon name="alert-triangle" size={16} color={COLORS.danger} strokeWidth={2} />
            <Text style={styles.helpDanger}>Call 911</Text>
          </Pressable>
          <Pressable onPress={textContact} style={styles.helpBtn} accessibilityLabel="Text my contact">
            <Icon name="users" size={16} color={COLORS.primary} strokeWidth={2} />
            <Text style={styles.helpSafe}>Text my contact</Text>
          </Pressable>
        </View>

        {showRest ? (
          <View style={styles.restBanner}>
            <Icon name="clock" size={18} color={COLORS.accentDark} strokeWidth={2} />
            <Text style={styles.restText}>
              You have been out for {Math.floor(elapsed / 60)} minutes
              {report ? ` · it is ${formatTemp(report.tempF)}` : ''}. Want a sit-down?
            </Text>
            <Pressable onPress={() => setShowRest(false)} hitSlop={10} accessibilityLabel="Dismiss rest reminder">
              <Icon name="x" size={16} color={COLORS.textMuted} />
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
                  <Icon name="alert-triangle" size={12} color={COLORS.danger} strokeWidth={2} />
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
            <StatBox icon="trending-up" value={`${Math.round(elevationLoss)}`} label="Loss (ft)" iconColor={COLORS.textMuted} />
            <StatBox icon="zap" value={String(calories)} label="Calories" />
            <StatBox icon="tree" value={String(trees)} label="Trees" />
            <StatBox icon="alert-circle" value={`${speedWarnings}/3`} label="Warnings" iconColor={speedWarnings > 0 ? COLORS.warning : COLORS.textMuted} />
          </View>

          {/* Speed warnings banner */}
          {speedWarnings > 0 && speedWarnings < 3 ? (
            <View style={styles.warningBanner}>
              <Icon name="alert-triangle" size={16} color={COLORS.warning} strokeWidth={2} />
              <Text style={styles.warningText}>
                Speed warning {speedWarnings}/3 — {speedWarnings === 1 ? 'One more and we will flag this activity.' : 'One more and this activity may not count.'}
              </Text>
            </View>
          ) : null}

          {/* Speed alert modal — 3 strikes */}
          {showSpeedAlert ? (
            <View style={styles.alertOverlay}>
              <View style={styles.alertBox}>
                <Icon name="alert-circle" size={32} color={COLORS.danger} strokeWidth={2} />
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
              label="Finish activity"
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
  return (
    <View style={styles.statBox}>
      <Icon name={icon} size={14} color={iconColor ?? COLORS.primary} strokeWidth={2} />
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
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

function ResultStat({ label, value, icon }: { label: string; value: string; icon?: IconName }) {
  return (
    <View style={resultStyles.stat}>
      {icon && <Icon name={icon} size={20} color={COLORS.primary} strokeWidth={2} />}
      <Text style={resultStyles.statValue}>{value}</Text>
      <Text style={resultStyles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primaryDark },

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
  topCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4444',
  },
  topLabel: { ...TYPOGRAPHY.bodyMed, color: '#fff' },
  pauseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
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
  trailBadgeText: { ...TYPOGRAPHY.smallMed, color: COLORS.primary },

  statsPanel: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },

  primaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, justifyContent: 'center' },
  distanceValue: { ...TYPOGRAPHY.metricLg, color: COLORS.text },
  distanceUnit: { ...TYPOGRAPHY.h3, color: COLORS.textMuted },

  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.lg,
  },
  speedBlock: { alignItems: 'center', flex: 1 },
  speedValue: { fontSize: 32, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  speedOverLimit: { color: COLORS.danger },
  speedLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase' },
  speedDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  speedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  speedWarningText: { fontSize: 10, color: COLORS.danger, fontWeight: '600' },

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
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xs,
  },
  statBoxValue: { ...TYPOGRAPHY.h3, color: COLORS.text },
  statBoxLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  warningText: { ...TYPOGRAPHY.small, color: COLORS.warning, flex: 1 },

  alertOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  alertBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.md,
    maxWidth: 360,
  },
  alertTitle: { ...TYPOGRAPHY.h2, color: COLORS.text },
  alertText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center' },
  alertSubtext: { ...TYPOGRAPHY.small, color: COLORS.textMuted, textAlign: 'center' },
  alertButtons: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },

  helpRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
  helpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    minHeight: 48,
  },
  helpDanger: { ...TYPOGRAPHY.smallMed, color: COLORS.danger },
  helpSafe: { ...TYPOGRAPHY.smallMed, color: COLORS.primary },
  restBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
  },
  restText: { ...TYPOGRAPHY.small, color: COLORS.text, flex: 1 },
  finishRow: { paddingBottom: SPACING.md },

  resultContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  resultTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
  },
  resultSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.primarySurface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  trailCompleteText: {
    ...TYPOGRAPHY.bodyMed,
    color: COLORS.primary,
  },
  resultButtons: {
    width: '100%',
    marginTop: SPACING.md,
  },
});

const resultStyles = StyleSheet.create({
  stat: {
    alignItems: 'center',
    gap: SPACING.xs,
    minWidth: 100,
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  statLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },
});
