import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import { Screen, Card, Button, Segmented, Banner } from '../components/ui';

import { COLORS, SPACING, TREE_RULES, TYPOGRAPHY } from '../constants/theme';
import { useActivity } from '../context/ActivityContext';
import { useApp } from '../context/AppContext';
import { useWeather } from '../context/WeatherContext';

type Mode = 'hike' | 'bike';

export default function TrackScreen() {
  const navigation = useNavigation<any>();
  const { totalActivities } = useActivity();
  const { permission, requestLocation } = useApp();
  const { report } = useWeather();

  const [mode, setMode] = useState<Mode>('hike');
  const [starting, setStarting] = useState(false);

  const handleStart = useCallback(async () => {
    // Ask for permission if we do not have it yet — but never wait on a
    // GPS lock. That wait is what made Start feel broken.
    if (permission !== 'granted' && Platform.OS !== 'web') {
      setStarting(true);
      const coords = await requestLocation({ permissionOnly: true });
      setStarting(false);
      if (!coords) {
        Alert.alert(
          'Location needed',
          'EcoTrek needs location while you walk or ride so it can measure how far you go. Turn it on for EcoTrek in your phone settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    if (report && report.level === 'danger') {
      Alert.alert('Stay inside today', report.headline + '\n\n' + report.summary, [
        { text: 'Not today', style: 'cancel' },
        {
          text: 'I understand',
          style: 'destructive',
          onPress: () => navigation.navigate('ActiveTracking', { mode }),
        },
      ]);
      return;
    }

    navigation.navigate('ActiveTracking', { mode });
  }, [permission, requestLocation, report, navigation, mode]);

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
            { value: 'hike', label: 'Walk or hike', icon: 'boot' },
            { value: 'bike', label: 'Bike', icon: 'bike' },
          ]}
          value={mode}
          onChange={(v) => setMode(v as Mode)}
        />

        <Card>
          <View style={styles.infoHeader}>
            <View style={styles.infoIcon}>
              <Icon name={mode === 'hike' ? 'boot' : 'bike'} size={26} color={COLORS.primary} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>{mode === 'hike' ? 'Walking or hiking' : 'Biking'}</Text>
              <Text style={styles.infoSub}>
                {mode === 'hike'
                  ? `1 tree for every ${TREE_RULES.hikeMilesPerTree} mile`
                  : `1 tree for every ${TREE_RULES.bikeMilesPerTree} miles`}
              </Text>
            </View>
          </View>

          <View style={styles.infoDetails}>
            <InfoRow icon="play" text="Tap Start, put your phone away, and go." />
            <InfoRow icon="battery" text="Keep the app open for the best results." />
            <InfoRow
              icon="shield"
              text="We check that you are walking or biking, so scores stay fair."
            />
          </View>
        </Card>

        {totalActivities < 3 ? (
          <Card tone="sunken">
            <Text style={styles.explainTitle}>How trees are earned</Text>
            <Text style={styles.explainText}>
              1 tree per {TREE_RULES.hikeMilesPerTree} mile walked, 1 per {TREE_RULES.bikeMilesPerTree}{' '}
              miles biked. Trees are a fun way to see your effort — no real tree is planted.
            </Text>
          </Card>
        ) : null}

        <Button
          label={starting ? 'Starting…' : `Start ${mode === 'bike' ? 'ride' : 'walk'}`}
          icon="play"
          size="lg"
          full
          loading={starting}
          onPress={handleStart}
        />

        {permission === 'denied' ? (
          <Text style={styles.permissionNote}>
            Location is off, so we cannot measure distance. Turn it on for EcoTrek in your phone
            settings.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function InfoRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={18} color={COLORS.textMuted} strokeWidth={2} />
      <Text style={styles.infoRowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },

  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  infoIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  infoSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 4 },

  infoDetails: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm + 2 },
  infoRowText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, flex: 1 },

  explainTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: 6 },
  explainText: { ...TYPOGRAPHY.small, color: COLORS.textMuted },

  permissionNote: { ...TYPOGRAPHY.small, color: COLORS.textMuted, textAlign: 'center' },
});
