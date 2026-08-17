import React, { useRef, useState } from 'react';
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
import { Button } from '../components/ui';
import { COLORS, RADIUS, SPACING, TREE_RULES, TYPOGRAPHY } from '../constants/theme';

/**
 * First-run walkthrough.
 *
 * Four screens, because four is what it takes to explain the two things that
 * are not obvious — that trees are symbolic, and that the app refuses to send
 * you out in dangerous weather. Everything else can be discovered.
 *
 * Skippable from the first screen. Nobody should be trapped in an intro.
 */

type Page = {
  icon: IconName;
  title: string;
  body: string;
  points: { icon: IconName; text: string }[];
};

const PAGES: Page[] = [
  {
    icon: 'navigation',
    title: 'Track what you move',
    body: 'Start a hike or a ride and EcoTrek measures it with GPS. It recognises which Austin trail you are on by itself.',
    points: [
      { icon: 'map-pin', text: '14 trails with automatic detection' },
      { icon: 'flag', text: 'Cover 70% of one to log a completion' },
      { icon: 'battery', text: 'Location is read only while you record, never in the background' },
    ],
  },
  {
    icon: 'tree',
    title: 'Miles become trees',
    body: `One tree per ${TREE_RULES.hikeMilesPerTree} mile hiked, one per ${TREE_RULES.bikeMilesPerTree} miles biked.`,
    points: [
      {
        icon: 'info',
        text: 'Trees are a symbolic measure of your effort. No real tree is planted and no organisation is involved.',
      },
      { icon: 'star', text: 'They sit alongside EcoPoints, badges and levels' },
    ],
  },
  {
    icon: 'shield',
    title: 'It tells you when not to go',
    body: 'Austin heat and flash floods are the real hazard, so conditions come before encouragement.',
    points: [
      { icon: 'thermometer', text: 'Live heat index, storms, air quality and UV' },
      { icon: 'alert-triangle', text: 'Official National Weather Service warnings' },
      { icon: 'clock', text: 'In dangerous conditions the Start button asks you to reconsider' },
    ],
  },
  {
    icon: 'users',
    title: 'Bring people with you',
    body: 'Clubs are invite-only. Everything you earn adds to your club as well as to you.',
    points: [
      { icon: 'lock', text: 'Join with a six-character code from a member' },
      { icon: 'target', text: 'Five small challenges every week, reset on Monday' },
      { icon: 'flame', text: 'A streak for showing up, and a world top ten to climb' },
    ],
  },
];

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
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
          <View style={styles.mark}>
            <Icon name="tree" size={18} color={COLORS.primaryGlow} strokeWidth={2} />
          </View>
          {!last ? (
            <Pressable onPress={onDone} hitSlop={12}>
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          ) : null}
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
              <View style={styles.iconWrap}>
                <Icon name={p.icon} size={34} color={COLORS.primaryGlow} strokeWidth={1.7} />
              </View>

              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.body}>{p.body}</Text>

              <View style={styles.points}>
                {p.points.map((pt) => (
                  <View key={pt.text} style={styles.point}>
                    <View style={styles.pointIcon}>
                      <Icon name={pt.icon} size={15} color={COLORS.primaryGlow} strokeWidth={1.9} />
                    </View>
                    <Text style={styles.pointText}>{pt.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {PAGES.map((p, i) => (
              <Pressable
                key={p.title}
                onPress={() => goTo(i)}
                hitSlop={8}
                accessibilityLabel={`Go to step ${i + 1}`}
              >
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primaryDark },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { ...TYPOGRAPHY.bodyMed, color: 'rgba(255,255,255,0.55)' },

  page: { paddingHorizontal: SPACING.lg, justifyContent: 'center', flex: 1 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { fontSize: 32, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
  body: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.68)',
    marginTop: SPACING.sm + 2,
    maxWidth: 380,
  },
  points: { marginTop: SPACING.xl, gap: SPACING.md },
  point: { flexDirection: 'row', gap: SPACING.sm + 4, alignItems: 'flex-start' },
  pointIcon: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    ...TYPOGRAPHY.small,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
    lineHeight: 20,
    paddingTop: 5,
  },

  footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingVertical: SPACING.sm },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dotActive: { backgroundColor: COLORS.primaryGlow, width: 20 },
});
