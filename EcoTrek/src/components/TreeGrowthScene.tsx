import React, { useContext, useEffect, useId, useRef, useState } from 'react';
import { Animated, AppState, Easing, Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { TREE_STAGES, MATURE_IMAGE, TREE_IMAGE_COUNT, type CareKind, type TreeStage } from '../constants/treeGrowth';
import { stageForImage, seasonalTreeBehavior, treeSeason, type TreeSeason } from '../services/treeGrowth';

import { treeImage } from '../constants/treeImages';

export type TreeCareEffect = { kind: CareKind; nonce: number };
const LEAF = 'M2 7Q4 0 13 2Q13 10 5 11Q1 11 2 7Z';
// Fixed placement keeps the grove stable across care updates and rerenders.
const GROVE = [
  { x: -0.07, bottom: 0.26, size: 0.45, frame: 91, opacity: 0.24 },
  { x: 0.14, bottom: 0.29, size: 0.31, frame: 83, opacity: 0.17 },
  { x: 0.70, bottom: 0.28, size: 0.36, frame: 96, opacity: 0.20 },
  { x: 0.88, bottom: 0.22, size: 0.48, frame: 88, opacity: 0.30 },
] as const;
const COLORS = ['#B87935', '#D59D45', '#BC633D', '#D5AD52'];

/** 100 geometry-grown, ray-traced images of one consistent apple tree.
 * Seasons follow the calendar, not live weather. Only adult trees shed leaves. */
export default function TreeGrowthScene({ stageId, imageIndex, season = treeSeason(), isFullyGrown, careEffect, style, ambient = true }: {
  stageId?: TreeStage['id'];
  imageIndex?: number;
  progress?: number;
  season?: TreeSeason;
  isFullyGrown?: boolean;
  careEffect?: TreeCareEffect | null;
  style?: StyleProp<ViewStyle>;
  ambient?: boolean;
}) {
  const { appearance, motionEnabled } = useTheme();
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(navigation?.isFocused() ?? true);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [layout, setLayout] = useState({ width: 360, height: 322 });
  const night = appearance === 'dark';
  const milestone = TREE_STAGES.find((item) => item.id === stageId) ?? TREE_STAGES[0];
  const frame = Math.max(0, Math.min(TREE_IMAGE_COUNT - 1, Math.floor(imageIndex ?? milestone.firstImage)));
  const stage = stageForImage(frame);
  const mature = isFullyGrown ?? frame >= MATURE_IMAGE;
  const behavior = seasonalTreeBehavior(season, mature);
  const art = treeImage(frame, season, mature);
  const id = `grove-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const sway = useRef(new Animated.Value(0)).current;
  const seasonClock = useRef(new Animated.Value(0)).current;
  const effect = useRef(new Animated.Value(1)).current;
  const moving = ambient && motionEnabled && focused && foreground;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    const focus = navigation?.addListener('focus', () => setFocused(true));
    const blur = navigation?.addListener('blur', () => setFocused(false));
    return () => { sub.remove(); focus?.(); blur?.(); };
  }, [navigation]);
  useEffect(() => {
    if (!moving) { sway.setValue(0); seasonClock.setValue(0); return; }
    const breeze = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(sway, { toValue: -1, duration: 4800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    breeze.start();
    const cycle = Animated.loop(Animated.timing(seasonClock, { toValue: 1, duration: behavior.snow ? 12000 : 8500, easing: Easing.linear, useNativeDriver: true }));
    if (behavior.snow || behavior.fallingLeaves) cycle.start();
    return () => { breeze.stop(); cycle.stop(); };
  }, [moving, behavior.snow, behavior.fallingLeaves, sway, seasonClock]);
  useEffect(() => {
    if (!careEffect || !motionEnabled) { effect.setValue(1); return; }
    effect.setValue(0);
    const animation = Animated.timing(effect, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [careEffect, effect, motionEnabled]);

  const h = Math.min(layout.height * (0.24 + frame / 99 * 0.69), layout.height * 0.925, layout.width * 1.01);
  const rootBottom = layout.height * 0.115;
  const sky = behavior.snow ? night ? '#233743' : '#EAF1F4' : season === 'fall' ? night ? '#303A31' : '#F4EFE0' : night ? '#21372E' : '#EEF3E6';
  const ground = behavior.snow ? night ? '#8DADB8' : '#E0E9EA' : season === 'fall' ? night ? '#45503B' : '#DBD9BC' : night ? '#375440' : '#CDDCBB';
  const glow = behavior.snow ? '#F5FBFF' : '#FFF5CF';

  return (
    <View onLayout={(event) => setLayout(event.nativeEvent.layout)} style={[styles.scene, { backgroundColor: sky }, style]} accessible accessibilityRole="image" accessibilityLabel={`${stage.name}, ${season} scenery${behavior.fallingLeaves ? ', falling autumn leaves' : ''}${behavior.snow ? ', seasonal snow' : ''}`} testID="tree-growth-scene">
      <Svg width="100%" height="100%" viewBox="0 0 480 400" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={sky} /><Stop offset="1" stopColor={night ? '#344536' : '#F9F6EB'} /></LinearGradient>
          <RadialGradient id={`${id}-glow`} cx="72%" cy="22%" r="57%"><Stop offset="0" stopColor={glow} stopOpacity={night ? 0.12 : 0.65} /><Stop offset="1" stopColor={glow} stopOpacity={0} /></RadialGradient>
          <LinearGradient id={`${id}-acorn`} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#7C4B29" /><Stop offset="0.4" stopColor="#B98B58" /><Stop offset="1" stopColor="#82532D" /></LinearGradient>
        </Defs>
        <Rect width="480" height="400" fill={`url(#${id}-sky)`} /><Rect width="480" height="400" fill={`url(#${id}-glow)`} />
        <Circle cx="397" cy="65" r="18" fill={night ? '#DFE7D6' : glow} opacity={0.7} />
        <Path d="M0 292Q90 251 178 286T350 276Q425 249 480 284V400H0Z" fill={ground} opacity={0.38} />
        <Path d="M0 334Q110 299 208 326T389 313Q441 311 480 328V400H0Z" fill={ground} opacity={0.6} />
        <Ellipse cx="240" cy="359" rx={32 + stage.heightRatio * 48} ry="8" fill={night ? '#122619' : '#7B8960'} opacity={0.15} />
        <Path d="M153 360Q170 340 240 343Q308 340 327 360Q283 379 240 377Q195 379 153 360Z" fill={behavior.snow ? night ? '#CBDADF' : '#FDFEFC' : night ? '#454535' : '#CFBF9E'} opacity={0.88} />
        {!behavior.snow && <Path d="M190 357q-2-8-8-11m8 11q3-9 8-12M279 357q2-11 8-15m-8 15q-4-6-8-7" stroke={night ? '#7E9264' : '#8B9D6C'} strokeWidth="1.2" fill="none" />}
      </Svg>
      <View pointerEvents="none" accessible={false} testID="tree-background-grove" style={StyleSheet.absoluteFill}>
        {GROVE.map((tree, index) => <Image key={index} testID="grove-tree" source={treeImage(tree.frame, season, true)} resizeMode="contain" accessibilityIgnoresInvertColors style={{ position: 'absolute', left: layout.width * tree.x - layout.height * tree.size / 2, bottom: layout.height * tree.bottom, width: layout.height * tree.size, height: layout.height * tree.size, opacity: tree.opacity * (night ? 0.7 : 1) }} />)}
      </View>
      <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 480 400" preserveAspectRatio="none" style={StyleSheet.absoluteFill} testID="tree-ground-details">
        {/* A soft contact shadow anchors the growing tree in its soil. */}
        <Ellipse cx="240" cy="359" rx={18 + frame * 0.45} ry="5" fill={night ? '#14291D' : '#5C6245'} opacity={0.18} />
        {[{ x: 116, y: 354, r: 5 }, { x: 344, y: 366, r: 7 }, { x: 302, y: 350, r: 3 }, { x: 168, y: 377, r: 4 }].map((stone, i) => <React.Fragment key={i}>
          <Ellipse cx={stone.x + 2} cy={stone.y + 2} rx={stone.r + 2} ry="2" fill="#263C2A" opacity={0.12} />
          <Ellipse cx={stone.x} cy={stone.y} rx={stone.r} ry={stone.r * 0.48} fill={behavior.snow ? '#F8FCFD' : night ? '#7F8981' : '#AAA99A'} />
          <Path d={`M${stone.x - stone.r * 0.5} ${stone.y - 1}q${stone.r * 0.5} -2 ${stone.r} 0`} stroke={behavior.snow ? '#FFFFFF' : '#D1CEBC'} strokeWidth="0.8" fill="none" />
        </React.Fragment>)}
        {!behavior.snow && Array.from({ length: 22 }, (_, i) => {
          const x = 18 + (i * 79) % 445, y = 342 + (i * 17) % 53, height = 4 + i % 6;
          return <Path key={i} d={`M${x} ${y}q-1 -${height} -4 -${height + 2}m4 ${height + 2}q2 -${height + 3} 5 -${height + 4}m-5 ${height + 4}v-${height + 1}`} stroke={night ? '#718567' : season === 'fall' ? '#A49A62' : '#81965D'} strokeWidth="1" opacity={0.65} fill="none" />;
        })}
        {season === 'fall' && Array.from({ length: 12 }, (_, i) => <Path key={i} d={LEAF} transform={`translate(${36 + i * 36} ${365 + (i * 13) % 27}) rotate(${i * 37}) scale(0.5)`} fill={COLORS[i % COLORS.length]} opacity={0.65} />)}
      </Svg>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: (layout.width - h) / 2, bottom: rootBottom - h * 0.05, width: h, height: h, transformOrigin: '50% 95%', transform: [{ rotate: sway.interpolate({ inputRange: [-1, 1], outputRange: ['-0.28deg', '0.28deg'] }) }] }}>
        <Image source={art} resizeMode="contain" testID="tree-growth-image" style={{ width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
      </Animated.View>

      {(behavior.fallingLeaves || behavior.snow) && <View pointerEvents="none" style={StyleSheet.absoluteFill} testID={behavior.snow ? 'winter-snow' : 'autumn-leaves'}>
        {Array.from({ length: behavior.snow ? 12 : 8 }, (_, i) => {
          const phase = Animated.modulo(Animated.add(seasonClock, i * 0.137), 1);
          const x = behavior.snow ? (i * 67 + 19) % Math.max(1, layout.width) : layout.width * (0.22 + (i * 0.079) % 0.55);
          return <Animated.View key={i} style={{ position: 'absolute', left: x, top: behavior.snow ? 0 : layout.height * 0.2, width: 16, height: 16,
            opacity: moving ? phase.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.75, 0.7, 0] }) : 0.6,
            transform: [{ translateY: moving ? phase.interpolate({ inputRange: [0, 1], outputRange: [-16, layout.height * (behavior.snow ? 0.91 : 0.67)] }) : layout.height * (behavior.snow ? 0.7 : 0.69) },
              { translateX: moving ? phase.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [0, 16, -8, 26] }) : 0 },
              { rotate: moving ? phase.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '250deg'] }) : `${i * 29}deg` }],
          }}>
            <Svg width="16" height="16" viewBox="0 0 16 16">{behavior.snow ? <Circle cx="8" cy="8" r={i % 3 + 1} fill={night ? '#ECF7FC' : '#FFFFFF'} /> : <><Path d={LEAF} fill={COLORS[i % 4]} /><Path d="M2 12 11 4" stroke="#8A603A" strokeWidth="0.65" /></>}</Svg>
          </Animated.View>;
        })}
      </View>}
      {careEffect && motionEnabled && <Animated.View pointerEvents="none" testID="tree-care-effect" style={[StyleSheet.absoluteFill, { opacity: effect.interpolate({ inputRange: [0, 0.25, 0.7, 1], outputRange: [0, 0.9, 0.6, 0] }), transform: [{ translateY: effect.interpolate({ inputRange: [0, 1], outputRange: [careEffect.kind === 'water' ? -18 : 12, 0] }) }] }]}>
        <Svg width="100%" height="100%" viewBox="0 0 480 400" preserveAspectRatio="none">
          {careEffect.kind === 'water' ? Array.from({ length: 9 }, (_, i) => <Path key={i} d={`M${188 + (i * 13) % 100} ${254 + i * 8}q-7 11 0 15q7-4 0-15Z`} fill="#699AB4" opacity={0.6} />) : careEffect.kind === 'sun' ? <Circle cx="397" cy="65" r="41" fill="#EDCF8E" opacity={0.32} /> : <Ellipse cx="240" cy="359" rx="62" ry="12" fill="#A3B874" opacity={0.45} />}
        </Svg>
      </Animated.View>}
    </View>
  );
}
const styles = StyleSheet.create({ scene: { width: '100%', aspectRatio: 1.12, minHeight: 240, maxHeight: 430, overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24 } });
