import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

export default function ProfileMenu() {
  const { user, signOut } = useAuth();
  const { totalPoints, level } = useEcoPoints();
  const navigation = useNavigation<any>();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const navigate = (screen: string, params?: any) => {
    setOpen(false);
    // Navigate within the tab navigator
    navigation.navigate(screen, params);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.avatarBtn,
          pressed && { opacity: 0.8 },
        ]}
      >
        {user.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.initialsAvatar]}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
        )}
        <View style={styles.onlineDot} />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={styles.sheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.handle} />

            {/* User info */}
            <View style={styles.userSection}>
              <View style={styles.avatarLargeWrap}>
                {user.picture ? (
                  <Image
                    source={{ uri: user.picture }}
                    style={styles.bigAvatar}
                  />
                ) : (
                  <View style={[styles.bigAvatar, styles.initialsAvatarLarge]}>
                    <Text style={styles.bigInitials}>{initials}</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {user.email}
                </Text>
                <View style={styles.providerPill}>
                  <Text style={styles.providerText}>
                    {user.provider === 'google' ? '🔐 Google' : '👤 Guest'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Points card */}
            <View style={styles.pointsCard}>
              <View>
                <Text style={styles.pointsLabel}>ECOPOINTS</Text>
                <Text style={styles.pointsValue}>
                  {totalPoints.toLocaleString()}
                </Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{level}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Working menu items */}
            <MenuItem
              icon="🌍"
              label="My Impact"
              sub="Trees, miles, CO₂"
              onPress={() => navigate('Impact')}
            />
            <MenuItem
              icon="🏅"
              label="My Badges"
              sub="Achievements unlocked"
              onPress={() => {
                setOpen(false);
                navigation.navigate('Impact');
              }}
            />
            <MenuItem
              icon="👥"
              label="My Clubs"
              sub="Leaderboard & clubs"
              onPress={() => navigate('Clubs')}
            />
            <MenuItem
              icon="⚙️"
              label="Settings"
              sub="Units, account, analytics"
              onPress={() => {
                setOpen(false);
                // Push settings as a modal
                Alert.alert(
                  'Settings',
                  'Go to the Settings screen via the Impact tab → Settings button, or we can add a dedicated tab.',
                  [{ text: 'OK' }]
                );
              }}
            />

            <View style={styles.divider} />

            <Pressable
              style={({ pressed }) => [
                styles.signOutBtn,
                pressed && { opacity: 0.8 },
              ]}
              onPress={async () => {
                await signOut();
                setOpen(false);
              }}
            >
              <Text style={styles.signOutIcon}>🚪</Text>
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>

            <Text style={styles.version}>
              EcoTrek v1.0 · Built for Austin
            </Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuItem({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: string;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && { backgroundColor: COLORS.primarySurface },
      ]}
      onPress={onPress}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarBtn: { padding: 2, position: 'relative' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  initialsAvatar: {
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
  },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    padding: Platform.OS === 'web' ? SPACING.lg : 0,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderRadius: Platform.OS === 'web' ? RADIUS.xl : undefined,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.lg,
    maxWidth: Platform.OS === 'web' ? 440 : undefined,
    alignSelf: Platform.OS === 'web' ? 'center' : undefined,
    width: Platform.OS === 'web' ? '100%' : undefined,
    ...SHADOWS.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatarLargeWrap: { ...SHADOWS.md, borderRadius: 32 },
  bigAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  initialsAvatarLarge: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigInitials: { color: '#fff', fontWeight: '900', fontSize: 24 },
  name: { ...TYPOGRAPHY.h3, color: COLORS.text },
  email: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  providerPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  providerText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 11 },
  pointsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  pointsLabel: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  pointsValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  levelText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.sm },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
  },
  menuIcon: { fontSize: 22, width: 30 },
  menuLabel: { ...TYPOGRAPHY.bodyMed, color: COLORS.text },
  menuSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 1 },
  menuArrow: { color: COLORS.textLight, fontSize: 22 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerLight,
    marginTop: SPACING.xs,
  },
  signOutIcon: { fontSize: 18 },
  signOutText: { color: COLORS.danger, fontWeight: '800', fontSize: 15 },
  version: {
    ...TYPOGRAPHY.micro,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});