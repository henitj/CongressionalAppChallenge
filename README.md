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

## Vercel landing page and Android download

The repository root now contains a one-page, static EcoTrek landing page (`index.html`) that is ready to deploy on Vercel. It uses the existing app artwork, includes a public privacy policy at `/privacy`, and wires both install buttons to `/downloads/ecotrek.apk`.

The downloadable package is provided at `downloads/ecotrek.apk` for direct installation. You can also build an updated release binary from `EcoTrek/` with the included EAS profile:

```bash
cd EcoTrek
npx eas build --platform android --profile apk
```

After the build finishes, either upload the signed file as `downloads/ecotrek.apk` or set its public URL in `site-config.js`. The file also has an `installMode` switch: leave it as `apk` for the direct download, or change it to `play` after the package is live in Google Play. Then import this repository into Vercel with the project root as the root directory. The static page needs no build command.

> Android still requires the user to open the downloaded APK and confirm Install. A web page can start the download, but it cannot silently install an Android app. For iPhone, build the iOS app with EAS and distribute it through the App Store or TestFlight, then paste that public URL into `iosUrl` in `site-config.js`. The page automatically detects iPhone/iPad visitors and opens the iOS link. iOS does not allow an arbitrary IPA from a normal website to install as a general app.

Google sign-in and cross-device cloud progress are configured in the app and API, but they still require the owner's Google Cloud OAuth client IDs and a deployed API/Neon database. Follow `EcoTrek/docs/GOOGLE_OAUTH_SETUP.md` and `EcoTrek/docs/NEON_SETUP.md`; credentials are intentionally not committed.

### Prerequisites
- Node.js 20+
- npm (or yarn / pnpm)
- Expo Go app on mobile (optional, for physical device preview)

### Installation

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

### Validation & Testing

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
- Refer to [`EcoTrek/docs/PRIVACY_POLICY.md`](EcoTrek/docs/PRIVACY_POLICY.md) for our full privacy commitment.

---

## License

This project is submitted under the Congressional App Challenge. All rights reserved.
