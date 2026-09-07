/**
 * FEEDBACK — the single place the Google Form link lives.
 *
 * This is hardcoded on purpose: the user never sees or types a link anywhere.
 * Tapping any "Give feedback" button in the app opens this form directly.
 *
 * To point the app at a different form later, change the URL below — that is
 * the only edit anyone ever needs to make.
 *
 * (react-native is required lazily so this file can also be imported by the
 * plain-Node logic tests, which never call the helper below.)
 */
export const FEEDBACK_FORM_URL = 'https://forms.gle/mt4x5mzAyaG2xFEE6';

/**
 * Opens the feedback form. Used by the Give Feedback button at the bottom of
 * the Profile page and the popup that appears after a counted walk. Clean and
 * quiet: straight to the form, and if the device cannot open it (no browser,
 * rare), a short friendly message instead of a crash.
 */
export async function openFeedbackForm(): Promise<void> {
  const { Alert, Linking } = require('react-native') as typeof import('react-native');
  try {
    await Linking.openURL(FEEDBACK_FORM_URL);
  } catch (e) {
    console.warn('[feedback] could not open the form', e);
    Alert.alert(
      'One moment',
      'The feedback form could not be opened right now. Please try again in a moment.'
    );
  }
}
