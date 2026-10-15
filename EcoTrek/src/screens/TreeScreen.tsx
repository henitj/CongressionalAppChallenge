import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import Icon from '../components/Icon';
import Slider from '../components/Slider';
import TreeGrowthScene, { type TreeCareEffect } from '../components/TreeGrowthScene';
import { Screen, Button, ProgressBar, Sheet } from '../components/ui';
import { SPACING, type ColorPalette } from '../constants/theme';
import { useTheme, type Typography } from '../context/ThemeContext';
import { useGems } from '../context/GemsContext';
import { useTreeGrowth } from '../context/TreeGrowthContext';
import { useApp } from '../context/AppContext';
import { CARE_KINDS, CARE_ICON, CARE_LABEL, MATURE_IMAGE, TREE_IMAGE_COUNT, TREE_STAGES, type CareKind } from '../constants/treeGrowth';
import { stageForImage, treeSeason } from '../services/treeGrowth';

export default function TreeScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const navigation = useNavigation<any>();
  const { totalGems } = useGems();
  const tree = useTreeGrowth();
  const { effectiveCoords } = useApp();
  const season = treeSeason(tree.now, effectiveCoords.latitude);
  const [busy, setBusy] = useState<CareKind | 'plant' | 'harvest' | null>(null);
  const lock = useRef(false);
  const [careEffect, setCareEffect] = useState<TreeCareEffect | null>(null);
  const [feedback, setFeedback] = useState('');
  const [showHow, setShowHow] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState(0);
  const [confirmPlant, setConfirmPlant] = useState(false);
  const previewStage = stageForImage(previewImage);
  const date = (time: number) => new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const missing = tree.missingCare.map((kind) => CARE_LABEL[kind].toLowerCase());
  const previewStep = (direction: number) => setPreviewImage((image) => Math.max(0, Math.min(TREE_IMAGE_COUNT - 1, image + direction)));

  const handleCare = async (kind: CareKind) => {
    if (lock.current || tree.isCareDone(kind)) return;
    lock.current = true; setBusy(kind);
    try {
      if (await tree.addCare(kind)) {
        setCareEffect({ kind, nonce: Date.now() });
        setFeedback(`${CARE_LABEL[kind]} done for this week. Your tree’s growth pace improves as its needs are met.`);
      } else setFeedback('You need 1 gem. A walk, ride or weekly goal can help you earn it.');
    } catch { setFeedback('Couldn’t save that care step. Please try again.'); }
    finally { lock.current = false; setBusy(null); }
  };
  const harvest = async () => {
    if (lock.current) return;
    lock.current = true; setBusy('harvest');
    try { if (await tree.harvestApple()) setFeedback('A golden apple, just for you. Another can be earned next week.'); }
    catch { setFeedback('Couldn’t save your apple. Please try again.'); }
    finally { lock.current = false; setBusy(null); }
  };
  const plant = async () => {
    if (lock.current) return;
    lock.current = true; setBusy('plant');
    try {
      if (await tree.plantNew()) { setCareEffect(null); setFeedback('Your sage is safe in your grove. A little seedling begins today.'); setConfirmPlant(false); }
    } catch { setFeedback('Couldn’t save your new seed. Please try again.'); }
    finally { lock.current = false; setBusy(null); }
  };

  return (
    <Screen>
      <Header title="Your tree" subtitle="Patient care. Gradual growth." back />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.wallet} accessibilityLabel={`${totalGems} gems available`}>
            <Icon name="gem" size={21} color={colors.primary} strokeWidth={1.5} />
            <Text style={styles.walletValue}>{totalGems}</Text><Text style={styles.small}>gems</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => { setPreviewImage(tree.imageIndex); setPreview(true); }} style={styles.linkButton}>
            <Text style={styles.link}>Explore 100 images</Text><Icon name="chevron-right" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.sceneLabel} pointerEvents="none"><Icon name={season === 'winter' ? 'cloud-snow' : 'leaf'} size={14} color={colors.textSecondary} /><Text style={styles.season}>{season === 'fall' ? 'Autumn' : season.charAt(0).toUpperCase() + season.slice(1)} · Apple tree</Text></View>
          <TreeGrowthScene imageIndex={tree.imageIndex} careEffect={careEffect} season={season} isFullyGrown={tree.isFullyGrown} />
          <View style={styles.heroCopy}>
            <View style={styles.stageHeader}><Text style={styles.stageName}>{tree.stage.name}</Text><Text style={styles.small}>Growth image {tree.imageIndex + 1} / {tree.imageCount}</Text></View>
            <Text style={styles.bodyText}>{tree.stage.blurb}</Text>
            <ProgressBar percent={tree.overallProgress * 100} />
            <View style={styles.stageHeader}><Text style={styles.small}>Next: {tree.nextStage?.name ?? 'A tree to keep caring for'}</Text><Text style={styles.small}>{tree.ageDays} days old</Text></View>
            {tree.nextStageAt ? <Text style={styles.timing}>{tree.nextStageAt > tree.now ? `Earliest milestone: ${date(tree.nextStageAt)}. ` : ''}{tree.weeksToNext > 0 ? `${tree.weeksToNext.toFixed(1)} more growth weeks at full pace.` : 'Calendar age still matters.'}</Text> : null}
          </View>
        </View>

        {tree.saveError ? <Text accessibilityLiveRegion="polite" style={[styles.bodyText, { color: colors.danger }]}>{tree.saveError}</Text> : null}
        {feedback ? <Text style={styles.feedback} accessibilityLiveRegion="polite">{feedback}</Text> : null}

        <View style={styles.week}>
          <View style={styles.stageHeader}><Text style={styles.sectionTitle}>This week’s care</Text><Text style={styles.small}>Once each · 1 gem</Text></View>
          <View style={styles.careRow}>
            {CARE_KINDS.map((kind) => {
              const done = tree.isCareDone(kind);
              const unavailable = done || busy !== null || totalGems < 1;
              return <Pressable key={kind} onPress={() => handleCare(kind)} disabled={unavailable} accessibilityRole="button" accessibilityLabel={done ? `${CARE_LABEL[kind]} complete this week` : `Add ${CARE_LABEL[kind].toLowerCase()} for 1 gem`} accessibilityState={{ disabled: unavailable }} style={({ pressed }) => [styles.care, done && { backgroundColor: colors.primarySurface }, pressed && { opacity: 0.7 }]}>
                <Icon name={done ? 'check-circle' : CARE_ICON[kind]} size={25} color={done ? colors.primary : kind === 'water' ? colors.info : kind === 'sun' ? colors.accentDark : colors.primary} strokeWidth={1.5} />
                <Text style={styles.careName}>{CARE_LABEL[kind]}</Text><Text style={styles.small}>{busy === kind ? 'Saving…' : done ? 'Done' : '1 gem'}</Text>
              </Pressable>;
            })}
          </View>
          <View style={[styles.pace, { backgroundColor: tree.careComplete ? colors.primarySurface : colors.surfaceSunken }]} testID="tree-growth-factor">
            <View style={styles.stageHeader}><Text style={styles.sectionTitle}>{tree.careComplete ? 'Ready to flourish' : 'Growing more slowly'}</Text><Text style={[styles.paceValue, { color: tree.careComplete ? colors.primary : colors.accentDark }]}>{tree.growthPercent}% pace</Text></View>
            <Text accessibilityLiveRegion="polite" style={styles.bodyText}>{tree.careComplete ? tree.outdoorThisWeek ? 'All three needs are met, and your outdoor boost is active. This is full-speed growth.' : 'All three needs are met. Save an outing this week to lift growth from 75% to 100%.' : `Still needs ${missing.join(', ')}. ${tree.carePercent}% care strength${tree.outdoorThisWeek ? ' with your outdoor boost' : ', before the outdoor boost'}. Finish all three to flourish.`}</Text>
          </View>
          <View style={styles.outdoorRow}><Icon name={tree.outdoorThisWeek ? 'check-circle' : 'boot'} size={19} color={tree.outdoorThisWeek ? colors.primary : colors.textMuted} /><Text style={[styles.bodyText, { flex: 1 }]}>{tree.outdoorThisWeek ? 'Walk or ride saved for this week.' : 'A saved walk or ride brings the full outdoor growth boost.'}</Text></View>
          <Text style={styles.timing}>Care refreshes on Monday. Partial care counts at a slower rate; missing weeks never erase your tree.</Text>
          {!tree.outdoorThisWeek || totalGems < 1 ? <Button label="Earn gems outside" icon="boot" full variant="secondary" onPress={() => navigation.navigate('Tabs', { screen: 'Track' })} /> : null}
        </View>

        {tree.isFullyGrown || tree.goldenApples > 0 ? <View style={styles.reward}>
          <View style={styles.stageHeader}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><Icon name="gift" size={22} color={colors.accentDark} /><Text style={styles.sectionTitle}>Golden apples</Text></View><Text style={styles.rewardCount}>{tree.goldenApples}</Text></View>
          <Text style={styles.bodyText}>{tree.harvestedThisWeek ? 'This week’s apple is yours. See you next week.' : tree.canHarvest ? 'A full-grown tree has something special for you.' : tree.isFullyGrown ? 'Complete all three care actions and an outing to earn this week’s golden apple.' : 'Kept from your earlier trees. This seedling’s special apples unlock at full growth.'}</Text>
          {tree.canHarvest ? <Button label="Collect golden apple" icon="gift" full loading={busy === 'harvest'} disabled={busy !== null} onPress={harvest} /> : null}
        </View> : null}

        <Pressable style={styles.howToggle} onPress={() => setShowHow((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: showHow }}><Text style={styles.link}>How your tree grows</Text><Icon name={showHow ? 'chevron-down' : 'chevron-right'} size={17} color={colors.primary} /></Pressable>
        {showHow ? <View style={styles.explanation}>
          <Text style={styles.bodyText}>100 separately rendered growth images show the same apple tree adding leaves, side shoots, branches, flower buds, blossoms and fruit. Seventeen milestones describe those changes. Young nursery images are close-ups for detail; they are not resized copies of an adult tree.</Text>
          <Text style={styles.bodyText}>Water, sunlight and soil are each needed once a week. With an outing, all three give 100% growth, two give 60%, one gives 25%, and none give 5%. Without an outing, the pace is multiplied by 75%. Missing care slows new growth, never reverses old growth. Extra taps cannot buy more care or skip time.</Text>
          <Text style={styles.bodyText}>Full growth needs both a full calendar year and 52 full-speed-equivalent growth weeks. Sage needs 18 calendar months and 78 growth weeks. Incomplete care therefore takes longer. The virtual timeline is compressed for the game—not a claim that real apple trees mature this quickly.</Text>
          <Text style={styles.bodyText}>Save a valid walk or ride of at least 0.1 mile and 1 minute for the weekly outdoor boost. Care may happen before or after the outing. A one-mile walk normally earns the three gems for the week’s care.</Text>
          <Text style={styles.bodyText}>Seasons follow the calendar and hemisphere, not live weather. Young trees keep their leaves. Only full-grown trees shed autumn leaves and have bare winter branches. Everyone gets winter snow scenery. Without location, scenery defaults to the northern hemisphere.</Text>
          <Text style={styles.bodyText}>A fully cared-for outdoor week earns one golden apple after maturity. It is a keepsake, not money or extra gems. Sage can stay with you, or be saved in your grove before starting another seedling.</Text>
          <Text style={styles.bodyText}>Planted {date(tree.plantedAt)} · {tree.forest} {tree.forest === 1 ? 'tree' : 'trees'} saved in your virtual grove. Your existing birthday, full-care weeks, gems and apples are kept by this update.</Text>
        </View> : null}
        {tree.isSage ? <Button label="Save sage & plant a new seed" icon="plus" full variant="secondary" onPress={() => setConfirmPlant(true)} /> : null}
        <Text style={styles.disclaimer}>A virtual tree. No real tree is planted.</Text>
      </View>

      {preview ? <Sheet visible onClose={() => setPreview(false)} title="100 small steps of growth" subtitle="Illustrations only · not your live progress">
        <View style={styles.preview}>
          <TreeGrowthScene imageIndex={previewImage} isFullyGrown={previewImage >= MATURE_IMAGE} season={season} ambient={false} style={{ minHeight: 200 }} />
          <View style={{ gap: 5, alignItems: 'center' }}><Text style={styles.stageName}>{previewStage.name}</Text><Text style={styles.bodyText}>Image {previewImage + 1} of {TREE_IMAGE_COUNT} · {previewStage.timeLabel}</Text></View>
          <Slider label="Growth image" value={previewImage} min={0} max={TREE_IMAGE_COUNT - 1} step={1} onChange={setPreviewImage} valueLabel={`${previewImage + 1} / ${TREE_IMAGE_COUNT}`} />
          <View style={styles.previewControls}><Button label="Previous image" icon="chevron-left" variant="secondary" onPress={() => previewStep(-1)} disabled={previewImage === 0} style={{ flex: 1 }} /><Button label="Next image" icon="chevron-right" variant="secondary" onPress={() => previewStep(1)} disabled={previewImage === TREE_IMAGE_COUNT - 1} style={{ flex: 1 }} /></View>
          <View style={styles.milestones}>{TREE_STAGES.map((milestone) => <Pressable key={milestone.id} onPress={() => setPreviewImage(milestone.firstImage)} accessibilityRole="button" accessibilityLabel={`Preview ${milestone.name}`} accessibilityState={{ selected: previewStage.id === milestone.id }} style={[styles.milestone, { backgroundColor: previewStage.id === milestone.id ? colors.primary : colors.surfaceSunken }]}><Text style={[typography.micro, { color: previewStage.id === milestone.id ? colors.textInverse : colors.textSecondary }]}>{milestone.name}</Text></Pressable>)}</View>
          <Text style={styles.disclaimer}>All 100 images can be explored. Your real tree still needs calendar age and consistent weekly care. Previewing spends nothing and changes no progress.</Text>
        </View>
      </Sheet> : null}
      <Sheet visible={confirmPlant} onClose={() => setConfirmPlant(false)} title="Begin another tree?" subtitle="Your sage and golden apples stay in your grove."><View style={styles.explanation}><Text style={styles.bodyText}>The new seedling begins today. It needs a fresh year of gradual growth and care. Keeping your sage is also perfectly fine.</Text><Button label="Save sage & plant seed" onPress={plant} loading={busy === 'plant'} disabled={busy !== null} full /><Button label="Keep my sage" onPress={() => setConfirmPlant(false)} variant="secondary" full /></View></Sheet>
    </Screen>
  );
}
function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: 21 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    wallet: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: c.primarySurface, borderRadius: 24, paddingHorizontal: 13, paddingVertical: 9 },
    walletValue: { ...t.h4, color: c.primary }, small: { ...t.micro, color: c.textMuted },
    linkButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 }, link: { ...t.smallMed, color: c.primary },
    hero: { borderRadius: 24, overflow: 'hidden', backgroundColor: c.surface },
    sceneLabel: { position: 'absolute', top: 14, left: 17, zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }, season: { ...t.micro, color: c.textSecondary },
    heroCopy: { padding: 18, gap: 12 }, stageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
    stageName: { ...t.h2, color: c.text }, bodyText: { ...t.small, color: c.textSecondary, lineHeight: Math.max(22, t.small.lineHeight ?? 22) },
    timing: { ...t.micro, fontWeight: '400', color: c.textMuted, lineHeight: Math.max(20, Math.round(t.micro.fontSize * 1.75)) },
    sectionTitle: { ...t.h4, color: c.text }, week: { gap: 13 }, careRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    care: { flex: 1, minWidth: 84, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 18, backgroundColor: c.surface }, careName: { ...t.smallMed, color: c.text, textAlign: 'center' },
    pace: { padding: 16, borderRadius: 18, gap: 9 }, paceValue: { ...t.h4 }, outdoorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
    feedback: { ...t.small, color: c.primary, backgroundColor: c.primarySurface, padding: 14, borderRadius: 14, lineHeight: Math.max(22, t.small.lineHeight ?? 22) },
    reward: { gap: 12, padding: 18, borderRadius: 20, backgroundColor: c.accentLight }, rewardCount: { ...t.h3, color: c.accentDark },
    howToggle: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, minHeight: 44 }, explanation: { gap: 14 },
    disclaimer: { ...t.micro, fontWeight: '400', textAlign: 'center', color: c.textMuted, lineHeight: Math.max(20, Math.round(t.micro.fontSize * 1.75)) },
    preview: { gap: 16 }, previewControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    milestones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, milestone: { minHeight: 40, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10, justifyContent: 'center' },
  });
}
