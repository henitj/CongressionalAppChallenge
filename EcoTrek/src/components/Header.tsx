import React from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon, { IconName } from './Icon';
import { Avatar } from './ui';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Action = { icon: IconName; onPress: () => void; badge?: boolean; label?: string };

type Props = {
  title: string;
  subtitle?: string;
  /** Shows a back chevron instead of the avatar. */
  back?: boolean;
  actions?: Action[];
  /** Hide the profile avatar (e.g. on the Profile screen itself). */
  hideAvatar?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function Header({
  title,
  subtitle,
  back,
  actions = [],
  hideAvatar,
  style,
}: Props) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors, fontScale } = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.background }, style]}>
      <View style={styles.bar}>
        {back ? (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityLabel="Go back"
          >
            <Icon name="chevron-left" size={20} color={colors.text} strokeWidth={2.1} />
          </Pressable>
        ) : null}

        <View style={styles.titleWrap}>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted, fontSize: Math.round(13 * fontScale) }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          <Text style={[styles.title, { color: colors.text, fontSize: Math.round(30 * fontScale) }]} numberOfLines={2}>
            {title}
          </Text>
        </View>

        <View style={styles.actions}>
          {actions.map((a, i) => (
            <Pressable
              key={i}
              onPress={a.onPress}
              hitSlop={10}
              style={styles.iconBtn}
              accessibilityLabel={a.label}
            >
              <Icon name={a.icon} size={19} color={COLORS.textSecondary} strokeWidth={1.9} />
              {a.badge ? <View style={styles.dot} /> : null}
            </Pressable>
          ))}

          {!hideAvatar && !back ? (
            <Pressable
              onPress={() => navigation.navigate('Profile')}
              hitSlop={8}
              accessibilityLabel="Open profile"
            >
              <Avatar name={user?.name} uri={user?.picture} size={34} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: COLORS.background,
  },
  bar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  titleWrap: { flex: 1 },
  title: { ...TYPOGRAPHY.h1, color: COLORS.text },
  subtitle: {
    ...TYPOGRAPHY.overline,
    color: COLORS.textMuted,
    marginBottom: 1,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
});
