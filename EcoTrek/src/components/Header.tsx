import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import TreeIcon from './TreeIcon';
import ProfileMenu from './ProfileMenu';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export default function Header({ title, subtitle, right }: Props) {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.bar}>
        <View style={styles.left}>
          <TreeIcon size={28} color="#fff" />
          <View style={{ marginLeft: SPACING.sm }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.right}>
          {right}
          <ProfileMenu />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: COLORS.primaryDark },
  bar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryDark,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...TYPOGRAPHY.h2, color: '#fff' },
  subtitle: { ...TYPOGRAPHY.small, color: '#B7D8C4' },
});
