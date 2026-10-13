import { useCallback, useState } from 'react';
import { alert } from '../services/alert';
import { useNavigation } from '@react-navigation/native';

import { useApp } from '../context/AppContext';
import { useWeather } from '../context/WeatherContext';

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
    // ensures the web APK gets the real browser/WebView permission prompt.
    setStarting(true);
    let coords: { latitude: number; longitude: number } | null = null;
    try {
      coords = await requestLocation({ permissionOnly: true, explain: true });
    } finally {
      setStarting(false);
    }
    if (!coords) return; // requestLocation already explains how to restore access.

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
