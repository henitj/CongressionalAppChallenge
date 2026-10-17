# EcoTrek Android download

`ecotrek.apk` is the direct-download Android WebView package, served from `/download` as an `EcoTrek.apk` attachment. `/` opens the web app directly; `/download` is a file response, not an install guide or platform landing page.

## Current artifact

| | |
| --- | --- |
| Version | 1.6.0 (versionCode 8) |
| Size | 8,608,698 bytes |
| SHA-256 | `091bf0de26c4f99793fe6f8500911354f1f342d6f1904aec71133f5bdef8ebc1` |
| Signing certificate | `C=US, O=EcoTrek Team, CN=EcoTrek` |
| Certificate SHA-256 | `74005b52c140cd4b45a1adb0e95ce31ea30e82b4e6db20197dc0c889901726d3` |
| Signatures | APK Signature Scheme v1 + v2 + v3; 4-byte aligned |
| Android | minSdk 24 (Android 7.0); targetSdk 34 |

`ecotrek-apk.json` contains the same release metadata; `ecotrek.apk.sha256` is suitable for `sha256sum -c`. Rebuilding the package regenerates both files.

## Verify or rebuild

Verify the downloaded binary with the project’s Python tools:

```bash
python3 -m pip install -r ../android-shell/requirements.txt
python3 ../android-shell/tools/validate_apk.py ecotrek.apk
```

To rebuild from current source, follow [`../android-shell/README.md`](../android-shell/README.md). The shell wraps the same web export served by the website. A rebuild requires Node/npm, Java, apktool, Python signing dependencies, and the project signing key.

The 1.6.0 APK was rebuilt from the refreshed Expo export. Its v1/v2/v3 signatures, certificate agreement, 151 referenced web assets, ZIP alignment, and `resources.arsc` storage were verified by the build script. Automated verification does **not** prove live GPS, map-tile, photo-provider, weather-provider, or Android device behavior; test on a physical phone before broad distribution.

## Sideloading and stores

Android may show a Play Protect warning for privately signed sideloaded apps. That is separate from the app’s cryptographic checks and does not mean this package is a Google Play release. This APK is not a Play Store submission; a store release requires a separately built native EAS candidate, current Play Console forms, and store review.
