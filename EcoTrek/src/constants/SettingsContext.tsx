import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Appearance, TextSize } from './theme';

type Units = 'imperial' | 'metric';
type TempUnit = 'F' | 'C';

type Stored = {
  units: Units;
  tempUnit: TempUnit;
  appearance: Appearance;
  textSize: TextSize;
};

const DEFAULTS: Stored = {
  units: 'imperial',
  tempUnit: 'F',
  appearance: 'light',
  textSize: 'default',
};

function normalizeAppearance(raw: unknown): Appearance {
  if (raw === 'dark' || raw === 'sky') return raw;
  return 'light';
}

type SettingsState = Stored & {
  setUnits: (u: Units) => Promise<void>;
  setTempUnit: (t: TempUnit) => Promise<void>;
  setAppearance: (a: Appearance) => Promise<void>;
  setTextSize: (s: TextSize) => Promise<void>;
  formatDistance: (miles: number) => string;
  formatDistanceCompact: (miles: number) => string;
  formatDistanceUnit: () => string;
  formatTemp: (fahrenheit: number) => string;
  convertDistance: (miles: number) => number;
};

const SettingsContext = createContext<SettingsState | null>(null);
const STORAGE_KEY = '@ecotrek/settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Stored>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        setState({
          units: parsed.units === 'metric' ? 'metric' : 'imperial',
          tempUnit: parsed.tempUnit === 'C' ? 'C' : 'F',
          appearance: normalizeAppearance(parsed.appearance),
          textSize:
            parsed.textSize === 'large' || parsed.textSize === 'xlarge' ? parsed.textSize : 'default',
        });
      } catch {
        /* keep defaults */
      }
    });
  }, []);

  const persist = useCallback(async (next: Stored) => {
    setState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setUnits = useCallback(async (units: Units) => persist({ ...state, units }), [state, persist]);
  const setTempUnit = useCallback(
    async (tempUnit: TempUnit) => persist({ ...state, tempUnit }),
    [state, persist]
  );
  const setAppearance = useCallback(
    async (appearance: Appearance) => persist({ ...state, appearance }),
    [state, persist]
  );
  const setTextSize = useCallback(
    async (textSize: TextSize) => persist({ ...state, textSize }),
    [state, persist]
  );

  const convertDistance = useCallback(
    (miles: number) => (state.units === 'metric' ? miles * 1.60934 : miles),
    [state.units]
  );

  const formatDistance = useCallback(
    (miles: number) => convertDistance(miles).toFixed(2),
    [convertDistance]
  );

  const formatDistanceCompact = useCallback(
    (miles: number) => String(Number(convertDistance(miles).toFixed(2))),
    [convertDistance]
  );

  const formatDistanceUnit = useCallback(
    () => (state.units === 'metric' ? 'km' : 'mi'),
    [state.units]
  );

  const formatTemp = useCallback(
    (fahrenheit: number) => {
      if (state.tempUnit === 'C') return `${Math.round(((fahrenheit - 32) * 5) / 9)}°C`;
      return `${Math.round(fahrenheit)}°F`;
    },
    [state.tempUnit]
  );

  const value = useMemo<SettingsState>(
    () => ({
      ...state,
      setUnits,
      setTempUnit,
      setAppearance,
      setTextSize,
      formatDistance,
      formatDistanceCompact,
      formatDistanceUnit,
      formatTemp,
      convertDistance,
    }),
    [
      state,
      setUnits,
      setTempUnit,
      setAppearance,
      setTextSize,
      formatDistance,
      formatDistanceCompact,
      formatDistanceUnit,
      formatTemp,
      convertDistance,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider />');
  return ctx;
}
