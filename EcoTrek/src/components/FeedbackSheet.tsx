import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import { Sheet, Button } from './ui';
import { RADIUS, SPACING, ColorPalette } from '../constants/theme';
import { openFeedbackForm } from '../constants/feedback';
import { useTheme, Typography } from '../context/ThemeContext';

/**
 * Post-walk feedback popup.
 *
 * After a counted walk we ask once, quietly, whether they want to tell us
 * how it went. "Not now" closes it. Tapping Give feedback opens the team's
 * Google Form and dismisses the sheet.
 */
export default function FeedbackSheet({
  visible,
  onClose,
  kind = 'hike',
}: {
  visible: boolean;
  onClose: () => void;
  kind?: 'hike' | 'bike';
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const word = kind === 'bike' ? 'ride' : 'walk';

  const giveFeedback = async () => {
    await openFeedbackForm();
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="How was that?"
      subtitle={`A short note after your ${word} helps us make EcoTrek better.`}
    >
      <View style={{ gap: SPACING.md }}>
        <View style={styles.note}>
          <View style={styles.noteIcon}>
            <Icon name="star" size={18} color={colors.primary} strokeWidth={1.9} />
          </View>
          <Text style={styles.noteText}>
            Two minutes, one form. What worked, what did not, anything you wish the app did.
          </Text>
        </View>

        <Button label="Give feedback" icon="star" full onPress={giveFeedback} />
        <Button label="Not now" variant="ghost" full onPress={onClose} />
      </View>
    </Sheet>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    note: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: SPACING.sm + 2,
      backgroundColor: c.primarySurface,
      borderRadius: RADIUS.md,
      padding: SPACING.md - 2,
    },
    noteIcon: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.sm,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noteText: { ...t.small, color: c.textSecondary, flex: 1 },
  });
}
