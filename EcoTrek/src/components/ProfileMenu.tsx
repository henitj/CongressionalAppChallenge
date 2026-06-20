import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Image,
  Platform,
  Animated,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useEcoPoints } from '../constants/EcoPointsContext';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

export default function ProfileMenu() {
  const { user, signOut } = useAuth();
  const { totalPoints, level } = useEcoPoints();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
        {/* Online dot */}
        <View style={styles.onlineDot} />
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={styles.sheet}
            onStartShouldSetResponder={() => true}
          >
            {/* Handle bar */}
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
                <View style={styles.providerRow}>
                  <View style={styles.providerPill}>
                    <Text style={styles.providerText}>
                      {user.provider === 'google' ? '🔐 Google' : '👤 Guest'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* EcoPoints card */}
            <View style={styles.pointsCard}>
              <View>
                <Text style={styles.pointsLabel}>EcoPoints</Text>
                <Text style={styles.pointsValue}>
                  {totalPoints.toLocaleString()}
                </Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{level}</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Menu items */}
            <MenuItem icon="🌍" label="My Impact" onPress={() => setOpen(false)} />
            <MenuItem icon="🏅" label="My Badges" onPress={() => setOpen(false)} />
            <MenuItem icon="⚙️" label="Settings" onPress={() => setOpen(false)} />

            <View style={styles.divider} />

            {/* Sign out */}
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

            {/* Version */}
            <Text style={styles.version}>EcoTrek v1.0 · Built for Austin</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
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
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarBtn: {
    padding: 2,
    position: 'relative',
  },
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
  initialsText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
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

  // Modal
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

  // User section
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatarLargeWrap: {
    ...SHADOWS.md,
    borderRadius: 32,
  },
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
  bigInitials: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 24,
  },
  name: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  email: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  providerRow: { marginTop: 6 },
  providerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  providerText: {
    color: COLORS.primaryDark,
    fontWeight: '700',
    fontSize: 11,
  },

  // Points card
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
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
  levelText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },

  // Menu items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
  },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { ...TYPOGRAPHY.bodyMed, color: COLORS.text, flex: 1 },
  menuArrow: { color: COLORS.textLight, fontSize: 20, fontWeight: '300' },

  // Sign out
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
  signOutText: {
    color: COLORS.danger,
    fontWeight: '800',
    fontSize: 15,
  },

  // Version
  version: {
    ...TYPOGRAPHY.micro,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});