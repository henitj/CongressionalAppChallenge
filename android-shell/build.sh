#!/usr/bin/env bash
#
# Builds downloads/ecotrek.apk — the sideload Android package.
#
# The APK is a small, dependency-free WebView shell (see java/ for readable
# sources, smali/ for what actually ships) wrapped around the Expo web export
# of the app in ../EcoTrek.
#
# Pipeline:
#   1. export the web app (EcoTrek/scripts/postexport-web.mjs transpiles the
#      bundle for older Android System WebViews, adds the ES5 polyfill prelude
#      and injects the boot watchdog) and copy the result into ../app, which is
#      the single copy of the export used by both the APK and the website;
#   2. assemble the shell with apktool;
#   3. 4-byte align uncompressed entries and sign v1 + v2 + v3 with
#      tools/sign_apk.py (no Android SDK needed, only `cryptography`);
#   4. verify the finished file with tools/validate_apk.py, which re-derives
#      every digest and signature from the bytes on disk, and write
#      downloads/ecotrek-apk.json + downloads/ecotrek.apk.sha256 (the release
#      facts the website prints).
#
# Requirements:
#   - node + the EcoTrek npm install (for `expo export`, step 1 only)
#   - a Java runtime (java) for apktool
#   - apktool.jar (https://apktool.org, 2.4+)
#   - python3 dependencies in requirements.txt (`cryptography` for signing and
#     `asn1crypto` for the independent v1 signature check)
#
# Usage:
#   APKTOOL=/path/to/apktool.jar ./build.sh
#
# Useful switches:
#   SKIP_WEB_EXPORT=1   reuse the existing ../app export (no npm install needed)
#   ASSETS_DIR=...      stage the web assets from somewhere else
#
set -euo pipefail
cd "$(dirname "$0")"

APKTOOL="${APKTOOL:-apktool.jar}"
OUT="${OUT:-../downloads/ecotrek.apk}"
PYTHON="${PYTHON:-python3}"
EXPORT_DIR="${EXPORT_DIR:-../EcoTrek/dist}"
ASSETS_DIR="${ASSETS_DIR:-../app}"

if ! "$PYTHON" -c 'import cryptography, asn1crypto' >/dev/null 2>&1; then
  echo "Missing APK Python dependencies. Run: $PYTHON -m pip install -r requirements.txt" >&2
  exit 1
fi

# apktool only needs *a* JVM; jdk4py (a pip-installable JDK) is fine.
if [ -z "${JAVA:-}" ]; then
  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
    JAVA="$JAVA_HOME/bin/java"
  elif command -v java >/dev/null 2>&1; then
    JAVA="java"
  else
    JAVA="$("$PYTHON" -c 'import jdk4py, os; print(os.path.join(jdk4py.JAVA_HOME, "bin", "java"))' 2>/dev/null || true)"
  fi
fi
if [ -z "${JAVA:-}" ] || ! command -v "$JAVA" >/dev/null 2>&1 && [ ! -x "$JAVA" ]; then
  echo "No Java runtime found. Install one (or set JAVA=/path/to/java) to run apktool." >&2
  exit 1
fi

case "$ASSETS_DIR" in
  ../app|../EcoTrek/dist|/*) ;;
  *) echo "Refusing to use ASSETS_DIR=$ASSETS_DIR — it is not a known export directory." >&2; exit 1 ;;
esac

if [ "${SKIP_WEB_EXPORT:-0}" = "1" ]; then
  echo "==> 1/5 Reusing the existing web export in $ASSETS_DIR"
else
  echo "==> 1/5 Exporting the web app"
  (cd ../EcoTrek && npm run export:web)
  echo "    syncing $EXPORT_DIR -> $ASSETS_DIR"
  rm -rf "$ASSETS_DIR"
  cp -r "$EXPORT_DIR" "$ASSETS_DIR"
fi

echo "==> 2/5 Assembling the shell project"
BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT
cp -r AndroidManifest.xml apktool.yml res smali "$BUILD/"
cp -r "$ASSETS_DIR" "$BUILD/assets"

echo "==> 3/5 Building the APK (apktool)"
"$JAVA" -jar "$APKTOOL" b "$BUILD" -o "$BUILD/unsigned.apk"

echo "==> 4/5 Aligning + signing (v1 + v2 + v3)"
"$PYTHON" tools/sign_apk.py "$BUILD/unsigned.apk" "$OUT" \
  signing/ecotrek-release.key.pem signing/ecotrek-release.cert.pem

echo "==> 5/5 Verifying signatures and writing the release facts"
"$PYTHON" tools/validate_apk.py "$OUT"
"$PYTHON" tools/apk_release_info.py "$OUT" "${OUT%.apk}-apk.json" \
  signing/ecotrek-release.cert.pem "${OUT}.sha256"

echo
echo "Done: $OUT"
echo "Copy the values above into site-config.js (apkBytes, apkSha256, signingCertSha256) before publishing."
