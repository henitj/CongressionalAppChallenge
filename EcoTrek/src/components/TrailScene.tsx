import React, { useId, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

const HIKER = require('../../assets/hiker.png');
const BIKER = require('../../assets/biker.png');

/** Instant, clearly-labelled illustration, not a photograph of this trail.
 * Reuses the user's approved character art; no photo search or old stick figures. */
export default function TrailScene({ mode = 'hike', style }: { mode?: 'hike' | 'bike'; style?: StyleProp<ViewStyle> }) {
  const { colors, appearance } = useTheme();
  const night = appearance === 'dark';
  const [height, setHeight] = useState(132);
  const id = `trail-sky-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const figureHeight = Math.min(165, height * 0.82);
  const figureWidth = figureHeight * (mode === 'bike' ? 0.956 : 0.516);
  const dark = night ? '#183A2B' : '#628C72';
  const light = night ? '#234B38' : '#98B6A0';
  return (
    <View testID="trail-illustration" onLayout={(event) => setHeight(event.nativeEvent.layout.height)} style={[{ width: '100%', minHeight: 150, flexGrow: 1, flexShrink: 0 }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 480 220" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={night ? '#183339' : colors.infoLight} /><Stop offset="1" stopColor={night ? '#294638' : colors.primarySurface} /></LinearGradient></Defs>
        <Rect width="480" height="220" fill={`url(#${id})`} />
        <Circle cx="392" cy="42" r="18" fill={night ? '#D9E5D7' : '#F4E7BD'} opacity={0.9} />
        <Path d="M0 103Q91 63 179 99T339 88Q425 60 480 89V220H0Z" fill={light} opacity={0.4} />
        <Path d="M0 145Q99 112 202 137T373 131Q442 122 480 139V220H0Z" fill={light} opacity={0.8} />
        <Path d="M254 131Q213 174 145 220H324Q272 172 263 131Z" fill={night ? '#758374' : '#DFD7B8'} />
        <Path d="M0 177Q67 149 125 174L184 220H0ZM480 175Q420 146 363 180L311 220H480Z" fill={dark} opacity={0.58} />
        {[{ x: 82, y: 175, scale: 0.9 }, { x: 126, y: 145, scale: 0.65 }, { x: 367, y: 164, scale: 0.8 }, { x: 413, y: 183, scale: 1.05 }].map((tree, i) => <G key={i} transform={`translate(${tree.x} ${tree.y}) scale(${tree.scale})`} opacity={0.68}><Path d="M0 0V-46" stroke={dark} strokeWidth="4" /><Path d="M-17-26 0-66 18-26ZM-22-9 0-48 23-9Z" fill={dark} /></G>)}
        <Ellipse cx="240" cy="207" rx={mode === 'bike' ? 48 : 27} ry="5" fill={night ? '#0A2716' : '#5F795E'} opacity={0.18} />
      </Svg>
      <Image source={mode === 'bike' ? BIKER : HIKER} resizeMode="contain" accessibilityLabel={`${mode === 'bike' ? 'Cyclist' : 'Hiker'} illustration`} style={{ position: 'absolute', bottom: Math.max(7, height * 0.065), left: '50%', width: figureWidth, height: figureHeight, transform: [{ translateX: -figureWidth / 2 }] }} />
    </View>
  );
}
