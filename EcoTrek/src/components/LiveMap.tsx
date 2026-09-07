import React from 'react';
import { View } from 'react-native';

import RouteSketch from './RouteSketch';
import { Coord } from '../services/location';
import { RADIUS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  path: Coord[];
  current?: Coord;
  height?: number;
  follow?: boolean;
};

/**
 * Fallback map (tests / unknown platforms).
 * Native uses LiveMap.native.tsx; web uses LiveMap.web.tsx.
 * This file must NOT import leaflet or react-native-maps — Metro would
 * otherwise drag those into the wrong bundle and Expo Go would fail to load.
 */
export default function LiveMap({ path, current, height = 260 }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: '100%',
        height,
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        backgroundColor: colors.backgroundDark,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <RouteSketch path={path} current={current} />
    </View>
  );
}
