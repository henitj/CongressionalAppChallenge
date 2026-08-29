import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StatusBar } from 'react-native';

import {
  Appearance,
  ColorPalette,
  PALETTES,
  TYPOGRAPHY,
  fontScaleFor,
} from '../constants/theme';
import { useSettings } from '../constants/SettingsContext';

type ThemeValue = {
  colors: ColorPalette;
  appearance: Appearance;
  fontScale: number;
  /** TYPOGRAPHY with every font size and line height scaled by fontScale. */
  typography: typeof TYPOGRAPHY;
  simpleMode: boolean;
  reduceMotion: boolean;
};

const FALLBACK: ThemeValue = {
  colors: PALETTES.light,
  appearance: 'light',
  fontScale: 1,
  typography: TYPOGRAPHY,
  simpleMode: false,
  reduceMotion: false,
};

const ThemeContext = createContext<ThemeValue>(FALLBACK);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { appearance, textSize, simpleMode, reduceMotion: preferReduce } = useSettings();
  const [systemReduce, setSystemReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setSystemReduce(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setSystemReduce);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const scale = fontScaleFor(textSize, simpleMode);
    return {
      colors: PALETTES[appearance] ?? PALETTES.light,
      appearance,
      fontScale: scale,
      typography: scaleTypography(TYPOGRAPHY, scale),
      simpleMode,
      reduceMotion: preferReduce || systemReduce,
    };
  }, [appearance, textSize, simpleMode, preferReduce, systemReduce]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar barStyle={appearance === 'dark' ? 'light-content' : 'dark-content'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** The type ramp as currently scaled — handy in style-builder signatures. */
export type Typography = typeof TYPOGRAPHY;

export function scaled(size: number, scale: number) {
  return Math.round(size * scale);
}

/**
 * Scale every font size and line height in the type ramp. Centralising this
 * is what makes the text-size setting actually work: screens read
 * `typography` from the theme, so "large" grows the whole app uniformly
 * instead of a handful of hand-picked labels while everything else stays
 * fixed (which is what used to break the layout).
 */
export function scaleTypography(t: typeof TYPOGRAPHY, scale: number): typeof TYPOGRAPHY {
  if (scale === 1) return t;
  const out = {} as Record<string, { fontSize?: number; lineHeight?: number } & object>;
  for (const [key, value] of Object.entries(t)) {
    const next = { ...(value as object) } as { fontSize?: number; lineHeight?: number };
    if (typeof next.fontSize === 'number') next.fontSize = Math.round(next.fontSize * scale);
    if (typeof next.lineHeight === 'number') next.lineHeight = Math.round(next.lineHeight * scale);
    out[key] = next;
  }
  return out as typeof TYPOGRAPHY;
}
