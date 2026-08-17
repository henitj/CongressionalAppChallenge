/**
 * Dynamic Expo config.
 *
 * `app.json` is static — it cannot read environment variables. Anything that
 * differs between your machine, CI and a release build has to be injected
 * here instead, or it ships as the literal string "$MY_VAR".
 *
 * Two things need that treatment:
 *
 *   1. The Android Google Maps key. Without it the native map on Android
 *      renders as a blank grey rectangle. It is free for mobile map display,
 *      but it is required.
 *        → Enable "Maps SDK for Android" at console.cloud.google.com,
 *          create an API key, and put it in .env as GOOGLE_MAPS_ANDROID_KEY.
 *
 *   2. The iOS URL scheme for Google sign-in, which is the iOS OAuth client
 *      id with its parts reversed. Deriving it from the client id means there
 *      is only one value to keep correct instead of two that must match.
 *
 * Everything else still lives in app.json, which stays readable and diffable.
 */

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const MAPS_ANDROID_KEY = process.env.GOOGLE_MAPS_ANDROID_KEY ?? '';

/** Turns 123-abc.apps.googleusercontent.com into com.googleusercontent.apps.123-abc */
function reversedClientId(clientId) {
  if (!clientId.endsWith('.apps.googleusercontent.com')) return null;
  return `com.googleusercontent.apps.${clientId.replace('.apps.googleusercontent.com', '')}`;
}

module.exports = ({ config }) => {
  const scheme = reversedClientId(IOS_CLIENT_ID);

  if (!MAPS_ANDROID_KEY && process.env.EAS_BUILD_PLATFORM === 'android') {
    // Fail loudly at build time rather than shipping a blank map.
    console.warn(
      '\n  GOOGLE_MAPS_ANDROID_KEY is not set. The Android map will render blank.\n' +
        '  See docs/LAUNCH_CHECKLIST.md, section 5.\n'
    );
  }

  return {
    ...config,

    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        // Only added when an iOS client id exists — an empty scheme array
        // makes the app fail App Store validation.
        ...(scheme ? { CFBundleURLTypes: [{ CFBundleURLSchemes: [scheme] }] } : {}),
      },
    },

    android: {
      ...config.android,
      ...(MAPS_ANDROID_KEY
        ? { config: { googleMaps: { apiKey: MAPS_ANDROID_KEY } } }
        : {}),
    },
  };
};
