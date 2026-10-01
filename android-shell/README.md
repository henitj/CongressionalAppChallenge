# EcoTrek Android shell

This folder builds `downloads/ecotrek.apk` — the direct-download Android
package served from the landing page.

## What it is

A ~1 MB, dependency-free **WebView shell** around the Expo *web* export of
the app in `../EcoTrek`. It contains three tiny classes (readable sources in
`java/`, the shipped smali in `smali/`):

| Class | Job |
| --- | --- |
| `MainActivity` | Creates the WebView, locks `textZoom` to 100, enables standard viewport behaviour, handles back navigation, permission results and file-chooser results. |
| `AppWebViewClient` | Serves the bundled web app from `assets/` on the **virtual secure origin** `https://appassets.ecotrek.app`, and opens external links in the browser. |
| `AppChromeClient` | Bridges web geolocation to the Android permission dialog, and `<input type="file">` to the system photo picker. |

## Why the virtual HTTPS origin matters

The previous shell loaded `file:///android_asset/index.html`. From a `file://`
origin, Android WebView blocks cross-origin `fetch()` (so trail search,
weather and AI calls all failed) and refuses geolocation (not a secure
context). Serving the same files through `shouldInterceptRequest` on an
`https://` origin makes the app behave exactly like it does in Chrome:
network calls, GPS, and localStorage all work.

It also fixes the "stretched / shifted" rendering: `setTextZoom(100)`
disables Android's font boosting and `setUseWideViewPort(true)` makes the
WebView honour the page's `<meta name="viewport">`.

## Rebuilding

```bash
APKTOOL=/path/to/apktool.jar ./build.sh
```

The script exports the web app (`npm run export:web` in `../EcoTrek`),
assembles this project with apktool, and signs with
`signing/ecotrek-release.key.pem` (v1/JAR scheme — valid on every Android
version because the app targets SDK 29; `minSdk` is 24 / Android 7.0).

> **Keep the signing key.** Installing an update signed with a different key
> forces users to uninstall first. The key here is a self-signed sideload
> key (like a debug keystore), not a Play Store credential.

If you later publish to Google Play, build the real native app instead:

```bash
cd ../EcoTrek && npx eas build --platform android --profile production
```

## Editing the shell

Edit the `.java` reference files first, then mirror the change into the
matching `.smali` file (they are deliberately kept line-for-line parallel).
apktool assembles `smali/` into `classes.dex` during `build.sh` — no Android
SDK or Gradle required.
