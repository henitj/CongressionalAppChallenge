import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'react-native';

import {
  Appearance,
  ColorPalette,
  PALETTES,
  TYPOGRAPHY,
  fontScaleFor,
  paletteFor,
} from '../constants/theme';
import { useSettings } from '../constants/SettingsContext';
import { AccessibilityInfo } from 'react-native';

type ThemeValue = {
  colors: ColorPalette;
  appearance: Appearance;
  fontScale: number;
  typography: typeof TYPOGRAPHY;
  /** True when screen transitions should be skipped. */
  motionEnabled: boolean;
};

const FALLBACK: ThemeValue = {
  colors: PALETTES.light,
  appearance: 'light',
  fontScale: 1,
  typography: TYPOGRAPHY,
  motionEnabled: true,
};

const ThemeContext = createContext<ThemeValue>(FALLBACK);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { appearance, textSize, simpleMode, reduceMotion } = useSettings();
  const [hour, setHour] = useState(() => new Date().getHours());
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  // 'system' follows the OS reduce-motion setting, live.
  useEffect(() => {
    if (reduceMotion !== 'system') return;
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduceMotion);
    return () => sub.remove();
  }, [reduceMotion]);

  useEffect(() => {
    const tick = () => setHour(new Date().getHours());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    // Simple mode bumps the whole type ramp a step, on top of the chosen size.
    const scale = fontScaleFor(textSize) * (simpleMode ? 1.12 : 1);
    const colors = paletteFor(appearance, hour);
    const motionEnabled =
      reduceMotion === 'on' ? false : reduceMotion === 'off' ? true : !systemReduceMotion;
    return {
      colors,
      appearance,
      motionEnabled,
      fontScale: scale,
      typography: scaleTypography(TYPOGRAPHY, scale),
    };
  }, [appearance, textSize, hour, simpleMode, reduceMotion, systemReduceMotion]);

  const darkBar = appearance === 'dark';

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar barStyle={darkBar ? 'light-content' : 'dark-content'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export type Typography = typeof TYPOGRAPHY;

export function scaled(size: number, scale: number) {
  return Math.round(size * scale);
}

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
