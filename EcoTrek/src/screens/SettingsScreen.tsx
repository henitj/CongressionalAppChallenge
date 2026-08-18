import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert, Linking, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import Icon, { IconName } from '../components/Icon';
import { Screen, Card, SectionHeader, Segmented, Divider, Banner, Button } from '../components/ui';

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useSettings } from '../constants/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { useActivity } from '../context/ActivityContext';
import { useNotifications } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';
import { clearUserData } from '../services/storage';
import { isBackendConfigured } from '../services/api';
import { googleConfigProblems } from '../constants/authConfig';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, APP_VERSION } from '../constants/appInfo';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const {
    units,
    tempUnit,
    setUnits,
    setTempUnit,
    appearance,
    setAppearance,
    textSize,
    setTextSize,
    simpleMode,
    setSimpleMode,
    reduceMotion,
    setReduceMotion,
  } = useSettings();
  const { profile, setProfile } = useProfile();
  const [emName, setEmName] = useState(profile.emergencyName ?? '');
  const [emPhone, setEmPhone] = useState(profile.emergencyPhone ?? '');
  const { user, signOut, signInWithGoogle } = useAuth();
  const { resetPoints } = useEcoPoints();
  const { clearHistory } = useActivity();
  const { permission, requestLocation } = useApp();
  const notif = useNotifications();

  const [busy, setBusy] = useState(false);

  // Setup problems are shown during development only. A real user cannot act
  // on "the Android client ID is missing", but the team needs to see it before
  // they ship a build where sign-in silently fails.
  const configProblems = __DEV__ ? googleConfigProblems() : [];

  const enableNotifications = async (on: boolean) => {
    if (on) {
      const ok = await notif.enable();
      if (!ok) {
        Alert.alert(
          'Notifications are off',
          'Turn on notifications for EcoTrek in your phone settings to get streak and challenge reminders.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } else {
      await notif.disable();
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Erase all your data?',
      'This deletes your activities, points, badges and streaks from this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase everything',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            await Promise.all([resetPoints(), clearHistory()]);
            await clearUserData(user?.id);
            setBusy(false);
            Alert.alert('Done', 'Your data has been erased from this device.');
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This erases everything on this device and signs you out. If you signed in with Google, EcoTrek stops storing anything about you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            await clearUserData(user?.id);
            await signOut();
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <Header title="Settings" back />

      <View style={styles.body}>
        {/* Account */}
        <View>
          <SectionHeader title="Account" />
          <Card>
            <View style={styles.accountRow}>
              <View style={styles.accountIcon}>
                <Icon name="user" size={18} color={COLORS.primary} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>{user?.name ?? 'Trekker'}</Text>
                <Text style={styles.accountEmail}>
                  {user?.provider === 'guest' ? 'Guest account' : user?.email}
                </Text>
              </View>
            </View>
            {user?.provider === 'guest' ? (
              <>
                <Banner
                  tone="neutral"
                  icon="info"
                  title="Save your walks"
                  message="Sign in with Google and we will keep the walks you already logged on this phone."
                  style={{ marginTop: SPACING.md - 2 }}
                />
                <Button
                  label="Save with Google"
                  full
                  style={{ marginTop: SPACING.sm }}
                  onPress={() => signInWithGoogle()}
                />
              </>
            ) : null}
          </Card>
        </View>

        {/* Units */}
        <View>
          <SectionHeader title="Units" />
          <Card style={{ gap: SPACING.md - 2 }}>
            <View>
              <Text style={styles.settingLabel}>Distance</Text>
              <Segmented
                options={[
                  { value: 'imperial', label: 'Miles' },
                  { value: 'metric', label: 'Kilometres' },
                ]}
                value={units}
                onChange={(v) => setUnits(v as any)}
                style={{ marginTop: 6 }}
              />
            </View>
            <View>
              <Text style={styles.settingLabel}>Temperature</Text>
              <Segmented
                options={[
                  { value: 'F', label: 'Fahrenheit' },
                  { value: 'C', label: 'Celsius' },
                ]}
                value={tempUnit}
                onChange={(v) => setTempUnit(v as any)}
                style={{ marginTop: 6 }}
              />
            </View>
          </Card>
        </View>

        {/* Notifications */}
        <View>
          <SectionHeader title="Notifications" />
          <Card padded={false}>
            <ToggleRow
              icon="bell"
              title="Enable notifications"
              subtitle={
                notif.supported
                  ? 'Reminders and severe weather alerts'
                  : 'Not available on this device'
              }
              value={notif.enabled && notif.permissionGranted}
              onChange={enableNotifications}
              disabled={!notif.supported}
            />
            {notif.enabled && notif.permissionGranted ? (
              <>
                <Divider style={{ marginLeft: 58 }} />
                <ToggleRow
                  icon="flame"
                  title="Streak reminder"
                  subtitle="A nudge each evening if you have not been out"
                  value={notif.streakReminder}
                  onChange={(v) => notif.setPref('streakReminder', v)}
                />
                <Divider style={{ marginLeft: 58 }} />
                <ToggleRow
                  icon="target"
                  title="Challenge reminder"
                  subtitle="Saturday morning, before the week resets"
                  value={notif.challengeReminder}
                  onChange={(v) => notif.setPref('challengeReminder', v)}
                />
                <Divider style={{ marginLeft: 58 }} />
                <ToggleRow
                  icon="calendar"
                  title="Sunday recap"
                  subtitle="A summary of your week, every Sunday evening"
                  value={notif.weeklyRecap}
                  onChange={(v) => notif.setPref('weeklyRecap', v)}
                />
                <Divider style={{ marginLeft: 58 }} />
                <ToggleRow
                  icon="alert-triangle"
                  title="Severe weather alerts"
                  subtitle="Flood, storm and extreme heat warnings for your area"
                  value={notif.safetyAlerts}
                  onChange={(v) => notif.setPref('safetyAlerts', v)}
                />
              </>
            ) : null}
          </Card>
        </View>

        {/* Permissions */}
        <View>
          <SectionHeader title="Permissions" />
          <Card padded={false}>
            <Pressable
              onPress={() => (permission === 'granted' ? Linking.openSettings() : requestLocation())}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.rowIcon}>
                <Icon name="map-pin" size={16} color={COLORS.primary} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Location</Text>
                <Text style={styles.rowSub}>
                  {permission === 'granted'
                    ? 'Granted — used only while you are tracking'
                    : 'Off — distance tracking will not work'}
                </Text>
              </View>
              <Text style={styles.rowAction}>{permission === 'granted' ? 'Manage' : 'Enable'}</Text>
            </Pressable>
          </Card>
          <Text style={styles.note}>
            We only use GPS while a walk or ride is recording — including if you lock your phone.
            When you tap Finish, we stop.
          </Text>
        </View>

        {/* About */}
        <View>
          <SectionHeader title="About" />
          <Card padded={false}>
            <LinkRow icon="shield" title="Privacy policy" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
            <Divider style={{ marginLeft: 58 }} />
            <LinkRow
              icon="help-circle"
              title="Contact support"
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            />
            <Divider style={{ marginLeft: 58 }} />
            <LinkRow icon="alert-triangle" title="Trail safety" onPress={() => navigation.navigate('Safety')} />
            <Divider style={{ marginLeft: 58 }} />
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Icon name="info" size={16} color={COLORS.textMuted} strokeWidth={1.9} />
              </View>
              <Text style={[styles.rowTitle, { flex: 1 }]}>Version</Text>
              <Text style={styles.rowValue}>
                {APP_VERSION}
                {isBackendConfigured() ? ' · cloud' : ' · on-device'}
              </Text>
            </View>
          </Card>
        </View>

        {configProblems.length > 0 ? (
          <Banner
            tone="warning"
            icon="alert-triangle"
            title="Setup incomplete (development only)"
            message={configProblems.join(' ')}
          />
        ) : null}

        {/* Data */}
        <View>
          <SectionHeader title="Your data" />
          <Card padded={false}>
            <Pressable
              onPress={confirmReset}
              disabled={busy}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: COLORS.warningLight }]}>
                <Icon name="refresh" size={16} color={COLORS.warning} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Erase my data</Text>
                <Text style={styles.rowSub}>Clears activities, points, badges and streaks</Text>
              </View>
            </Pressable>
            <Divider style={{ marginLeft: 58 }} />
            <Pressable
              onPress={confirmDeleteAccount}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: COLORS.dangerLight }]}>
                <Icon name="trash" size={16} color={COLORS.danger} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: COLORS.danger }]}>Delete account</Text>
                <Text style={styles.rowSub}>Erases everything and signs you out</Text>
              </View>
            </Pressable>
          </Card>
        </View>

        <Button label="Sign out" variant="secondary" icon="log-out" full onPress={signOut} />
      </View>
    </Screen>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
  disabled,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.5 }]}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={16} color={COLORS.primary} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
        thumbColor="#fff"
      />
    </View>
  );
}

function LinkRow({ icon, title, onPress }: { icon: IconName; title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={16} color={COLORS.primary} strokeWidth={1.9} />
      </View>
      <Text style={[styles.rowTitle, { flex: 1 }]}>{title}</Text>
      <Icon name="chevron-right" size={16} color={COLORS.textLight} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md + 2 },

  accountRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 4 },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: { ...TYPOGRAPHY.h4, color: COLORS.text },
  accountEmail: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },

  settingLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 4,
    paddingVertical: 13,
    paddingHorizontal: SPACING.md - 2,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },
  rowSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  rowValue: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  rowAction: { ...TYPOGRAPHY.smallMed, color: COLORS.primary },

  note: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: SPACING.sm },
  pad: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md - 2 },
  input: {
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    minHeight: 52,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
});
