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

type ThemeValue = {
  colors: ColorPalette;
  appearance: Appearance;
  fontScale: number;
  typography: typeof TYPOGRAPHY;
};

const FALLBACK: ThemeValue = {
  colors: PALETTES.light,
  appearance: 'light',
  fontScale: 1,
  typography: TYPOGRAPHY,
};

const ThemeContext = createContext<ThemeValue>(FALLBACK);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { appearance, textSize } = useSettings();
  const [hour, setHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const tick = () => setHour(new Date().getHours());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const scale = fontScaleFor(textSize);
    const colors = paletteFor(appearance, hour);
    return {
      colors,
      appearance,
      fontScale: scale,
      typography: scaleTypography(TYPOGRAPHY, scale),
    };
  }, [appearance, textSize, hour]);

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
