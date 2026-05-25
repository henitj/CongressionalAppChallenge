import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

export default function ProfileMenu() {
  const { user, signOut } = useAuth();
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
      <Pressable onPress={() => setOpen(true)} style={styles.avatarBtn}>
        {user.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.initialsAvatar]}>
            <Text style={styles.initialsText}>{initials}</Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.userRow}>
              {user.picture ? (
                <Image source={{ uri: user.picture }} style={styles.bigAvatar} />
              ) : (
                <View style={[styles.bigAvatar, styles.initialsAvatar]}>
                  <Text style={styles.bigInitials}>{initials}</Text>
                </View>
              )}
              <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.email}>{user.email}</Text>
                <View style={styles.providerPill}>
                  <Text style={styles.providerText}>
                    {user.provider === 'google' ? '🔐 Google' : '👤 Guest'}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              style={styles.signOut}
              onPress={async () => {
                await signOut();
                setOpen(false);
              }}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarBtn: { padding: 4 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#fff' },
  initialsAvatar: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    padding: SPACING.md,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  bigAvatar: { width: 64, height: 64, borderRadius: 32 },
  bigInitials: { color: '#fff', fontWeight: '900', fontSize: 22 },
  name: { ...TYPOGRAPHY.h2, color: COLORS.text },
  email: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 2 },
  providerPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: '#EAF6EE',
  },
  providerText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 11 },
  signOut: {
    padding: SPACING.md,
    borderRadius: RADIUS.pill,
    backgroundColor: '#FDECEA',
    alignItems: 'center',
  },
  signOutText: { color: COLORS.danger, fontWeight: '800', fontSize: 15 },
});
