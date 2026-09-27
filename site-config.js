/*
 * Public landing-page configuration.
 *
 * Android uses a signed APK or Google Play URL. iPhone uses the App Store or
 * TestFlight URL — a raw IPA downloaded from a website is not a generally
 * installable iPhone distribution package.
 */
window.ECOTREK_CONFIG = {
  // Keep `apk` while the direct Android download is the public install path.
  // Change this to `play` once the app is published in Google Play.
  installMode: 'apk',
  apkUrl: '/downloads/ecotrek.apk',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.ecotrek.app',
  webAppUrl: '/app/',

  // Paste the public App Store or TestFlight URL here after making the iOS
  // build. The page automatically uses it when opened on an iPhone or iPad.
  iosUrl: '',
};
