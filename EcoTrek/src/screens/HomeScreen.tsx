import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon from '../components/Icon';
import ConditionsCard from '../components/ConditionsCard';
import { Screen, Card, Button, Segmented } from '../components/ui';
import { ColorPalette, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useActivity } from '../context/ActivityContext';
import { useProfile } from '../context/ProfileContext';
import { useSettings } from '../constants/SettingsContext';
import { firstNameOf } from '../services/displayName';
import { useStartActivity } from '../hooks/useStartActivity';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { history } = useActivity();
  const { formatDistance, formatDistanceUnit } = useSettings();
  const { colors, fontScale } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { mode, setMode, start, starting } = useStartActivity('hike');

  const firstName = firstNameOf(profile.firstName, user?.name);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const last = history[0];

  return (
    <Screen>
      <Header
        title={firstName}
        subtitle={`${greeting} · ${new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })}`}
        actions={[{ icon: 'sliders', onPress: () => navigation.navigate('Settings'), label: 'Settings' }]}
      />

      <View style={styles.body}>
        <ConditionsCard />

        <Segmented
          options={[
            { value: 'hike', label: 'Walk', icon: 'boot' },
            { value: 'bike', label: 'Bike', icon: 'bike' },
          ]}
          value={mode}
          onChange={(v) => setMode(v)}
        />

        <Pressable
          onPress={start}
          disabled={starting}
          accessibilityRole="button"
          accessibilityLabel={mode === 'bike' ? 'Start ride' : 'Start walk'}
          style={({ pressed }) => [styles.startBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.88 }]}
        >
          <Icon name="play" size={28} color="#fff" strokeWidth={2.2} />
          <Text style={[styles.startLabel, { fontSize: Math.round(22 * fontScale) }]}>
            {starting ? 'Starting…' : mode === 'bike' ? 'Start ride' : 'Start walk'}
          </Text>
        </Pressable>

        <View>
          <Text style={styles.section}>Your last walk</Text>
          {last ? (
            <Card onPress={() => navigation.navigate('ActivityDetail', { activityId: last.id })}>
              <View style={styles.lastRow}>
                <View style={styles.lastIcon}>
                  <Icon
                    name={last.type === 'bike' ? 'bike' : 'boot'}
                    size={20}
                    color={colors.primary}
                    strokeWidth={1.9}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lastTitle} numberOfLines={1}>
                    {last.trailName ?? (last.type === 'bike' ? 'Bike ride' : 'Walk')}
                  </Text>
                  <Text style={styles.lastMeta}>
                    {new Date(last.startedAt).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' · '}
                    {formatDistance(last.miles)} {formatDistanceUnit()}
                    {' · '}
                    {Math.max(1, Math.round(last.durationSec / 60))} min
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.textLight} />
              </View>
            </Card>
          ) : (
            <Card tone="sunken">
              <Text style={styles.emptyTitle}>You have not walked yet</Text>
              <Text style={styles.emptyText}>Tap Start walk when you are ready. That is all.</Text>
            </Card>
          )}
          <Button
            label="See all walks"
            variant="ghost"
            onPress={() => navigation.navigate('History')}
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
          />
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.lg },
  startBtn: {
    backgroundColor: c.primary,
    borderRadius: RADIUS.xl,
    minHeight: 88,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  startLabel: { color: '#fff', fontWeight: '700', letterSpacing: -0.2 },
  section: { ...TYPOGRAPHY.h3, color: c.text, marginBottom: SPACING.sm },
  lastRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  lastIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastTitle: { ...TYPOGRAPHY.h4, color: c.text },
  lastMeta: { ...TYPOGRAPHY.small, color: c.textMuted, marginTop: 3 },
  emptyTitle: { ...TYPOGRAPHY.h4, color: c.text },
  emptyText: { ...TYPOGRAPHY.body, color: c.textMuted, marginTop: 4 },
  });
}
