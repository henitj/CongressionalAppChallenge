# EcoTrek Mobile App

EcoTrek is an Expo / React Native outdoor activity application engineered for iOS, Android, and Web. Designed with a short path from launch to tracking, EcoTrek combines real-time GPS recording, offline-first data caching, local trail discovery, weather safety monitoring, and community conservation gamification.

Built for the **Congressional App Challenge** by Henit Jain, Matan Heber, Arjun Averineni, and Basil Vinesh.

---

## Architecture & Design Principles

### 1. Local-First Architecture
EcoTrek requires zero cloud infrastructure to function. All activities, streak records, eco badges, sightings, and cleanups persist in device-isolated AsyncStorage partitions. When connectivity is available, the app gracefully enriches the experience with real-time weather alerts and optional cloud sync.

### 2. High-Performance Mobile UI
- **Zero-Allocation Rerenders**: Component-level memoization (`React.memo`) and cached theme stylesheets prevent garbage collection spikes during high-frequency GPS updates.
- **Virtualized Lists**: FlatList configurations are fine-tuned with bounded window sizes, clipped subviews, and item height estimation for smooth 60/120fps scrolling.
- **Measured Keyboard Clearance**: Native dynamic keyboard height measurement eliminates layout jitter and jumpy bottom sheets.

### 3. Crash Resilience & Defensive Programming
- **Division-by-Zero & Math Bounds Guards**: All pace, speed, elevation gain, and percentage calculation functions are shielded with fallback guards against non-finite values (`NaN`, `Infinity`).
- **Safe Serialization**: Structured JSON storage handlers (`safeParse` / `safeStringify`) validate data integrity and gracefully recover from corrupted storage keys.
- **Comprehensive Error Boundaries**: React error boundaries isolate screen exceptions, offering users an instant "Try Again" recovery action without terminating the app.
- **Safe Teardown**: Leaflet on web/WebView and native map views use guarded cleanup; the recorded route still renders as a local sketch if tiles or network are unavailable.

### 4. Approved artwork and continuous tree growth
- The Start activity cards use the selected AI-generated hiker/cyclist PNGs, not vector stand-ins; there is no oversized scene above the pickers.
- `TreeGrowthScene` develops one branching, textured oak through all six stages. Each care step changes its growth, with care effects, reduced-motion support, free preview and persisted forest progress.

---

## Product Features

### Active Recording & Smart Trails
- **GPS Recording**: Track distance, duration, elevation, live pace, splits, and route polylines. Accuracy-weighted smoothing, speed checks, and a sustained movement window reduce phantom distance while stationary.
- **Keyless maps**: Web and Android WebView use bundled Leaflet with OpenStreetMap tiles, attribution, zoom and recenter controls. The map occupies about two-thirds of the tracking area (side-by-side in landscape); stats scroll separately and stop stays reachable. An eight-second watchdog and retry avoid an endless map spinner. Discovery uses OSM/Overpass.
- **Trail Photos & Completion**: Commons/admin-approved photos with illustrated fallbacks; route points are compared with the catalogue to detect trail completions.
- **Trail Ratings & Bookmarks**: Save favorite trails, record ratings, and get recommendations based on difficulty and past ratings.

### Environmental Impact & Gamification
- **EcoPoints**: Earn points for walks, rides, and environmental cleanups. Cleanup count remains in the log, while its self-reported reward is capped at 10 points per activity.
- **Streaks & Freezes**: 4-week milestones award streak freezes to protect active streaks during rest periods.
- **Community & Leaderboards**: Track personal milestones, club standings, and weekly challenges.

### Conditions & Trail Assistant
- **Weather Safety Matrix**: Live temperature, precipitation probability, humidity, UV index, and National Weather Service advisories.
- **Online Grok assistant**: The website and Android WebView APK offer a Connect/Test flow for Grok through Puter, with relevant trail/weather facts and conversation history. Puter sign-in and account/credit limits apply; Connected appears only after a real model response. It can answer custom questions rather than only preset trail questions; when offline, EcoTrek labels its local answer as a fallback.
- **AI privacy and optional keys**: Questions and relevant trail/weather facts are sent to Puter; GPS coordinates, profile details, and activity history are not included. A personal OpenAI-compatible provider key is optional and stored locally; see the privacy policy.

---

## Directory Structure

```text
src/
├── __tests__/       # Logic and render suites (255 tests at this release)
├── components/      # UI primitives, error boundary, headers, cards, and SVG illustrations
├── constants/       # Color palettes, typography, spacing, trail datasets, and badge criteria
├── context/         # App context providers (Auth, Activity, Theme, Weather, Streak, etc.)
├── hooks/           # Custom hooks for responsiveness, GPS location, and keyboard height
├── navigation/      # Root navigation stack and persistent bottom tab navigators
├── screens/         # Feature screens (Home, LiveRecord, Trails, Impact, Leaderboard, etc.)
├── services/        # Business logic, mathematical formulas, GPS geodesy, storage, API
└── types/           # Core TypeScript types and data models
```

---

## The website is this app

The repository root contains the Vercel-ready site, and its front door (`../index.html`) *is* the exported app — not a landing page. The export itself lives in `../app/` (the same files the Android shell bundles), and `serve-site.mjs` at the root previews the whole thing locally with the same rewrites Vercel applies:

```bash
node ../serve-site.mjs        # http://localhost:8000
```

`npm run export:web` runs `scripts/postexport-web.mjs` after `expo export`, which transpiles the bundle for older Android System WebViews, adds the ES5 polyfill prelude and the boot watchdog, and (for a full-repository build) regenerates the repository-root app page. The standalone EcoTrek app can also be deployed directly from this folder to Vercel; its configured build skips that side effect and omits install-page redirects/links. See the section below.

## Deploy this folder to Vercel

Create a Vercel project from the repository and set **Root Directory** to `EcoTrek` (or run the Vercel CLI from this folder). `vercel.json` in this folder explicitly configures:

- install: `npm ci --no-audit --no-fund`
- build: `ECOTREK_STANDALONE_WEB=1 npm run export:web`
- output: `dist/`
- client-side navigation fallback to `index.html`
- geolocation permission and immutable cache headers for hashed assets
- app-only output (no redirect or links to the repository's separate install pages)

Maps on the website/WebView APK need **no key or billing setup**. Leaflet 1.9.4 is bundled; OSM tiles need internet access, include attribution, and are not prefetched. A failed tile load shows the route-only sketch and Retry map without stopping GPS. A larger deployment must use an appropriate tile service and follow its terms. Grok uses bundled Puter.js 2.6.4; no app-owned key is required, but users must connect Puter and may need credits. The in-app test sends an actual request before claiming Connected.

The root `vercel.json` is for the full repository website/install pages. When deploying the `EcoTrek` folder, Vercel uses this folder's separate `vercel.json` instead.

## Getting Started

### Development Requirements
- **Node.js**: v20.0.0 or higher
- **npm**: v10.0.0 or higher
- **Expo CLI**: bundled via `npx expo`

### Running the App

```bash
# 1. Install dependencies
npm install

# 2. Launch Metro bundler
npm start            # Interactive CLI (Expo Go tunnel for mobile)
npm run start:lan    # Local network mode
npm run web          # Web browser preview
```

### Verification & Quality Assurance

```bash
# Run strict TypeScript type checks
npm run typecheck

# Run Jest unit and component test suites
npm test

# Run full quality verification
npm run verify

# With a fresh export synced to ../app and `node ../serve-site.mjs` running:
npx playwright install chromium
npm run test:web
# Override ECOTREK_BASE_URL for another host/port; ECOTREK_CHROMIUM_PATH
# optionally selects an existing browser executable.
```

---

## Environment Variables (Optional)

The app retains local-route fallbacks without `.env`; OSM tiles and online Grok answers require a network. Copy the example file only for optional configuration:

```bash
cp .env.example .env
```

| Variable | Description |
| :--- | :--- |
| `GOOGLE_MAPS_ANDROID_KEY` | Optional native Android Maps SDK key for EAS/native builds; restrict by package and signing certificate. |
| `EXPO_PUBLIC_PUTER_GROK_MODEL` | Optional Puter Grok model override; defaults to `x-ai/grok-4.7`. No application-owned AI key is required; Puter sign-in/credits may be required. |
| `EXPO_PUBLIC_API_URL` | Optional base URL for the Node.js / Neon PostgreSQL backend. |

Trail discovery currently queries OpenStreetMap/Overpass. TrailSplits is not configured: no API schema, endpoint, or key is present in this checkout. Do not claim it is active until those are verified.

---

## Documentation Links

- [1.3.0 validation and manual checks](docs/RELEASE_1.3.0.md)
- [Launch Checklist](docs/LAUNCH_CHECKLIST.md)
- [Database & Neon API Setup](docs/NEON_SETUP.md)
- [Google OAuth Configuration](docs/GOOGLE_OAUTH_SETUP.md)
- [Penetration & Security Testing](docs/PEN_TEST.md)
- [Privacy Policy](docs/PRIVACY_POLICY.md)
