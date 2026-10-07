/**
 * Boot tests for the auth layer.
 *
 * These used to guard a real crash: `expo-auth-session`'s Google provider threw
 * *during render* when no client IDs were configured ("Client Id property
 * `androidClientId` must be defined to use Google auth on this platform"), and
 * because AuthProvider wraps the whole tree that throw took the app straight to
 * the ErrorBoundary's "Something went wrong" screen on launch.
 *
 * The Google flow is gone — the button could never work without a configured
 * Google Cloud project, so it was removed rather than left failing. What these
 * tests protect now is the replacement: a provider that boots on every
 * platform with no configuration at all, a sign-in screen that only offers the
 * local profile, and no leftover Google button anywhere in the tree.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

// SafeAreaProvider measures itself via a native layout event that never fires
// under Jest, so the real one renders nothing and the tree below it never
// mounts. Everything else in the library is kept intact; only the provider is
// swapped for a pass-through that supplies fixed insets.
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  const React = require('react');
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const insets = { top: 47, left: 0, right: 0, bottom: 34 };
  return {
    ...actual,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        actual.SafeAreaFrameContext.Provider,
        { value: frame },
        React.createElement(
          actual.SafeAreaInsetsContext.Provider,
          { value: insets },
          children
        )
      ),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
  };
});

// expo-linking needs a native manifest that does not exist under Jest.
jest.mock('expo-linking', () => ({
  createURL: (path: string) => `ecotrek://${path}`,
  useURL: () => null,
  addEventListener: () => ({ remove() {} }),
  openURL: async () => {},
  parse: () => ({ path: '', queryParams: {} }),
}));

import { AuthProvider, useAuth } from '../context/AuthContext';

function Probe() {
  const { loading, user } = useAuth();
  return <Text>{loading ? 'loading' : `ready:${user ? user.id : 'signed-out'}`}</Text>;
}

describe('AuthProvider with no configuration at all', () => {
  const platforms = ['android', 'ios', 'web'] as const;
  const { Platform } = require('react-native');
  const realOS = Platform.OS;

  afterEach(() => {
    Platform.OS = realOS;
  });

  it.each(platforms)('mounts without throwing on %s', async (os) => {
    Platform.OS = os;

    const screen = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText('ready:signed-out')).toBeTruthy());
  });
});

/**
 * The end-to-end version: boot the real <App /> and confirm the user lands on
 * the sign-in screen rather than the ErrorBoundary's fallback.
 */
describe('cold launch with an empty .env', () => {
  it('reaches the sign-in screen instead of the error fallback', async () => {
    const App = require('../../App').default;
    const screen = render(<App />);

    await waitFor(
      () => {
        expect(screen.queryByText(/Something went wrong/i)).toBeNull();
        expect(screen.getByText(/Start walking/i)).toBeTruthy();
      },
      { timeout: 8000 }
    );
  }, 20000);

  it('offers no Google sign-in at all', async () => {
    const App = require('../../App').default;
    const screen = render(<App />);

    await waitFor(() => expect(screen.getByText(/Start walking/i)).toBeTruthy(), { timeout: 8000 });
    expect(screen.queryByText(/Google/i)).toBeNull();
  }, 20000);
});
