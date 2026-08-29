import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon, { IconName } from '../components/Icon';
import Logo from '../components/Logo';
import { Button } from '../components/ui';
import { SPACING, ColorPalette } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Page = { icon: IconName; title: string; body: string };

const PAGES: Page[] = [
  {
    icon: 'boot',
    title: 'Tap Start. Then walk.',
    body: 'Put your phone in your pocket. We count the miles for you — even if you lock the screen.',
  },
  {
    icon: 'tree',
    title: 'Miles become trees.',
    body: 'Walk a mile, earn a tree. A fun way to watch your progress grow. No real tree is planted.',
  },
  {
    icon: 'sun',
    title: 'We check the weather.',
    body: 'See today’s temperature before you go. If it is too hot or stormy, we will say so in plain words.',
  },
  {
    icon: 'users',
    title: 'Walk with friends.',
    body: 'Join a club with a short code and cheer each other on. Or enjoy the quiet solo miles.',
  },
];

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const last = page === PAGES.length - 1;

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(PAGES.length - 1, index));
    setPage(clamped);
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page) setPage(next);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Logo size={46} />
          <Pressable onPress={onDone} hitSlop={16} accessibilityLabel="Skip introduction">
            <Text style={[styles.skip, typography.smallMed]}>Skip</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          style={{ flex: 1 }}
        >
          {PAGES.map((p) => (
            <View key={p.title} style={[styles.page, { width }]}>
              <View style={styles.picture}>
                <Icon name={p.icon} size={72} color={colors.primaryGlow} strokeWidth={1.5} />
              </View>
              <Text style={[styles.title, typography.h1]}>{p.title}</Text>
              <Text style={[styles.body, typography.body]}>{p.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {PAGES.map((p, i) => (
              <Pressable key={p.title} onPress={() => goTo(i)} hitSlop={12} accessibilityLabel={`Go to step ${i + 1}`}>
                <View style={[styles.dot, i === page && styles.dotActive]} />
              </Pressable>
            ))}
          </View>
          <Button
            label={last ? 'Get started' : 'Next'}
            iconRight={last ? undefined : 'arrow-right'}
            size="lg"
            full
            variant="secondary"
            onPress={() => (last ? onDone() : goTo(page + 1))}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(c: ColorPalette) {
  return StyleSheet.create({

  root: { flex: 1, backgroundColor: c.primaryDark },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  skip: { color: 'rgba(255,255,255,0.8)' },
  page: {
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  picture: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 38,
  },
  body: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: SPACING.md,
    maxWidth: 340,
  },
  footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: SPACING.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotActive: { backgroundColor: c.primaryGlow, width: 24 },

  });
}
