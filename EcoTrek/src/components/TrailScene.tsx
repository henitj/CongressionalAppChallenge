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

/** Full scene is fitted without cropping the walker or bicycle. */
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
  const skinColor = '#F1C49A';
  const rock = night ? '#2C3A34' : '#C4B89A';

  return (
    <View style={[{ width: '100%', flex: 1, minHeight: 150 }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 320 230" preserveAspectRatio="xMidYMid meet">
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

          {mode === 'bike' ? <Biker dark={treeDark} pack={packColor} skin={skinColor} /> : <Walker dark={treeDark} pack={packColor} skin={skinColor} />}
        </G>
      </Svg>
    </View>
  );
}

/**
 * Hiker mid-stride. The walker has two distinct, anatomically natural legs
 * that swing in opposite directions — front leg reaching forward into the next step,
 * rear leg extending naturally back with toe pushing off forward — plus a clear
 * torso, head, hat, arms, and a small backpack.
 */
function Walker({ dark, pack, skin }: { dark: string; pack: string; skin: string }) {
  return (
    <G strokeLinecap="round" strokeLinejoin="round">
      <Ellipse cx="157" cy="356" rx="28" ry="3" fill={dark} opacity={0.12} />
      {/* Rear leg extends naturally back; front leg reaches into the next step. */}
      <Path d="M152 326 L141 338 L132 348 L139 352" stroke="#60766B" strokeWidth="5.5" fill="none" />
      <Path d="M158 327 L170 339 L176 352 L184 352" stroke={dark} strokeWidth="5.5" fill="none" />
      <Rect x="143" y="303" width="12" height="20" rx="4" fill={pack} />
      {/* Jacket and two matching sleeves; hands begin only at the wrists. */}
      <Path d="M154 300 Q163 299 167 306 L161 329 Q156 333 149 327 L150 307 Z" fill={dark} />
      <Path d="M159 307 L170 317" stroke={dark} strokeWidth="6" fill="none" />
      <Path d="M170 317 L180 315" stroke={skin} strokeWidth="4" fill="none" />
      <Path d="M152 308 L143 319" stroke={dark} strokeWidth="6" fill="none" />
      <Path d="M143 319 L139 331" stroke={skin} strokeWidth="4" fill="none" />
      <Path d="M161 298 L159 304" stroke={skin} strokeWidth="4" />
      <Circle cx="163" cy="292" r="7.5" fill={skin} />
      <Path d="M155 291 Q156 281 165 284 Q171 286 171 291 L175 292 Z" fill={dark} />
    </G>
  );
}

/** Side-view bicycle with two frame triangles and feet on opposite pedals. */
function Biker({ dark, pack, skin }: { dark: string; pack: string; skin: string }) {
  return (
    <G strokeLinecap="round" strokeLinejoin="round">
      <Ellipse cx="160" cy="373" rx="45" ry="4" fill={dark} opacity={0.12} />
      <Circle cx="131" cy="353" r="18" stroke={dark} strokeWidth="3" fill="none" />
      <Circle cx="187" cy="353" r="18" stroke={dark} strokeWidth="3" fill="none" />
      <Path d="M131 353 L146 327 L157 353 Z M146 327 L177 327 L157 353 M177 320 L187 353"
        stroke={pack} strokeWidth="3.2" fill="none" />
      <Path d="M146 327 L143 320 M138 320 L150 320 M177 327 L175 315 L184 315"
        stroke={dark} strokeWidth="3" fill="none" />
      <Path d="M145 320 L138 339 L151 348" stroke="#60766B" strokeWidth="5" fill="none" />
      <Path d="M143 320 L156 299 Q163 299 168 306 L152 325 Z" fill={dark} />
      {/* Long jersey sleeve plus a short exposed hand at the handlebar. */}
      <Path d="M160 305 L174 318" stroke={dark} strokeWidth="6" fill="none" />
      <Path d="M174 318 L180 315" stroke={skin} strokeWidth="4" fill="none" />
      <Path d="M150 322 L167 333 L163 358" stroke={dark} strokeWidth="5" fill="none" />
      <Path d="M158 358 L168 358 M146 348 L156 348" stroke={dark} strokeWidth="3" fill="none" />
      <Path d="M151 348 L163 358" stroke={pack} strokeWidth="2" />
      <Circle cx="169" cy="292" r="7" fill={skin} />
      <Path d="M162 292 Q162 281 171 284 Q179 286 177 293 Z" fill={pack} />
      <Path d="M166 298 L162 305" stroke={skin} strokeWidth="4" />
      <Path d="M146 305 L152 297 Q155 295 158 299 L154 309 Z" fill={pack} />
    </G>
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
