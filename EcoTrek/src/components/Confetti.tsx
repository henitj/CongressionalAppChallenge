import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native';

/**
 * Confetti, built from plain Animated views — no extra dependency, works on
 * iOS, Android and web, and runs on the native driver so it stays smooth
 * even on modest phones.
 *
 * The burst fires once on mount and rains for a couple of seconds. Mount it
 * inside the screen you want to celebrate in:
 *
 *   {celebrating ? <Confetti /> : null}
 */

const COLORS = [
  '#1A7A5A',
  '#34A078',
  '#7DD4AD',
  '#E8943A',
  '#FFD166',
  '#4D9DE0',
  '#E15554',
  '#9B5DE5',
];

type Piece = {
  /** Horizontal start, as a percentage of the screen width. */
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  /** Sideways drift in pixels while falling (negative = left). */
  drift: number;
  /** Full rotations while falling, in degrees. */
  spin: number;
  round: boolean;
};

function makePieces(count: number): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < count; i += 1) {
    pieces.push({
      left: Math.random() * 100,
      size: 6 + Math.random() * 7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 500,
      duration: 2100 + Math.random() * 1400,
      drift: (Math.random() - 0.5) * 140,
      spin: (Math.random() - 0.5) * 720,
      round: Math.random() < 0.3,
    });
  }
  return pieces;
}

export default function Confetti({
  count = 70,
  onFinish,
  style,
}: {
  count?: number;
  /** Called once every piece has finished falling. */
  onFinish?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { height } = useWindowDimensions();
  const pieces = useMemo(() => makePieces(count), [count]);
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current;
  const finishedRef = useRef(false);

  useEffect(() => {
    const animations = pieces.map((p, i) =>
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(progress[i], {
          toValue: 1,
          duration: p.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start(({ finished }) => {
      if (finished && !finishedRef.current) {
        finishedRef.current = true;
        onFinish?.();
      }
    });
    // One burst per mount — parents remount (key change) to fire another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      pointerEvents="none"
      style={[styles.root, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pieces.map((p, i) => {
        const translateY = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-30, height + 60],
        });
        const translateX = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.drift],
        });
        const rotate = progress[i].interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.spin}deg`],
        });
        const opacity = progress[i].interpolate({
          inputRange: [0, 0.82, 1],
          outputRange: [1, 1, 0.4],
        });

        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 1.7,
              borderRadius: p.round ? p.size / 2 : 2,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 1000,
  },
});
