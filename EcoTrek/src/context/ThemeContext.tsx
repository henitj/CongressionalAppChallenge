import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StatusBar } from 'react-native';

import {
  Appearance,
  ColorPalette,
  PALETTES,
  TextSize,
  fontScaleFor,
} from '../constants/theme';
import { useSettings } from '../constants/SettingsContext';

type ThemeValue = {
  colors: ColorPalette;
  appearance: Appearance;
  fontScale: number;
  simpleMode: boolean;
  reduceMotion: boolean;
};

const FALLBACK: ThemeValue = {
  colors: PALETTES.light,
  appearance: 'light',
  fontScale: 1,
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

  const value = useMemo<ThemeValue>(
    () => ({
      colors: PALETTES[appearance] ?? PALETTES.light,
      appearance,
      fontScale: fontScaleFor(textSize, simpleMode),
      simpleMode,
      reduceMotion: preferReduce || systemReduce,
    }),
    [appearance, textSize, simpleMode, preferReduce, systemReduce]
  );

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

export function scaled(size: number, scale: number) {
  return Math.round(size * scale);
}
