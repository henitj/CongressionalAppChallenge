import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import ActivityCharacter from '../components/ActivityCharacter';
import { Screen, Banner } from '../components/ui';
import { ColorPalette, RADIUS, SPACING, TREE_RULES } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useWeather } from '../context/WeatherContext';
import { useResetOnLeave } from '../hooks/useResetOnLeave';
import { useStartActivity } from '../hooks/useStartActivity';
import { Typography, useTheme } from '../context/ThemeContext';

/** No decorative trail hero: the two activity choices are the focus. */
export default function TrackScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { permission, usingFallbackLocation, requestLocation } = useApp();
  const { report } = useWeather();
  const { mode, setMode, start, starting } = useStartActivity('hike');
  const { width, height } = useWindowDimensions();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  // Short phones keep the Start button on screen instead of below the fold.
  const artHeight = height < 700 ? Math.max(96, height * 0.2) : Math.min(214, Math.max(140, height * 0.25));
  const artWidth = Math.min(240, (Math.min(width, 720) - 80) / 2);

  useEffect(() => {
    if (route.params?.mode === 'hike' || route.params?.mode === 'bike') {
      setMode(route.params.mode);
      navigation.setParams({ mode: undefined });
    }
  }, [route.params?.mode, navigation, setMode]);

  useResetOnLeave(useCallback(() => setMode('hike'), [setMode]));

  const treeLine = mode === 'hike'
    ? `1 symbolic tree per ${TREE_RULES.hikeMilesPerTree} mile walked`
    : `1 symbolic tree per ${TREE_RULES.bikeMilesPerTree} miles ridden`;

  return (
    <Screen contentStyle={{ paddingBottom: SPACING.lg }}>
      <Header title="Start" subtitle="A little fresh air goes a long way" />
      <View style={styles.body}>
        {report && report.level !== 'good' ? (
          <Banner
            tone={report.level === 'danger' ? 'danger' : report.level === 'warning' ? 'warning' : 'info'}
            icon={report.level === 'danger' ? 'alert-triangle' : 'info'}
            title={report.headline}
            message={report.summary}
          />
        ) : null}

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>YOUR NEXT ADVENTURE</Text>
          <Text style={styles.title}>How are you heading out?</Text>
          <Text style={styles.subtitle}>Choose your pace. We’ll take care of the miles.</Text>
        </View>

        <View style={styles.modeRow} accessibilityRole="radiogroup" accessibilityLabel="Activity type">
          {([
            { value: 'hike' as const, title: 'Walk', subtitle: 'One step at a time', icon: 'boot' as const },
            { value: 'bike' as const, title: 'Bike', subtitle: 'Find your own rhythm', icon: 'bike' as const },
          ]).map((option) => {
            const selected = mode === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setMode(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                accessibilityLabel={`${option.title}, ${option.value === 'hike' ? 'On foot' : 'Ride'}`}
                testID={`activity-${option.value}`}
                style={({ pressed }) => [styles.modeCard, selected && styles.modeCardSelected, pressed && { opacity: 0.86 }]}
              >
                <View style={[styles.modeCheck, selected && styles.modeCheckSelected]}>
                  {selected ? <Icon name="check" size={14} color="#fff" strokeWidth={2.6} /> : null}
                </View>
                <View style={styles.art}>
                  <ActivityCharacter mode={option.value} size={artWidth} height={artHeight} />
                </View>
                <View style={styles.modeTitleRow}>
                  <Icon name={option.icon} size={20} color={colors.primary} />
                  <Text style={styles.modeTitle}>{option.title}</Text>
                </View>
                <Text style={styles.modeSubtitle}>{option.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.impactNote}>
          <Icon name="tree" size={19} color={colors.primary} />
          <Text style={styles.impactText}>{treeLine}</Text>
        </View>

        <Pressable
          onPress={start}
          disabled={starting}
          accessibilityRole="button"
          accessibilityState={{ disabled: starting, busy: starting }}
          accessibilityLabel={mode === 'bike' ? 'Start ride' : 'Start walk'}
          style={({ pressed }) => [styles.startBtn, (pressed || starting) && { opacity: 0.8 }]}
        >
          <Icon name="play" size={22} color="#fff" filled />
          <Text style={styles.startLabel}>{starting ? 'Starting…' : mode === 'bike' ? 'Start ride' : 'Start walk'}</Text>
          <Icon name="arrow-right" size={22} color="#fff" />
        </Pressable>

        {usingFallbackLocation || permission !== 'granted' ? (
          <Pressable onPress={() => requestLocation({ explain: true })} style={styles.locationNote} accessibilityRole="button">
            <Icon name="map-pin" size={16} color={colors.textMuted} />
            <Text style={styles.permissionNote}>
              {permission === 'denied'
                ? 'Location is off. Tap to restore GPS access.'
                : 'GPS connects when you start. Tap to check location.'}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.permissionNote, { textAlign: 'center' }]}>GPS ready · Your route stays on this device</Text>
        )}
      </View>
    </Screen>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: SPACING.lg },
    heading: { gap: 8 },
    eyebrow: { ...t.overline, color: c.primary },
    title: { ...t.h2, color: c.text },
    subtitle: { ...t.small, color: c.textMuted },
    modeRow: { flexDirection: 'row', gap: 12 },
    modeCard: {
      flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 10, paddingTop: 24, paddingBottom: 20,
      borderRadius: 24, borderWidth: 2, borderColor: c.borderLight, backgroundColor: c.surface,
    },
    modeCardSelected: { borderColor: c.primary, backgroundColor: c.primarySurface },
    modeCheck: {
      position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12,
      borderWidth: 1.5, borderColor: c.borderStrong, alignItems: 'center', justifyContent: 'center',
    },
    modeCheckSelected: { borderColor: c.primaryMid, backgroundColor: c.primaryMid },
    art: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    modeTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    modeTitle: { ...t.h3, color: c.text },
    modeSubtitle: { ...t.micro, color: c.textMuted, textAlign: 'center', marginTop: 6 },
    impactNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    impactText: { ...t.micro, color: c.textSecondary, flexShrink: 1 },
    startBtn: {
      borderRadius: RADIUS.xl, minHeight: 64, paddingVertical: 18, paddingHorizontal: SPACING.lg,
      alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, backgroundColor: c.primaryMid,
    },
    startLabel: { ...t.h3, color: '#fff', fontWeight: '700', flex: 1, textAlign: 'center' },
    locationNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44 },
    permissionNote: { ...t.micro, color: c.textMuted, flexShrink: 1, lineHeight: 19 },
  });
}
