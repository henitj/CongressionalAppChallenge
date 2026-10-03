/**
 * Single place for the store-facing details you'll need to fill in once and
 * never think about again. Everything that references them reads from here.
 */

export const APP_VERSION = '1.0.0';

/**
 * REQUIRED before Google Play will accept the app. Host the policy anywhere
 * public (a GitHub Pages page is fine and free) and paste the URL here.
 * A ready-to-publish draft lives at docs/PRIVACY_POLICY.md.
 */
export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://henitj.github.io/CongressionalAppChallenge/privacy';

/**
 * Optional: the public page that walks through getting an AI key (the
 * website's /api-key page). Set EXPO_PUBLIC_API_KEY_GUIDE_URL to show a
 * "step-by-step guide" line in the assistant's settings sheet; when it is
 * empty the line is simply not rendered.
 */
export const AI_KEY_GUIDE_URL = process.env.EXPO_PUBLIC_API_KEY_GUIDE_URL ?? '';

/** Shown in Settings and required on the Play listing. */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'ecotrek.support@gmail.com';

export const APP_NAME = 'EcoTrek';

