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
    icon: 'clock',
    title: 'Your progress stays with you.',
    body: 'Your walks, rides and personal profile are saved on this device. Find them under More.',
  },
  {
    icon: 'trash',
    title: 'Every piece counts.',
    body: 'After every trail, EcoTrek asks: How many pieces of trash do you pick up? Enter any honest number from 0 to 99. The more you collect, the more EcoPoints you earn.',
  },
];

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  // `page` state can only be trusted once React has re-rendered with it, but
  // the "Next" button can be tapped the instant a swipe settles — so we also
  // keep a ref that is updated synchronously on every scroll event and never
  // goes stale, and use that (not the possibly-one-tick-behind state) to
  // decide where "Next" should land.
  const pageRef = useRef(0);
  const widthRef = useRef(width);
  widthRef.current = width;
  const last = page === PAGES.length - 1;

  const setCurrentPage = (next: number) => {
    if (pageRef.current !== next) {
      pageRef.current = next;
      setPage(next);
    }
  };

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(PAGES.length - 1, index));
    setCurrentPage(clamped);
    scrollRef.current?.scrollTo({ x: clamped * widthRef.current, animated: true });
  };

  // Fires continuously while dragging (not just once momentum settles — on
  // web a trackpad/mouse drag often never raises onMomentumScrollEnd at
  // all), so `pageRef`/`page` always reflect exactly where the user actually
  // is, never the page the component *thinks* it last snapped to.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = widthRef.current || 1;
    const next = Math.round(e.nativeEvent.contentOffset.x / w);
    const clamped = Math.max(0, Math.min(PAGES.length - 1, next));
    setCurrentPage(clamped);
  };

  const handleNext = () => {
    if (pageRef.current >= PAGES.length - 1) {
      onDone();
      return;
    }
    goTo(pageRef.current + 1);
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
          onScroll={onScroll}
          scrollEventThrottle={32}
          onMomentumScrollEnd={onScroll}
          onScrollEndDrag={onScroll}
          style={{ flex: 1 }}
        >
          {PAGES.map((p, index) => {
            // This page alone carries an extra block (the honesty-policy
            // demo) below the usual title/body. Without shrinking the icon
            // circle to make room, the panel's total content was taller
            // than its own `maxHeight`, and because the panel centres its
            // children, the overflow split both ways — pushing the icon
            // circle up past the panel's own top edge on shorter phones.
            // That is what read as "the trash icon pops out of its box."
            const hasDemo = p.icon === 'trash';
            return (
            <View key={p.title} style={[styles.page, { width }]}>
              <View style={styles.tourPanel}>
                <Text style={[styles.stepLabel, typography.overline]}>INTRODUCTION · {index + 1} OF {PAGES.length}</Text>
                <View style={[styles.picture, hasDemo && styles.pictureCompact]}>
                  <Icon name={p.icon} size={hasDemo ? 56 : 72} color={colors.primaryGlow} strokeWidth={1.5} />
                </View>
                <Text style={[styles.title, typography.h1]}>{p.title}</Text>
                <Text style={[styles.body, typography.body]}>{p.body}</Text>
                {hasDemo ? (
                  <View style={styles.trashDemo} accessibilityLabel="Trash count tutorial: enter 0 to 99 pieces">
                  <Text style={[styles.trashDemoLabel, typography.smallMed]}>Honesty policy</Text>
                  <View style={styles.trashDemoInput}>
                    <Text style={[styles.trashDemoNumber, typography.h2]}>0–99</Text>
                    <Text style={[styles.trashDemoUnit, typography.small]}>pieces</Text>
                  </View>
                  <Text style={[styles.trashDemoHint, typography.small]}>More pieces = more points</Text>
                </View>
                ) : null}
              </View>
            </View>
            );
          })}
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
            onPress={handleNext}
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
    // Equal left/right padding with the panel centred on this axis — this
    // used to be flex-end with mismatched padding (32 vs 16), which shoved
    // the whole panel, and every icon inside it, ~36px right of centre on a
    // typical phone. That read as "the icons look shifted right."
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  tourPanel: {
    width: '94%',
    maxWidth: 440,
    maxHeight: '96%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 28,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  stepLabel: { color: 'rgba(255,255,255,0.62)', marginBottom: SPACING.md },
  picture: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  // The trash page has an extra block below (the honesty-policy demo), so
  // its icon circle is smaller to keep total panel height in line with
  // every other page instead of overflowing the panel's own bounds.
  pictureCompact: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: SPACING.md,
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
  trashDemo: {
    width: '100%',
    maxWidth: 300,
    marginTop: SPACING.md,
    padding: SPACING.sm + 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  trashDemoLabel: { color: '#fff' },
  trashDemoInput: {
    minWidth: 160,
    minHeight: 58,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  trashDemoNumber: { color: '#1A2B24' },
  trashDemoUnit: { color: '#6B7F75' },
  trashDemoHint: { color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: SPACING.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotActive: { backgroundColor: c.primaryGlow, width: 24 },

  });
}
