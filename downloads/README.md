# EcoTrek Android download

`ecotrek.apk` is the direct-download Android package, served from the short
website URL `/download` (as an `EcoTrek.apk` attachment). It is a small, signed
WebView shell around the same Expo web build the website serves — see
[`/android-shell/README.md`](../android-shell/README.md) for how it works and
how to rebuild it:

```bash
APKTOOL=/path/to/apktool.jar ../android-shell/build.sh
```

## Release facts

| | |
| --- | --- |
| Version | 1.2.0 (versionCode 3) |
| Size | 1,800,427 bytes |
| SHA-256 | `b0f309a6cc02151062044704c7648ddcd8e03f4842bac9dc734d553ca6ddfcf7` |
| Signing certificate | `CN=EcoTrek, O=EcoTrek Team, C=US` |
| Certificate SHA-256 | `74005b52c140cd4b45a1adb0e95ce31ea30e82b4e6db20197dc0c889901726d3` |
| Signatures | APK Signature Scheme **v1 + v2 + v3** (4-byte aligned) |
| Android | minSdk 24 (Android 7.0) · targetSdk 34 |

`ecotrek-apk.json` holds the same numbers machine-readably (the install page and
`site-config.js` are filled from it) and `ecotrek.apk.sha256` is the line
`sha256sum -c` expects. Every build rewrites all three, so these values move
whenever the shell or the web export does.

Verify the published file yourself — no Android SDK or apktool needed. Install
the Python helpers first (`python3 -m pip install -r ../android-shell/requirements.txt`):

```bash
python3 ../android-shell/tools/validate_apk.py ecotrek.apk
```

It re-derives the v2/v3 content digests from the bytes on disk, checks the v1
JAR chain, confirms v1 and v2/v3 are signed by the same certificate, that the
web bundle's assets are all bundled, and that the uncompressed entries are
aligned.

## Play Protect

Sideloaded apps come from a signing key Google has never attested, so Android
may show **“Play Protect doesn’t recognise this app”** or **“Unsafe app
blocked”** with `More → Install`. That prompt is a property of distributing
outside Google Play and it is the same for F-Droid, Amazon, or a company
intranet. `install/android.html` walks through it and explains what the panel
does and does not mean, and the hash table above lets anyone confirm the file
they downloaded is the file that was published.

What *can* be fixed to keep Play Protect and Android itself happy has been:

- v1 + v2 + v3 signatures (a v1-only APK is exactly what "unsafe app blocked"
  usually means on Android 11+);
- `targetSdk 34` — a stale `targetSdk` is the other common trigger, and Play
  requires a current one for published apps;
- `resources.arsc` stored uncompressed and 4-byte aligned (required from
  API 30);
- no cleartext traffic, no ad or analytics SDK, no `debuggable` flag, and only
  the two permissions the app actually uses (internet, location).

## Publishing

For a Google Play release, build the real native app instead:

```bash
cd ../EcoTrek
npx eas build --platform android --profile production
```

For iPhone, distribute through the App Store / TestFlight:

```bash
npx eas build --platform ios --profile production
```

After the iOS build is approved, paste its public URL into `iosUrl` in
`/site-config.js`; `install/ios.html` switches from the Home Screen steps to
the store button automatically. Until then the site sends iPhone and iPad
visitors to those steps, and Android visitors to `install/android.html`.
