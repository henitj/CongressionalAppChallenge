import React, { useState } from 'react';
import { View, Text, LayoutChangeEvent, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Coord } from '../services/location';
import { SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

/**
 * A map-shaped safety net.
 *
 * When real map tiles cannot be reached — no signal on a trail, a blocked
 * network — an empty grey rectangle makes the app look broken even though
 * recording is working fine. This draws the route we have actually recorded
 * on a plain grid instead, so the space still says something true.
 */
export default function RouteSketch({
  path,
  current,
}: {
  path: Coord[];
  current?: Coord;
}) {
  const { colors, typography } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const points = current ? [...path, current] : path;
  const ready = size.width > 0 && size.height > 0;

  // Project lat/lon into the box, keeping the aspect ratio honest.
  let d = '';
  let dots: { x: number; y: number }[] = [];
  if (ready && points.length > 0) {
    const pad = 26;
    const lats = points.map((p) => p.latitude);
    const lons = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const spanLat = Math.max(maxLat - minLat, 0.0004);
    const spanLon = Math.max(maxLon - minLon, 0.0004);
    const scale = Math.min((size.width - pad * 2) / spanLon, (size.height - pad * 2) / spanLat);
    const offsetX = (size.width - spanLon * scale) / 2;
    const offsetY = (size.height - spanLat * scale) / 2;

    dots = points.map((p) => ({
      x: offsetX + (p.longitude - minLon) * scale,
      y: size.height - (offsetY + (p.latitude - minLat) * scale),
    }));
    d = dots.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  }

  const gridStep = 34;
  const cols = ready ? Math.ceil(size.width / gridStep) : 0;
  const rows = ready ? Math.ceil(size.height / gridStep) : 0;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {ready ? (
        <Svg width={size.width} height={size.height}>
          {Array.from({ length: cols }).map((_, i) => (
            <Line
              key={`v${i}`}
              x1={i * gridStep}
              y1={0}
              x2={i * gridStep}
              y2={size.height}
              stroke={colors.borderLight}
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: rows }).map((_, i) => (
            <Line
              key={`h${i}`}
              x1={0}
              y1={i * gridStep}
              x2={size.width}
              y2={i * gridStep}
              stroke={colors.borderLight}
              strokeWidth={1}
            />
          ))}

          {d && dots.length > 1 ? (
            <Path d={d} stroke={colors.primary} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}

          {dots.length > 0 ? (
            <Circle cx={dots[0].x} cy={dots[0].y} r={5} fill={colors.accent} stroke="#fff" strokeWidth={2} />
          ) : null}
          {dots.length > 0 ? (
            <Circle
              cx={dots[dots.length - 1].x}
              cy={dots[dots.length - 1].y}
              r={7}
              fill="#FFD000"
              stroke={colors.primaryDark}
              strokeWidth={3}
            />
          ) : null}
        </Svg>
      ) : null}

      {points.length === 0 ? (
        <View style={styles.center}>
          <Text style={[typography.small, { color: colors.textMuted }]}>
            Waiting for your first GPS fix…
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
});
