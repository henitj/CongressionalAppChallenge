import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useApp } from '../context/AppContext';
import { useWeather } from '../context/WeatherContext';

export type ActivityMode = 'hike' | 'bike';

export function useStartActivity(initial: ActivityMode = 'hike') {
  const navigation = useNavigation<any>();
  const { permission, requestLocation } = useApp();
  const { report } = useWeather();
  const [mode, setMode] = useState<ActivityMode>(initial);
  const [starting, setStarting] = useState(false);

  const start = useCallback(async () => {
    if (permission !== 'granted' && Platform.OS !== 'web') {
      setStarting(true);
      const coords = await requestLocation({ permissionOnly: true });
      setStarting(false);
      if (!coords) {
        Alert.alert(
          'Location needed',
          'Turn on location for EcoTrek in your phone settings so we can measure how far you go.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    if (report?.level === 'danger') {
      Alert.alert('Stay inside today', `${report.headline}\n\n${report.summary}`, [
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
  }, [permission, requestLocation, report, navigation, mode]);

  return { mode, setMode, start, starting };
}
