# EcoTrek Android download

The signed Android APK is intentionally not committed to the repository.
Build it with EAS, then publish it at this path or update `apkUrl` in
`/site-config.js` to point at a public EAS artifact or GitHub Release asset.

From `EcoTrek/`:

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
