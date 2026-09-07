/**
 * ErrorBoundary fallback: retry and the "Report error" button.
 *
 * The boundary is the last thing standing between a crash and a blank screen,
 * so it is worth testing that it not only renders but that reporting actually
 * hands the mail app a useful payload.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import ErrorBoundary from '../components/ErrorBoundary';
import { buildErrorReport } from '../services/errorReport';
import { SUPPORT_EMAIL, APP_VERSION } from '../constants/appInfo';

// errorReport reaches Linking through `require('react-native')`, so spy on
// the real module rather than mocking a deep internal path.
import { Linking } from 'react-native';
const mockOpenURL = jest.spyOn(Linking, 'openURL');

function Boom(): React.ReactElement {
  throw new Error('kaboom for the test');
}

/** The boundary logs via console.error by design; keep the output readable. */
let spy: jest.SpyInstance;
beforeEach(() => {
  mockOpenURL.mockClear();
  mockOpenURL.mockImplementation(async () => true);
  spy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => spy.mockRestore());
afterAll(() => mockOpenURL.mockRestore());

describe('ErrorBoundary fallback', () => {
  it('shows the fallback instead of crashing, with both actions', () => {
    const screen = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByText('Report error')).toBeTruthy();
  });

  it('renders children normally when nothing throws', () => {
    const screen = render(
      <ErrorBoundary>
        <Text>all good</Text>
      </ErrorBoundary>
    );
    expect(screen.getByText('all good')).toBeTruthy();
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('opens the mail app with the error prefilled when Report error is tapped', async () => {
    const screen = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    fireEvent.press(screen.getByText('Report error'));

    await waitFor(() => expect(mockOpenURL).toHaveBeenCalledTimes(1));

    const url = mockOpenURL.mock.calls[0][0] as unknown as string;
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}`)).toBe(true);
    // The actual failure has to survive the round trip into the mail body.
    expect(decodeURIComponent(url)).toContain('kaboom for the test');

    await waitFor(() =>
      expect(screen.getByText(/your mail app has the report ready/i)).toBeTruthy()
    );
  });

  it('tells the user to copy the details when no mail app can open', async () => {
    mockOpenURL.mockImplementation(async () => {
      throw new Error('no mail app');
    });

    const screen = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    fireEvent.press(screen.getByText('Report error'));

    // A failed report must never leave the person stuck with no way to tell us.
    await waitFor(() => expect(screen.getByText(/No mail app opened/i)).toBeTruthy());
  });
});

describe('buildErrorReport', () => {
  it('includes the message, version and a reproduction prompt', () => {
    const { subject, body } = buildErrorReport(new Error('disk on fire'), '\n    in Thing');

    expect(subject).toContain('disk on fire');
    expect(subject).toContain(APP_VERSION);
    expect(body).toContain('disk on fire');
    expect(body).toContain(APP_VERSION);
    expect(body).toMatch(/What I was doing/i);
    expect(body).toContain('in Thing');
  });

  it('survives an error with no message or stack', () => {
    const bare = new Error('');
    bare.stack = undefined;
    expect(() => buildErrorReport(bare, null)).not.toThrow();
    expect(buildErrorReport(bare, null).body).toContain('Unknown error');
  });
});
