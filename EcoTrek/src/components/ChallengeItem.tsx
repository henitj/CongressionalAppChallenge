import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Icon from './Icon';
import { Pill, ProgressBar } from './ui';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { ActiveChallenge } from '../context/ChallengeContext';
import { CATEGORY_LABEL } from '../constants/challenges';

/**
 * One weekly challenge.
 *
 * Manual challenges get a tap target on the right. Auto challenges show a
 * progress bar instead — the app ticks those off itself, so there is nothing
 * to press and no way to cheat yourself into thinking you did it.
 */
export default function ChallengeItem({
  challenge,
  onComplete,
  onUndo,
  busy,
}: {
  challenge: ActiveChallenge;
  onComplete: (id: string) => void;
  onUndo?: (id: string) => void;
  busy?: boolean;
}) {
  const { completed, kind, target = 1, progress } = challenge;
  const done = completed;

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={[styles.icon, done && styles.iconDone]}>
        <Icon
          name={done ? 'check' : challenge.icon}
          size={18}
          color={done ? '#fff' : COLORS.primary}
          strokeWidth={done ? 2.6 : 1.9}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
            {challenge.title}
          </Text>
          <Text style={styles.points}>+{challenge.points}</Text>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {challenge.description}
        </Text>

        {kind === 'auto' && !done ? (
          <View style={styles.progressWrap}>
            <ProgressBar percent={challenge.progressPercent} height={5} />
            <Text style={styles.progressText}>
              {formatProgress(progress, target, challenge.metric)}
            </Text>
          </View>
        ) : (
          <View style={styles.metaRow}>
            <Pill
              label={kind === 'auto' ? 'Tracked automatically' : CATEGORY_LABEL[challenge.category]}
              tone={done ? 'primary' : 'neutral'}
              size="sm"
            />
            {done && onUndo ? (
              <Pressable onPress={() => onUndo(challenge.id)} hitSlop={8}>
                <Text style={styles.undo}>Undo</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {kind === 'manual' && !done ? (
        <Pressable
          onPress={() => onComplete(challenge.id)}
          disabled={busy}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
          accessibilityLabel={`Mark ${challenge.title} complete`}
        >
          {busy ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Icon name="circle" size={26} color={COLORS.borderStrong} strokeWidth={1.7} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function formatProgress(progress: number, target: number, metric?: string) {
  const p = metric === 'miles' ? progress.toFixed(1) : Math.floor(progress);
  const unit =
    metric === 'miles'
      ? 'mi'
      : metric === 'activities'
      ? 'trips'
      : metric === 'trees'
      ? 'trees'
      : 'days';
  return `${p} of ${target} ${unit}`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm + 4,
    padding: SPACING.md - 2,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardDone: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primaryGlow,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDone: { backgroundColor: COLORS.primary },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  title: { ...TYPOGRAPHY.h4, color: COLORS.text, flex: 1 },
  titleDone: { color: COLORS.primary },
  points: {
    ...TYPOGRAPHY.smallMed,
    color: COLORS.accentDark,
  },
  description: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  progressWrap: { gap: 4, marginTop: 4 },
  progressText: { ...TYPOGRAPHY.micro, color: COLORS.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 3 },
  undo: { ...TYPOGRAPHY.micro, color: COLORS.textMuted, textDecorationLine: 'underline' },
  action: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
