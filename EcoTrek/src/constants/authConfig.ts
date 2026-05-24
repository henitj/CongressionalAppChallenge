/**
 * Google OAuth client IDs.
 *
 * 1. Go to https://console.cloud.google.com/apis/credentials
 * 2. Create an OAuth 2.0 Client ID for each platform you're targeting:
 *    - Web → use the Expo redirect URI for web (https://yourdomain or http://localhost:8081)
 *    - iOS → bundle ID: com.ecotrek.app  (and add reversed client id below)
 *    - Android → package: com.ecotrek.app + SHA-1 from `eas credentials`
 * 3. Drop the client IDs here.
 *
 * If you leave the placeholders, the sign-in button stays disabled and the
 * "Continue as guest" button still lets you use the app.
 */
export const GOOGLE_AUTH = {
  expoClientId: 'YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com',
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
};

export function isGoogleConfigured() {
  return !Object.values(GOOGLE_AUTH).some((v) => v.startsWith('YOUR_'));
}
