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
  expoClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  webClientId: '140635508834-8p2onen68nm93bgavok2k5inrb1ffl0h.apps.googleusercontent.com',
  iosClientId: '140635508834-cdba42jq8ifogv0ac0ps0t5p6s840a7k.apps.googleusercontent.com',
  androidClientId: '',
};

export function isGoogleConfigured() {
  return (
    GOOGLE_AUTH.webClientId &&
    GOOGLE_AUTH.iosClientId &&
    !GOOGLE_AUTH.webClientId.startsWith('YOUR_') &&
    !GOOGLE_AUTH.iosClientId.startsWith('YOUR_')
  );
}
