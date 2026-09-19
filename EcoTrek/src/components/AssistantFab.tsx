import React from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';

/**
 * Floating "ask the AI" button, pinned to the bottom-right of a screen.
 *
 * One tap opens the assistant chat. Kept as its own component so any screen
 * can drop it in without re-declaring the positioning or the sparkle icon.
 */
export default function AssistantFab({ trailId }: { trailId?: string }) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => navigation.navigate('Assistant', trailId ? { trailId } : {})}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: colors.primary },
        pressed && { transform: [{ scale: 0.94 }], opacity: 0.9 },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Ask the AI assistant"
      testID="assistant-fab"
    >
      <Icon name="sparkles" size={26} color="#fff" strokeWidth={1.9} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: Platform.OS === 'ios' ? 24 : 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
