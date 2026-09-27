/*
 * Public landing-page configuration.
 *
 * The APK is intentionally not checked into this repository. Build a signed
 * Android APK with the EcoTrek `apk` EAS profile, then place it at this URL
 * (or replace `apkUrl` with the public EAS/GitHub release URL).
 */
window.ECOTREK_CONFIG = {
  // Keep `apk` while the direct download is the public install path. Change
  // this to `play` once the app is published in Google Play.
  installMode: 'apk',
  apkUrl: '/downloads/ecotrek.apk',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.ecotrek.app',
};
