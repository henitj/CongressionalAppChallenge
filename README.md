# EcoTrek

EcoTrek is a local-first outdoor activity tracker and conservation companion built for the **Congressional App Challenge** by Henit Jain, Matan Heber, Arjun Averineni, and Basil Vinesh.

The Expo / React Native app runs on web, iOS, and Android. People can record outdoor activities, discover nearby trails, check conditions, browse trail photos, and grow a virtual tree to Sage in six calendar months with steady weekly care and outdoor activity.

## The website opens the app

The repository’s Vercel root (`/`) launches EcoTrek directly on every platform. There is no platform chooser, marketing home page, Android/iPhone install page, or Grok chat page in the launch flow. The exported app lives in `app/`; `index.html` at the repository root is generated from the same export. `/app/` is an additional direct app entry point. `/download` is a direct APK file download, not an install landing page. `/privacy` is the privacy policy.

Build the web export and regenerate the root entry from the app directory:

```bash
cd EcoTrek
npm ci
npm run export:web
```

Preview the full repository site after exporting:

```bash
cd ..
node serve-site.mjs
```

Then open `http://localhost:8000/`. Vercel’s root configuration is in `vercel.json`; it serves the app at `/`, rewrites valid app routes to the export, retains the direct `/download` endpoint, and has no platform install redirects.

## Product features

- **Activity tracking:** GPS walks, hikes, and rides with location-retry handling, route recording, distance and duration summaries, and an offline route sketch if map tiles fail.
- **Step counting:** walks also count footsteps from the phone's motion sensor (`EcoTrek/src/services/steps.ts`), so a lap around the house is measured even when GPS cannot see it. Distance is whichever of GPS and steps saw more; nothing from the sensor is stored.
- **Worldwide trail discovery:** When location is granted, EcoTrek looks up named OpenStreetMap trails around the device. Austin’s richer bundled catalogue is used only when coordinates are actually near Austin. Successful results are cached on-device; failed empty lookups remain retryable. No location is silently replaced with Austin.
- **Trail details and sharing:** Trail-specific photo browsing with a local illustration and retry when Commons photos are unavailable; share a selected trail’s details, map pin, and up to two related photo links.
- **Local conditions:** Location-based forecasts and safety information when a real location is available. The app never requests background location in the website or WebView APK.
- **Tree growth:** A one-time introduction previews gradual growth and the oldest sage stage. The tree page shows growth pace and care milestones, without exposing illustration-image counts.
- **Local-first progress:** Profiles, walks, points, tree care, ratings, and settings are stored on-device by default. An optional API can provide a public approved-trail catalogue; this build has no Google sign-in, so it does not sync a guest profile’s private data to a cloud account.
- **Accessible layouts:** Scalable typography, responsive screens, reduced-motion support, keyboard-aware inputs, and mobile/tablet layouts.

There is **no user-facing Grok or AI chatbot**. The optional backend’s trail-intelligence service is separate from chat and can continue to provide background trail-data enrichment. Location, map, photo, weather, and backend requests are described in [`EcoTrek/docs/PRIVACY_POLICY.md`](EcoTrek/docs/PRIVACY_POLICY.md) and [`privacy.html`](privacy.html).

## Development and checks

Requirements: Node.js 20+ and npm.

```bash
cd EcoTrek
npm ci
npm run typecheck
npm test
npm run verify
```

To test the generated website and routes from the repository root:

```bash
node --test tests/*.test.mjs
```

For browser checks, export the web app, start `node serve-site.mjs` from the repository root, then run:

```bash
cd EcoTrek
npx playwright install chromium
npm run test:web
```

Browser tests mock location, maps, and external services; they are regression checks, not proof that live third-party services or physical devices work.

## Android package

`downloads/ecotrek.apk` is served directly at `/download`. Rebuild it from the latest app export before distributing updates; do not assume a prebuilt APK contains recent source changes.

The shell build and APK verification tools live in [`android-shell/README.md`](android-shell/README.md). A build may require Java, `apktool`, Python dependencies, and the signing configuration described there. Typical source-build command:

```bash
APKTOOL=/path/to/apktool.jar android-shell/build.sh
```

Verify the resulting package with:

```bash
python3 -m pip install -r android-shell/requirements.txt
python3 android-shell/tools/validate_apk.py downloads/ecotrek.apk
```

## Repository layout

```text
CongressionalAppChallenge/
├── index.html                 # Generated app entry; Vercel opens EcoTrek here
├── app/                       # Exported web app and static assets
├── vercel.json                # App-first routes, privacy page and direct APK download
├── privacy.html               # Website privacy policy
├── serve-site.mjs              # Local preview server for Vercel-style paths
├── tests/                     # Website and direct-download regression tests
├── downloads/                 # APK artifact and release metadata
├── android-shell/              # APK build and validation tools
└── EcoTrek/                    # Expo / React Native app, tests and optional API
    ├── src/components/         # UI, trail photo gallery, maps and illustrations
    ├── src/context/            # Local application state and providers
    ├── src/navigation/         # App navigation
    ├── src/screens/            # User-facing screens
    ├── src/services/           # Location, trails, weather, sharing and local data
    ├── src/__tests__/          # Unit and render tests
    ├── tests/web/              # Playwright browser regression tests
    └── server/                 # Optional API and database adapter
```

## Privacy and security

- Location is requested only when a nearby feature or activity needs it; background location is not requested by the web app or WebView APK.
- Personal profiles and activity data are local by default. Configured third-party features make network requests as described in the privacy policy.
- Trail results and photos are supplied by OpenStreetMap/Overpass and Wikimedia Commons; map and weather services receive the requests needed for those features.
- The app does not sell data or show ads. A custom backend deployment may have different storage and retention behavior; operators should document it.

## License

This project is submitted under the Congressional App Challenge. All rights reserved.
