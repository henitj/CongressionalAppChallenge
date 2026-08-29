import React from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon, { IconName } from './Icon';
import { Avatar } from './ui';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { SPACING } from '../constants/theme';
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
  const { profile } = useProfile();
  const { colors, typography } = useTheme();

  // Always go somewhere: if there is nothing to go back to (cold open,
  // deep link) fall back to the home tabs instead of a dead tap.
  const goBack = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate('Tabs');
  };

  return (
    <SafeAreaView edges={['top']} style={[{ backgroundColor: colors.background }, style]}>
      <View style={styles.bar}>
        {back ? (
          <Pressable
            onPress={goBack}
            hitSlop={12}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityLabel="Go back"
          >
            <Icon name="chevron-left" size={20} color={colors.text} strokeWidth={2.1} />
          </Pressable>
        ) : null}

        <View style={styles.titleWrap}>
          {subtitle ? (
            <Text style={[styles.subtitle, typography.overline, { color: colors.textMuted }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          <Text style={[styles.title, typography.h1, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
        </View>

        <View style={styles.actions}>
          {actions.map((a, i) => (
            <Pressable
              key={i}
              onPress={a.onPress}
              hitSlop={10}
              style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              accessibilityLabel={a.label}
            >
              <Icon name={a.icon} size={19} color={colors.textSecondary} strokeWidth={1.9} />
              {a.badge ? (
                <View style={[styles.dot, { backgroundColor: colors.accent, borderColor: colors.surface }]} />
              ) : null}
            </Pressable>
          ))}

          {!hideAvatar && !back ? (
            <Pressable
              onPress={() => navigation.navigate('Profile')}
              hitSlop={8}
              accessibilityLabel="Open profile"
            >
              <Avatar name={user?.name} uri={profile.avatarUri ?? user?.picture} size={44} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

// Color-free geometry; every color is applied at render time from the theme.
const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  titleWrap: { flex: 1 },
  title: { marginBottom: 0 },
  subtitle: { marginBottom: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
