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
- **Safe Teardown**: Map rendering engines (Leaflet for Web, native views for mobile) use guarded unmounting routines to prevent asynchronous memory leaks or null-pointer dereferences.

### 4. Natural Vector Illustrations
- Built with React Native SVG, the interactive `TrailScene` showcases anatomically proportioned walkers and cyclists with natural stride physics, lifelike limb extension angles, and adaptive environment elements.

---

## Product Features

### Active Recording & Smart Trails
- **GPS Recording**: Track distance, duration, elevation, live pace, splits, and route polylines.
- **Auto Trail Completion**: Compares active route points against catalog trail bounding polygons to automatically detect trail completions.
- **Trail Ratings & Bookmarks**: Save favorite trails, record ratings, and get smart recommendations based on difficulty and past ratings.

### Environmental Impact & Gamification
- **EcoPoints**: Earn points for zero-emission travel (walking, running, cycling) and environmental cleanups.
- **Streaks & Freezes**: 4-week milestones award streak freezes to protect active streaks during rest periods.
- **Community & Leaderboards**: Track personal milestones, club standings, and weekly challenges.

### Conditions & Trail Assistant
- **Weather Safety Matrix**: Live temperature, precipitation probability, humidity, UV index, and National Weather Service advisories.
- **Intelligent Offline Assistant**: Conversational offline guide answering queries on trail difficulty, dog-friendliness, water availability, and route distances.

---

## Directory Structure

```text
src/
├── __tests__/       # Comprehensive Jest test suite (120+ unit and component tests)
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
```

---

## Environment Variables (Optional)

EcoTrek works completely out of the box without any `.env` configuration. To enable optional Google OAuth or external API synchronization:

```bash
cp .env.example .env
```

| Variable | Description |
| :--- | :--- |
| `EXPO_PUBLIC_API_URL` | Base URL for optional Node.js / Neon PostgreSQL backend |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` | Google OAuth Client ID for Web |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` | Google OAuth Client ID for iOS |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` | Google OAuth Client ID for Android |

---

## Documentation Links

- [Launch Checklist](docs/LAUNCH_CHECKLIST.md)
- [Database & Neon API Setup](docs/NEON_SETUP.md)
- [Google OAuth Configuration](docs/GOOGLE_OAUTH_SETUP.md)
- [Penetration & Security Testing](docs/PEN_TEST.md)
- [Privacy Policy](docs/PRIVACY_POLICY.md)
