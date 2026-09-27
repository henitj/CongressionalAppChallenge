# EcoTrek Android download

The signed APK is intentionally not committed to the repository. Build it with
EAS, then upload the resulting file here as `ecotrek.apk`, or update
`apkUrl` in `/site-config.js` to point at a public EAS artifact or GitHub
Release asset.

From `EcoTrek/`:

```bash
npx eas build --platform android --profile apk
```

The landing page button is already wired to `/downloads/ecotrek.apk`.
