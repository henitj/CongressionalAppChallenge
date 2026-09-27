# EcoTrek Android download

The direct Android download package `ecotrek.apk` is provided in this directory for immediate installation from the landing page.

To build an updated release binary with EAS from `EcoTrek/`:

```bash
npx eas build --platform android --profile apk
```

For iPhone, build the iOS app through Apple distribution instead of uploading a
raw IPA:

```bash
npx eas build --platform ios --profile production
```

After the iOS build is approved in the App Store or available in TestFlight,
paste that public URL into `iosUrl` in `/site-config.js`. The landing page
automatically opens the iOS link for iPhone and iPad visitors.
