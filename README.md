# EcoTrek

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2052-black.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-61dafb.svg)](https://reactnative.dev/)
[![Tests](https://img.shields.io/badge/Tests-120%20passed-success.svg)](https://jestjs.io/)

EcoTrek is a local-first, high-performance React Native / Expo outdoor activity tracker and conservation companion for iOS, Android, and web. It enables users to record GPS walks, hikes, and bike rides, discover nearby trails, assess live weather safety, track environmental impact, and build healthy outdoor habits.

Built for the **Congressional App Challenge** by Henit Jain, Matan Heber, Arjun Averineni, and Basil Vinesh.

---

## Key Features

- **GPS Activity Tracking**: High-accuracy walk, hike, and bike ride recording with background location tracking, live pace/elevation calculation, and route smoothing.
- **Smart Trail Discovery & Completion**: Curated trail catalogue with distance filtering, difficulty levels, route previews, elevation profiles, user ratings, and automatic completion detection.
- **Live Trail Conditions & Weather Safety**: Real-time hourly weather forecast, US National Weather Service safety advisories, and outdoor condition ratings powered by Open-Meteo.
- **EcoPoints & Environmental Impact**: Log carbon offset, trail cleanups, wildlife sightings, and unlock symbolic trees and badges for sustainable recreation.
- **Streaks & Challenges**: Weekly streaks with freeze protection, community leaderboards, and rotating weekly challenges.
- **Offline-First & Local-First**: Zero required server dependencies — all user data, activity logs, streaks, and settings are saved locally with bounded storage retention.
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
| `/api-key.html` | The API-key page: where to get a key for the assistant's optional AI upgrade, and where it goes in the app. |
| `/privacy` | Privacy policy, including the AI-key section. |

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
verifies the signatures and the v1 JAR chain, checks that v1/v2/v3 agree, that
every asset the web bundle asks for is bundled, and that uncompressed entries
are aligned.

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

The shipped app has **no sign-in**: walks, points and settings are stored on the device under a local profile, and there is no account to create. (Google sign-in was removed — without configured OAuth client IDs the button could only fail.) Cross-device progress needs a deployed API/Neon database plus an OAuth provider; if that is ever set up, `EcoTrek/docs/GOOGLE_OAUTH_SETUP.md` and `EcoTrek/docs/NEON_SETUP.md` describe the pieces, and `EcoTrek/src/context/AuthContext.tsx` is where the provider would go back.

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

- Location permissions are requested solely for trail proximity and active activity recording.
- GPS data remains strictly on your device unless you explicitly connect to a sync backend.
- Account-isolated local storage prevents cross-profile data leaks.
- An optional AI key is stored only in the app's local storage, is sent only to
  the provider the user picked, and only over HTTPS; it can be removed at any
  time. See `/api-key.html` and the privacy policy's AI-key section.
- Refer to [`EcoTrek/docs/PRIVACY_POLICY.md`](EcoTrek/docs/PRIVACY_POLICY.md) for our full privacy commitment.

---

## License

This project is submitted under the Congressional App Challenge. All rights reserved.
