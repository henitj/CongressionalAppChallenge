import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Header from '../components/Header';
import Icon from '../components/Icon';
import TreeGrowthScene from '../components/TreeGrowthScene';
import { Screen, Card, Pill, Button, ProgressBar, Banner } from '../components/ui';
import { SPACING, RADIUS, ColorPalette } from '../constants/theme';
import { useTheme, Typography } from '../context/ThemeContext';
import { useGems } from '../context/GemsContext';
import { useTreeGrowth } from '../context/TreeGrowthContext';
import { CARE_KINDS, CARE_ICON, CARE_LABEL, CareKind, TREE_STAGES } from '../constants/treeGrowth';
import { alert } from '../services/alert';

export default function TreeScreen() {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { totalGems } = useGems();
  const { stage, stageNumber, stageCount, care, forest, isFullyGrown, costFor, isCareDone, addCare, plantNew } =
    useTreeGrowth();
  const [busy, setBusy] = useState<CareKind | null>(null);

  const stagePercent = useMemo(() => {
    const done = CARE_KINDS.reduce((n, k) => n + Math.min(care[k], stage.unitsPerCare), 0);
    const needed = stage.unitsPerCare * CARE_KINDS.length;
    return needed ? (done / needed) * 100 : 0;
  }, [care, stage]);

  const handleCare = async (kind: CareKind) => {
    if (busy) return;
    setBusy(kind);
    try {
      const ok = await addCare(kind);
      if (!ok) {
        alert(
          'Not enough gems',
          `${CARE_LABEL[kind]} costs ${costFor(kind)} gems right now. Earn more by walking, riding or finishing weekly goals.`
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const handlePlantNew = async () => {
    await plantNew();
  };

  return (
    <Screen>
      <Header title="Your tree" subtitle="Grown with gems, not with money" back />

      <View style={styles.body}>
        <Card>
          <View style={styles.gemRow}>
            <View style={styles.gemBadge}>
              <Icon name="gem" size={18} color={colors.accentDark} strokeWidth={1.8} />
              <Text style={styles.gemValue}>{totalGems}</Text>
            </View>
            <Text style={styles.gemHint}>gems available</Text>
          </View>

          <TreeGrowthScene stageId={stage.id} />

          <View style={styles.stageHeader}>
            <Text style={styles.stageName}>{stage.name}</Text>
            <Pill label={`Stage ${stageNumber} / ${stageCount}`} tone="neutral" size="sm" icon="tree" />
          </View>
          <Text style={styles.stageBlurb}>{stage.blurb}</Text>

          {!isFullyGrown ? (
            <ProgressBar percent={stagePercent} style={{ marginTop: SPACING.sm }} />
          ) : null}
        </Card>

        {isFullyGrown ? (
          <Banner
            tone="success"
            icon="check-circle"
            title="Fully grown"
            message={`This tree is flourishing. Plant a new seed to keep going — you have grown ${forest} tree${forest === 1 ? '' : 's'} so far.`}
          />
        ) : null}

        {isFullyGrown ? (
          <Button label="Plant a new seed" icon="plus" variant="primary" size="lg" full onPress={handlePlantNew} />
        ) : (
          <View style={styles.careGrid}>
            {CARE_KINDS.map((kind) => {
              const done = isCareDone(kind);
              const cost = costFor(kind);
              const have = care[kind];
              return (
                <Card key={kind} padded style={styles.careCard}>
                  <View style={styles.careIconWrap}>
                    <Icon name={CARE_ICON[kind]} size={22} color={done ? colors.primary : colors.textMuted} />
                  </View>
                  <Text style={styles.careLabel}>{CARE_LABEL[kind]}</Text>
                  <Text style={styles.careCount}>
                    {Math.min(have, stage.unitsPerCare)} / {stage.unitsPerCare}
                  </Text>
                  <Button
                    label={done ? 'Done' : `${cost} gems`}
                    icon={done ? 'check' : 'gem'}
                    variant={done ? 'secondary' : 'primary'}
                    size="sm"
                    full
                    disabled={done || busy !== null}
                    loading={busy === kind}
                    onPress={() => handleCare(kind)}
                  />
                </Card>
              );
            })}
          </View>
        )}

        <Card tone="sunken">
          <Text style={styles.howTitle}>How this works</Text>
          <Rule
            icon="gem"
            text="Hiking, biking, finishing trails, weekly goals and badges all earn gems — separate from your EcoPoints."
            styles={styles}
          />
          <Rule
            icon="droplet"
            text="Spend gems on water, sunlight and nutrients to grow the tree through its stages."
            styles={styles}
          />
          <Rule
            icon="tree"
            text={`A fully grown tree takes real commitment — there are ${TREE_STAGES.length} stages in all, and the cost per stage goes up.`}
            styles={styles}
          />
        </Card>
      </View>
    </Screen>
  );
}

function Rule({ icon, text, styles }: { icon: any; text: string; styles: ReturnType<typeof makeStyles> }) {
  const { colors } = useTheme();
  return (
    <View style={styles.rule}>
      <Icon name={icon} size={15} color={colors.textMuted} strokeWidth={1.9} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    body: { paddingHorizontal: SPACING.md, gap: SPACING.md },
    gemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    gemBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: RADIUS.pill,
      backgroundColor: c.accentLight ?? c.primarySurface,
    },
    gemValue: { ...t.h4, color: c.accentDark },
    gemHint: { ...t.small, color: c.textMuted },
    stageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: SPACING.sm,
    },
    stageName: { ...t.h3, color: c.text },
    stageBlurb: { ...t.small, color: c.textMuted, marginTop: 2 },
    careGrid: { flexDirection: 'row', gap: SPACING.sm },
    careCard: { flex: 1, alignItems: 'center', gap: 6 },
    careIconWrap: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.md,
      backgroundColor: c.surfaceSunken,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    careLabel: { ...t.small, color: c.text, fontWeight: '600' },
    careCount: { ...t.micro, color: c.textMuted, marginBottom: 4 },
    howTitle: { ...t.h4, color: c.text, marginBottom: SPACING.sm + 2 },
    rule: { flexDirection: 'row', gap: SPACING.sm + 2, marginBottom: SPACING.sm + 2 },
    ruleText: { ...t.small, color: c.textSecondary, flex: 1 },
  });
}
