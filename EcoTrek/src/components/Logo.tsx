import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const LOGO = require('../../assets/logo.png');

/**
 * The EcoTrek mark: a trail-marker pin with one route growing into a leaf.
 * The pin represents location tracking, while the leaf keeps the
 * lighter-footprint idea visible without extra scenery that disappears at
 * small sizes.
 *
 * The source file (assets/logo.png) is square with the brand background
 * baked in, so we round the corners here and it sits cleanly on any surface.
 */
export default function Logo({ size = 72, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={LOGO}
      style={[{ width: size, height: size, borderRadius: Math.round(size * 0.26) }, style]}
      accessibilityLabel="EcoTrek logo"
      accessibilityRole="image"
    />
  );
}
