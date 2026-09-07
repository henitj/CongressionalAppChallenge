import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Pill, Banner, EmptyState, Divider } from '../components/ui';
import { ColorPalette, RADIUS, SPACING } from '../constants/theme';
import { useWeather } from '../context/WeatherContext';
import { useSettings } from '../constants/SettingsContext';
import { useApp } from '../context/AppContext';
import { iconForCode, LEVEL_META, SafetyLevel } from '../services/weather';
import { Typography, useTheme } from '../context/ThemeContext';

const TONE_MAP: Record<SafetyLevel, 'success' | 'info' | 'warning' | 'danger'> = {
  good: 'success',
  caution: 'info',
  warning: 'warning',
  danger: 'danger',
};

/**
 * The full weather report. Home keeps one tiny box; this is the deeper
 * look for people who want it — verdict, best window, official alerts,
 * what to watch for, and the next 12 hours.
 */
export default function ConditionsScreen() {
  const { report, loading, error, refresh } = useWeather();
  const { formatTemp } = useSettings();
  const { usingFallbackLocation, requestLocation } = useApp();
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(), []);

  if (loading && !report) {
    return (
      <Screen scroll={false}>
        <Header title="Conditions" back />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.centerText, typography.small, { color: colors.textMuted }]}>Reading the sky…</Text>
        </View>
      </Screen>
    );
  }

  if (!report) {
    return (
      <Screen scroll={false}>
        <Header title="Conditions" back />
        <EmptyState
          icon="cloud"
          title="Conditions unavailable"
          message={error ?? 'Could not reach the weather service.'}
          action="Try again"
          onAction={() => refresh(true)}
        />
      </Screen>
    );
  }

  const meta = LEVEL_META[report.level];
  const official = report.advisories.filter((a) => a.official);
  const derived = report.advisories.filter((a) => !a.official);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => refresh(true)} tintColor={colors.textMuted} />
      }
    >
      <Header title="Weather" subtitle="Today and the next few hours" back />

      <View style={styles.body}>
        {/* Verdict */}
        <Card>
          <View style={styles.verdictTop}>
            <View style={[styles.verdictIcon, { backgroundColor: colors.primarySurface }]}>
              <Icon name={report.icon as IconName} size={26} color={colors.primary} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1 }}>
              <Pill label={meta.label} tone={TONE_MAP[report.level]} size="sm" />
              <Text style={[styles.verdictHeadline, typography.h2, { color: colors.text }]}>{report.headline}</Text>
            </View>
          </View>
          <Text style={[styles.verdictSummary, typography.body, { color: colors.textSecondary }]}>
            {report.summary}
          </Text>

          <Divider style={{ marginVertical: SPACING.md - 2 }} />

          <View style={styles.grid}>
            <GridStat styles={styles} typography={typography} colors={colors} label="Now" value={formatTemp(report.tempF)} />
            <GridStat styles={styles} typography={typography} colors={colors} label="Feels like" value={formatTemp(report.feelsLikeF)} />
            <GridStat styles={styles} typography={typography} colors={colors} label="High" value={formatTemp(report.highF)} />
            <GridStat styles={styles} typography={typography} colors={colors} label="Low" value={formatTemp(report.lowF)} />
          </View>
        </Card>

        {report.bestWindow ? (
          <Banner
            tone="info"
            icon="clock"
            title={`Best window: ${report.bestWindow}`}
            message="Coolest stretch with the lowest rain chance in the next 14 hours."
          />
        ) : null}

        {/* Official NWS alerts */}
        {official.length > 0 ? (
          <View>
            <Text style={[styles.sectionTitle, typography.h3, { color: colors.text }]}>Official alerts</Text>
            <View style={{ gap: SPACING.sm }}>
              {official.map((a) => (
                <Card
                  key={a.id}
                  style={[
                    styles.alertCard,
                    a.level === 'danger' && { borderColor: colors.dangerBorder, backgroundColor: colors.dangerLight },
                  ]}
                >
                  <View style={styles.alertHead}>
                    <Icon
                      name={a.icon as IconName}
                      size={18}
                      color={a.level === 'danger' ? colors.danger : colors.warning}
                      strokeWidth={2}
                    />
                    <Text style={[styles.alertTitle, typography.h4, { color: colors.text }]}>{a.title}</Text>
                    <Pill
                      label={a.level === 'danger' ? 'Severe' : 'Advisory'}
                      tone={a.level === 'danger' ? 'danger' : 'warning'}
                      size="sm"
                    />
                  </View>
                  <Text style={[styles.alertDetail, typography.small, { color: colors.textSecondary }]}>
                    {a.detail}
                  </Text>
                  <Text style={[styles.alertSource, typography.micro, { color: colors.textMuted }]}>
                    {a.source}
                    {a.expires
                      ? ` · until ${new Date(a.expires).toLocaleString(undefined, { weekday: 'short', hour: 'numeric' })}`
                      : ''}
                  </Text>
                </Card>
              ))}
            </View>
          </View>
        ) : null}

        {/* Derived advisories */}
        {derived.length > 0 ? (
          <View>
            <Text style={[styles.sectionTitle, typography.h3, { color: colors.text }]}>What to watch for</Text>
            <Card padded={false}>
              {derived.map((a, i) => (
                <View key={a.id}>
                  {i > 0 ? <Divider style={{ marginLeft: 58 }} /> : null}
                  <View style={styles.advisoryRow}>
                    <View
                      style={[
                        styles.advisoryIcon,
                        { backgroundColor: colors.infoLight },
                        a.level === 'danger' && { backgroundColor: colors.dangerLight },
                        a.level === 'warning' && { backgroundColor: colors.warningLight },
                      ]}
                    >
                      <Icon
                        name={a.icon as IconName}
                        size={17}
                        color={
                          a.level === 'danger'
                            ? colors.danger
                            : a.level === 'warning'
                            ? colors.warning
                            : colors.info
                        }
                        strokeWidth={1.9}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.advisoryTitle, typography.h4, { color: colors.text }]}>{a.title}</Text>
                      <Text style={[styles.advisoryDetail, typography.small, { color: colors.textMuted }]}>
                        {a.detail}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ) : (
          <Banner
            tone="success"
            icon="check-circle"
            title="Nothing to flag"
            message="No weather advisories, no heat or air quality concerns right now."
          />
        )}

        {/* Hourly */}
        {report.hourly.length > 0 ? (
          <View>
            <Text style={[styles.sectionTitle, typography.h3, { color: colors.text }]}>Next 12 hours</Text>
            <Card padded={false} style={styles.hourlyCard}>
              {/* A horizontal strip, not twelve columns crushed into the
                  width of a phone. Each hour keeps a fixed width so the
                  numbers stay readable at any text size. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourlyRow}
              >
                {report.hourly.map((h, i) => {
                  const wet = h.precipChance >= 40;
                  return (
                    <View key={h.time} style={styles.hourCol}>
                      <Text style={[styles.hourLabel, typography.micro, { color: i === 0 ? colors.text : colors.textMuted }]}>
                        {i === 0 ? 'Now' : formatHour(h.hour)}
                      </Text>
                      <Icon
                        name={iconForCode(h.code, h.hour >= 7 && h.hour <= 19) as IconName}
                        size={20}
                        color={wet ? colors.info : colors.textSecondary}
                        strokeWidth={1.8}
                      />
                      <Text style={[styles.hourTemp, typography.h4, { color: colors.text }]}>
                        {Math.round(h.temp)}°
                      </Text>
                      {/* Rain chance: a bar in a fixed-height track, so every
                          column lines up instead of floating at its own level. */}
                      <View style={[styles.rainTrack, { backgroundColor: colors.surfaceSunken }]}>
                        <View
                          style={[
                            styles.rainFill,
                            {
                              height: `${Math.max(4, h.precipChance)}%`,
                              backgroundColor: wet ? colors.info : colors.infoBorder,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.hourRain,
                          typography.micro,
                          { color: wet ? colors.info : colors.textLight },
                        ]}
                      >
                        {h.precipChance}%
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
              <Text style={[styles.hourlyFootnote, typography.micro, { color: colors.textLight }]}>
                Temperature and chance of rain, hour by hour
              </Text>
            </Card>
          </View>
        ) : null}

        {/* Source + location note */}
        <Card tone="sunken">
          <Text style={[styles.sourceTitle, typography.h4, { color: colors.text }]}>Where this comes from</Text>
          <Text style={[styles.sourceText, typography.small, { color: colors.textMuted }]}>
            Conditions and forecast from Open-Meteo. Watches, warnings and advisories come
            straight from the US National Weather Service — the same feed behind your phone's
            emergency alerts.
          </Text>
          {usingFallbackLocation ? (
            <Text style={[styles.sourceText, typography.small, { color: colors.textMuted, marginTop: SPACING.sm }]}>
              Showing a default location because location access is off.{' '}
              <Text style={[{ color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' }]} onPress={() => requestLocation()}>
                Use my location
              </Text>
            </Text>
          ) : null}
          <Text style={[styles.updated, typography.micro, { color: colors.textLight }]}>
            Updated {new Date(report.fetchedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

function GridStat({
  styles,
  typography,
  colors,
  label,
  value,
}: {
  styles: any;
  typography: Typography;
  colors: ColorPalette;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.gridStat}>
      <Text style={[styles.gridLabel, typography.micro, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.gridValue, typography.h4, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function formatHour(h: number) {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h > 12 ? `${h - 12}p` : `${h}a`;
}

function makeStyles() {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: SPACING.md },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
    centerText: {},

    verdictTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 2 },
    verdictIcon: {
      width: 52,
      height: 52,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verdictHeadline: { marginTop: 5 },
    verdictSummary: { marginTop: SPACING.sm + 2 },

    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    gridStat: { width: '25%', paddingVertical: SPACING.sm - 2 },
    gridLabel: {},
    gridValue: { marginTop: 2 },

    sectionTitle: { marginBottom: SPACING.sm + 2 },

    alertCard: { gap: 6 },
    alertHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    alertTitle: { flex: 1 },
    alertDetail: {},
    alertSource: { marginTop: 2 },

    advisoryRow: {
      flexDirection: 'row',
      gap: SPACING.sm + 4,
      padding: SPACING.md - 2,
      alignItems: 'flex-start',
    },
    advisoryIcon: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.sm + 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    advisoryTitle: {},
    advisoryDetail: { marginTop: 2 },

    hourlyCard: { paddingVertical: SPACING.md - 2 },
    hourlyRow: { paddingHorizontal: SPACING.sm + 2, gap: SPACING.xs },
    hourCol: {
      width: 58,
      alignItems: 'center',
      gap: 6,
      paddingVertical: SPACING.xs,
    },
    hourLabel: {},
    hourTemp: {},
    rainTrack: {
      width: 6,
      height: 40,
      borderRadius: 3,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    rainFill: { width: '100%', borderRadius: 3 },
    hourRain: {},
    hourlyFootnote: {
      marginTop: SPACING.sm,
      paddingHorizontal: SPACING.md - 2,
    },

    sourceTitle: { marginBottom: 4 },
    sourceText: {},
    updated: { marginTop: SPACING.sm },
  });
}
