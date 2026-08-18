import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import Icon, { IconName } from './Icon';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useWeather } from '../context/WeatherContext';
import { LEVEL_META, SafetyLevel } from '../services/weather';
import { useSettings } from '../constants/SettingsContext';

const TONE: Record<SafetyLevel, { bg: string; fg: string; border: string }> = {
  good: { bg: COLORS.successLight, fg: COLORS.success, border: COLORS.successBorder },
  caution: { bg: COLORS.infoLight, fg: COLORS.info, border: COLORS.infoBorder },
  warning: { bg: COLORS.warningLight, fg: COLORS.warning, border: COLORS.warningBorder },
  danger: { bg: COLORS.dangerLight, fg: COLORS.danger, border: COLORS.dangerBorder },
};

/**
 * Home-screen weather: current temperature plus the next few hours.
 * No extra page, no 10-stat grid — just what you need to decide if you
 * should go outside.
 */
export default function ConditionsCard({ compact }: { compact?: boolean }) {
  const { report, loading, error, refresh } = useWeather();
  const { formatTemp } = useSettings();

  if (loading && !report) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color={COLORS.textMuted} />
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
        <Icon name="refresh" size={18} color={COLORS.textMuted} />
        <Text style={styles.loadingText}>{error ?? 'Weather unavailable'} — tap to try again</Text>
      </Pressable>
    );
  }

  const tone = TONE[report.level];
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

      {!compact && hours.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hourly}
        >
          {hours.map((h) => (
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

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md + 4,
  },
  loadingText: { ...TYPOGRAPHY.small, color: COLORS.textMuted, flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { ...TYPOGRAPHY.overline },
  headline: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: 2 },
  tempWrap: { alignItems: 'flex-end' },
  temp: { fontSize: 32, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  feels: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  hourly: { gap: SPACING.md, paddingTop: 2 },
  hourCol: {
    alignItems: 'center',
    minWidth: 56,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: RADIUS.md,
  },
  hourLabel: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  hourTemp: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: 2 },
  note: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
});
