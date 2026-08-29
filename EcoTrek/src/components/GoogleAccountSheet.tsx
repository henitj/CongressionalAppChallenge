import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';

import Icon from './Icon';
import { Banner, Button, Sheet } from './ui';
import { ColorPalette, RADIUS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { Typography, useTheme } from '../context/ThemeContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  mode?: 'signin' | 'upgrade';
};

export default function GoogleAccountSheet({ visible, onClose, mode = 'signin' }: Props) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { signInWithLocalGoogle, localGoogleAccounts } = useAuth();

  const [pickingNew, setPickingNew] = useState(false);
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const hasRememberedAccounts = localGoogleAccounts.length > 0;

  useEffect(() => {
    if (!visible) return;
    setPickingNew(false);
    setGoogleName('');
    setGoogleEmail('');
  }, [visible]);

  const handleLocalPick = async (name: string, email: string) => {
    setBusy(true);
    try {
      await signInWithLocalGoogle(name, email);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'upgrade' ? 'Save with Google' : 'Continue with Google';
  const subtitle = pickingNew
    ? mode === 'upgrade'
      ? 'Create a preview Google account and keep the walks already on this device.'
      : 'Create a preview Google account for this live demo.'
    : hasRememberedAccounts
    ? mode === 'upgrade'
      ? 'Pick an account to keep this guest progress.'
      : 'Choose an account to continue.'
    : 'Use a preview Google account here. On a phone build, this step opens Google directly.';

  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <View style={{ gap: SPACING.md }}>
        {!pickingNew ? (
          <Banner
            tone="neutral"
            icon="info"
            title="Why this looks different in the preview"
            message="Arena's live preview cannot round-trip Google's secure popup, so this web demo uses a simple account chooser instead. The phone build still uses real Google sign-in."
          />
        ) : null}

        {!pickingNew && hasRememberedAccounts ? (
          <View style={{ gap: 2 }}>
            {localGoogleAccounts.map((account) => (
              <Pressable
                key={account.email}
                style={({ pressed }) => [styles.googleRow, pressed && { opacity: 0.7 }]}
                onPress={() => handleLocalPick(account.name, account.email)}
                accessibilityRole="button"
                accessibilityLabel={`Sign in as ${account.name}`}
              >
                <View style={styles.googleAvatar}>
                  <Text style={styles.googleAvatarText}>
                    {account.name.trim().charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.googleName}>{account.name}</Text>
                  <Text style={styles.googleEmail}>{account.email}</Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.textLight} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {!pickingNew && !hasRememberedAccounts ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Icon name="globe" size={18} color={colors.primary} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyTitle}>No preview Google accounts yet</Text>
              <Text style={styles.emptyText}>
                Create one once here, then it will show up as a one-tap option every time you sign out or come back.
              </Text>
            </View>
          </View>
        ) : null}

        {pickingNew ? (
          <>
            <View style={{ gap: 8 }}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput
                value={googleName}
                onChangeText={setGoogleName}
                placeholder="Jane Doe"
                placeholderTextColor={colors.textLight}
                maxLength={50}
                style={styles.input}
                onSubmitEditing={() => googleEmail.trim() && handleLocalPick(googleName, googleEmail)}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                value={googleEmail}
                onChangeText={setGoogleEmail}
                placeholder="jane@example.com"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                onSubmitEditing={() => googleName.trim() && handleLocalPick(googleName, googleEmail)}
              />
            </View>
            <View style={styles.actionRow}>
              <Button label="Back" variant="ghost" onPress={() => setPickingNew(false)} />
              <Button
                label="Continue"
                full
                loading={busy}
                disabled={!googleName.trim() || !googleEmail.trim()}
                onPress={() => handleLocalPick(googleName, googleEmail)}
                style={{ flex: 1 }}
              />
            </View>
          </>
        ) : (
          <Button
            label={hasRememberedAccounts ? 'Use another Google account' : 'Create a preview Google account'}
            variant="secondary"
            full
            onPress={() => setPickingNew(true)}
          />
        )}
      </View>
    </Sheet>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    googleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm + 4,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.sm + 2,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    googleAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleAvatarText: { ...t.h3, color: c.primary },
    googleName: { ...t.bodyMed, color: c.text },
    googleEmail: { ...t.small, color: c.textMuted },
    emptyState: {
      flexDirection: 'row',
      gap: SPACING.sm + 4,
      alignItems: 'center',
      backgroundColor: c.surfaceSunken,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: SPACING.md - 2,
    },
    emptyIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { ...t.bodyMed, color: c.text },
    emptyText: { ...t.small, color: c.textMuted, marginTop: 2 },
    fieldLabel: { ...t.overline, color: c.textMuted },
    input: {
      backgroundColor: c.surfaceSunken,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: SPACING.md - 2,
      paddingVertical: 13,
      ...t.body,
      color: c.text,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
  });
}
