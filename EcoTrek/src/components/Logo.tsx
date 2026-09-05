import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

// Use the finished circular badge rather than the old stretched ribbon mark.
// The asset has a transparent surround, so it stays crisp on light and dark
// surfaces alike.
const LOGO = require('../../assets/logo-polished.png');

/**
 * The EcoTrek mark — a circular emblem on a fresh spring-green to emerald
 * gradient, with a trail of cream footprints that become living leaves as
 * they climb. This is the app's face: it greets people on the intro and
 * sign-in screens, matching the installed app icon.
 *
 * The source file is a square circular badge with a transparent surround,
 * so it sits cleanly on any surface.
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
