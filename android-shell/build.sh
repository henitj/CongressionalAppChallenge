#!/usr/bin/env bash
#
# Builds downloads/ecotrek.apk — the sideload Android package.
#
# The APK is a small, dependency-free WebView shell (see java/ for readable
# sources, smali/ for what actually ships) wrapped around the Expo web export
# of the app in ../EcoTrek.
#
# Requirements:
#   - node + the EcoTrek npm install (for `expo export`)
#   - a Java runtime (java) for apktool
#   - apktool.jar (https://apktool.org, 2.4+)
#   - python3 with `cryptography` (pip install cryptography) for signing
#
# Usage:
#   APKTOOL=/path/to/apktool.jar ./build.sh
#
set -euo pipefail
cd "$(dirname "$0")"

APKTOOL="${APKTOOL:-apktool.jar}"
OUT="${OUT:-../downloads/ecotrek.apk}"

echo "==> 1/4 Exporting the web app"
(cd ../EcoTrek && npm run export:web)

echo "==> 2/4 Assembling the shell project"
BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT
cp -r AndroidManifest.xml apktool.yml res smali "$BUILD/"
cp -r ../EcoTrek/dist "$BUILD/assets"

echo "==> 3/4 Building the APK (apktool)"
java -jar "$APKTOOL" b "$BUILD" -o "$BUILD/unsigned.apk"

echo "==> 4/4 Signing (v1, see tools/sign_v1.py)"
python3 tools/sign_v1.py "$BUILD/unsigned.apk" "$OUT" \
  signing/ecotrek-release.key.pem signing/ecotrek-release.cert.pem
python3 tools/verify_v1.py "$OUT"

echo "Done: $OUT"
