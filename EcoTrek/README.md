# EcoTrek app

EcoTrek is an Expo / React Native outdoor activity tracker and conservation companion for iOS, Android, and web. It is built for the **Congressional App Challenge** by Henit Jain, Matan Heber, Arjun Averineni, and Basil Vinesh.

## Product overview

- Record GPS walks, hikes, and bike rides with retryable location handling and an offline route-only map fallback.
- Find named trails worldwide using OpenStreetMap/Overpass. The bundled Austin catalogue is used only for a real location near Austin; there is no default-city trail list.
- Browse multiple trail photos when available, see a local illustration and retry when photo services are unavailable, and share one selected trail with its details, map pin, and up to two photo links.
- Check nearby weather and safety information when a real device location is available.
- Grow a virtual tree through weekly care. A one-time introduction previews growth and the oldest sage stage; the interface does not show illustration-image counts.
- Keep a local profile, activities, points, ratings, and settings on-device by default. A configured API can provide a public approved-trail catalogue; this build has no Google sign-in, so guest profiles do not sync private data to cloud accounts.

There is **no user-facing Grok or AI chat experience**. The optional `trailIntel` service remains available for background trail-data enrichment; it is not a conversation UI. The app does not request background location in the website or WebView APK.

## Architecture and reliability

- **Local-first:** AsyncStorage is the default for personal progress. Optional network requests fail gracefully and should not prevent local activity tracking or saved-data access.
- **World-aware location:** Trail discovery validates latitude/longitude globally, avoids an Austin fallback, reuses successful cached results, retries Overpass mirrors within a bounded time, and exposes a retry state when a live lookup fails without results.
- **Defensive state:** Async storage is validated, long-running work is bounded where possible, requests are ignored after unmount, and screens provide explicit recovery paths.
- **Map fallback:** OpenStreetMap tiles are attributed; a failed tile request falls back to a local route sketch without stopping GPS recording.
- **Responsive UI:** Scalable text, keyboard-aware forms, short-screen onboarding, reduced-motion behavior, and phone/tablet layouts.

## Develop

Requirements: Node.js 20+ and npm.

```bash
npm ci
npm run web            # Expo web development server
npm start              # Expo CLI / device development
```

To regenerate the web export and the repository-root direct app entry:

```bash
npm run export:web
```

The export is written to `dist/`; the post-export script also writes the tracked repository paths `../app/` and `../index.html` when run from the full repository checkout. Start `node ../serve-site.mjs` from the repository root to preview the site’s app-first routes at `http://localhost:8000/`.

## Verification

```bash
npm run typecheck
npm test                 # logic tests + Jest render/interaction suites
npm run verify           # strict unused/type checks + tests
```

Website route tests run from the repository root:

```bash
node --test tests/*.test.mjs
```

Browser tests need a current web export and the repository preview server running:

```bash
npx playwright install chromium
npm run test:web
```

The browser suite mocks location, maps, and external services. It checks app routes, direct entry, responsive layouts, tree growth, retry states, and persisted local data; it does not verify live provider availability, physical Android/iOS behavior, or store releases.

## Vercel

The repository root is the Vercel deployment entry and opens the app directly for all platforms. It has no Android, Apple, or API landing pages. `/app/` is a second app route, `/privacy` is the privacy policy, and `/download` directly serves the APK file.

For a separate app-only Vercel project, set **Root Directory** to `EcoTrek`; the folder-level `vercel.json` exports to `dist/`. Configure an optional `EXPO_PUBLIC_API_URL` only if the deployment runs the companion API. See [`server/README.md`](server/README.md) for the optional backend and [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md) for data flows.

## Optional environment

Copy `.env.example` only when you need a configured native map or API URL:

```bash
cp .env.example .env
```

- `GOOGLE_MAPS_ANDROID_KEY`: optional, restricted key for separately built native Android/EAS maps. The website and WebView APK use OpenStreetMap tiles.
- `EXPO_PUBLIC_API_URL`: optional URL for the EcoTrek API; never put a database secret in an Expo public variable.
- `EXPO_PUBLIC_PRIVACY_URL` and `EXPO_PUBLIC_SUPPORT_EMAIL`: optional listing metadata.

No browser/OSM key or user-provided Grok key is needed. Trail lookup uses OpenStreetMap/Overpass; photo lookup uses Wikimedia Commons; weather uses Open-Meteo and U.S. National Weather Service data. TrailSplits is not configured in this checkout.

## Project layout

```text
src/
├── components/      # Reusable UI, maps, trail gallery and illustrations
├── constants/       # Theme tokens, trail data, tree stages and app constants
├── context/         # App, activity, profile, tree, weather and other providers
├── hooks/           # Responsive layout, keyboard and activity hooks
├── navigation/      # Root stack and tab navigation
├── screens/         # App screens
├── services/        # Location, trails, photos, weather, sharing and storage
├── __tests__/       # Logic, render and interaction tests
└── types/           # Shared app types
```
