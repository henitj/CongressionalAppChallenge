import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Animated,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon, { IconName } from '../components/Icon';
import { Button, Sheet } from '../components/ui';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, PRIVACY_POLICY_URL } from '../constants/appInfo';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'navigation',
    title: 'See how far you go',
    text: 'Start a walk or ride. We measure the miles for you.',
  },
  {
    icon: 'sun',
    title: 'Check the weather first',
    text: 'Today’s temperature and the next few hours, right on the home screen.',
  },
  {
    icon: 'target',
    title: 'Five small goals a week',
    text: 'Nothing huge. Just enough to keep you moving.',
  },
  {
    icon: 'users',
    title: 'Cheer each other on',
    text: 'Join a club with a short code from a friend.',
  },
];

export default function SignInScreen() {
  const { signInWithGoogle, signInAsGuest, error, googleConfigured } = useAuth();
  const [showGuest, setShowGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [busy, setBusy] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fade, rise]);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  };

  const handleGuest = async () => {
    setBusy(true);
    try {
      await signInAsGuest(guestName.trim() || 'Guest Trekker');
      setShowGuest(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
              {/* Mark */}
              <View style={styles.mark}>
                <Icon name="tree" size={30} color={COLORS.primaryGlow} strokeWidth={1.9} />
              </View>

              <Text style={styles.title}>{APP_NAME}</Text>
              <Text style={styles.tagline}>
                Every mile you move under your own power grows your forest.
              </Text>

              {/* Features */}
              <View style={styles.features}>
                {FEATURES.map((f) => (
                  <View key={f.title} style={styles.feature}>
                    <View style={styles.featureIcon}>
                      <Icon name={f.icon} size={17} color={COLORS.primaryGlow} strokeWidth={1.9} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureTitle}>{f.title}</Text>
                      <Text style={styles.featureText}>{f.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>

            <View style={{ flex: 1 }} />

            {/* Actions */}
            <Animated.View style={{ opacity: fade, gap: SPACING.sm + 2 }}>
              {error ? (
                <View style={styles.errorBox}>
                  <Icon name="alert-circle" size={15} color={COLORS.dangerLight} strokeWidth={2} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {googleConfigured ? (
                <Button
                  label="Continue with Google"
                  variant="secondary"
                  size="lg"
                  full
                  loading={busy}
                  onPress={handleGoogle}
                />
              ) : (
                <View style={styles.configNote}>
                  <Icon name="info" size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                  <Text style={styles.configNoteText}>
                    Google sign-in is not configured yet. Add your client IDs in
                    src/constants/authConfig.ts.
                  </Text>
                </View>
              )}

              <Button
                label="Continue as guest"
                variant="ghost"
                tone="rgba(255,255,255,0.85)"
                size="lg"
                full
                onPress={() => setShowGuest(true)}
              />

              <Text style={styles.legal}>
                By continuing you agree to our{' '}
                <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                  privacy policy
                </Text>
                . EcoTrek uses your location only while you are recording an activity.
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Sheet
        visible={showGuest}
        onClose={() => setShowGuest(false)}
        title="Continue as guest"
        subtitle="Your progress stays on this device only"
      >
        <View style={{ gap: SPACING.md }}>
          <View style={{ gap: 6 }}>
            <Text style={styles.fieldLabel}>What should we call you?</Text>
            <TextInput
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Guest Trekker"
              placeholderTextColor={COLORS.textLight}
              maxLength={30}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleGuest}
            />
          </View>
          <Text style={styles.guestNote}>
            Guest data is not backed up. If you reinstall the app or change phones, it is gone.
            Signing in with Google keeps it.
          </Text>
          <Button label="Start as guest" full loading={busy} onPress={handleGuest} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primaryDark },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },

  mark: {
    width: 62,
    height: 62,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { fontSize: 40, fontWeight: '700', color: '#fff', letterSpacing: -0.45 },
  tagline: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.68)',
    marginTop: SPACING.sm,
    maxWidth: 320,
  },

  features: { marginTop: SPACING.xl, gap: SPACING.md + 2 },
  feature: { flexDirection: 'row', gap: SPACING.md - 2, alignItems: 'flex-start' },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { ...TYPOGRAPHY.h4, color: '#fff' },
  featureText: {
    ...TYPOGRAPHY.small,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(192,57,43,0.25)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
  },
  errorText: { ...TYPOGRAPHY.small, color: COLORS.dangerLight, flex: 1 },

  configNote: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
  },
  configNoteText: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.6)', flex: 1 },

  legal: {
    ...TYPOGRAPHY.small,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  legalLink: { color: 'rgba(255,255,255,0.75)', textDecorationLine: 'underline' },

  fieldLabel: { ...TYPOGRAPHY.overline, color: COLORS.textMuted },
  input: {
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: 13,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  guestNote: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
});
