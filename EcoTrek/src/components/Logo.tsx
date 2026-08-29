import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const LOGO = require('../../assets/logo.png');

/**
 * The EcoTrek mark — a deep-forest-green circular emblem with a cream
 * winding trail that flows up into a fresh leaf, a warm orange sun, and
 * two cream pine trees at the base. This is the app's face: it greets
 * people on the intro and sign-in screens, matching the installed app icon.
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
