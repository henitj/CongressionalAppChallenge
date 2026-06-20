import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'ghost' | 'secondary' | 'accent';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
};

export default function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
  icon,
  size = 'md',
}: Props) {
  const getBg = () => {
    if (variant === 'danger') return COLORS.danger;
    if (variant === 'ghost') return 'transparent';
    if (variant === 'secondary') return COLORS.primarySurface;
    if (variant === 'accent') return COLORS.accent;
    return COLORS.primary;
  };

  const getColor = () => {
    if (variant === 'ghost') return COLORS.primary;
    if (variant === 'secondary') return COLORS.primaryDark;
    return '#fff';
  };

  const getPadding = () => {
    if (size === 'sm') return { paddingVertical: 10, paddingHorizontal: 18 };
    if (size === 'lg') return { paddingVertical: 18, paddingHorizontal: 32 };
    return { paddingVertical: 14, paddingHorizontal: 24 };
  };

  const bg = getBg();
  const color = getColor();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        getPadding(),
        { backgroundColor: bg },
        variant === 'ghost' && styles.ghostBorder,
        variant === 'accent' && SHADOWS.md,
        variant === 'primary' && SHADOWS.md,
        variant === 'danger' && SHADOWS.sm,
        { opacity: disabled ? 0.45 : pressed ? 0.88 : 1 },
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <View style={styles.inner}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text
            style={[
              styles.text,
              { color },
              size === 'sm' && { fontSize: 13 },
              size === 'lg' && { fontSize: 17 },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBorder: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: { fontSize: 16 },
  text: {
    ...TYPOGRAPHY.h4,
    letterSpacing: 0.2,
  },
});