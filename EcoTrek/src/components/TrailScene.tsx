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
 * Walk: a dirt trail through trees with a person walking.
 * Bike: the same kind of trail, with a person actually riding.
 *
 * The scene is laid out on a landscape viewBox (320x230) and anchored to the
 * BOTTOM with preserveAspectRatio="xMidYMax slice". The hero container on the
 * Start tab is wide and fairly short, and a tall viewBox used to scale up
 * until the walker was chopped off at the knees. Now the ground always sits
 * on the container's bottom edge — extra space crops harmless sky off the
 * top, and the person on the trail stays fully visible on every screen size.
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
  const trailColor = night ? '#3A4E44' : '#E8D4A8';
  const trailEdge = night ? '#2A3C34' : '#D4BE8A';
  const treeDark = night ? '#0C2016' : colors.primaryDark;
  const treeLight = night ? '#173125' : colors.primary;
  const packColor = colors.accent;
  const rock = night ? '#2C3A34' : '#C4B89A';

  return (
    <View style={[{ width: '100%', flex: 1, minHeight: 150 }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 320 230" preserveAspectRatio="xMidYMax slice">
        <Defs>
          <LinearGradient id="ecotrek-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={skyTop} />
            <Stop offset="1" stopColor={skyBottom} />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="320" height="230" fill="url(#ecotrek-sky)" />

        {/* Sun (day) / crescent moon (night) */}
        <Circle cx="256" cy="44" r="23" fill={sunColor} opacity={night ? 0.85 : 0.95} />
        {night ? <Circle cx="247" cy="37" r="20" fill={skyTop} /> : null}

        <G opacity={night ? 0.16 : 0.45}>
          <Ellipse cx="64" cy="34" rx="30" ry="11" fill="#FFFFFF" />
          <Ellipse cx="92" cy="27" rx="19" ry="9" fill="#FFFFFF" />
          <Ellipse cx="170" cy="58" rx="22" ry="8" fill="#FFFFFF" />
        </G>

        <G stroke={treeDark} strokeWidth="1.8" fill="none" opacity={night ? 0.25 : 0.4} strokeLinecap="round">
          <Path d="M120 34 q6 -5 11 0 q5 -5 11 0" />
          <Path d="M160 46 q4.5 -4 8 0 q3.5 -4 8 0" />
        </G>

        {/*
          Everything below was drawn on the old 320x420 canvas with the ground
          at y=420. Shifting it up 190 puts the ground exactly on the bottom
          edge of this canvas, so nothing at trail level can be cropped.
        */}
        <G transform="translate(0,-190)">
          <Path
            d="M0 250 Q54 210 110 244 Q152 268 196 238 Q250 200 320 246 L320 420 L0 420 Z"
            fill={hillBack}
          />
          <Path
            d="M0 286 Q62 252 124 282 Q186 312 244 278 Q288 252 320 280 L320 420 L0 420 Z"
            fill={hillMid}
          />

          {/* Winding dirt trail, widening toward you */}
          <Path
            d="M158 262 C148 300 138 330 88 420 L236 420 C186 330 176 300 168 262 Z"
            fill={trailColor}
            opacity={night ? 0.55 : 0.95}
          />
          <Path
            d="M160 268 C152 304 142 334 108 410"
            stroke={trailEdge}
            strokeWidth="2.2"
            fill="none"
            opacity={0.55}
            strokeDasharray="8 10"
            strokeLinecap="round"
          />

          <Path d="M0 336 Q40 316 82 340 Q104 352 96 420 L0 420 Z" fill={hillFront} />
          <Path d="M320 330 Q276 312 236 338 Q214 352 226 420 L320 420 Z" fill={hillFront} />

          {/* Stones along the path */}
          <Ellipse cx="118" cy="392" rx="10" ry="5" fill={rock} opacity={0.7} />
          <Ellipse cx="210" cy="386" rx="8" ry="4" fill={rock} opacity={0.65} />
          <Ellipse cx="148" cy="348" rx="6" ry="3" fill={rock} opacity={0.5} />

          <Tree x={38} y={352} scale={1.5} dark={treeDark} light={treeLight} />
          <Tree x={78} y={372} scale={1.15} dark={treeDark} light={treeLight} />
          <Tree x={266} y={356} scale={1.4} dark={treeDark} light={treeLight} />
          <Tree x={300} y={382} scale={1.1} dark={treeDark} light={treeLight} />
          <Tree x={214} y={288} scale={0.75} dark={treeDark} light={treeLight} />
          <Tree x={104} y={280} scale={0.62} dark={treeDark} light={treeLight} />
          <Tree x={192} y={268} scale={0.45} dark={treeDark} light={treeLight} />

          {mode === 'bike' ? (
            <G>
              <Circle cx="136" cy="352" r="14" fill="none" stroke={treeDark} strokeWidth="3.8" />
              <Circle cx="136" cy="352" r="3" fill={treeDark} />
              <Circle cx="178" cy="352" r="14" fill="none" stroke={treeDark} strokeWidth="3.8" />
              <Circle cx="178" cy="352" r="3" fill={treeDark} />
              <Path
                d="M136 352 L154 330 L178 352 M154 330 L148 352 M154 330 L168 322"
                stroke={treeDark}
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path d="M147 314 Q156 306 166 314 L168 332 Q156 338 146 332 Z" fill={treeDark} />
              <Circle cx="156" cy="300" r="8.5" fill={treeDark} />
              <Path d="M150 318 q-8 10 -2 16" stroke={treeDark} strokeWidth="4.2" fill="none" strokeLinecap="round" />
              <Path d="M164 318 q10 8 6 16" stroke={treeDark} strokeWidth="4.2" fill="none" strokeLinecap="round" />
              <Rect x="150" y="314" width="13" height="13" rx="4" fill={packColor} />
            </G>
          ) : (
            <G>
              <Circle cx="158" cy="292" r="8" fill={treeDark} />
              <Path d="M149 306 Q158 300 167 306 L169 330 Q158 336 147 330 Z" fill={treeDark} />
              <Path d="M165 308 q12 4 10 18" stroke={treeDark} strokeWidth="4.6" strokeLinecap="round" fill="none" />
              <Path d="M151 308 q-10 8 -6 16" stroke={treeDark} strokeWidth="4.6" strokeLinecap="round" fill="none" />
              {/* Stride: one foot forward, one back */}
              <Path d="M150 332 l-10 22" stroke={treeDark} strokeWidth="5.6" strokeLinecap="round" fill="none" />
              <Path d="M164 332 l12 18" stroke={treeDark} strokeWidth="5.6" strokeLinecap="round" fill="none" />
              <Rect x="152" y="308" width="12" height="14" rx="4" fill={packColor} />
            </G>
          )}
        </G>
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
