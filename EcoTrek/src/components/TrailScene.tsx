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

/** Far-side limbs read as "behind" with this muted green. */
const FAR_LIMB = '#5F7367';
/** Boots and shoes. */
const BOOT = '#2B3A32';
/** The sleeve on the far arm, a shade off the jacket for depth. */
const FAR_SLEEVE = '#11352A';
/** Darker accent for pack straps and the helmet band. */
const STRAP = '#C47A28';

/**
 * Hiker mid-stride, built from a few connected shapes:
 * one capsule stroke for the torso (which gives naturally rounded
 * shoulders and hips), jointed limb strokes that always start at the
 * shoulder/hip, small round hands at the sleeve ends, a short neck,
 * and a cap. No bare "skin" segments ever float free of the body.
 */
function Walker({ dark, pack, skin }: { dark: string; pack: string; skin: string }) {
  return (
    <G strokeLinecap="round" strokeLinejoin="round">
      <Ellipse cx="160" cy="352" rx="30" ry="3" fill={dark} opacity={0.12} />

      {/*
        Rear leg: hip → knee (bent sharply back, trailing) → toe pushing
        off the ground. The knee sits well off the straight hip-to-foot
        line so the bend actually reads instead of looking like one
        rigid stick.
      */}
      <Path d="M157 320 L144 328 L139 346" stroke={FAR_LIMB} strokeWidth="6.2" fill="none" />
      <Path d="M139 346 L130 350" stroke={BOOT} strokeWidth="5.2" fill="none" />

      {/* Front leg: hip → knee bent forward → foot planted ahead. */}
      <Path d="M160 320 L171 332 L168 350" stroke={dark} strokeWidth="6.2" fill="none" />
      <Path d="M168 350 L178 352" stroke={BOOT} strokeWidth="5.2" fill="none" />

      {/* Backpack sits snug behind the torso. */}
      <Rect x="142" y="301" width="11" height="19" rx="4.5" fill={pack} transform="rotate(6 147 310)" />
      <Path d="M150 304 L156 303 M150 316 L156 316" stroke={STRAP} strokeWidth="2" fill="none" />

      {/* Torso: a single capsule stroke — clean rounded shoulders. */}
      <Path d="M158.5 319 L160.5 302" stroke={dark} strokeWidth="13" fill="none" />

      {/* Back arm swings down and back; small hand at the sleeve end. */}
      <Path d="M159 304 L153 313 L150 321" stroke={FAR_SLEEVE} strokeWidth="5" fill="none" />
      <Circle cx="149.5" cy="323.5" r="2.7" fill={skin} />

      {/* Front arm swings forward with a bent elbow. */}
      <Path d="M162 304 L170 311 L176 307" stroke={dark} strokeWidth="5" fill="none" />
      <Circle cx="178" cy="305.5" r="2.7" fill={skin} />

      {/* Short neck, head, and a cap with a small front brim. */}
      <Path d="M161 299 L161.5 294" stroke={skin} strokeWidth="4.5" />
      <Circle cx="162" cy="289" r="7" fill={skin} />
      <Path
        d="M155 287.5 Q155.5 279.5 163 280.5 Q169.5 281.5 169.3 287 L173.5 288.2 Q169 290 165.5 289.4 Q159 288.6 155 287.5 Z"
        fill={dark}
      />
    </G>
  );
}

/**
 * Side-view cyclist: a clean diamond frame, saddle and bars, cranks with
 * both feet on opposite pedals, a leaning capsule torso, one visible hand
 * on the grip, and a snug helmet. Same construction rules as the walker —
 * every limb starts at a joint on the body.
 */
function Biker({ dark, pack, skin }: { dark: string; pack: string; skin: string }) {
  return (
    <G strokeLinecap="round" strokeLinejoin="round">
      <Ellipse cx="160" cy="373" rx="45" ry="4" fill={dark} opacity={0.12} />

      {/* Wheels with hubs. */}
      <Circle cx="131" cy="353" r="18" stroke={dark} strokeWidth="3" fill="none" />
      <Circle cx="187" cy="353" r="18" stroke={dark} strokeWidth="3" fill="none" />
      <Circle cx="131" cy="353" r="2.4" fill={dark} />
      <Circle cx="187" cy="353" r="2.4" fill={dark} />

      {/* Frame: rear triangle, top and down tubes, fork. */}
      <Path
        d="M131 353 L150 325 L157 353 Z M150 325 L176 325 M176 325 L157 353 M176 325 L187 353"
        stroke={pack}
        strokeWidth="3.2"
        fill="none"
      />

      {/* Seat post and saddle; head tube and handlebar. */}
      <Path d="M150 325 L148 317" stroke={pack} strokeWidth="3" fill="none" />
      <Path d="M143 316.5 L153 316.5" stroke={dark} strokeWidth="3.5" fill="none" />
      <Path d="M176 325 L173.5 313.5 L180 311.5" stroke={dark} strokeWidth="2.6" fill="none" />

      {/* Crank arms: one down to the near pedal, one up-back to the far pedal. */}
      <Path d="M157 353 L159 357 M157 353 L152 335" stroke={dark} strokeWidth="2.5" fill="none" />
      <Circle cx="157" cy="353" r="2.6" fill={dark} />

      {/*
        Far leg: hip → knee lifted up and forward → far pedal near the
        top of its stroke. The knee is pushed well clear of the hip-to-
        pedal line so the leg reads as folded/bent, not a straight rod
        floating behind the seat.
      */}
      <Path d="M150 318 L138 328 L152 335" stroke={FAR_LIMB} strokeWidth="5" fill="none" />
      <Path d="M152 335 L159 332" stroke={BOOT} strokeWidth="4" fill="none" />

      {/* Torso: capsule leaning toward the bars. */}
      <Path d="M150 317 L164 302" stroke={dark} strokeWidth="11" fill="none" />

      {/* Near leg: hip → knee → pedal near the bottom of its stroke, extended but still visibly jointed at the knee. */}
      <Path d="M152 318 L160 337 L159 357" stroke={dark} strokeWidth="5.5" fill="none" />
      <Path d="M159 357 L166 359" stroke={BOOT} strokeWidth="4" fill="none" />

      {/* Arm reaching the handlebar; the hand rests on the grip. */}
      <Path d="M163.5 303.5 L170 309 L176 311" stroke={FAR_SLEEVE} strokeWidth="4.6" fill="none" />
      <Circle cx="179.3" cy="311.6" r="2.7" fill={skin} />

      {/* Short neck, head, snug helmet with a band. */}
      <Path d="M166 300 L167.5 295.5" stroke={skin} strokeWidth="4.2" />
      <Circle cx="168.5" cy="290.5" r="6.6" fill={skin} />
      <Path d="M161.8 289.6 A6.8 6.8 0 0 1 175.2 289.6 L173.8 290.2 L163 290.1 Z" fill={pack} />
      <Path d="M163 286.2 L174.2 286.2" stroke={STRAP} strokeWidth="1.3" />
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
