import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '../context/ThemeContext';
import { TreeStage } from '../constants/treeGrowth';

/**
 * The tree, drawn fresh at every stage. Not a single image with opacity
 * tricks — each stage gets its own trunk height, canopy size and little
 * extras (blossoms, fruit) so growth actually reads as growth.
 */
export default function TreeGrowthScene({
  stageId,
  style,
}: {
  stageId: TreeStage['id'];
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, appearance } = useTheme();
  const night = appearance === 'dark';

  const skyTop = night ? '#101F33' : colors.infoLight;
  const skyBottom = night ? '#17301F' : colors.primarySurface;
  const sunColor = night ? '#DCE6F0' : colors.accent;
  const soilDark = night ? '#2A2016' : '#6B4A2F';
  const soilLight = night ? '#3A2C1C' : '#8C6239';
  const trunkColor = night ? '#4A3220' : '#8A5A34';
  const trunkDark = night ? '#352417' : '#6B4426';
  const leafDark = night ? '#123A22' : colors.primaryDark;
  const leafMid = night ? '#1C5533' : colors.primary;
  const leafLight = night ? '#277043' : colors.primaryLight;

  const cx = 160; // horizontal center
  const groundY = 196;

  // Geometry per stage — small, deliberate jumps so each stage is visibly
  // bigger than the last.
  const g = (() => {
    switch (stageId) {
      case 'seed':
        return { trunkH: 0, trunkW: 0, canopy: 0, mound: true, seedVisible: true };
      case 'sprout':
        return { trunkH: 22, trunkW: 5, canopy: 16, mound: false, leaves: 2 };
      case 'sapling':
        return { trunkH: 42, trunkW: 7, canopy: 30, mound: false, leaves: 0 };
      case 'young':
        return { trunkH: 64, trunkW: 10, canopy: 46, mound: false, leaves: 0 };
      case 'mature':
        return { trunkH: 84, trunkW: 14, canopy: 60, mound: false, leaves: 0, fruit: 0 };
      case 'flourishing':
        return { trunkH: 92, trunkW: 16, canopy: 70, mound: false, leaves: 0, fruit: 6, blossoms: 10 };
      default:
        return { trunkH: 0, trunkW: 0, canopy: 0, mound: true, seedVisible: true };
    }
  })();

  const trunkTopY = groundY - (g.trunkH ?? 0);
  const canopyR = g.canopy ?? 0;

  return (
    <View style={[{ width: '100%', aspectRatio: 1.35, minHeight: 170 }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 320 240" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id="tg-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={skyTop} />
            <Stop offset="1" stopColor={skyBottom} />
          </LinearGradient>
          <RadialGradient id="tg-canopy" cx="35%" cy="30%" r="75%">
            <Stop offset="0" stopColor={leafLight} />
            <Stop offset="0.6" stopColor={leafMid} />
            <Stop offset="1" stopColor={leafDark} />
          </RadialGradient>
          <LinearGradient id="tg-trunk" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={trunkDark} />
            <Stop offset="0.5" stopColor={trunkColor} />
            <Stop offset="1" stopColor={trunkDark} />
          </LinearGradient>
          <LinearGradient id="tg-soil" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={soilLight} />
            <Stop offset="1" stopColor={soilDark} />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="320" height="240" fill="url(#tg-sky)" />
        <Circle cx="258" cy="42" r="22" fill={sunColor} opacity={night ? 0.8 : 0.9} />

        {/* Ground */}
        <Path d={`M0 ${groundY + 2} Q160 ${groundY - 10} 320 ${groundY + 2} V240 H0 Z`} fill="url(#tg-soil)" />
        <Path
          d={`M0 ${groundY + 2} Q160 ${groundY - 10} 320 ${groundY + 2}`}
          stroke={night ? '#4C3A26' : '#A9824F'}
          strokeWidth={3}
          fill="none"
          opacity={0.6}
        />

        {/* Seed / soil mound */}
        {g.mound ? (
          <G>
            <Ellipse cx={cx} cy={groundY - 4} rx={26} ry={10} fill="url(#tg-soil)" opacity={0.9} />
            {g.seedVisible ? (
              <Ellipse cx={cx} cy={groundY - 9} rx={7} ry={9} fill={trunkColor} stroke={trunkDark} strokeWidth={1.5} />
            ) : null}
          </G>
        ) : null}

        {/* Trunk */}
        {g.trunkH ? (
          <Path
            d={`M${cx - g.trunkW / 2} ${groundY} L${cx - g.trunkW / 2.6} ${trunkTopY} Q${cx} ${trunkTopY - 6} ${cx + g.trunkW / 2.6} ${trunkTopY} L${cx + g.trunkW / 2} ${groundY} Z`}
            fill="url(#tg-trunk)"
          />
        ) : null}

        {/* Sprout's two baby leaves instead of a full canopy */}
        {stageId === 'sprout' ? (
          <G>
            <Ellipse cx={cx - 10} cy={trunkTopY + 2} rx={11} ry={6} fill="url(#tg-canopy)" transform={`rotate(-25 ${cx - 10} ${trunkTopY + 2})`} />
            <Ellipse cx={cx + 10} cy={trunkTopY + 2} rx={11} ry={6} fill="url(#tg-canopy)" transform={`rotate(25 ${cx + 10} ${trunkTopY + 2})`} />
          </G>
        ) : null}

        {/* Full canopy for sapling and up — three overlapping puffs read as "cartoon tree" */}
        {canopyR && stageId !== 'sprout' ? (
          <G>
            <Circle cx={cx - canopyR * 0.55} cy={trunkTopY - canopyR * 0.35} r={canopyR * 0.62} fill="url(#tg-canopy)" />
            <Circle cx={cx + canopyR * 0.55} cy={trunkTopY - canopyR * 0.3} r={canopyR * 0.6} fill="url(#tg-canopy)" />
            <Circle cx={cx} cy={trunkTopY - canopyR * 0.75} r={canopyR * 0.72} fill="url(#tg-canopy)" />
          </G>
        ) : null}

        {/* Blossoms for the final stage */}
        {g.blossoms
          ? Array.from({ length: g.blossoms }).map((_, i) => {
              const angle = (i / g.blossoms!) * Math.PI * 2;
              const r = canopyR * (0.5 + 0.25 * ((i % 3) / 2));
              const bx = cx + Math.cos(angle) * r * 1.05;
              const by = trunkTopY - canopyR * 0.55 + Math.sin(angle) * r * 0.75;
              return <Circle key={`blossom-${i}`} cx={bx} cy={by} r={4.5} fill="#FFC9E0" opacity={0.95} />;
            })
          : null}

        {/* Fruit for mature / flourishing */}
        {g.fruit
          ? Array.from({ length: g.fruit }).map((_, i) => {
              const angle = (i / g.fruit!) * Math.PI * 2 + 0.4;
              const r = canopyR * 0.55;
              const fx = cx + Math.cos(angle) * r;
              const fy = trunkTopY - canopyR * 0.5 + Math.sin(angle) * r * 0.8;
              return <Circle key={`fruit-${i}`} cx={fx} cy={fy} r={5} fill="#E2553E" stroke="#A8311F" strokeWidth={0.8} />;
            })
          : null}
      </Svg>
    </View>
  );
}
