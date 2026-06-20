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
  formatDistance: (miles: number) => string;
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

  const formatDistanceUnit = useCallback(() => {
    return units === 'metric' ? 'km' : 'mi';
  }, [units]);

  const formatTemp = useCallback(
    (fahrenheit: number) => {
      if (tempUnit === 'C') {
        return `${(((fahrenheit - 32) * 5) / 9).toFixed(1)}°C`;
      }
      return `${fahrenheit.toFixed(1)}°F`;
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