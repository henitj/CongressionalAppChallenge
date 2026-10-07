/*
 * EcoTrek site configuration.
 *
 * One place for the release facts the install page prints, so a new build
 * only has to be described once. android-shell/build.sh prints the matching
 * values (version, size, SHA-256, certificate fingerprint) after every build —
 * copy them here when you publish.
 */
window.ECOTREK_CONFIG = {
  // --- install paths -------------------------------------------------------
  // 'apk' serves the signed file from this site; switch to 'play' once a Play
  // Store listing exists.
  installMode: 'apk',
  // Stable, short URL. The hosting config rewrites this to the APK artifact,
  // while keeping the response as a binary attachment.
  apkUrl: '/download',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.ecotrek.app',

  // Paste the public App Store or TestFlight URL here after the iOS build is
  // approved; the iPhone page then shows the store button instead of only the
  // Home Screen instructions.
  iosUrl: '',

  // --- app pages -----------------------------------------------------------
  webAppUrl: '/',
  androidInstallUrl: '/install/android.html',
  iosInstallUrl: '/install/ios.html',
  apiKeyUrl: '/api-key.html',

  // --- release facts (printed on the pages) --------------------------------
  apkVersion: '1.2.0',
  apkVersionCode: 3,
  apkBytes: 1800427,
  apkSha256: 'b0f309a6cc02151062044704c7648ddcd8e03f4842bac9dc734d553ca6ddfcf7',
  signingCertSubject: 'CN=EcoTrek, O=EcoTrek Team, C=US',
  signingCertSha256: '74005b52c140cd4b45a1adb0e95ce31ea30e82b4e6db20197dc0c889901726d3',
  minAndroid: 'Android 7.0 (API 24)',
  targetSdk: 34,
  apkSigned: 'APK Signature Scheme v1 + v2 + v3 (4-byte aligned)',
};
