import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon, { IconName } from './Icon';
import { ColorPalette, RADIUS, SPACING } from '../constants/theme';
import { useWeather } from '../context/WeatherContext';
import { LEVEL_META, SafetyLevel } from '../services/weather';
import { useSettings } from '../constants/SettingsContext';
import { Typography, useTheme } from '../context/ThemeContext';

function toneFor(c: ColorPalette): Record<SafetyLevel, { bg: string; border: string }> {
  return {
    good: { bg: c.successLight, border: c.successBorder },
    caution: { bg: c.infoLight, border: c.infoBorder },
    warning: { bg: c.warningLight, border: c.warningBorder },
    danger: { bg: c.dangerLight, border: c.dangerBorder },
  };
}

/**
 * The one tiny weather box on the home screen.
 *
 * We are not a weather app: this is just the one small glance you need to
 * decide to go outside or not — the temperature, the condition, and a single
 * friendly sentence. Everything else (hourly, alerts, air quality) lives one
 * tap away on the full Conditions page.
 */
export default function ConditionsCard() {
  const navigation = useNavigation<any>();
  const { report, loading, error, refresh } = useWeather();
  const { formatTemp } = useSettings();
  const { colors, typography } = useTheme();
  const styles = React.useMemo(() => makeWeatherStyles(colors, typography), [colors, typography]);

  if (loading && !report) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color={colors.textMuted} />
        <Text style={styles.loadingText}>Checking the weather…</Text>
      </View>
    );
  }

  if (error || !report) {
    return (
      <Pressable
        onPress={() => refresh(true)}
        style={[styles.card, styles.loadingCard]}
        accessibilityLabel="Retry weather"
      >
        <Icon name="refresh" size={18} color={colors.textMuted} />
        <Text style={styles.loadingText}>{error ?? 'Weather unavailable'} — tap to try again</Text>
      </Pressable>
    );
  }

  const tone = toneFor(colors)[report.level];
  const meta = LEVEL_META[report.level];

  return (
    <Pressable
      onPress={() => navigation.navigate('Conditions')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tone.bg, borderColor: tone.border },
        pressed && { opacity: 0.88 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Weather: ${formatTemp(report.tempF)}, ${report.condition}. ${report.shortNote}. Tap for details.`}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
          <Icon name={report.icon as IconName} size={20} color={colors.primary} strokeWidth={1.9} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.topLine}>
            <Text style={styles.temp}>{formatTemp(report.tempF)}</Text>
            <Text style={styles.condition}>{report.condition}</Text>
          </View>
          <Text style={[styles.note, { color: meta.tone === 'danger' ? colors.danger : colors.textSecondary }]} numberOfLines={2}>
            {meta.label} · {report.shortNote}
          </Text>
        </View>

        <Icon name="chevron-right" size={17} color={colors.textLight} />
      </View>
    </Pressable>
  );
}

function makeWeatherStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    card: {
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingVertical: SPACING.sm + 4,
      paddingHorizontal: SPACING.md,
    },
    loadingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.md + 4,
    },
    loadingText: { ...t.small, color: c.textMuted, flex: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topLine: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm - 2 },
    temp: { ...t.h2, color: c.text, letterSpacing: -0.4 },
    condition: { ...t.body, color: c.textSecondary },
    note: { ...t.small, color: c.textSecondary, marginTop: 2 },
  });
}
