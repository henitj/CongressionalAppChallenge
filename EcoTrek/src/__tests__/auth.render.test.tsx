/**
 * Regression test for the Google sign-in crash.
 *
 * With an empty `.env`, `expo-auth-session`'s Google provider used to throw
 * *during render* — "Client Id property `androidClientId` must be defined to
 * use Google auth on this platform." Because AuthProvider wraps the whole
 * tree, that single throw took the entire app down to the ErrorBoundary's
 * "Something went wrong" screen on launch.
 *
 * The rest of the suite mocks the Google provider away, so it could never
 * catch this. This file deliberately runs against the REAL module.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

jest.unmock('expo-auth-session/providers/google');

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
import { isGoogleConfigured } from '../constants/authConfig';

function Probe() {
  const { loading, googleConfigured } = useAuth();
  return <Text>{loading ? 'loading' : `ready:${googleConfigured}`}</Text>;
}

describe('AuthProvider with no Google client IDs configured', () => {
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

    // Renders at all -> the client-id invariant no longer throws.
    await waitFor(() => expect(screen.getByText('ready:false')).toBeTruthy());
  });

  it('reports Google as not configured so the UI can offer guest instead', () => {
    expect(isGoogleConfigured()).toBe(false);
  });
});

/**
 * The end-to-end version of the same guarantee: boot the real <App />, with
 * the real Google provider, and confirm the user lands on the sign-in screen
 * rather than the ErrorBoundary's "Something went wrong" fallback.
 */
describe('cold launch with an empty .env', () => {
  it('reaches the sign-in screen instead of the error fallback', async () => {
    const App = require('../../App').default;
    const screen = render(<App />);

    await waitFor(
      () => {
        expect(screen.queryByText(/Something went wrong/i)).toBeNull();
        expect(screen.getByText(/Continue as guest/i)).toBeTruthy();
      },
      { timeout: 8000 }
    );
  }, 20000);
});
