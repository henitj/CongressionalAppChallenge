import { useCallback, useState } from 'react';
import { alert } from '../services/alert';
import { useNavigation } from '@react-navigation/native';

import { useApp } from '../context/AppContext';
import { useWeather } from '../context/WeatherContext';
import { primeMotionPermission } from '../services/stepSensor';

export type ActivityMode = 'hike' | 'bike';

export function useStartActivity(initial: ActivityMode = 'hike') {
  const navigation = useNavigation<any>();
  const { requestLocation } = useApp();
  const { report } = useWeather();
  const [mode, setMode] = useState<ActivityMode>(initial);
  const [starting, setStarting] = useState(false);

  const start = useCallback(async () => {
    // Re-check on every deliberate Start tap. This handles a permission or
    // device-location switch changed in Settings while EcoTrek was open, and
    // ensures the browser/WebView gets the real location prompt and a genuine
    // fix. Never substitute a city-wide fallback for missing GPS.
    setStarting(true);
    // Must run inside the tap itself: iPhones only ask about motion from a tap.
    if (mode === 'hike') await primeMotionPermission().catch(() => false);
    let coords: { latitude: number; longitude: number } | null = null;
    try {
      coords = await requestLocation({ explain: true });
    } finally {
      setStarting(false);
    }
    if (!coords) return; // requestLocation explains denied access and offers retry.

    if (report?.level === 'danger') {
      alert('Stay inside today', `${report.headline}\n\n${report.summary}`, [
        { text: 'Not today', style: 'cancel' },
        {
          text: 'I understand',
          style: 'destructive',
          onPress: () => navigation.navigate('ActiveTracking', { mode }),
        },
      ]);
      return;
    }

    navigation.navigate('ActiveTracking', { mode });
  }, [requestLocation, report, navigation, mode]);

  return { mode, setMode, start, starting };
}
