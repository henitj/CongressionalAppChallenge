import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const LOGO = require('../../assets/logo.png');

/**
 * The EcoTrek mark — a mountain-and-trail emblem on a fresh green-to-sky
 * gradient. This is the app's face: it greets people on the intro and
 * sign-in screens, matching the installed app icon.
 *
 * The source file (assets/logo.png) is square with the gradient baked in,
 * so we round the corners here and it sits cleanly on any background.
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
