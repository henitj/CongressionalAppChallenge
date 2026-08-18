import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import Icon, { IconName } from './Icon';
import { ColorPalette, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useWeather } from '../context/WeatherContext';
import { LEVEL_META, SafetyLevel } from '../services/weather';
import { useSettings } from '../constants/SettingsContext';
import { useTheme } from '../context/ThemeContext';

function toneFor(c: ColorPalette): Record<SafetyLevel, { bg: string; fg: string; border: string }> {
  return {
    good: { bg: c.successLight, fg: c.success, border: c.successBorder },
    caution: { bg: c.infoLight, fg: c.info, border: c.infoBorder },
    warning: { bg: c.warningLight, fg: c.warning, border: c.warningBorder },
    danger: { bg: c.dangerLight, fg: c.danger, border: c.dangerBorder },
  };
}

/**
 * Home-screen weather: current temperature plus the next few hours.
 * No extra page, no 10-stat grid — just what you need to decide if you
 * should go outside.
 */
export default function ConditionsCard({ compact }: { compact?: boolean }) {
  const { report, loading, error, refresh } = useWeather();
  const { formatTemp } = useSettings();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeWeatherStyles(colors), [colors]);

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
  const hours = report.hourly.slice(0, 6);

  return (
    <Pressable
      onPress={() => refresh(true)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tone.bg, borderColor: tone.border },
        pressed && { opacity: 0.9 },
      ]}
      accessibilityLabel={`Weather ${formatTemp(report.tempF)}, ${meta.label}`}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: tone.fg }]}>
          <Icon name={report.icon as IconName} size={22} color="#fff" strokeWidth={2} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.status, { color: tone.fg }]}>{meta.label}</Text>
          <Text style={styles.headline} numberOfLines={2}>
            {report.headline}
          </Text>
        </View>

        <View style={styles.tempWrap}>
          <Text style={styles.temp}>{formatTemp(report.tempF)}</Text>
          <Text style={styles.feels}>feels {formatTemp(report.feelsLikeF)}</Text>
        </View>
      </View>

      {hours.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hourly}
        >
          {(compact ? hours.slice(0, 5) : hours).map((h) => (
            <View key={h.time} style={styles.hourCol}>
              <Text style={styles.hourLabel}>{formatHour(h.hour)}</Text>
              <Text style={styles.hourTemp}>{Math.round(h.temp)}°</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {report.level === 'danger' || report.level === 'warning' ? (
        <Text style={styles.note} numberOfLines={2}>
          {report.summary}
        </Text>
      ) : null}
    </Pressable>
  );
}

function formatHour(h: number) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function makeWeatherStyles(c: ColorPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      padding: SPACING.md,
      gap: SPACING.md,
    },
    loadingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.md + 4,
    },
    loadingText: { ...TYPOGRAPHY.small, color: c.textMuted, flex: 1 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    status: { ...TYPOGRAPHY.overline },
    headline: { ...TYPOGRAPHY.h3, color: c.text, marginTop: 2 },
    tempWrap: { alignItems: 'flex-end' },
    temp: { fontSize: 32, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
    feels: { ...TYPOGRAPHY.small, color: c.textMuted, marginTop: 2 },
    hourly: { gap: SPACING.md, paddingTop: 2 },
    hourCol: {
      alignItems: 'center',
      minWidth: 56,
      paddingVertical: 8,
      paddingHorizontal: 8,
      backgroundColor: 'rgba(255,255,255,0.55)',
      borderRadius: RADIUS.md,
    },
    hourLabel: { ...TYPOGRAPHY.small, color: c.textMuted },
    hourTemp: { ...TYPOGRAPHY.h3, color: c.text, marginTop: 2 },
    note: { ...TYPOGRAPHY.small, color: c.textSecondary },
  });
}
