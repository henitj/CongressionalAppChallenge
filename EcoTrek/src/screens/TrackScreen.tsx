import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import { Screen, Card, Segmented, Banner } from '../components/ui';
import { SPACING, TREE_RULES } from '../constants/theme';
import { useActivity } from '../context/ActivityContext';
import { useApp } from '../context/AppContext';
import { useWeather } from '../context/WeatherContext';
import { useResetOnLeave } from '../hooks/useResetOnLeave';
import { useStartActivity } from '../hooks/useStartActivity';
import { useTheme } from '../context/ThemeContext';

/**
 * The Start tab. One job: start a walk or a ride.
 *
 * Deliberately quiet — one card explaining what will happen, one big
 * button. The weather note appears only when it actually matters.
 */
export default function TrackScreen() {
  const { totalActivities } = useActivity();
  const { permission } = useApp();
  const { report } = useWeather();
  const { mode, setMode, start, starting } = useStartActivity('hike');
  const { colors, typography } = useTheme();

  useResetOnLeave(
    useCallback(() => {
      setMode('hike');
    }, [setMode])
  );

  return (
    <Screen>
      <Header title="Start" subtitle="Ready when you are" />

      <View style={styles.body}>
        {report && report.level !== 'good' ? (
          <Banner
            tone={report.level === 'danger' ? 'danger' : report.level === 'warning' ? 'warning' : 'info'}
            icon={report.level === 'danger' ? 'alert-triangle' : 'info'}
            title={report.headline}
            message={report.summary}
          />
        ) : null}

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
            pressed && { opacity: 0.88 },
          ]}
        >
          <Icon name="play" size={28} color="#fff" strokeWidth={2.2} />
          <Text style={[styles.startLabel, typography.h2, { color: '#fff' }]}>
            {starting ? 'Starting…' : mode === 'bike' ? 'Start ride' : 'Start walk'}
          </Text>
        </Pressable>

        {totalActivities < 3 ? (
          <Card tone="sunken">
            <Text style={[styles.explainTitle, typography.h4, { color: colors.text }]}>
              {mode === 'hike'
                ? `Walking earns 1 tree per ${TREE_RULES.hikeMilesPerTree} mile`
                : `Biking earns 1 tree per ${TREE_RULES.bikeMilesPerTree} miles`}
            </Text>
            <Text style={[styles.explainText, typography.small, { color: colors.textMuted, lineHeight: typography.small.lineHeight }]}>
              Tap Start, put your phone away, and go. You can lock it — we keep
              measuring until you tap Finish.
            </Text>
          </Card>
        ) : null}

        {permission === 'denied' ? (
          <Text style={[styles.permissionNote, typography.small, { color: colors.textMuted }]}>
            Location is off, so we cannot measure distance. Turn it on for EcoTrek in your phone settings.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

// Color-free geometry only — all colors and text sizes come from the theme
// at render time, so this file re-themes and re-scales for free.
const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  startBtn: {
    borderRadius: 20,
    minHeight: 88,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  startLabel: { fontWeight: '700', letterSpacing: -0.2 },
  explainTitle: { marginBottom: 6 },
  explainText: {},
  permissionNote: { textAlign: 'center' },
});
