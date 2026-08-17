import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
 * The "should I go outside right now" card.
 *
 * This is the first thing on the Home screen for a reason: in Austin the
 * answer is genuinely no for a good chunk of the year, and an app that sends
 * you out into a 108°F afternoon or a flash flood warning is a bad app.
 */
export default function ConditionsCard({ compact }: { compact?: boolean }) {
  const navigation = useNavigation<any>();
  const { report, loading, error, refresh } = useWeather();
  const { formatTemp } = useSettings();

  if (loading && !report) {
    return (
      <View style={[styles.card, styles.loadingCard]}>
        <ActivityIndicator size="small" color={COLORS.textMuted} />
        <Text style={styles.loadingText}>Checking conditions…</Text>
      </View>
    );
  }

  if (error || !report) {
    return (
      <Pressable onPress={() => refresh(true)} style={[styles.card, styles.loadingCard]}>
        <Icon name="refresh" size={16} color={COLORS.textMuted} />
        <Text style={styles.loadingText}>{error ?? 'Conditions unavailable'} — tap to retry</Text>
      </Pressable>
    );
  }

  const tone = TONE[report.level];
  const meta = LEVEL_META[report.level];

  return (
    <Pressable
      onPress={() => navigation.navigate('Conditions')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tone.bg, borderColor: tone.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: tone.fg }]}>
          <Icon name={report.icon as IconName} size={20} color="#fff" strokeWidth={2} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
            <Text style={[styles.status, { color: tone.fg }]}>{meta.short}</Text>
          </View>
          <Text style={styles.headline}>{report.headline}</Text>
        </View>

        <View style={styles.tempWrap}>
          <Text style={styles.temp}>{formatTemp(report.tempF)}</Text>
          <Text style={styles.feels}>feels {formatTemp(report.feelsLikeF)}</Text>
        </View>
      </View>

      {!compact ? (
        <>
          <Text style={styles.summary} numberOfLines={3}>
            {report.summary}
          </Text>

          <View style={styles.statsRow}>
            <Stat icon="droplet" value={`${report.precipChance}%`} label="Rain" />
            <Stat icon="wind" value={`${Math.round(report.windMph)}`} label="mph" />
            <Stat icon="sun" value={`${Math.round(report.uvIndex)}`} label="UV" />
            {report.aqi != null ? <Stat icon="cloud-fog" value={`${report.aqi}`} label="AQI" /> : null}
          </View>

          {report.bestWindow && report.level !== 'good' ? (
            <View style={styles.bestWindow}>
              <Icon name="clock" size={13} color={COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.bestWindowText}>
                Better window: <Text style={styles.bestWindowBold}>{report.bestWindow}</Text>
              </Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {report.advisories.length > 0
                ? `${report.advisories.length} advisor${report.advisories.length === 1 ? 'y' : 'ies'}`
                : 'No active advisories'}
            </Text>
            <View style={styles.footerLink}>
              <Text style={[styles.footerLinkText, { color: tone.fg }]}>Full report</Text>
              <Icon name="chevron-right" size={13} color={tone.fg} strokeWidth={2.3} />
            </View>
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={13} color={COLORS.textMuted} strokeWidth={1.9} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    gap: SPACING.sm + 2,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md + 2,
  },
  loadingText: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: { ...TYPOGRAPHY.micro, letterSpacing: 1 },
  headline: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: 1 },
  tempWrap: { alignItems: 'flex-end' },
  temp: { ...TYPOGRAPHY.h2, color: COLORS.text },
  feels: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },
  summary: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingTop: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { ...TYPOGRAPHY.smallMed, color: COLORS.text },
  statLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },
  bestWindow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bestWindowText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
  bestWindowBold: { fontWeight: '700', color: COLORS.text },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  footerText: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  footerLinkText: { ...TYPOGRAPHY.micro, fontWeight: '700' },
});
