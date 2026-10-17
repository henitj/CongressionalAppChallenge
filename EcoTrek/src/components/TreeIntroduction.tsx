import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Header from './Header';
import TreeGrowthScene from './TreeGrowthScene';
import { Button, Screen } from './ui';
import { SPACING, type ColorPalette } from '../constants/theme';
import { useTheme, type Typography } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { treeSeason } from '../services/treeGrowth';

const GROWTH_PREVIEW = [0, 8, 17, 27, 38, 49, 60, 70, 79];

type Props = { onDone: () => void | Promise<void> };

/** A one-time, two-step welcome to the tree's slow growth lifecycle. */
export default function TreeIntroduction({ onDone }: Props) {
  const { colors, typography, motionEnabled } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { coords } = useApp();
  const season = treeSeason(Date.now(), coords?.latitude ?? 0);
  const [page, setPage] = useState<0 | 1>(0);
  const [frame, setFrame] = useState(GROWTH_PREVIEW[0]);
  const [saving, setSaving] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (page !== 0 || !motionEnabled) {
      if (page === 0) setFrame(GROWTH_PREVIEW[0]);
      return;
    }

    let frameIndex = 0;
    setFrame(GROWTH_PREVIEW[0]);
    const timer = setInterval(() => {
      frameIndex += 1;
      const next = GROWTH_PREVIEW[Math.min(frameIndex, GROWTH_PREVIEW.length - 1)];
      setFrame(next);
      if (frameIndex >= GROWTH_PREVIEW.length - 1) clearInterval(timer);
    }, 260);
    return () => clearInterval(timer);
  }, [page, motionEnabled]);

  const finish = async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setSaving(true);
    try {
      await onDone();
    } catch {
      // The caller persists the intro flag best-effort; never strand someone
      // on the welcome screen if local storage is temporarily unavailable.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Header title="Your tree" subtitle="A story in slow, steady growth" hideAvatar />
      <View style={styles.content}>
        <View style={styles.artCard}>
          {page === 0 ? (
            <TreeGrowthScene
              imageIndex={frame}
              season={season}
              isFullyGrown={false}
              ambient={false}
              style={styles.scene}
            />
          ) : (
            <TreeGrowthScene
              imageIndex={99}
              season={season}
              isFullyGrown
              ambient={false}
              style={styles.scene}
            />
          )}
        </View>

        {page === 0 ? (
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>A NEW BEGINNING</Text>
            <Text style={styles.title}>A little care grows a tree</Text>
            <Text style={styles.body}>
              Watch one apple tree add leaves and branches. Each week, water, sunlight, soil, and time help it grow. A saved walk or ride gives it an extra boost.
            </Text>
            <Text style={styles.note}>
              Growth is gradual. Tapping faster never skips a week.
            </Text>
          </View>
        ) : (
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>THE LONG VIEW</Text>
            <Text style={styles.title}>The oldest sage tree</Text>
            <Text style={styles.body}>
              This is a preview of what patient care can become. A sage tree takes six months and steady weekly care to reach. Your own tree starts as a small seedling and grows at its own pace.
            </Text>
            <Text style={styles.note}>
              When you tap Done, you’ll see your tree and the care you can give it each week.
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {page === 1 ? (
            <Button
              label="Back"
              variant="ghost"
              onPress={() => setPage(0)}
              disabled={saving}
              style={styles.backButton}
            />
          ) : null}
          <Button
            label={page === 0 ? 'Next' : 'Done'}
            iconRight={page === 0 ? 'arrow-right' : undefined}
            size="lg"
            full
            loading={saving}
            disabled={saving}
            onPress={page === 0 ? () => setPage(1) : finish}
            style={styles.nextButton}
          />
        </View>
      </View>
    </Screen>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    content: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl, gap: SPACING.md },
    artCard: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      overflow: 'hidden',
      borderRadius: 24,
      backgroundColor: c.primarySurface,
    },
    scene: { minHeight: 220, maxHeight: 360 },
    copy: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: SPACING.sm },
    eyebrow: { ...t.overline, color: c.primary, letterSpacing: 0.7 },
    title: { ...t.h2, color: c.text },
    body: { ...t.body, color: c.textSecondary, lineHeight: Math.max(t.body.lineHeight ?? 24, t.body.fontSize * 1.4) },
    note: { ...t.smallMed, color: c.textMuted, lineHeight: Math.max(20, t.smallMed.fontSize * 1.4) },
    actions: { width: '100%', maxWidth: 520, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    backButton: { minWidth: 84 },
    nextButton: { flex: 1 },
  });
}
