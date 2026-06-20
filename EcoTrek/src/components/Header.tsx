import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import TreeIcon from './TreeIcon';
import ProfileMenu from './ProfileMenu';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  variant?: 'default' | 'transparent' | 'light';
};

export default function Header({
  title,
  subtitle,
  right,
  variant = 'default',
}: Props) {
  const isDark = variant !== 'light';

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safe,
        variant === 'light' && styles.safeLight,
        variant === 'transparent' && styles.safeTransparent,
      ]}
    >
      <View style={styles.bar}>
        {/* Left: logo + title */}
        <View style={styles.left}>
          <View style={styles.logoWrap}>
            <TreeIcon size={26} color={isDark ? '#fff' : COLORS.primary} />
          </View>
          <View style={{ marginLeft: SPACING.sm }}>
            <Text
              style={[
                styles.title,
                !isDark && { color: COLORS.text },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  !isDark && { color: COLORS.textMuted },
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right: actions + profile */}
        <View style={styles.right}>
          {right}
          <ProfileMenu />
        </View>
      </View>

      {/* Bottom border line */}
      <View
        style={[
          styles.bottomLine,
          isDark && { backgroundColor: 'rgba(255,255,255,0.08)' },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.primaryDark,
    ...SHADOWS.md,
  },
  safeLight: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  safeTransparent: {
    backgroundColor: 'transparent',
  },
  bar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: '#fff',
    letterSpacing: -0.3,
  },
  subtitle: {
    ...TYPOGRAPHY.micro,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bottomLine: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});