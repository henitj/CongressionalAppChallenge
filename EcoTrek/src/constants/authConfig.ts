import { Platform } from 'react-native';

/**
 * Google OAuth configuration.
 *
 * ── Setup, once ───────────────────────────────────────────────────────────
 * You should not have to edit this file. Put your client IDs in `.env` at the
 * project root (copy `.env.example`) and they get picked up automatically:
 *
 *     EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com
 *     EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...apps.googleusercontent.com
 *     EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...apps.googleusercontent.com
 *
 * Where to get them: https://console.cloud.google.com/apis/credentials
 *   • Web client       — Authorized redirect URIs must include
 *                        https://auth.expo.io/@<your-expo-username>/ecotrek
 *                        and http://localhost:8081 for local web testing.
 *   • iOS client       — Bundle ID: com.ecotrek.app
 *   • Android client   — Package: com.ecotrek.app
 *                        SHA-1 fingerprint: run `eas credentials` and use the
 *                        fingerprint of the **release** keystore Play will
 *                        sign with. The debug keystore fingerprint will NOT
 *                        work on a Play Store build — this is the single most
 *                        common reason Google sign-in works in testing and
 *                        fails in production.
 *
 * Client IDs are not secrets — they are designed to be public and shipping
 * them in the app bundle is expected. Client *secrets* are a different thing
 * and must never appear here.
 */

const env = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
};

export const GOOGLE_AUTH = {
  /** Expo Go / proxy flows reuse the web client. */
  expoClientId: env.web,
  webClientId: env.web,
  iosClientId: env.ios,
  androidClientId: env.android,
};

function looksReal(id: string): boolean {
  return id.length > 0 && !id.startsWith('YOUR_') && id.endsWith('.apps.googleusercontent.com');
}

/**
 * True when the current platform has a usable client ID. Checked per-platform
 * so a missing Android ID doesn't silently break the Play Store build while
 * everything looks fine on iOS.
 */
export function isGoogleConfigured(): boolean {
  if (Platform.OS === 'android') {
    // Android needs its own client; Expo Go falls back to the web one.
    return looksReal(GOOGLE_AUTH.androidClientId) || looksReal(GOOGLE_AUTH.expoClientId);
  }
  if (Platform.OS === 'ios') {
    return looksReal(GOOGLE_AUTH.iosClientId) || looksReal(GOOGLE_AUTH.expoClientId);
  }
  return looksReal(GOOGLE_AUTH.webClientId);
}

/** Surfaces exactly what is missing, so setup problems are obvious. */
export function googleConfigProblems(): string[] {
  const out: string[] = [];
  if (!looksReal(GOOGLE_AUTH.webClientId)) out.push('Web client ID is missing.');
  if (!looksReal(GOOGLE_AUTH.iosClientId)) out.push('iOS client ID is missing.');
  if (!looksReal(GOOGLE_AUTH.androidClientId))
    out.push('Android client ID is missing — Google sign-in will fail on the Play Store build.');
  return out;
}
