import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { COLORS } from '../constants/theme';

export default function TreeIcon({ size = 32, color = COLORS.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="32" cy="22" r="16" fill={color} />
      <Circle cx="20" cy="30" r="11" fill={color} opacity={0.8} />
      <Circle cx="44" cy="30" r="11" fill={color} opacity={0.8} />
      <Rect x="28" y="35" width="8" height="20" rx="2" fill={COLORS.bark} />
    </Svg>
  );
}
