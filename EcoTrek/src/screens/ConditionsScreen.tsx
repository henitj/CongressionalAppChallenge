import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, Pill, Banner, EmptyState, Divider } from '../components/ui';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useWeather } from '../context/WeatherContext';
import { useSettings } from '../constants/SettingsContext';
import { useApp } from '../context/AppContext';
import { LEVEL_META, SafetyLevel } from '../services/weather';

const TONE_MAP: Record<SafetyLevel, 'success' | 'info' | 'warning' | 'danger'> = {
  good: 'success',
  caution: 'info',
  warning: 'warning',
  danger: 'danger',
};

export default function ConditionsScreen() {
  const { report, loading, error, refresh } = useWeather();
  const { formatTemp } = useSettings();
  const { usingFallbackLocation, requestLocation } = useApp();

  if (loading && !report) {
    return (
      <Screen scroll={false}>
        <Header title="Conditions" back />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.centerText}>Reading the sky…</Text>
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
        <RefreshControl refreshing={loading} onRefresh={() => refresh(true)} tintColor={COLORS.textMuted} />
      }
    >
      <Header title="Conditions" subtitle="Trail safety report" back />

      <View style={styles.body}>
        {/* Verdict */}
        <Card>
          <View style={styles.verdictTop}>
            <View style={styles.verdictIcon}>
              <Icon name={report.icon as IconName} size={26} color={COLORS.primary} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1 }}>
              <Pill label={meta.label} tone={TONE_MAP[report.level]} size="sm" />
              <Text style={styles.verdictHeadline}>{report.headline}</Text>
            </View>
          </View>
          <Text style={styles.verdictSummary}>{report.summary}</Text>

          <Divider style={{ marginVertical: SPACING.md - 2 }} />

          <View style={styles.grid}>
            <GridStat label="Now" value={formatTemp(report.tempF)} />
            <GridStat label="Feels like" value={formatTemp(report.feelsLikeF)} />
            <GridStat label="High" value={formatTemp(report.highF)} />
            <GridStat label="Low" value={formatTemp(report.lowF)} />
            <GridStat label="Humidity" value={`${report.humidity}%`} />
            <GridStat label="Wind" value={`${Math.round(report.windMph)} mph`} />
            <GridStat label="Gusts" value={`${Math.round(report.windGustMph)} mph`} />
            <GridStat label="UV index" value={String(Math.round(report.uvIndex))} />
            {report.aqi != null ? <GridStat label="Air quality" value={String(report.aqi)} /> : null}
            <GridStat label="Rain chance" value={`${report.precipChance}%`} />
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
            <Text style={styles.sectionTitle}>Official alerts</Text>
            <View style={{ gap: SPACING.sm }}>
              {official.map((a) => (
                <Card
                  key={a.id}
                  style={[
                    styles.alertCard,
                    a.level === 'danger' && { borderColor: COLORS.dangerBorder, backgroundColor: COLORS.dangerLight },
                  ]}
                >
                  <View style={styles.alertHead}>
                    <Icon
                      name={a.icon as IconName}
                      size={18}
                      color={a.level === 'danger' ? COLORS.danger : COLORS.warning}
                      strokeWidth={2}
                    />
                    <Text style={styles.alertTitle}>{a.title}</Text>
                    <Pill
                      label={a.level === 'danger' ? 'Severe' : 'Advisory'}
                      tone={a.level === 'danger' ? 'danger' : 'warning'}
                      size="sm"
                    />
                  </View>
                  <Text style={styles.alertDetail}>{a.detail}</Text>
                  <Text style={styles.alertSource}>
                    {a.source}
                    {a.expires ? ` · until ${new Date(a.expires).toLocaleString(undefined, { weekday: 'short', hour: 'numeric' })}` : ''}
                  </Text>
                </Card>
              ))}
            </View>
          </View>
        ) : null}

        {/* Derived advisories */}
        {derived.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>What to watch for</Text>
            <Card padded={false}>
              {derived.map((a, i) => (
                <View key={a.id}>
                  {i > 0 ? <Divider style={{ marginLeft: 58 }} /> : null}
                  <View style={styles.advisoryRow}>
                    <View
                      style={[
                        styles.advisoryIcon,
                        a.level === 'danger' && { backgroundColor: COLORS.dangerLight },
                        a.level === 'warning' && { backgroundColor: COLORS.warningLight },
                      ]}
                    >
                      <Icon
                        name={a.icon as IconName}
                        size={17}
                        color={
                          a.level === 'danger'
                            ? COLORS.danger
                            : a.level === 'warning'
                            ? COLORS.warning
                            : COLORS.info
                        }
                        strokeWidth={1.9}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.advisoryTitle}>{a.title}</Text>
                      <Text style={styles.advisoryDetail}>{a.detail}</Text>
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
            <Text style={styles.sectionTitle}>Next 12 hours</Text>
            <Card padded={false} style={{ paddingVertical: SPACING.md - 2 }}>
              <View style={styles.hourlyRow}>
                {report.hourly.map((h) => (
                  <View key={h.time} style={styles.hourCol}>
                    <Text style={styles.hourLabel}>{formatHour(h.hour)}</Text>
                    <Text style={styles.hourTemp}>{Math.round(h.temp)}°</Text>
                    <View
                      style={[
                        styles.rainBar,
                        { height: Math.max(3, (h.precipChance / 100) * 34) },
                        h.precipChance >= 50 && { backgroundColor: COLORS.info },
                      ]}
                    />
                    <Text style={styles.hourRain}>{h.precipChance}%</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        ) : null}

        {/* Source + location note */}
        <Card tone="sunken">
          <Text style={styles.sourceTitle}>Where this comes from</Text>
          <Text style={styles.sourceText}>
            Conditions and forecast from Open-Meteo. Watches, warnings and advisories come
            straight from the US National Weather Service — the same feed behind your phone's
            emergency alerts.
          </Text>
          {usingFallbackLocation ? (
            <Text style={[styles.sourceText, { marginTop: SPACING.sm }]}>
              Showing Austin, TX because location access is off.{' '}
              <Text style={styles.link} onPress={() => requestLocation()}>
                Use my location
              </Text>
            </Text>
          ) : null}
          <Text style={styles.updated}>
            Updated {new Date(report.fetchedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

function GridStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.gridStat}>
      <Text style={styles.gridLabel}>{label}</Text>
      <Text style={styles.gridValue}>{value}</Text>
    </View>
  );
}

function formatHour(h: number) {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h > 12 ? `${h - 12}p` : `${h}a`;
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  centerText: { ...TYPOGRAPHY.small, color: COLORS.textMuted },

  verdictTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md - 2 },
  verdictIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictHeadline: { ...TYPOGRAPHY.h2, color: COLORS.text, marginTop: 5 },
  verdictSummary: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: SPACING.sm + 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridStat: { width: '25%', paddingVertical: SPACING.sm - 2 },
  gridLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },
  gridValue: { ...TYPOGRAPHY.h4, color: COLORS.text, marginTop: 2 },

  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.sm + 2 },

  alertCard: { gap: 6 },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  alertTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, flex: 1 },
  alertDetail: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
  alertSource: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, marginTop: 2 },

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
    backgroundColor: COLORS.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advisoryTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  advisoryDetail: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },

  hourlyRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  hourCol: { alignItems: 'center', gap: 4, flex: 1 },
  hourLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },
  hourTemp: { ...TYPOGRAPHY.smallMed, color: COLORS.text },
  rainBar: {
    width: 5,
    borderRadius: 3,
    backgroundColor: COLORS.skyLight,
  },
  hourRain: { fontSize: 9, color: COLORS.textLight, fontWeight: '600' },

  sourceTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: 4 },
  sourceText: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  link: { color: COLORS.primary, fontWeight: '600', textDecorationLine: 'underline' },
  updated: { ...TYPOGRAPHY.micro, color: COLORS.textLight, marginTop: SPACING.sm },
});
