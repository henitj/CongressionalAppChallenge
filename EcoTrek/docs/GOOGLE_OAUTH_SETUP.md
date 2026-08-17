# Google OAuth setup

Roughly 20 minutes. Do it once and never touch it again.

You do **not** edit any source file — every value goes in `.env`.

---

## 1. Create your own Cloud project

The client IDs currently checked into the repo belong to project
`140635508834`, which is not yours. Make your own.

1. https://console.cloud.google.com/projectcreate
2. Name it `EcoTrek`.

## 2. OAuth consent screen

**APIs & Services → OAuth consent screen**

- User type: **External**
- App name: `EcoTrek`
- Support email: your team's address
- Developer contact: same
- **Scopes: add only `email`, `profile`, `openid`.**

That last point matters. Those three are non-sensitive, so Google does not put
you through its verification review. Add anything beyond them and you are into
a multi-week process for no benefit — the app does not need any other scope.

Then **Publish app**. While it is in Testing mode only accounts on your test
list can sign in, which will look like a broken app to a Play reviewer.

## 3. Create three OAuth clients

**APIs & Services → Credentials → Create credentials → OAuth client ID**

### Web

Type: Web application

Authorized JavaScript origins:
```
http://localhost:8081
https://auth.expo.io
```

Authorized redirect URIs:
```
https://auth.expo.io/@YOUR_EXPO_USERNAME/ecotrek
http://localhost:8081
```

Replace `YOUR_EXPO_USERNAME` with your actual Expo account name
(`npx expo whoami`).

### iOS

Type: iOS · Bundle ID: `com.ecotrek.app`

### Android

Type: Android · Package name: `com.ecotrek.app`

For the SHA-1 fingerprint:

```bash
eas credentials
# → Android → production → Keystore → show the SHA-1
```

> **This is the single most common reason Google sign-in works in testing and
> then fails on the Play Store.** The debug keystore has a different SHA-1 to
> the release keystore Play signs with. Use the release one. If you also want
> sign-in to work in a local debug build, add a *second* Android OAuth client
> with the debug SHA-1:
>
> ```bash
> keytool -list -v -keystore ~/.android/debug.keystore \
>   -alias androiddebugkey -storepass android -keypass android
> ```
>
> Two clients, same package name, different fingerprints — that is allowed and
> is the normal setup.

Also note: if you use **Play App Signing** (the default, and recommended),
Google re-signs your app with *their* key. The SHA-1 you need is then the one
shown in **Play Console → Setup → App integrity → App signing key
certificate**, not your upload key. Add that one too.

## 4. Paste them in

`EcoTrek/.env`:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxx-web.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxx-ios.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxx-android.apps.googleusercontent.com
```

Restart the dev server (env vars are read at bundle time, not runtime).

Client IDs are public by design and safe to ship inside the app. Client
**secrets** are not — the app never needs one, so if you are copying a secret
somewhere, stop.

## 5. iOS URL scheme

If you build for iOS, `app.json` needs the reversed iOS client ID:

```json
"CFBundleURLTypes": [
  { "CFBundleURLSchemes": ["com.googleusercontent.apps.YOUR-IOS-CLIENT-ID"] }
]
```

`iosUrlScheme()` in `src/constants/authConfig.ts` builds that string for you if
you want to check it.

## 6. Backend

If you are running `server/`, list every client ID you accept tokens from:

```
GOOGLE_CLIENT_IDS=xxxx-web...,xxxx-ios...,xxxx-android...
```

The API verifies each incoming ID token against Google's public keys and checks
the audience is one of these. That check is what stops someone POSTing another
user's id.

---

## Checking it worked

`isGoogleConfigured()` is per-platform, so a missing Android client will not be
hidden by a working iOS one. `googleConfigProblems()` returns a list of exactly
what is absent — call it from a screen if you want to see it.

Test on a **release build on a real Android phone** before submitting. Expo Go
uses the Expo proxy and a different signing key, so it proves nothing about
whether your production sign-in works.
