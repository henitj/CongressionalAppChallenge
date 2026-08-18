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
import { COLORS, RADIUS, SPACING, TREE_RULES } from '../constants/theme';

/**
 * First-run walkthrough.
 *
 * Written in plain language for older adults and anyone who is new to the
 * app. No jargon, no scary headlines, no "we only read location in the
 * background" legalese.
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
    title: 'Walk or ride. We measure the miles.',
    body: 'Tap Start, put your phone in your pocket, and go. EcoTrek records how far you walk, hike, or bike.',
    points: [
      { icon: 'map-pin', text: 'It can tell which Austin trail you are on.' },
      { icon: 'flag', text: 'Finish most of a trail and we mark it complete.' },
      { icon: 'battery', text: 'We only use GPS while you are recording. When you stop, we stop.' },
    ],
  },
  {
    icon: 'tree',
    title: 'Every mile grows your forest.',
    body: `Walk ${TREE_RULES.hikeMilesPerTree} mile, earn 1 tree. Bike ${TREE_RULES.bikeMilesPerTree} miles, earn 1 tree.`,
    points: [
      {
        icon: 'info',
        text: 'Trees are a fun way to see your progress. No real tree is planted.',
      },
      { icon: 'star', text: 'You also earn points, badges, and levels as you go.' },
    ],
  },
  {
    icon: 'sun',
    title: 'We check the weather for you.',
    body: 'See today’s temperature and the next few hours before you head out. If it is too hot or stormy, we will say so clearly.',
    points: [
      { icon: 'thermometer', text: 'Current temperature, right on the home screen.' },
      { icon: 'clock', text: 'The next few hours, so you can pick a cooler time.' },
      { icon: 'shield', text: 'A simple note if it is safer to stay inside.' },
    ],
  },
  {
    icon: 'users',
    title: 'Bring people with you.',
    body: 'Join a club with a short code from a friend. Your miles help the whole group.',
    points: [
      { icon: 'lock', text: 'Clubs are invite-only. You need a 6-character code.' },
      { icon: 'target', text: 'Five small goals each week. Nothing huge.' },
      { icon: 'flame', text: 'A weekly streak for showing up — that is enough.' },
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
            <Icon name="tree" size={20} color={COLORS.primaryGlow} strokeWidth={2} />
          </View>
          {!last ? (
            <Pressable onPress={onDone} hitSlop={16} accessibilityLabel="Skip introduction">
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
                <Icon name={p.icon} size={36} color={COLORS.primaryGlow} strokeWidth={1.7} />
              </View>

              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.body}>{p.body}</Text>

              <View style={styles.points}>
                {p.points.map((pt) => (
                  <View key={pt.text} style={styles.point}>
                    <View style={styles.pointIcon}>
                      <Icon name={pt.icon} size={18} color={COLORS.primaryGlow} strokeWidth={1.9} />
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
                hitSlop={12}
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
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },

  page: { paddingHorizontal: SPACING.lg, justifyContent: 'center', flex: 1 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: { fontSize: 30, fontWeight: '700', color: '#fff', letterSpacing: -0.4, lineHeight: 36 },
  body: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.78)',
    marginTop: SPACING.md,
    maxWidth: 400,
  },
  points: { marginTop: SPACING.xl, gap: SPACING.md },
  point: { flexDirection: 'row', gap: SPACING.sm + 4, alignItems: 'flex-start' },
  pointIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    fontSize: 16,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
    paddingTop: 6,
  },

  footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: SPACING.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: SPACING.sm },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dotActive: { backgroundColor: COLORS.primaryGlow, width: 24 },
});
