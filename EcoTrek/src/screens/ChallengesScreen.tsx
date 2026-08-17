import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Header from '../components/Header';
import Icon from '../components/Icon';
import ChallengeItem from '../components/ChallengeItem';
import { Screen, Card, Pill, ProgressBar, Banner } from '../components/ui';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useChallenges } from '../context/ChallengeContext';
import { useClub } from '../constants/ClubContext';
import { useActivity } from '../context/ActivityContext';

export default function ChallengesScreen() {
  const {
    challenges,
    completedCount,
    totalCount,
    timeLeftLabel,
    pointsEarnedThisWeek,
    pointsAvailable,
    lifetimeCompleted,
    allDone,
    completeChallenge,
    undoChallenge,
  } = useChallenges();
  const { myClub } = useClub();
  const { totalActivities } = useActivity();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Explainers are for new users. After a few activities they are just clutter.
  const showBasics = totalActivities < 3 && lifetimeCompleted < 3;

  const handleComplete = async (id: string) => {
    setBusyId(id);
    try {
      await completeChallenge(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <Header title="Weekly challenges" subtitle={timeLeftLabel} back />

      <View style={styles.body}>
        {/* Summary */}
        <Card>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryValue}>
                {completedCount}
                <Text style={styles.summaryTotal}> / {totalCount}</Text>
              </Text>
              <Text style={styles.summaryLabel}>Completed this week</Text>
            </View>
            <View style={styles.pointsBox}>
              <Text style={styles.pointsValue}>+{pointsEarnedThisWeek}</Text>
              <Text style={styles.pointsLabel}>of {pointsAvailable} pts</Text>
            </View>
          </View>
          <ProgressBar
            percent={(completedCount / totalCount) * 100}
            style={{ marginTop: SPACING.md - 2 }}
          />
          <View style={styles.summaryFooter}>
            <Pill label={`${lifetimeCompleted} all time`} tone="neutral" size="sm" icon="award" />
            <Pill label={timeLeftLabel} tone="neutral" size="sm" icon="clock" />
          </View>
        </Card>

        {allDone ? (
          <Banner
            tone="success"
            icon="check-circle"
            title="Clean sweep"
            message="You finished every challenge this week. A fresh set unlocks Monday morning."
          />
        ) : null}

        {myClub ? (
          <Banner
            tone="info"
            icon="users"
            title={`Points go to ${myClub.name}`}
            message="Every challenge you finish adds the same number of points to your club's score."
          />
        ) : (
          <Banner
            tone="neutral"
            icon="users"
            title="Join a club to make these count double"
            message="Challenge points add to your club's total as well as your own."
          />
        )}

        {/* List */}
        <View style={{ gap: SPACING.sm }}>
          {challenges.map((c) => (
            <ChallengeItem
              key={c.id}
              challenge={c}
              onComplete={handleComplete}
              onUndo={undoChallenge}
              busy={busyId === c.id}
            />
          ))}
        </View>

        {/* How it works */}
        {showBasics ? (
        <Card tone="sunken">
          <Text style={styles.howTitle}>How challenges work</Text>
          <Rule
            icon="target"
            text="Five challenges every week, the same five for everyone. They reset Monday at midnight."
          />
          <Rule
            icon="activity"
            text="Ones marked Tracked automatically tick off on their own as you log distance."
          />
          <Rule
            icon="check"
            text="The rest are on your honour. Tap the circle when you have done it — the point is the habit, not the paperwork."
          />
          <Rule icon="users" text="Points count toward your personal score and your club's." />
        </Card>
        ) : null}
      </View>
    </Screen>
  );
}

function Rule({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.rule}>
      <Icon name={icon} size={15} color={COLORS.textMuted} strokeWidth={1.9} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  summaryTop: { flexDirection: 'row', alignItems: 'center' },
  summaryValue: { fontSize: 34, fontWeight: '700', color: COLORS.text, letterSpacing: -0.4 },
  summaryTotal: { fontSize: 20, color: COLORS.textLight, fontWeight: '600' },
  summaryLabel: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  pointsBox: {
    alignItems: 'flex-end',
    paddingLeft: SPACING.md,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.borderLight,
  },
  pointsValue: { ...TYPOGRAPHY.h2, color: COLORS.accentDark },
  pointsLabel: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },
  summaryFooter: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md - 2 },
  howTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: SPACING.sm + 2 },
  rule: { flexDirection: 'row', gap: SPACING.sm + 2, marginBottom: SPACING.sm + 2 },
  ruleText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, flex: 1 },
});
