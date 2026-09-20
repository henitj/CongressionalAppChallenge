import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sheet } from './ui';
import Icon from './Icon';
import { SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { saveTrailRating } from '../services/trailRatings';

export default function TrailRatingSheet({ visible, trailId, trailName, onClose }: {
  visible: boolean;
  trailId?: string;
  trailName?: string;
  onClose: () => void;
}) {
  const { colors, typography } = useTheme();
  const [rating, setRating] = useState(0);
  const choose = async (stars: number) => {
    if (!trailId) return onClose();
    setRating(stars);
    try {
      await saveTrailRating(trailId, stars);
    } finally {
      // Storage failure must never trap someone behind the rating sheet.
      setTimeout(onClose, 350);
    }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Rate the trail" subtitle={trailName ? `How was ${trailName}?` : 'How was this trail?'}>
      <View style={{ alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => choose(star)} hitSlop={7} accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}>
              <Icon name="star" size={38} color={star <= rating ? colors.accent : colors.borderStrong} strokeWidth={2} />
            </Pressable>
          ))}
        </View>
        <Text style={[typography.small, { color: colors.textMuted, textAlign: 'center' }]}>Your rating is saved and helps tailor future trail recommendations.</Text>
      </View>
    </Sheet>
  );
}
