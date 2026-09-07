/**
 * ERROR REPORTING — turns a crash into something the team can act on.
 *
 * Used by the "Report error" button on the ErrorBoundary fallback. The goal is
 * a report that is actually useful: the message and stack alone are often not
 * enough to reproduce a crash, so the device, OS and app version travel with
 * it.
 *
 * Delivery is by email, on purpose. It needs no backend, no API key and no
 * network call of our own, and the person can see exactly what is being sent
 * before it leaves their device — which matters when the payload includes
 * device details.
 *
 * NOTHING here may throw. It runs inside a crash screen; if reporting fails,
 * the fallback must still be usable.
 */

import { Platform } from 'react-native';
import { APP_NAME, APP_VERSION, SUPPORT_EMAIL } from '../constants/appInfo';

/** Keeps mailto URLs under length limits that some mail clients enforce. */
const MAX_STACK_CHARS = 1500;

export type ErrorReport = {
  subject: string;
  body: string;
};

/**
 * Best-effort device description. `expo-device` is imported lazily and inside
 * a try, because a crash screen must not depend on a native module loading.
 */
function describeDevice(): string {
  let device = 'unknown device';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Device = require('expo-device') as typeof import('expo-device');
    const parts = [Device.manufacturer, Device.modelName].filter(Boolean);
    if (parts.length) device = parts.join(' ');
  } catch {
    /* not available — the platform line below still gives us something */
  }
  return device;
}

/** Builds the report text. Pure and safe to unit-test. */
export function buildErrorReport(error: Error, componentStack?: string | null): ErrorReport {
  const message = error?.message || 'Unknown error';

  const stack = (error?.stack ?? '').slice(0, MAX_STACK_CHARS);
  const component = (componentStack ?? '').slice(0, MAX_STACK_CHARS);

  const body = [
    'Something went wrong in ' + APP_NAME + '.',
    '',
    'What I was doing when it happened:',
    '(please describe — even one line helps a lot)',
    '',
    '',
    '--- technical details, please keep ---',
    `Error: ${message}`,
    `App: ${APP_NAME} ${APP_VERSION}`,
    `Platform: ${Platform.OS} ${String(Platform.Version ?? '')}`.trim(),
    `Device: ${describeDevice()}`,
    `When: ${new Date().toISOString()}`,
    '',
    stack ? `Stack:\n${stack}` : 'Stack: (none)',
    component ? `\nComponent stack:${component}` : '',
  ].join('\n');

  return { subject: `${APP_NAME} ${APP_VERSION} crash: ${message.slice(0, 80)}`, body };
}

/**
 * Opens the user's mail app with the report pre-filled.
 *
 * Returns true when the mail app was handed the report, false when it could
 * not be opened — the caller shows the details on screen to copy instead, so
 * the report is never simply lost.
 */
export async function reportError(
  error: Error,
  componentStack?: string | null
): Promise<boolean> {
  try {
    const { Linking } = require('react-native') as typeof import('react-native');
    const { subject, body } = buildErrorReport(error, componentStack);
    const url =
      `mailto:${SUPPORT_EMAIL}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    await Linking.openURL(url);
    return true;
  } catch (e) {
    try {
      console.warn('[errorReport] could not open the mail app', e);
    } catch {
      /* ignore */
    }
    return false;
  }
}
