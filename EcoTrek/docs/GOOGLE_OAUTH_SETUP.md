# Setting up Google Sign-In for EcoTrek

EcoTrek uses [`expo-auth-session`](https://docs.expo.dev/guides/google-authentication/) with the Google provider. That gives you real Google OAuth on **iOS, Android, and the Web** from one code path.

Until you complete the steps below, the Google button is disabled and "Continue as guest" is the working sign-in path.

---

## 1. Create a Google Cloud project
1. Go to [console.cloud.google.com](https://console.cloud.google.com/) → create a new project (e.g. `EcoTrek`).
2. APIs & Services → **OAuth consent screen** → External → fill in app name, support email, developer email. Add scopes `.../auth/userinfo.email` and `.../auth/userinfo.profile`. Add yourself as a test user while in "Testing" mode.

## 2. Create OAuth 2.0 client IDs

You'll create **one per platform**, all under *APIs & Services → Credentials → Create Credentials → OAuth client ID*.

### Web client (covers `npx expo start --web` and Expo Go via auth proxy)
- Type: **Web application**
- Authorized JavaScript origins:
  - `http://localhost:8081`
  - `https://auth.expo.io`
- Authorized redirect URIs:
  - `https://auth.expo.io/@your-expo-username/ecotrek`
  - `http://localhost:8081`

### iOS client
- Type: **iOS**
- Bundle ID: `com.ecotrek.app`
- After creating, note the **iOS URL scheme** (reversed client id). Add it to `app.json`:

```json
"ios": {
  "bundleIdentifier": "com.ecotrek.app",
  "infoPlist": {
    "CFBundleURLTypes": [
      { "CFBundleURLSchemes": ["com.googleusercontent.apps.YOUR_IOS_CLIENT_ID"] }
    ]
  }
}
```

### Android client
- Type: **Android**
- Package name: `com.ecotrek.app`
- SHA-1: run `eas credentials` (after `npm i -g eas-cli`) and pick Android → keystore → fingerprint, **or** for local dev `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`.

### Expo client (Expo Go shortcut)
- Use the same **Web client ID** value for the `expoClientId` field — `expo-auth-session` uses the Expo auth proxy and your web client to complete the round-trip from Expo Go.

## 3. Paste the IDs into the app

Open `src/constants/authConfig.ts` and replace the placeholders:

```ts
export const GOOGLE_AUTH = {
  expoClientId:    'xxxxxxxx-web.apps.googleusercontent.com',
  webClientId:     'xxxxxxxx-web.apps.googleusercontent.com',
  iosClientId:     'xxxxxxxx-ios.apps.googleusercontent.com',
  androidClientId: 'xxxxxxxx-and.apps.googleusercontent.com',
};
```

Restart Metro (`npx expo start -c`). The Google button on the sign-in screen will activate, and clicking it will:

- **Web**: open the Google consent popup at `accounts.google.com`.
- **iOS/Android (Expo Go)**: open the system browser → Google consent → redirect back via `auth.expo.io` → return to the app.
- **iOS/Android (standalone / EAS build)**: open the system browser → redirect directly to `com.ecotrek.app://` via the reversed client id scheme.

On success the app fetches the user's Google profile (name, email, picture), stores it in AsyncStorage, and shows the main tabs.

---

## Notes

- The session persists across app launches via `@react-native-async-storage/async-storage` under key `@ecotrek/auth_user`.
- Tap the avatar in the top-right header → **Sign out** to clear it.
- For production builds add the production SHA-1 fingerprint to the Android client and submit your OAuth consent screen for verification.
