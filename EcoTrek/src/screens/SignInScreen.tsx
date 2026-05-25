import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import TreeIcon from '../components/TreeIcon';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';

export default function SignInScreen() {
  const { signInWithGoogle, signInAsGuest, error, googleConfigured } = useAuth();
  const [guestName, setGuestName] = useState('');
  const [busy, setBusy] = useState<'google' | 'guest' | null>(null);

  const handleGoogle = async () => {
    setBusy('google');
    await signInWithGoogle();
    setBusy(null);
  };
  const handleGuest = async () => {
    setBusy('guest');
    await signInAsGuest(guestName.trim() || undefined);
    setBusy(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <TreeIcon size={88} color="#fff" />
          <Text style={styles.brand}>EcoTrek</Text>
          <Text style={styles.tag}>Hike. Bike. Grow Austin.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.body}>
            Sign in to track your trails, plant trees with Veritree, and watch
            your impact grow over time.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.googleBtn,
              !googleConfigured && styles.googleDisabled,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleGoogle}
            disabled={!googleConfigured || busy !== null}
          >
            {busy === 'google' ? (
              <ActivityIndicator color="#3c4043" />
            ) : (
              <>
                <Image
                  source={{
                    uri: 'https://developers.google.com/identity/images/g-logo.png',
                  }}
                  style={styles.gLogo}
                />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {!googleConfigured && (
            <Text style={styles.hint}>
              ⚙️ Add your Google OAuth client IDs to{' '}
              <Text style={styles.code}>src/constants/authConfig.ts</Text> to
              enable Google sign-in. You can use guest mode below in the
              meantime.
            </Text>
          )}

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.or}>OR</Text>
            <View style={styles.line} />
          </View>

          <Text style={styles.guestLabel}>Continue as guest</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name (optional)"
            placeholderTextColor={COLORS.textMuted}
            value={guestName}
            onChangeText={setGuestName}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleGuest}
          />
          <PrimaryButton
            title={busy === 'guest' ? 'Loading…' : 'Start hiking as guest'}
            onPress={handleGuest}
            variant="ghost"
            loading={busy === 'guest'}
            style={{ marginTop: SPACING.sm }}
          />

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          By signing in you agree to plant trees with Veritree for every mile
          you trek 🌳
        </Text>
        <Text style={styles.platform}>
          Platform: {Platform.OS.toUpperCase()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primaryDark },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, flexGrow: 1 },
  hero: { alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.lg },
  brand: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: SPACING.sm },
  tag: { color: '#B7D8C4', ...TYPOGRAPHY.body, marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: { ...TYPOGRAPHY.h1, color: COLORS.text, marginBottom: SPACING.xs },
  body: { ...TYPOGRAPHY.body, color: COLORS.textMuted, marginBottom: SPACING.lg, lineHeight: 22 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#dadce0',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
  },
  googleDisabled: { opacity: 0.5 },
  gLogo: { width: 20, height: 20, marginRight: SPACING.sm },
  googleText: { color: '#3c4043', fontWeight: '700', fontSize: 15 },
  hint: {
    marginTop: SPACING.sm,
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    backgroundColor: '#F0F2F0',
    color: COLORS.bark,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
  or: { marginHorizontal: SPACING.sm, color: COLORS.textMuted, fontWeight: '700', fontSize: 11 },
  guestLabel: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.xs },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  errorBox: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: '#FDECEA',
    borderRadius: RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },
  footer: { color: '#B7D8C4', textAlign: 'center', marginTop: SPACING.xl, fontSize: 12 },
  platform: { color: '#5f7d6f', textAlign: 'center', marginTop: 4, fontSize: 10 },
});
