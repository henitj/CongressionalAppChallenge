import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Sheet } from './ui';
import Icon from './Icon';
import { SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { loadTrailRatings, removeTrailRating, saveTrailRating } from '../services/trailRatings';

/** Shared by trail details and the optional post-walk sheet. No visit required. */
export function TrailRatingControls({ trailId, userId, initialRating = 0, onSaved }: {
  trailId: string;
  userId?: string | null;
  initialRating?: number;
  onSaved?: (stars: number) => void;
}) {
  const { colors, typography } = useTheme();
  const [rating, setRating] = useState(initialRating);
  const [feedback, setFeedback] = useState('Saved on this device.');
  const [failed, setFailed] = useState(false);
  const request = useRef(0);
  const activeScope = useRef(`${userId}:${trailId}`);
  activeScope.current = `${userId}:${trailId}`;
  useEffect(() => {
    const token = ++request.current;
    setRating(initialRating);
    setFailed(false);
    setFeedback('Saved on this device.');
    loadTrailRatings(userId).then((saved) => {
      if (token === request.current) setRating(saved[trailId] ?? 0);
    });
    return () => { request.current += 1; };
  }, [trailId, userId]); // A parent refresh must not overwrite a selection in flight.

  const choose = async (stars: number) => {
    const token = ++request.current;
    const scope = activeScope.current;
    setRating(stars);
    setFailed(false);
    setFeedback('Saving…');
    try {
      if (stars === 0) await removeTrailRating(trailId, userId);
      else await saveTrailRating(trailId, stars, userId);
      if (scope === activeScope.current) onSaved?.(stars);
      if (token === request.current) setFeedback(stars ? `${stars} out of 5 · saved` : 'Rating removed.');
    } catch {
      if (token === request.current) {
        setFailed(true);
        setFeedback('Couldn’t save your rating. Tap a star to try again.');
      }
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={[typography.h4, { color: colors.text }]}>Your rating</Text>
        {rating > 0 && <Pressable onPress={() => choose(0)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Remove your rating" style={{ minHeight: 36, justifyContent: 'center' }}>
          <Text style={[typography.small, { color: colors.textMuted }]}>Clear</Text>
        </Pressable>}
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Your trail rating" style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => choose(star)} accessibilityRole="radio" accessibilityState={{ checked: star === rating }} aria-checked={star === rating} accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`} accessibilityHint="Save your personal trail rating" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="star" size={30} filled={star <= rating} color={star <= rating ? colors.accent : colors.borderStrong} strokeWidth={1.5} />
          </Pressable>
        ))}
      </View>
      <Text accessibilityLiveRegion="polite" style={[typography.small, { color: failed ? colors.danger : colors.textMuted }]}>{feedback}</Text>
    </View>
  );
}

export default function TrailRatingSheet({ visible, trailId, trailName, onClose }: {
  visible: boolean;
  trailId?: string;
  trailName?: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  return (
    <Sheet visible={visible} onClose={onClose} title="Rate the trail" subtitle={trailName}>
      <View style={{ gap: SPACING.lg }}>
        {visible && trailId ? <TrailRatingControls trailId={trailId} userId={user?.id ?? null} /> : null}
        <Button label="Done" onPress={onClose} full variant="secondary" />
      </View>
    </Sheet>
  );
}
