# EcoTrek Android WebView shell

`downloads/ecotrek.apk` is a direct file download from `/download`; this folder contains the reproducible sideload shell source. It is separate from the Vercel website entry, which opens the web app directly at `/`.

## What ships

The APK is a small Android WebView around the Expo web export in `../EcoTrek`.

| Component | Responsibility |
| --- | --- |
| `MainActivity` | Hosts the web app on a virtual HTTPS origin, keeps Android text zoom at 100%, forwards Back to React Navigation, and handles location/photo-picker results. |
| `AppWebViewClient` | Serves the packaged app assets from `https://appassets.ecotrek.app` and opens external links in the browser. |
| `AppChromeClient` | Bridges foreground geolocation requests to Android permission prompts and the web profile-photo picker to the system picker. |

Readable Java references are in `java/`; the equivalent classes assembled into the APK are in `smali/`. There is no child authentication window or user-facing Grok/AI chat in the current app.

## Why the virtual HTTPS origin matters

The previous shell loaded `file:///android_asset/index.html`. From a `file://` origin, Android WebView blocks cross-origin `fetch()` and geolocation because it is not a secure context. Serving the same files through `shouldInterceptRequest` on an HTTPS origin lets the app use its online trail, photo, weather, and map providers and request foreground GPS. The app does not request background location.

`setTextZoom(100)` prevents Android font boosting from distorting layouts, while the exported HTML includes a viewport reset and compatibility prelude for older System WebViews. Trail maps use OpenStreetMap tiles with attribution; if tiles fail, the recorded route remains available as a local sketch with retry.

User profile and activity data remain local by default. Optional server-side trail information is configured separately; the app has no user question/chat flow. See [`../EcoTrek/docs/PRIVACY_POLICY.md`](../EcoTrek/docs/PRIVACY_POLICY.md) for provider and optional-backend details.

## Rebuild the APK

```bash
APKTOOL=/path/to/apktool.jar ./build.sh
```

Requirements: Node.js and `npm ci` in `../EcoTrek`, a Java runtime, apktool 2.4+, and the Python packages in `requirements.txt` (`cryptography` and `asn1crypto`). The build exports the web app, transpiles it for older Android WebViews, validates referenced assets, syncs the generated app tree to `../app`, assembles the shell, signs it v1 + v2 + v3, and validates the final APK. `downloads/ecotrek-apk.json` and `downloads/ecotrek.apk.sha256` are refreshed by the release-info step.

Useful environment variables:

| Variable | Meaning |
| --- | --- |
| `SKIP_WEB_EXPORT=1` | Reuse the existing web export in `../app`; does not run the Expo export. |
| `ASSETS_DIR=...` | Use `../app`, `../EcoTrek/dist`, or an absolute export directory as staged APK assets. |
| `OUT=...` | Write the APK somewhere other than `downloads/ecotrek.apk`. |
| `JAVA=...`, `PYTHON=...`, `APKTOOL=...` | Select tool locations. |

To verify the exported web app without building Android, run from `../EcoTrek`:

```bash
npm ci
npm run typecheck
npm test
npm run verify
npm run export:web
```

To publish to Google Play, build and review a native EAS Android release separately; this WebView APK is a sideload artifact, not a Play Store approval.

## Editing the shell

Edit the `.java` reference files first, then mirror the change into the matching `.smali` file. `apktool` assembles `smali/` into `classes.dex`; no Android SDK or Gradle is required.

```bash
java -jar APKTOOL.jar d ../downloads/ecotrek.apk -o /tmp/ecotrek-apk-check -f
diff smali/com/ecotrek/app/AppWebViewClient.smali /tmp/ecotrek-apk-check/smali/com/ecotrek/app/AppWebViewClient.smali
```

The diff should contain only apktool-renamed labels. A successful assembly or source-contract test is not a substitute for testing GPS, permissions, file picking, network access, and navigation on a physical Android device.

## Signing

The checked-in release key is for sideload updates; changing it requires users to uninstall the old APK before installing a newly signed one. It is not a Play Store credential. The build validates signatures and content digests, but do not describe an APK as newly verified unless a current build was run.
