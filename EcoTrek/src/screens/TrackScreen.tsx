import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import TrailScene from '../components/TrailScene';
import { Screen, Segmented, Banner } from '../components/ui';
import { ColorPalette, RADIUS, SPACING, TREE_RULES } from '../constants/theme';
import { useActivity } from '../context/ActivityContext';
import { useApp } from '../context/AppContext';
import { useWeather } from '../context/WeatherContext';
import { useSettings } from '../constants/SettingsContext';
import { useResetOnLeave } from '../hooks/useResetOnLeave';
import { useStartActivity } from '../hooks/useStartActivity';
import { Typography, useTheme } from '../context/ThemeContext';

/**
 * The Start tab. One job: start a walk or a ride.
 *
 * The whole screen is the button's stage — an illustration of the trail fills
 * the space above it instead of a paragraph explaining what a walk is. No
 * scrolling: pick Walk or Bike, press the big green button, go.
 */
export default function TrackScreen() {
  const { totalActivities } = useActivity();
  const { permission } = useApp();
  const { report } = useWeather();
  const { simpleMode } = useSettings();
  const { mode, setMode, start, starting } = useStartActivity('hike');
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  useResetOnLeave(
    useCallback(() => {
      setMode('hike');
    }, [setMode])
  );

  const treeLine =
    mode === 'hike'
      ? `1 tree per ${TREE_RULES.hikeMilesPerTree} mile walked`
      : `1 tree per ${TREE_RULES.bikeMilesPerTree} miles ridden`;

  return (
    <Screen scroll={false}>
      <Header title="Start" subtitle="Ready when you are" />

      <View style={styles.body}>
        {report && report.level !== 'good' ? (
          <Banner
            tone={report.level === 'danger' ? 'danger' : report.level === 'warning' ? 'warning' : 'info'}
            icon={report.level === 'danger' ? 'alert-triangle' : 'info'}
            title={report.headline}
            message={simpleMode ? undefined : report.summary}
          />
        ) : null}

        {/* The stage: illustration fills whatever height is left over. */}
        <View style={styles.hero}>
          <TrailScene mode={mode} />
          <View style={styles.heroCaption}>
            <Icon name="tree" size={15} color={colors.primary} strokeWidth={2} />
            <Text style={styles.heroCaptionText} numberOfLines={1}>
              {treeLine}
            </Text>
          </View>
        </View>

        <Segmented
          options={[
            { value: 'hike', label: 'Walk', icon: 'boot' },
            { value: 'bike', label: 'Bike', icon: 'bike' },
          ]}
          value={mode}
          onChange={setMode}
        />

        <Pressable
          onPress={start}
          disabled={starting}
          accessibilityRole="button"
          accessibilityLabel={mode === 'bike' ? 'Start ride' : 'Start walk'}
          style={({ pressed }) => [
            styles.startBtn,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.88, transform: [{ scale: 0.995 }] },
          ]}
        >
          <View style={styles.startIcon}>
            <Icon name="play" size={22} color={colors.primary} strokeWidth={2.4} filled />
          </View>
          <Text style={styles.startLabel}>
            {starting ? 'Starting…' : mode === 'bike' ? 'Start ride' : 'Start walk'}
          </Text>
        </Pressable>

        {permission === 'denied' ? (
          <Text style={styles.permissionNote}>
            Location is off, so we cannot measure distance. Turn it on for EcoTrek in your phone settings.
          </Text>
        ) : totalActivities === 0 ? (
          <Text style={styles.permissionNote}>You can lock your phone — we keep measuring.</Text>
        ) : null}
      </View>
    </Screen>
  );
}

// Geometry lives here; every colour and text size comes from the theme, so
// this screen re-themes and re-scales for free.
function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    body: {
      flex: 1,
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.md,
      gap: SPACING.md,
    },

    hero: {
      flex: 1,
      minHeight: 170,
      borderRadius: RADIUS.xl,
      overflow: 'hidden',
      backgroundColor: c.primarySurface,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: 'flex-end',
    },
    heroCaption: {
      position: 'absolute',
      left: SPACING.sm + 2,
      bottom: SPACING.sm + 2,
      right: SPACING.sm + 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      alignSelf: 'flex-start',
      paddingVertical: 7,
      paddingHorizontal: SPACING.sm + 2,
      borderRadius: RADIUS.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    heroCaptionText: { ...t.smallMed, color: c.text, flexShrink: 1 },

    startBtn: {
      borderRadius: RADIUS.xl,
      minHeight: 76,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: SPACING.sm + 4,
    },
    startIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    startLabel: { ...t.h2, color: '#fff', fontWeight: '700', letterSpacing: -0.2 },

    permissionNote: { ...t.small, color: c.textMuted, textAlign: 'center' },
  });
}
