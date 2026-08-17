/* eslint-disable @typescript-eslint/no-var-requires */

// AsyncStorage has no native module under Jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Maps and notifications are native-only; the screens only need them to exist.
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mock = (props) => React.createElement(View, props, props.children);
  return {
    __esModule: true,
    default: Mock,
    Marker: Mock,
    Polyline: Mock,
    Circle: Mock,
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 30.2672, longitude: -97.7431, accuracy: 5 },
    timestamp: Date.now(),
  })),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
  Accuracy: { Balanced: 3, BestForNavigation: 6 },
}));

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));

// Scheduling is a no-op under test; the real module warns about Expo Go.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [null, null, jest.fn()],
}));

// The weather services are real network calls. Tests must never hit them.
global.fetch = jest.fn(async () => ({
  ok: false,
  status: 503,
  json: async () => ({}),
}));

// Quieten the act() noise from providers that load asynchronously.
jest.spyOn(console, 'error').mockImplementation((msg, ...rest) => {
  if (typeof msg === 'string' && msg.includes('not wrapped in act')) return;
  // Any other console.error in a render test is a genuine problem.
  throw new Error(`console.error during render: ${msg} ${rest.join(' ')}`);
});
