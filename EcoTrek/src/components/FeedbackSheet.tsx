import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Linking } from 'react-native';

import Icon from './Icon';
import { Button } from './ui';
import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import {
  FEEDBACK_FORM_URL,
  isFeedbackConfigured,
  submitFeedbackRating,
} from '../constants/feedback';
import { useTheme, Typography } from '../context/ThemeContext';

/**
 * The "give feedback" popup.
 *
 * Shown in two places, both by design:
 *   • automatically once, right after a first finished hike/ride, and
 *   • from the Give Feedback button at the bottom of the Profile page.
 *
 * Pick 1–5 stars → Submit → the rating is posted straight to the team's
 * Google Form (links live in src/constants/feedback.ts).
 */
export default function FeedbackSheet({
  visible,
  onClose,
  /** Worded for the after-hike moment ("How was your first hike?"). */
  title = 'Enjoying EcoTrek?',
  subtitle = 'Tap a star to rate it — your rating goes straight to the team.',
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}) {
  const { colors, typography } = useTheme();
  const styles = makeStyles(colors, typography);

  const [stars, setStars] = useState(0);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset for the next time it opens.
  useEffect(() => {
    if (visible) {
      setStars(0);
      setSending(false);
      setDone(false);
    }
  }, [visible]);

  // Clean up the auto-close timer if the popup goes away early.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const submit = async () => {
    if (stars < 1 || sending) return;
    setSending(true);
    await submitFeedbackRating(stars);
    setSending(false);
    setDone(true);
    // A short victory lap, then out of the way.
    timerRef.current = setTimeout(onClose, 1600);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close feedback" />
        <View style={styles.card}>
          {done ? (
            <>
              <View style={styles.doneIcon}>
                <Icon name="check-circle" size={44} color={colors.primary} strokeWidth={1.6} />
              </View>
              <Text style={styles.doneTitle}>Thank you!</Text>
              <Text style={styles.doneBody}>
                Your rating was sent to the EcoTrek team. See you on the trail.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.headerIcon}>
                <Icon name="star" size={26} color="#FFFFFF" strokeWidth={2} filled />
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>

              <View style={styles.starRow} accessibilityLabel="How many stars do you give EcoTrek?">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setStars(n)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`${n} ${n === 1 ? 'star' : 'stars'}`}
                    style={styles.starBtn}
                  >
                    <Icon
                      name="star"
                      size={36}
                      color={n <= stars ? '#FFB020' : colors.borderStrong}
                      strokeWidth={1.8}
                      filled={n <= stars}
                    />
                  </Pressable>
                ))}
              </View>

              <Button
                label={sending ? 'Sending…' : 'Submit'}
                iconRight={sending ? undefined : 'arrow-right'}
                size="lg"
                full
                loading={sending}
                disabled={stars < 1 || sending}
                onPress={submit}
                style={{ marginTop: SPACING.md }}
              />
              <Pressable onPress={onClose} hitSlop={10} style={{ marginTop: SPACING.sm }}>
                <Text style={styles.notNow}>Not now</Text>
              </Pressable>

              {isFeedbackConfigured() ? (
                <Pressable
                  onPress={() => Linking.openURL(FEEDBACK_FORM_URL)}
                  style={{ marginTop: SPACING.sm }}
                  hitSlop={8}
                >
                  <Text style={styles.fullForm}>Open the full form to write more</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.lg,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: c.surface,
      borderRadius: RADIUS.xl,
      padding: SPACING.lg,
      alignItems: 'center',
    },

    headerIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#FFB020',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.sm,
    },
    title: { ...t.h2, color: c.text, textAlign: 'center' },
    subtitle: { ...t.small, color: c.textMuted, textAlign: 'center', marginTop: 4 },

    starRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: SPACING.xs,
      marginTop: SPACING.md,
    },
    starBtn: { padding: 4 },

    notNow: { ...t.smallMed, color: c.textMuted },
    fullForm: { ...t.small, color: c.primary },

    doneIcon: { marginBottom: SPACING.sm },
    doneTitle: { ...t.h2, color: c.text },
    doneBody: { ...t.body, color: c.textMuted, textAlign: 'center', marginTop: 4 },
  });
}
