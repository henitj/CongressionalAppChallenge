# EcoTrek Android download

`ecotrek.apk` is the direct-download Android package served from the landing
page. It is a small WebView shell around the Expo web export of the app —
see **`/android-shell/README.md`** for how it works and how to rebuild it:

```bash
APKTOOL=/path/to/apktool.jar ../android-shell/build.sh
```

The shell serves the app on a secure virtual origin, so trail search,
weather, GPS and the assistant's optional AI upgrade all work exactly like
they do in the browser. It targets SDK 29 (installable on Android 7.0+).

For a Google Play release, build the real native app with EAS instead:

```bash
cd ../EcoTrek
npx eas build --platform android --profile production
```

For iPhone, distribute through the App Store / TestFlight:

```bash
npx eas build --platform ios --profile production
```

After the iOS build is approved, paste its public URL into `iosUrl` in
`/site-config.js`. The landing page automatically opens the iOS link for
iPhone and iPad visitors.
