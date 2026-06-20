import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORS,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  SHADOWS,
} from '../constants/theme';
import TreeIcon from '../components/TreeIcon';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../constants/AuthContext';

const FEATURES = [
  { icon: '🗺️', title: 'Trail Discovery', body: 'Find Austin trails near you powered by AI' },
  { icon: '🌳', title: 'Real Tree Planting', body: 'Every mile plants a verified tree with Veritree' },
  { icon: '✨', title: 'AI Nature Guide', body: 'Ask anything about wildlife, plants, and trails' },
  { icon: '⭐', title: 'EcoPoints', body: 'Earn points, unlock badges, level up your impact' },
];

export default function SignInScreen() {
  const {
    signInWithGoogle,
    signInAsGuest,
    error,
    googleConfigured,
    loading,
  } = useAuth();

  const [guestName, setGuestName] = useState('');
  const [busy, setBusy] = useState<'google' | 'guest' | null>(null);
  const [showGuest, setShowGuest] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const featureFade = useRef(new Animated.Value(1)).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Feature carousel
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(featureFade, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(featureFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      setFeatureIndex((i) => (i + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGoogle = async () => {
    setBusy('google');
    await signInWithGoogle();
    setBusy(null);
  };

  const handleGuest = async () => {
    if (!guestName.trim() && !showGuest) {
      setShowGuest(true);
      return;
    }
    setBusy('guest');
    await signInAsGuest(guestName.trim() || undefined);
    setBusy(null);
  };

  // Loading screen
  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <TreeIcon size={72} color="#fff" />
        </Animated.View>
        <ActivityIndicator
          color="rgba(255,255,255,0.7)"
          size="large"
          style={{ marginTop: SPACING.lg }}
        />
        <Text style={styles.loadingText}>Loading EcoTrek…</Text>
      </View>
    );
  }

  const feature = FEATURES[featureIndex];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <Animated.View
            style={[
              styles.hero,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo */}
            <Animated.View
              style={[
                styles.logoWrap,
                { transform: [{ scale: logoScale }] },
              ]}
            >
              <TreeIcon size={64} color="#fff" />
            </Animated.View>

            <Text style={styles.brand}>EcoTrek</Text>
            <Text style={styles.tagline}>Explore. Learn. Protect.</Text>

            {/* Feature carousel */}
            <Animated.View
              style={[styles.featureCarousel, { opacity: featureFade }]}
            >
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureBody}>{feature.body}</Text>
            </Animated.View>

            {/* Dots */}
            <View style={styles.dots}>
              {FEATURES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === featureIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── Sign in card ── */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.cardTitle}>Get started</Text>
            <Text style={styles.cardSubtitle}>
              Join thousands of Austin trekkers growing the urban forest.
            </Text>

            {/* Google button */}
            <Pressable
              style={({ pressed }) => [
                styles.googleBtn,
                !googleConfigured && styles.googleDisabled,
                pressed && { opacity: 0.87, transform: [{ scale: 0.99 }] },
              ]}
              onPress={handleGoogle}
              disabled={!googleConfigured || busy !== null}
            >
              {busy === 'google' ? (
                <ActivityIndicator color="#3c4043" size="small" />
              ) : (
                <>
                  <Image
                    source={{
                      uri: 'https://developers.google.com/identity/images/g-logo.png',
                    }}
                    style={styles.gLogo}
                  />
                  <Text style={styles.googleText}>
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>

            {!googleConfigured && (
              <View style={styles.configHint}>
                <Text style={styles.configHintText}>
                  ⚙️ Add OAuth client IDs to{' '}
                  <Text style={styles.configCode}>
                    src/constants/authConfig.ts
                  </Text>{' '}
                  to enable Google sign-in.
                </Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Guest section */}
            {!showGuest ? (
              <Pressable
                style={({ pressed }) => [
                  styles.guestBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => setShowGuest(true)}
                disabled={busy !== null}
              >
                <Text style={styles.guestBtnText}>
                  Continue as Guest 👤
                </Text>
              </Pressable>
            ) : (
              <View style={styles.guestForm}>
                <Text style={styles.guestFormLabel}>
                  What should we call you?
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={guestName}
                  onChangeText={setGuestName}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleGuest}
                  autoFocus
                />
                <View style={styles.guestActions}>
                  <Pressable
                    style={styles.guestCancel}
                    onPress={() => setShowGuest(false)}
                  >
                    <Text style={styles.guestCancelText}>Back</Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      title={
                        busy === 'guest' ? 'Starting…' : 'Start Trekking'
                      }
                      onPress={handleGuest}
                      loading={busy === 'guest'}
                      icon="🥾"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>⚠️ Sign-in failed</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </Animated.View>

          {/* ── Impact stats ── */}
          <Animated.View
            style={[styles.statsRow, { opacity: fadeAnim }]}
          >
            <StatItem value="10+" label="Austin Trails" icon="🗺️" />
            <View style={styles.statSep} />
            <StatItem value="AI" label="Powered Guide" icon="✨" />
            <View style={styles.statSep} />
            <StatItem value="🌳" label="Real Trees" icon="🌱" />
          </Animated.View>

          {/* ── Footer ── */}
          <Text style={styles.footer}>
            By continuing you agree to plant trees for every mile you trek.
          </Text>
          <Text style={styles.version}>
            EcoTrek v1.0 · {Platform.OS.toUpperCase()} · Built for Austin 🤘
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatItem({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primaryDark },

  // Loading
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    ...TYPOGRAPHY.body,
    marginTop: SPACING.md,
  },

  // Scroll content
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    flexGrow: 1,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  logoWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: SPACING.md,
    ...SHADOWS.lg,
  },
  brand: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginBottom: 4,
  },
  tagline: {
    color: 'rgba(255,255,255,0.5)',
    ...TYPOGRAPHY.bodyMed,
    fontStyle: 'italic',
    marginBottom: SPACING.lg,
    letterSpacing: 0.3,
  },

  // Feature carousel
  featureCarousel: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    width: '100%',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 100,
    justifyContent: 'center',
  },
  featureIcon: { fontSize: 32, marginBottom: SPACING.xs },
  featureTitle: {
    ...TYPOGRAPHY.h3,
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureBody: {
    ...TYPOGRAPHY.small,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 19,
  },

  // Dots
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: COLORS.accent,
    width: 18,
  },

  // Sign in card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.xl,
  },
  cardTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontSize: 26,
  },
  cardSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },

  // Google button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    gap: SPACING.sm,
    ...SHADOWS.sm,
    marginBottom: SPACING.sm,
  },
  googleDisabled: { opacity: 0.45 },
  gLogo: { width: 22, height: 22 },
  googleText: {
    color: '#3c4043',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.1,
  },

  // Config hint
  configHint: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  configHintText: {
    color: COLORS.bark,
    fontSize: 12,
    lineHeight: 18,
  },
  configCode: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 11,
    backgroundColor: '#F0EEE8',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
    gap: SPACING.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },

  // Guest button
  guestBtn: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  guestBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },

  // Guest form
  guestForm: { gap: SPACING.sm },
  guestFormLabel: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    paddingHorizontal: SPACING.md,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  guestActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  guestCancel: {
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  guestCancelText: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },

  // Error
  errorBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  errorTitle: {
    color: COLORS.danger,
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    lineHeight: 18,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: { alignItems: 'center', gap: 3 },
  statIcon: { fontSize: 22 },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statSep: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Footer
  footer: {
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  version: {
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});