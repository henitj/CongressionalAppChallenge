# EcoTrek

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-black.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61dafb.svg)](https://reactnative.dev/)
[![Tests](https://img.shields.io/badge/Tests-238%20passing-success.svg)](https://jestjs.io/)

EcoTrek is a local-first, high-performance React Native / Expo outdoor activity tracker and conservation companion for iOS, Android, and web. It enables users to record GPS walks, hikes, and bike rides, discover nearby trails, assess live weather safety, track environmental impact, and build healthy outdoor habits.

Built for the **Congressional App Challenge** by Henit Jain, Matan Heber, Arjun Averineni, and Basil Vinesh.

---

## Key Features

- **GPS Activity Tracking**: Walk, hike, and bike recording with accuracy-weighted GPS smoothing, stationary-drift rejection, speed-jump checks, and a clear retry flow for location permissions/settings.
- **Google Maps & Trail Discovery**: Google Maps JavaScript tiles on web/the WebView APK and Google Maps on native Android when configured; trail discovery still uses OpenStreetMap data with a route-sketch fallback when maps are unavailable.
- **Trail Photos & Completion**: Wikimedia Commons/admin-approved trail photos with a local illustrated fallback, trail details, ratings, and automatic completion detection.
- **EcoPoints & Environmental Impact**: Log cleanups and wildlife sightings, and unlock symbolic trees and badges; self-reported cleanup rewards are capped at 10 points per activity.
- **Streaks & Challenges**: Weekly streaks with freeze protection, community leaderboards, and rotating weekly challenges.
- **Offline-First & Local-First**: Zero required server dependencies — all user data, activity logs, streaks, and settings are saved locally with bounded storage retention.
- **Trail assistant**: Available from Trails (not Home). The website and WebView APK call Grok through Puter for custom questions; trail/weather facts are supplied when relevant, with an explicit offline fallback. A personal OpenAI-compatible key remains optional.
- **Accessible & Responsive Design**: Dynamic light and dark themes, scalable typography, reduced motion support, tablet and phone responsive layouts, and hardware keyboard clearance.

---

## Performance & Resilience Hardening

EcoTrek has been optimized for speed, battery life, and crash resilience:

1. **Rendering Performance**:
   - `React.memo` and fine-grained `useMemo` / `useCallback` implementations across all list items, cards, and data badges.
   - Cached style creation preventing thousands of duplicate stylesheet allocations on every render tick.
   - Virtualized list rendering (`FlatList`) with optimized `initialNumToRender`, `windowSize`, `maxToRenderPerBatch`, and `removeClippedSubviews`.
2. **Crash-Proof Math & Data Operations**:
   - Defensive mathematical guards protecting against division by zero (e.g., zero-distance pace calculations, challenge progress percentages).
   - `NaN` and `Infinity` sanitization in GPS geodesy (`haversineMiles`, `smoothDelta`, `instantMph`).
   - Safe CSS/layout dimension calculations preventing invalid percentage styles in weather bars and progress indicators.
3. **Defensive State & Storage Management**:
   - Fault-tolerant JSON serialization (`safeParse` / `safeStringify`) with fallback defaults for corrupt or legacy storage schemas.
   - Global and component-level React `ErrorBoundary` handlers with user-friendly recovery flows.
   - Safe asynchronous cleanup and teardown routines preventing unmount race conditions on maps and GPS listeners.
4. **Fluid Vector Illustrations**:
   - Natural, anatomically proportioned vector SVG characters in `TrailScene` with realistic walking and cycling postures.

---

## The website *is* the app

There is no separate marketing page. `index.html` at the repository root is the
full EcoTrek app (the same Expo web build that ships inside the Android APK), so
opening the site puts the actual product in front of the visitor.

| URL | What it is |
| --- | --- |
| `/` | The full app. |
| `/app/` | The same app with a permanent address (also the PWA `start_url`). |
| `/install/android.html` | Android install guide: the signed APK, the Play Protect prompts, hashes and permissions, plus a browser-install fallback. |
| `/download` | Short, direct URL that downloads the Android APK as `EcoTrek.apk`. |
| `/install/ios.html` | iPhone / iPad guide: run the app in Safari and add it to the Home Screen. |
| `/api-key.html` | Optional bring-your-own-key instructions. The website and Android WebView APK use Grok through Puter without a personal AI key. |
| `/privacy` | Privacy policy, including Google Maps, trail/photo providers, and online assistant data flow. |

**Platform routing.** Android visitors to `/` are sent to the Android install
guide (a Vercel redirect rule on the User-Agent, with the same logic repeated in
the page, so it also works on static hosts that ignore `vercel.json`). Apple and
desktop visitors get the app itself. Nobody is trapped: `/install/android.html`
links to `/?web=1`, which sets an `ecotrek_web` cookie that the redirect respects
from then on.

**Deployment.** The site is plain static files (no build step) with routing in
`vercel.json`:

- `/assets/*` is rewritten to `/app/assets/*`, because the app bundle addresses
  its own images with root-absolute URLs;
- `/privacy`, `/app`, `/download`, and `/apk` are rewritten to their files;
- `/download` returns the APK as a no-transform attachment with revalidation
  headers, while `/downloads/*` exposes the release facts;
- `/_expo/*` and `/assets/*` are served `immutable`;
- `Permissions-Policy` allows geolocation for the site itself — the app cannot
  record a walk without it.

To deploy only the Expo app rather than the full website/install pages, set
Vercel **Root Directory** to `EcoTrek`. That folder has its own `vercel.json`,
standalone export command, SPA fallback, and environment-variable guidance in
[`EcoTrek/README.md`](EcoTrek/README.md#deploy-this-folder-to-vercel).

### Android APK

`downloads/ecotrek.apk` is the direct-download package, built by
`android-shell/build.sh` (see `android-shell/README.md`). It is signed with
**APK Signature Scheme v1 + v2 + v3**, 4-byte aligned, and targets API 34:

```bash
APKTOOL=/path/to/apktool.jar android-shell/build.sh
```

The build prints the release facts and writes them next to the download, where
the install page reads them:

- `downloads/ecotrek-apk.json` — version, size, SHA-256, signing certificate
  fingerprint, signature schemes;
- `downloads/ecotrek.apk.sha256` — a `sha256sum`-format line for manual checks.

Verify a published APK at any time (no Android SDK required). Install the
Python helpers once, then run the validator:

```bash
python3 -m pip install -r android-shell/requirements.txt
python3 android-shell/tools/validate_apk.py downloads/ecotrek.apk
```

The website download route can be smoke-tested locally with
`node --test tests/site-download.test.mjs`; it checks the attachment headers,
APK bytes, release size and SHA-256.

The APK validator re-derives the v2/v3 content digests from the file on disk,
verifies the signatures and the v1 JAR chain, checks that v1/v2/v3 agree and
that the two v3 SDK ranges match, confirms every web-bundle asset is bundled,
and checks that uncompressed entries are aligned. The Android build also runs
a v3 signer-format regression test before publishing the APK.

> **Play Protect.** Sideloaded apps are signed by a key Google has never
> attested, so Android may show *“Play Protect doesn’t recognise this app”* or
> *“Unsafe app blocked”* with **More details → Install anyway**. That prompt is
> inherent to distributing outside Google Play; `install/android.html` walks
> through it and documents exactly what is in the file. What *can* be fixed is
> has been: modern signature schemes, a current `targetSdk`, no cleartext
> traffic, no debug flag, no compressed resource table.

For a Google Play release, build the native app instead:

```bash
cd EcoTrek && npx eas build --platform android --profile production
```

For iPhone, distribute through the App Store / TestFlight; until that listing
exists, `install/ios.html` explains the Safari "Add to Home Screen" route. Paste
a published store URL into `iosUrl` in `site-config.js` and the iPhone page
switches to it automatically.

The shipped app has **no sign-in**: walks, points and settings are stored on the device under a local profile. Cross-device progress needs a deployed API/Neon database plus an OAuth provider; see `EcoTrek/docs/GOOGLE_OAUTH_SETUP.md` and `EcoTrek/docs/NEON_SETUP.md` before enabling that.

### Maps and trail API configuration

Copy `EcoTrek/.env.example` to an untracked `EcoTrek/.env` before a release. Set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` for the website and Android WebView APK (Maps JavaScript API); this browser key is included in the client bundle, so restrict it to the production website and `appassets.ecotrek.app` referrer. Native Android builds use `GOOGLE_MAPS_ANDROID_KEY` for the Android Maps SDK. Never commit `.env` or an unrestricted key.

Nearby trail catalogue searches still use OpenStreetMap's Overpass service. A TrailSplits adapter is **not** wired in: this checkout contains no TrailSplits API schema/endpoint or configured key, so no TrailSplits request is being made. The linked API must be verified and configured before claiming that integration.

#### Prerequisites
- Node.js 20+
- npm (or yarn / pnpm)
- Expo Go app on mobile (optional, for physical device preview)

#### Installation

```bash
# Clone the repository
git clone https://github.com/henitj/CongressionalAppChallenge.git
cd CongressionalAppChallenge/EcoTrek

# Install dependencies
npm install

# Start development server
npm start          # Expo interactive CLI (scan QR code with Expo Go)
npm run web        # Run in browser
```

#### Validation & Testing

```bash
# Type check with strict TypeScript
npm run typecheck

# Run Jest unit and component test suites (120+ tests)
npm test

# Run complete verification suite
npm run verify
```

---

## Repository Structure

```text
CongressionalAppChallenge/
├── README.md                  # Project overview and quick start
├── index.html                 # The website: the full app (generated from the export)
├── install/                   # Android / iOS install guides
├── api-key.html               # Where to get an AI key and where it goes
├── site.css / site.js         # Shared styling + release details for those pages
├── app/                       # The exported web app (assets the site root points at)
├── android-shell/             # APK build project + signing/validation tools
├── downloads/                 # The published APK + release facts
└── EcoTrek/                   # Main Expo / React Native application
    ├── assets/                # App icons, splash screens, and vector artwork
    ├── db/                    # PostgreSQL schemas and seed datasets
    ├── docs/                  # Architecture, privacy, penetration testing, and setup guides
    ├── server/                # Optional Node.js / Express backend with Neon PostgreSQL
    └── src/
        ├── __tests__/         # Unit, integration, and UI component tests
        ├── components/        # Reusable UI widgets, error boundaries, and illustrations
        ├── constants/         # Theme tokens, trail data, badge rules, and constants
        ├── context/           # React context state managers (Activity, Theme, Weather, etc.)
        ├── hooks/             # Custom hooks for responsiveness, location, and animations
        ├── navigation/        # React Navigation stacks and tab bar configurations
        ├── screens/           # Application screens (Home, Record, Trails, Impact, etc.)
        ├── services/          # Pure domain services (GPS, storage, weather, assistant, sync)
        └── types/             # TypeScript definitions and interface declarations
```

---

## Privacy & Security

- Location is used for nearby trail discovery and while recording; EcoTrek does not request background location.
- The local profile and recorded activity log stay on-device by default. Approximate coordinates are sent to the selected trail/weather/map services when those features are used.
- Online Grok answers send the question and relevant trail/weather facts to Puter; the app does not include GPS coordinates or profile details in that prompt. A personal provider key is optional and stored locally.
- See `EcoTrek/docs/PRIVACY_POLICY.md` for the provider-by-provider data flow and `/api-key.html` for optional key setup.
- Refer to [`EcoTrek/docs/PRIVACY_POLICY.md`](EcoTrek/docs/PRIVACY_POLICY.md) for our full privacy commitment.

---

## License

This project is submitted under the Congressional App Challenge. All rights reserved.
