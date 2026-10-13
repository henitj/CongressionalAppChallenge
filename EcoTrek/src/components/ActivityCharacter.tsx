import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '../context/ThemeContext';

type ActivityCharacterProps = {
  mode: 'hike' | 'bike';
  size?: number;
};

/** Small, friendly walkers and cyclists for the activity picker. */
export default function ActivityCharacter({ mode, size = 64 }: ActivityCharacterProps) {
  const { colors } = useTheme();
  const ink = colors.primaryDark;
  const jacket = mode === 'bike' ? '#F39A58' : colors.accent;
  const skin = '#F3C49C';
  const pants = '#38566C';
  const wheel = mode === 'bike' ? colors.primaryDark : 'transparent';

  return (
    <View accessible={false} pointerEvents="none" style={{ width: size, height: size }}>
      <Svg width="100%" height="100%" viewBox="0 0 80 80">
        <Circle cx="40" cy="40" r="38" fill={colors.primarySurface} />
        <Ellipse cx="40" cy="70" rx="22" ry="3.5" fill={colors.primaryDark} opacity={0.12} />

        {mode === 'bike' ? (
          <G fill="none" stroke={wheel} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx="22" cy="61" r="12" strokeWidth="2.5" />
            <Circle cx="59" cy="61" r="12" strokeWidth="2.5" />
            <Path d="M22 61 34 43l12 18H22l10-14h18l9 14M48 43l6-6m-8 0h10" strokeWidth="2.5" />
            <Circle cx="34" cy="43" r="2.4" fill={wheel} strokeWidth="1.2" />
          </G>
        ) : (
          <G>
            <Path d="M26 33c-5 0-8 4-8 10v15c0 2 2 3 4 2l11-9-1-16c0-1-3-2-6-2Z" fill={colors.primary} />
            <Path d="m23 58-5 4" stroke={ink} strokeWidth="2" strokeLinecap="round" />
          </G>
        )}

        {mode === 'hike' ? (
          <G fill="none" stroke={colors.primaryDark} strokeWidth="1.7" strokeLinecap="round" opacity={0.8}>
            <Path d="M15 51 12 72" />
            <Path d="m10 72 5 1" />
            <Path d="M65 48 68 70" />
            <Path d="m66 70 5 1" />
          </G>
        ) : null}

        {/* Legs and shoes */}
        <Path d="M34 48 30 61 23 68l7 3 11-8 4-12Z" fill={pants} />
        <Path d="m46 49 4 12 9 5-4 5-14-5-5-13Z" fill={pants} />
        <Path d="m23 68-4 4c-.8 1.1-.1 2.5 1.3 2.5h10.5c1.4 0 2.1-1.7 1.1-2.7L30 71Z" fill={ink} />
        <Path d="m55 66 2 4 9 2c1.3.3 1.5 2.3.1 2.7H54c-1.4 0-2.2-1.5-1.4-2.6l2-2.4Z" fill={ink} />

        {/* Shirt, arms, and neck */}
        <Path d="M35 32h12l7 8-4 13c-6 4-15 4-22 0l2-14Z" fill={jacket} />
        <Path d="m34 36-7 8-5-2-2 4 8 4 9-9" fill={skin} />
        <Path d="m48 36 7 6 4-2 3 4-8 5-8-7" fill={skin} />
        <Path d="M37 29h9v8c-2.4 2.8-6.6 2.8-9 0Z" fill={skin} />

        {/* Face and hair / helmet */}
        <Circle cx="41" cy="23" r="10" fill={skin} />
        {mode === 'bike' ? (
          <G>
            <Path d="M31 22c1-8 6-12 12-11 6 1 9 5 9 11l-4-1-3-5c-4 3-8 4-14 5Z" fill={colors.accent} />
            <Path d="M32 21c4 0 9-2 13-5" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />
          </G>
        ) : (
          <Path d="M31 23c-1-7 3-13 10-13 6 0 10 4 10 10-4 0-7-2-9-5-2 4-6 7-11 8Z" fill={ink} />
        )}
        <Circle cx="44" cy="24" r="1" fill={ink} />
        <Path d="M44 29q-2 1-4 0" fill="none" stroke={ink} strokeWidth="1" strokeLinecap="round" />

        {/* Little reflective detail makes the figures read at small sizes. */}
        <Rect x="39" y="39" width="3" height="9" rx="1.5" fill="#FFFFFF" opacity={0.75} />
      </Svg>
    </View>
  );
}
