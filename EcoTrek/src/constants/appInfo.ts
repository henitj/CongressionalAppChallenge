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

/** Shown in Settings and required on the Play listing. */
export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'ecotrek.support@gmail.com';

export const APP_NAME = 'EcoTrek';

