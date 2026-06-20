import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import Header from '../components/Header';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { useSettings } from '../constants/SettingsContext';
import { useAuth } from '../constants/AuthContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { useAnalytics } from '../constants/AnalyticsContext';

export default function SettingsScreen() {
  const { units, tempUnit, setUnits, setTempUnit } = useSettings();
  const { user, signOut } = useAuth();
  const { totalPoints, level, badges, resetPoints } = useEcoPoints();
  const { getSummary } = useAnalytics();

  const summary = getSummary();
  const unlockedBadges = badges.filter((b) => b.unlocked).length;

  const handleReset = () => {
    Alert.alert(
      'Reset EcoPoints',
      'This will permanently delete all your points, badges, and history. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: resetPoints,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Settings" subtitle="Preferences · Analytics" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile summary */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name ?? 'Trekker'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
            <Text style={styles.profileLevel}>{level}</Text>
          </View>
          <View style={styles.profilePoints}>
            <Text style={styles.profilePtsVal}>{totalPoints}</Text>
            <Text style={styles.profilePtsLabel}>pts</Text>
          </View>
        </View>

        {/* Units section */}
        <SectionHeader title="Units & Measurements" />
        <View style={styles.card}>
          <SettingRow
            icon="📏"
            title="Distance"
            subtitle={units === 'imperial' ? 'Miles (mi)' : 'Kilometers (km)'}
          >
            <View style={styles.segmentControl}>
              <Pressable
                style={[
                  styles.segment,
                  units === 'imperial' && styles.segmentActive,
                ]}
                onPress={() => setUnits('imperial')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    units === 'imperial' && styles.segmentTextActive,
                  ]}
                >
                  mi
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segment,
                  units === 'metric' && styles.segmentActive,
                ]}
                onPress={() => setUnits('metric')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    units === 'metric' && styles.segmentTextActive,
                  ]}
                >
                  km
                </Text>
              </Pressable>
            </View>
          </SettingRow>

          <View style={styles.settingDivider} />

          <SettingRow
            icon="🌡️"
            title="Temperature"
            subtitle={tempUnit === 'F' ? 'Fahrenheit (°F)' : 'Celsius (°C)'}
          >
            <View style={styles.segmentControl}>
              <Pressable
                style={[
                  styles.segment,
                  tempUnit === 'F' && styles.segmentActive,
                ]}
                onPress={() => setTempUnit('F')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    tempUnit === 'F' && styles.segmentTextActive,
                  ]}
                >
                  °F
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.segment,
                  tempUnit === 'C' && styles.segmentActive,
                ]}
                onPress={() => setTempUnit('C')}
              >
                <Text
                  style={[
                    styles.segmentText,
                    tempUnit === 'C' && styles.segmentTextActive,
                  ]}
                >
                  °C
                </Text>
              </Pressable>
            </View>
          </SettingRow>
        </View>

        {/* App analytics */}
        <SectionHeader title="App Usage (Your Device)" />
        <View style={styles.card}>
          <View style={styles.analyticsGrid}>
            <AnalyticTile
              icon="📱"
              label="Sessions"
              value={summary.sessionCount.toString()}
            />
            <AnalyticTile
              icon="🏅"
              label="Badges"
              value={`${unlockedBadges}/${badges.length}`}
            />
            <AnalyticTile
              icon="⭐"
              label="EcoPoints"
              value={totalPoints.toLocaleString()}
            />
            <AnalyticTile
              icon="📅"
              label="First used"
              value={summary.firstSeen}
            />
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.deviceIdRow}>
            <Text style={styles.deviceIdLabel}>Device ID</Text>
            <Text style={styles.deviceIdValue}>{summary.deviceId}</Text>
          </View>
        </View>

        {/* Top events */}
        {summary.topEvents.length > 0 && (
          <>
            <SectionHeader title="Top Actions (Your Device)" />
            <View style={styles.card}>
              {summary.topEvents.map((e) => (
                <View key={e.event} style={styles.topEventRow}>
                  <Text style={styles.topEventName}>{e.event}</Text>
                  <View style={styles.topEventBadge}>
                    <Text style={styles.topEventCount}>{e.count}×</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.card}>
          <SettingRow
            icon="👤"
            title="Provider"
            subtitle={user?.provider === 'google' ? 'Google account' : 'Guest account'}
          />
          <View style={styles.settingDivider} />
          <SettingRow icon="📧" title="Email" subtitle={user?.email ?? '—'} />
        </View>

        {/* Danger */}
        <SectionHeader title="Danger Zone" />
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [
              styles.dangerBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleReset}
          >
            <Text style={styles.dangerIcon}>🗑️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerTitle}>Reset EcoPoints</Text>
              <Text style={styles.dangerSub}>
                Permanently deletes all points, badges, and history
              </Text>
            </View>
          </Pressable>
          <View style={styles.settingDivider} />
          <Pressable
            style={({ pressed }) => [
              styles.dangerBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={async () => {
              await signOut();
            }}
          >
            <Text style={styles.dangerIcon}>🚪</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerTitle}>Sign out</Text>
              <Text style={styles.dangerSub}>
                You will need to sign in again
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.version}>EcoTrek v1.0 · Built for Austin 🤘</Text>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

function AnalyticTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.analyticTile}>
      <Text style={styles.analyticIcon}>{icon}</Text>
      <Text style={styles.analyticValue}>{value}</Text>
      <Text style={styles.analyticLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: SPACING.xxxl },

  // Profile
  profileCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  profileInitial: { color: '#fff', fontSize: 24, fontWeight: '900' },
  profileName: { ...TYPOGRAPHY.h3, color: '#fff' },
  profileEmail: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  profileLevel: { ...TYPOGRAPHY.caption, color: COLORS.accent, marginTop: 4, fontWeight: '700' },
  profilePoints: { alignItems: 'flex-end' },
  profilePtsVal: { fontSize: 28, fontWeight: '900', color: COLORS.accent },
  profilePtsLabel: { ...TYPOGRAPHY.micro, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },

  // Section header
  sectionHeader: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  // Setting row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  settingIcon: { fontSize: 22, width: 30 },
  settingTitle: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },
  settingSubtitle: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  settingDivider: { height: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.md },

  // Segment control
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
  },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { fontWeight: '700', fontSize: 13, color: COLORS.textMuted },
  segmentTextActive: { color: '#fff' },

  // Analytics
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  analyticTile: {
    width: '47%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  analyticIcon: { fontSize: 24 },
  analyticValue: { ...TYPOGRAPHY.h3, color: COLORS.primary },
  analyticLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  deviceIdRow: {
    padding: SPACING.md,
    gap: 4,
  },
  deviceIdLabel: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  deviceIdValue: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },

  // Top events
  topEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  topEventName: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, flex: 1 },
  topEventBadge: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  topEventCount: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },

  // Danger
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  dangerIcon: { fontSize: 22, width: 30 },
  dangerTitle: { ...TYPOGRAPHY.bodyMed, color: COLORS.danger },
  dangerSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },

  version: {
    ...TYPOGRAPHY.micro,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

// Fix missing Platform import
import { Platform } from 'react-native';