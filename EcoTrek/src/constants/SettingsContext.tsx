import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Units = 'imperial' | 'metric';
type TempUnit = 'F' | 'C';

type SettingsState = {
  units: Units;
  tempUnit: TempUnit;
  setUnits: (u: Units) => Promise<void>;
  setTempUnit: (t: TempUnit) => Promise<void>;
  // Conversion helpers
  /** Two decimals — for live tracking, where the width should not jump. */
  formatDistance: (miles: number) => string;
  /** Trimmed — "10", "7.9", "2.45". For catalogue and summary figures. */
  formatDistanceCompact: (miles: number) => string;
  formatDistanceUnit: () => string;
  formatTemp: (fahrenheit: number) => string;
  convertDistance: (miles: number) => number;
};

const SettingsContext = createContext<SettingsState | null>(null);
const STORAGE_KEY = '@ecotrek/settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [units, setUnitsState] = useState<Units>('imperial');
  const [tempUnit, setTempUnitState] = useState<TempUnit>('F');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const parsed = JSON.parse(raw);
        setUnitsState(parsed.units ?? 'imperial');
        setTempUnitState(parsed.tempUnit ?? 'F');
      }
    });
  }, []);

  const save = useCallback(
    async (next: { units: Units; tempUnit: TempUnit }) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    },
    []
  );

  const setUnits = useCallback(
    async (u: Units) => {
      setUnitsState(u);
      await save({ units: u, tempUnit });
    },
    [tempUnit, save]
  );

  const setTempUnit = useCallback(
    async (t: TempUnit) => {
      setTempUnitState(t);
      await save({ units, tempUnit: t });
    },
    [units, save]
  );

  const convertDistance = useCallback(
    (miles: number) => {
      return units === 'metric' ? miles * 1.60934 : miles;
    },
    [units]
  );

  const formatDistance = useCallback(
    (miles: number) => {
      const val = convertDistance(miles);
      return val.toFixed(2);
    },
    [convertDistance]
  );

  const formatDistanceCompact = useCallback(
    (miles: number) => {
      const val = convertDistance(miles);
      // Trailing zeros read as false precision: a 10-mile trail is "10 mi",
      // not "10.00 mi".
      return String(Number(val.toFixed(2)));
    },
    [convertDistance]
  );

  const formatDistanceUnit = useCallback(() => {
    return units === 'metric' ? 'km' : 'mi';
  }, [units]);

  const formatTemp = useCallback(
    (fahrenheit: number) => {
      if (tempUnit === 'C') {
        return `${Math.round(((fahrenheit - 32) * 5) / 9)}°C`;
      }
      // Nobody needs a tenth of a degree, and "100.0°F" reads worse than "100°F".
      return `${Math.round(fahrenheit)}°F`;
    },
    [tempUnit]
  );

  const value = useMemo<SettingsState>(
    () => ({
      units,
      tempUnit,
      setUnits,
      setTempUnit,
      formatDistance,
      formatDistanceCompact,
      formatDistanceUnit,
      formatTemp,
      convertDistance,
    }),
    [
      units,
      tempUnit,
      setUnits,
      setTempUnit,
      formatDistance,
      formatDistanceCompact,
      formatDistanceUnit,
      formatTemp,
      convertDistance,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error('useSettings must be used inside <SettingsProvider />');
  return ctx;
}