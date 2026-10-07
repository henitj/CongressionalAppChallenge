# EcoTrek Android shell

This folder builds `downloads/ecotrek.apk` — the direct-download Android
package served from the install guide.

## What it is

A ~1.3 MB, dependency-free **WebView shell** around the Expo *web* export of
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

> **One branch, one white screen.** The interceptor rewrites the requested path
> to `/index.html` for *one* case only — a request for `/`. If that comparison
> is inverted, every request (the JS bundle included) is answered with
> `index.html` as `text/html`, the app never boots, and all the user sees is a
> white screen. `smali/com/ecotrek/app/AppWebViewClient.smali` carries a comment
> on that line; keep it in step with `java/AppWebViewClient.java`, which is the
> readable reference.

## Rebuilding

```bash
APKTOOL=/path/to/apktool.jar ./build.sh
```

The script exports the web app (`npm run export:web` in `../EcoTrek`),
transpiles the bundle for older Android System WebViews and adds the ES5
polyfill prelude and boot watchdog (that work lives in
`../EcoTrek/scripts/postexport-web.mjs` + `web-compat.mjs`), copies the export
to `../app`, assembles this project with apktool, then aligns and signs with
`signing/ecotrek-release.key.pem` using **v1 + v2 + v3**. Install the Python
helpers once with `python3 -m pip install -r requirements.txt`; the release
validator needs both `cryptography` and `asn1crypto`.

Useful switches:

| Variable | Meaning |
| --- | --- |
| `SKIP_WEB_EXPORT=1` | reuse the existing `../app` export — no npm install needed |
| `ASSETS_DIR=...` | stage the web assets from somewhere else (must be `../app` or `../EcoTrek/dist`) |
| `OUT=...` | write the APK somewhere other than `downloads/ecotrek.apk` |
| `JAVA=...`, `PYTHON=...`, `APKTOOL=...` | tool paths (a pip-installed JDK via `jdk4py` is detected automatically) |

Every build ends by running `tools/validate_apk.py` (which re-derives the
signatures and content digests from the finished file) and
`tools/apk_release_info.py` (which writes `../downloads/ecotrek-apk.json` and
`../downloads/ecotrek.apk.sha256`). Copy the printed `size`, `sha-256` and
certificate fingerprint into `../site-config.js` and the facts on the install
page update with them.

> **Keep the signing key.** Installing an update signed with a different key
> forces users to uninstall first. The key here is a self-signed sideload key
> (like a debug keystore), not a Play Store credential.

If you later publish to Google Play, build the real native app instead:

```bash
cd ../EcoTrek && npx eas build --platform android --profile production
```

## Editing the shell

Edit the `.java` reference files first, then mirror the change into the
matching `.smali` file (they are deliberately kept line-for-line parallel).
apktool assembles `smali/` into `classes.dex` during `build.sh` — no Android
SDK or Gradle required. After a build you can prove what shipped with:

```bash
java -jar APKTOOL.jar d ../downloads/ecotrek.apk -o /tmp/apkverify -f
diff smali/com/ecotrek/app/AppWebViewClient.smali /tmp/apkverify/smali/com/ecotrek/app/AppWebViewClient.smali
```

(the only differences should be apktool's renamed labels).

## Tools

| Tool | What it does |
| --- | --- |
| `tools/sign_apk.py` | 4-byte aligns uncompressed entries, then signs v1 (JAR) + v2 + v3. Pure Python + `cryptography`. |
| `tools/validate_apk.py` | Independent verifier: v2/v3 content digests, signatures, v1 chain, cert agreement, bundled assets, alignment, `resources.arsc`. |
| `tools/apk_release_info.py` | Reads the binary `AndroidManifest.xml` and the signing block to print version, SDK levels, size, SHA-256 and certificate fingerprint. |
| `tools/apksig.py` | The APK Signature Scheme v1/v2/v3 primitives the two tools above share. |
| `tools/sign_v1.py`, `tools/verify_v1.py` | The original JAR-signing-only scripts, kept for reference and for old test vectors. |
