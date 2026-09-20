# EcoTrek App

EcoTrek is an Expo/React Native outdoor activity app for iOS, Android, and web. It is designed around a short path from opening the app to starting a walk, while still providing trail discovery, progress, impact, and accessibility tools.

## Product behavior

### Activities and trails

Users can record walks and bike rides with GPS, pause and finish from the live screen, and review results afterward. Named trails are detected near the recorded route; completing enough of a trail logs a true completion. A completed trail asks for a 1–5 star rating, stores it locally, and uses that preference in trail recommendations.

Activity history is grouped into **Past week**, **Past month**, and **Past year**. Raw activities older than one year are removed when the account history loads, keeping device storage bounded.

### Progress and impact

EcoPoints, badges, streaks, challenges, cleanup records, and symbolic trees provide lightweight motivation. An unlocked badge is claimed by tapping it once: the reward is applied immediately and confetti confirms the action. Symbolic trees do not represent real-world partner planting.

### First run and navigation

A first-time account receives a multi-step introduction before profile setup. The persistent tab bar explicitly identifies **Home**, **Start**, and **More**. Interior screens use sticky headers, so the back button remains available after scrolling.

### Responsive UI

The app supports light and dark appearances, three text sizes, reduced motion, phone and tablet widths, safe areas, and measured keyboard clearance. Bottom sheets and the Trail Assistant measure the actual keyboard instead of relying on fixed offsets. The unused Sky appearance has been retired.

## Architecture

```text
src/
├── components/      Shared controls, sheets, cards, maps, and illustrations
├── constants/       Themes, catalogues, app metadata, and point rules
├── context/         Auth, profile, activity, logbook, weather, and app state
├── hooks/           Responsive, keyboard, activity, and lifecycle hooks
├── navigation/      Root stack and primary tabs
├── screens/         One module per user-facing screen
├── services/        Domain logic and external integrations
├── types/           Ambient TypeScript declarations
└── __tests__/       Logic and React Native render coverage
```

The app is local-first. Context providers own user-visible state; service modules own storage, calculations, location, trail lookup, and network calls. The optional API lives in `server/`, while SQL migrations and seed data live in `db/`. Operational guides are isolated in `docs/`.

## Requirements

- Node.js 20+
- npm
- Expo Go for physical-device development, or a supported iOS/Android simulator

## Install and run

```bash
npm install
npm start            # Expo tunnel (recommended for phones)
npm run start:lan    # same-network development
npm run web          # browser
```

If Expo Go cannot download the bundle, verify that Expo Go supports the SDK in `package.json`, retry with `npm start`, and run `npx expo start --tunnel --clear` to clear Metro state.

## Quality checks

```bash
npm run typecheck
npm test
npm run verify
```

`verify` runs strict TypeScript checks, logic tests, and render tests. Tests live in `src/__tests__/`.

## Optional configuration

```bash
cp .env.example .env
```

The app works without backend variables. Add platform-specific Google client IDs only for real Google OAuth. Set `EXPO_PUBLIC_API_URL` to enable shared server features. Database credentials belong only in `server/.env`, never in the Expo app.

To configure Neon:

```bash
cd server
npm install
cp .env.example .env
npm run migrate
npm run check
```

See `docs/NEON_SETUP.md` and `server/README.md` for deployment and endpoint details.

## Data and privacy

- Activity and preference data are namespaced by account in device storage.
- Location recording stops when the user finishes the active activity.
- Stored route paths are thinned to limit storage growth.
- Activity history retains at most one year of raw entries.
- Positive cleanup reports may sync idempotently when the API is configured.

Read `docs/PRIVACY_POLICY.md` for the complete policy.

## Key documentation

- `docs/LAUNCH_CHECKLIST.md` — release readiness
- `docs/GOOGLE_OAUTH_SETUP.md` — authentication setup
- `docs/NEON_SETUP.md` — database and API setup
- `docs/PEN_TEST.md` — security verification
- `db/README.md` — schema and curated trail photos
- `server/README.md` — API design and endpoints
