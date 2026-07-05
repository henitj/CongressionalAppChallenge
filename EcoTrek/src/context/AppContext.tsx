import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fetchNearbyTrails, Trail } from '../constants/austinTrails';
import * as Location from 'expo-location';

type AppContextType = {
  trails: Trail[];
  isLoading: boolean;
  error: string | null;
  preloadTrails: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track if a preload is already running or completed to prevent double-calls on app boot
  const hasPreloaded = useRef(false);

  const preloadTrails = async () => {
    if (hasPreloaded.current) return;
    hasPreloaded.current = true;

    try {
      setIsLoading(true);
      setError(null);
      
      // 1. Get location permission immediately on boot
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // 2. Snag coordinates fast
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 3. Fire off the Groq request with the root timestamp attached
      const data = await fetchNearbyTrails({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp, 
      });

      setTrails(data);
    } catch (err: any) {
      console.error('Failed to preload EcoTrek trails:', err);
      setError(err.message || 'Something went wrong');
      // Reset tracker on failure so it allows a manual retry if needed
      hasPreloaded.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  // Run the fetch pipeline the millisecond the App boots up
  useEffect(() => {
    preloadTrails();
  }, []);

  return (
    <AppContext.Provider value={{ trails, isLoading, error, preloadTrails }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};