import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { useTheme } from '../context/ThemeContext';

/**
 * The illustration on the Start tab.
 *
 * Drawn rather than photographed: it is a few hundred bytes of vectors, it
 * recolours itself for light, dark and sky themes, and it stays sharp at any
 * size — which a stock photo of a park would not. The point is to fill the
 * screen with something calm instead of another paragraph of text.
 *
 * The canvas is portrait (320 × 420) because that is the shape of the space
 * left above the Start button on a phone; `slice` then crops the sky rather
 * than squashing the hills.
 */
export default function TrailScene({
  mode = 'hike',
  style,
}: {
  mode?: 'hike' | 'bike';
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, appearance } = useTheme();
  const night = appearance === 'dark';

  const skyTop = night ? '#101F33' : colors.infoLight;
  const skyBottom = night ? '#17301F' : colors.primarySurface;
  const sunColor = night ? '#DCE6F0' : colors.accent;
  const hillBack = night ? '#1E3729' : colors.primaryGlow;
  const hillMid = night ? '#204531' : colors.primaryLight;
  const hillFront = night ? '#183226' : colors.primaryMid;
  const trailColor = night ? '#3A4E44' : '#F2E6C6';
  const treeDark = night ? '#0C2016' : colors.primaryDark;
  const treeLight = night ? '#173125' : colors.primary;
  const packColor = colors.accent;

  return (
    <View style={[{ width: '100%', flex: 1, minHeight: 150 }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 320 420" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="ecotrek-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={skyTop} />
            <Stop offset="1" stopColor={skyBottom} />
          </LinearGradient>
        </Defs>

        {/* Sky */}
        <Rect x="0" y="0" width="320" height="420" fill="url(#ecotrek-sky)" />

        {/* Sun, or a moon after dark */}
        <Circle cx="242" cy="76" r="30" fill={sunColor} opacity={night ? 0.85 : 0.95} />
        {night ? <Circle cx="230" cy="66" r="27" fill={skyTop} /> : null}

        {/* Clouds */}
        <G opacity={night ? 0.16 : 0.45}>
          <Ellipse cx="72" cy="72" rx="34" ry="13" fill="#FFFFFF" />
          <Ellipse cx="98" cy="64" rx="22" ry="11" fill="#FFFFFF" />
          <Ellipse cx="176" cy="126" rx="26" ry="9" fill="#FFFFFF" />
        </G>

        {/* Two birds, because an empty sky looks like a loading state */}
        <G stroke={treeDark} strokeWidth="1.8" fill="none" opacity={night ? 0.25 : 0.4} strokeLinecap="round">
          <Path d="M58 150 q6 -5 11 0 q5 -5 11 0" />
          <Path d="M92 176 q4.5 -4 8 0 q3.5 -4 8 0" />
        </G>

        {/* Far hills */}
        <Path
          d="M0 250 Q54 210 110 244 Q152 268 196 238 Q250 200 320 246 L320 420 L0 420 Z"
          fill={hillBack}
        />
        {/* Middle hills */}
        <Path
          d="M0 286 Q62 252 124 282 Q186 312 244 278 Q288 252 320 280 L320 420 L0 420 Z"
          fill={hillMid}
        />

        {/* The trail, widening toward you */}
        <Path
          d="M152 268 C146 316 122 344 92 420 L232 420 C204 344 178 316 170 268 Z"
          fill={trailColor}
          opacity={night ? 0.5 : 0.92}
        />

        {/* Foreground banks either side of the trail */}
        <Path d="M0 336 Q40 316 82 340 Q104 352 96 420 L0 420 Z" fill={hillFront} />
        <Path d="M320 330 Q276 312 236 338 Q214 352 226 420 L320 420 Z" fill={hillFront} />

        {/* Trees — bigger in front, smaller toward the horizon */}
        <Tree x={38} y={352} scale={1.5} dark={treeDark} light={treeLight} />
        <Tree x={78} y={372} scale={1.15} dark={treeDark} light={treeLight} />
        <Tree x={266} y={356} scale={1.4} dark={treeDark} light={treeLight} />
        <Tree x={300} y={382} scale={1.1} dark={treeDark} light={treeLight} />
        <Tree x={214} y={288} scale={0.75} dark={treeDark} light={treeLight} />
        <Tree x={104} y={280} scale={0.62} dark={treeDark} light={treeLight} />
        <Tree x={192} y={268} scale={0.45} dark={treeDark} light={treeLight} />

        {/* Someone on the trail, heading out */}
        {mode === 'bike' ? (
          <G>
            <Circle cx="140" cy="348" r="13" fill="none" stroke={treeDark} strokeWidth="3.6" />
            <Circle cx="176" cy="348" r="13" fill="none" stroke={treeDark} strokeWidth="3.6" />
            <Path
              d="M140 348 L158 328 L176 348 M158 328 L150 348 M158 328 L166 320"
              stroke={treeDark}
              strokeWidth="3.4"
              fill="none"
              strokeLinecap="round"
            />
            <Path d="M151 312 Q158 306 165 312 L167 330 Q158 334 149 330 Z" fill={treeDark} />
            <Circle cx="158" cy="300" r="8" fill={treeDark} />
            <Path d="M152 316 q-4 6 0 10" stroke={treeDark} strokeWidth="4" fill="none" strokeLinecap="round" />
            <Path d="M164 316 q5 5 2 10" stroke={treeDark} strokeWidth="4" fill="none" strokeLinecap="round" />
            <Rect x="152" y="313" width="12" height="13" rx="4" fill={packColor} />
          </G>
        ) : (
          <G>
            <Circle cx="156" cy="296" r="7.5" fill={treeDark} />
            <Path d="M148 308 Q156 303 164 308 L166 330 Q156 335 146 330 Z" fill={treeDark} />
            <Path d="M163 310 q9 6 7 16" stroke={treeDark} strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <Path d="M149 310 q-9 5 -8 15" stroke={treeDark} strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <Path d="M151 332 l-6 20" stroke={treeDark} strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <Path d="M161 332 l7 19" stroke={treeDark} strokeWidth="5.5" strokeLinecap="round" fill="none" />
            <Rect x="150" y="309" width="12" height="14" rx="4" fill={packColor} />
          </G>
        )}
      </Svg>
    </View>
  );
}

function Tree({
  x,
  y,
  scale,
  dark,
  light,
}: {
  x: number;
  y: number;
  scale: number;
  dark: string;
  light: string;
}) {
  const h = 34 * scale;
  const w = 21 * scale;
  return (
    <G>
      <Rect x={x - 1.7 * scale} y={y} width={3.4 * scale} height={10 * scale} fill={dark} rx={1} />
      <Path d={`M${x} ${y - h} L${x + w / 2} ${y} L${x - w / 2} ${y} Z`} fill={light} />
      <Path d={`M${x} ${y - h} L${x + w / 2} ${y} L${x} ${y} Z`} fill={dark} opacity={0.32} />
    </G>
  );
}
