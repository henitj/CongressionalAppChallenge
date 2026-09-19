import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import { useTheme, Typography } from '../context/ThemeContext';
import { ColorPalette, RADIUS } from '../constants/theme';

/**
 * A themable range slider used by the trail filters.
 *
 * Deliberately hand-rolled instead of pulling in a native slider package:
 * it keeps the dependency tree Expo-Go-safe, follows the app's palette in
 * dark and high-contrast modes, and renders fine under Jest. Drag anywhere
 * on the track — the thumb follows the finger, snapped to `step`.
 */
export default function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  valueLabel,
  maxLabel,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** Left-hand caption, e.g. "Trail length". */
  label: string;
  /** Right-hand current value, e.g. "under 10 mi". */
  valueLabel: string;
  /** Shown instead of valueLabel when the slider sits at `max` ("Any"). */
  maxLabel?: string;
}) {
  const { colors, typography } = useTheme();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const width = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const set = (x: number) => {
    if (width.current <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / width.current));
    const raw = min + ratio * (max - min);
    const snapped = Math.max(min, Math.min(max, Math.round(raw / step) * step));
    if (snapped !== valueRef.current) onChange(snapped);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => set(e.nativeEvent.locationX),
      onPanResponderMove: (e) => set(e.nativeEvent.locationX),
    })
  ).current;

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const atMax = value >= max && !!maxLabel;

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, atMax && styles.valueAny]}>
          {atMax ? maxLabel : valueLabel}
        </Text>
      </View>
      <View
        style={styles.touchArea}
        onLayout={(e) => {
          width.current = e.nativeEvent.layout.width;
        }}
        {...pan.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + step));
          if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - step));
        }}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
        <View style={[styles.thumb, { left: `${ratio * 100}%` }]} pointerEvents="none" />
      </View>
    </View>
  );
}

function makeStyles(c: ColorPalette, t: Typography) {
  return StyleSheet.create({
    wrap: { gap: 2 },
    labels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { ...t.smallMed, color: c.textSecondary },
    value: { ...t.smallMed, color: c.primary },
    valueAny: { color: c.textMuted },
    touchArea: {
      height: 40,
      justifyContent: 'center',
    },
    track: {
      height: 5,
      borderRadius: RADIUS.pill,
      backgroundColor: c.borderLight,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: RADIUS.pill,
      backgroundColor: c.primary,
    },
    thumb: {
      position: 'absolute',
      width: 22,
      height: 22,
      borderRadius: 11,
      marginLeft: -11,
      backgroundColor: c.primary,
      borderWidth: 3,
      borderColor: '#fff',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 3,
    },
  });
}
