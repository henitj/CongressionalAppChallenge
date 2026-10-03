/*
 * EcoTrek site configuration.
 *
 * One place for the facts the install and API-key pages print, so a new build
 * only has to be described once. android-shell/build.sh prints the matching
 * values (version, size, SHA-256, certificate fingerprint) after every build —
 * copy them here when you publish.
 */
window.ECOTREK_CONFIG = {
  // --- install paths -------------------------------------------------------
  // 'apk' serves the signed file from this site; switch to 'play' once a Play
  // Store listing exists.
  installMode: 'apk',
  apkUrl: '/downloads/ecotrek.apk',
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
  apkBytes: 1277979,
  apkSha256: '88916801c64e4dd05daf181b0923640b8d2fdd0515fac10e76cb3308dfb0e2df',
  signingCertSubject: 'CN=EcoTrek, O=EcoTrek Team, C=US',
  signingCertSha256: '74005b52c140cd4b45a1adb0e95ce31ea30e82b4e6db20197dc0c889901726d3',
  minAndroid: 'Android 7.0 (API 24)',
  targetSdk: 34,
  apkSigned: 'APK Signature Scheme v1 + v2 + v3 (4-byte aligned)',
};
