import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import { Screen, Card, Button, Segmented, Banner } from '../components/ui';

import { COLORS, RADIUS, SPACING, TREE_RULES, TYPOGRAPHY } from '../constants/theme';
import { getCurrentPosition } from '../services/location';
import { useActivity } from '../context/ActivityContext';
import { useSettings } from '../constants/SettingsContext';
import { useApp } from '../context/AppContext';
import { useWeather } from '../context/WeatherContext';

type Mode = 'hike' | 'bike';

export default function TrackScreen() {
  const navigation = useNavigation<any>();
  const { totalActivities } = useActivity();
  const { formatDistanceUnit } = useSettings();
  const { permission, requestLocation } = useApp();
  const { report } = useWeather();

  const [mode, setMode] = useState<Mode>('hike');
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await getCurrentPosition();
      if (c) setHasLocation(true);
    })();
  }, []);

  const handleStart = useCallback(async () => {
    const coords = await requestLocation();
    if (!coords && Platform.OS !== 'web') {
      Alert.alert(
        'Location needed',
        'EcoTrek measures your distance from GPS. Turn on location access for EcoTrek in your phone settings to track an activity.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check for dangerous weather
    if (report && report.level === 'danger') {
      Alert.alert(
        'Dangerous conditions',
        report.headline + '\n\n' + report.summary,
        [
          { text: 'Not today', style: 'cancel' },
          {
            text: 'I understand the risk',
            style: 'destructive',
            onPress: () => navigation.navigate('ActiveTracking', { mode }),
          },
        ]
      );
      return;
    }

    navigation.navigate('ActiveTracking', { mode });
  }, [requestLocation, report, navigation, mode]);

  return (
    <Screen>
      <Header
        title="Track"
        subtitle="Ready to go?"
        actions={[{ icon: 'shield', onPress: () => navigation.navigate('Safety'), label: 'Safety' }]}
      />

      <View style={styles.body}>
        {/* Weather warning */}
        {report && report.level !== 'good' ? (
          <Banner
            tone={report.level === 'danger' ? 'danger' : report.level === 'warning' ? 'warning' : 'info'}
            icon={report.level === 'danger' ? 'alert-triangle' : 'info'}
            title={report.headline}
            message={report.summary}
            onPress={() => navigation.navigate('Conditions')}
          />
        ) : null}

        {/* Mode selector */}
        <Segmented
          options={[
            { value: 'hike', label: 'Hike', icon: 'boot' },
            { value: 'bike', label: 'Bike', icon: 'bike' },
          ]}
          value={mode}
          onChange={(v) => setMode(v as Mode)}
        />

        {/* Activity type info card */}
        <Card>
          <View style={styles.infoHeader}>
            <View style={styles.infoIcon}>
              <Icon name={mode === 'hike' ? 'boot' : 'bike'} size={24} color={COLORS.primary} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                {mode === 'hike' ? 'Hiking Mode' : 'Biking Mode'}
              </Text>
              <Text style={styles.infoSub}>
                {mode === 'hike'
                  ? 'Speed limit: 20 mph • 1 tree per mile'
                  : 'Speed limit: 30 mph • 1 tree per 3 miles'}
              </Text>
            </View>
          </View>

          <View style={styles.infoDetails}>
            <InfoRow icon="trending-up" text={mode === 'hike' ? 'Walking, jogging, or hiking pace' : 'Cycling at a comfortable pace'} />
            <InfoRow icon="shield" text="Activities are verified for fairness — excessive speed flags the activity" />
            <InfoRow icon="battery" text="Keep the app open for best GPS accuracy" />
          </View>
        </Card>

        {/* How trees work */}
        {totalActivities < 3 ? (
          <Card tone="sunken">
            <Text style={styles.explainTitle}>How trees are earned</Text>
            <Text style={styles.explainText}>
              1 tree per {TREE_RULES.hikeMilesPerTree} mile hiked, 1 per {TREE_RULES.bikeMilesPerTree}{' '}
              miles biked. Trees are a symbolic measure of your effort inside EcoTrek.
            </Text>
          </Card>
        ) : null}

        {/* Start button */}
        <Button
          label={`Start ${mode === 'bike' ? 'ride' : 'hike'}`}
          icon="play"
          size="lg"
          full
          onPress={handleStart}
        />

        {permission === 'denied' ? (
          <Text style={styles.permissionNote}>
            Location access is off, so distance cannot be measured. Enable it in your phone's
            settings for EcoTrek.
          </Text>
        ) : null}

        {/* Speed limit info */}
        <View style={styles.speedInfo}>
          <Icon name="shield" size={14} color={COLORS.textMuted} strokeWidth={2} />
          <Text style={styles.speedInfoText}>
            Anti-cheat: Speed is monitored during activity. 3 warnings and the activity may be flagged.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function InfoRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={15} color={COLORS.textMuted} strokeWidth={2} />
      <Text style={styles.infoRowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },

  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  infoSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },

  infoDetails: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: SPACING.sm + 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  infoRowText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, flex: 1 },

  explainTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: 4 },
  explainText: { ...TYPOGRAPHY.small, color: COLORS.textMuted },

  permissionNote: { ...TYPOGRAPHY.small, color: COLORS.textMuted, textAlign: 'center' },

  speedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  speedInfoText: { ...TYPOGRAPHY.small, color: COLORS.textMuted, flex: 1, textAlign: 'center' },
});
