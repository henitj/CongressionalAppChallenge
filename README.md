# EcoTrek 🌲

**Every mile you move under your own power grows your forest.**

EcoTrek is a React Native (Expo) app for hikers and cyclists in Austin, Texas. It tracks your outdoor activities with GPS, awards symbolic trees for distance covered, and lets you compete with friends in clubs. Designed to be simple enough for anyone to use — from first-time hikers to experienced trail runners.

---

## ✨ Features

### 🥾 Activity Tracking
- **GPS-powered tracking** for hikes and bike rides
- **Live stats screen** showing speed (mph), distance, time, elevation gain/loss, and calories burned
- **Automatic trail detection** — recognizes which of 14 Austin trails you're on
- **Background tracking** — keeps recording when you lock your phone
- **Anti-cheat system** — speed limits (20 mph hiking, 30 mph biking) with a 3-strike warning system to keep things fair

### 🌳 Trees & Points
- Earn **symbolic trees** for distance: 1 tree per mile hiked, 1 per 3 miles biked
- **EcoPoints** for every mile, tree, trail completion, and challenge
- **10 levels** from New Trekker to Trail Legend
- **40+ badges** to unlock

### 🔥 Weekly Streaks
- Log at least one activity per week to keep your streak alive
- **Streak freezes** — earn 1 freeze for every 4 consecutive active weeks (stack up to 4)
- Use a freeze to protect a missed week without breaking your streak
- Bonus points at every 4-week milestone

### 👥 Clubs
- **Invite-only clubs** — join with a 6-character code from a member (no random joins)
- Pool your points, trees, and miles with your team
- **Weekly club goals** that everyone contributes toward
- **Member leaderboard** within each club
- **World top 10** ranking across all clubs
- Owner controls: lock/unlock membership, set member caps, manage goals

### 🗺️ Austin Trails
- **14 curated Austin-area trails** built into the app — works offline
- Trail details: distance, difficulty, elevation, ratings, amenities
- Filter by type (hike/bike), difficulty, dog-friendly, family-friendly, water stations
- Sort by distance from you, length, difficulty, or rating
- AI-powered trail assistant for questions about conditions, dogs, water, and more

### 🌡️ Safety First
- **Live weather conditions** from the National Weather Service
- Heat index, UV, air quality, storm warnings
- **Dangerous conditions gate** — the Start button warns you before heading out in extreme weather
- Comprehensive trail safety tips for every trail

### 📊 Your Impact
- **Activity history** — last 5 activities with full details (distance, time, speed, calories, elevation, trees)
- **Weight tracking** — log your weight over time with a visual graph
- **Calorie estimates** using MET values based on your profile (height, weight, age)
- **Personal records** — longest distance, fastest pace, biggest day
- **Weekly recaps** — compare this week to last, celebrate milestones

### 👤 Profile Setup
- One-time setup: name, age, height, weight, step length
- Used for accurate calorie calculations and pace recommendations
- Update your weight anytime from the Profile screen
- Works for both Google sign-in and guest accounts

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native + Expo SDK 54 |
| Language | TypeScript |
| Navigation | React Navigation (bottom tabs + stack) |
| State | React Context (10 providers) |
| Storage | AsyncStorage (local-first) |
| Maps | react-native-maps (native), Leaflet (web) |
| Location | expo-location (GPS with background tracking) |
| Auth | Google OAuth (expo-auth-session) + guest mode |
| Backend | Optional Node.js + Neon PostgreSQL |
| Testing | Jest + React Testing Library + custom logic tests |

---

## 📁 Project Structure

```
EcoTrek/
├── App.tsx                      # Root component & provider stack
├── src/
│   ├── components/              # Shared UI components
│   │   ├── Icon.tsx            # SVG icon set (80+ icons)
│   │   ├── ui.tsx              # Screen, Card, Button, Pill, Sheet, etc.
│   │   ├── Header.tsx          # Page headers
│   │   ├── LiveMap.tsx         # GPS map (web + native)
│   │   ├── StreakStrip.tsx     # Weekly streak visualization
│   │   ├── ConditionsCard.tsx  # Weather conditions card
│   │   ├── ChallengeItem.tsx   # Weekly challenge row
│   │   ├── CleanupSheet.tsx    # Trail cleanup logger
│   │   └── OnboardingGate.tsx  # First-run gate (walkthrough + setup)
│   ├── screens/
│   │   ├── HomeScreen.tsx      # Dashboard with quick actions
│   │   ├── TrackScreen.tsx     # Activity mode selector & start
│   │   ├── ActiveTrackingScreen.tsx  # Live GPS tracking with stats
│   │   ├── TrailsScreen.tsx    # Austin trail catalogue
│   │   ├── LeaderboardScreen.tsx     # Clubs & world ranking
│   │   ├── ProfileScreen.tsx   # User profile & weight tracking
│   │   ├── HistoryScreen.tsx   # Last 5 activities with details
│   │   ├── StreakScreen.tsx    # Weekly streak & freezes
│   │   ├── ChallengesScreen.tsx      # Weekly challenges
│   │   ├── ImpactScreen.tsx    # Full activity history & records
│   │   ├── RecapScreen.tsx     # Weekly recap
│   │   ├── ConditionsScreen.tsx      # Detailed weather
│   │   ├── SafetyScreen.tsx    # Trail safety info
│   │   ├── SettingsScreen.tsx  # App settings
│   │   ├── SetupScreen.tsx     # Profile setup (name, body, etc.)
│   │   ├── OnboardingScreen.tsx      # First-run walkthrough
│   │   ├── SignInScreen.tsx    # Auth screen
│   │   └── AssistantScreen.tsx # AI trail assistant
│   ├── context/                # React Context providers
│   │   ├── AuthContext.tsx     # Authentication
│   │   ├── AppContext.tsx      # Location & trails
│   │   ├── ProfileContext.tsx  # User profile data
│   │   ├── ActivityContext.tsx # Activity history & validation
│   │   ├── StreakContext.tsx   # Weekly streaks & freezes
│   │   ├── ChallengeContext.tsx      # Weekly challenges
│   │   ├── LogbookContext.tsx  # Cleanup tracking
│   │   ├── NotificationContext.tsx   # Push notifications
│   │   └── WeatherContext.tsx  # Weather conditions
│   ├── constants/
│   │   ├── theme.ts            # Design system (colors, typography, etc.)
│   │   ├── austinTrails.ts     # 14 Austin trail definitions
│   │   ├── EcoPointsContext.tsx      # Points, levels & badges
│   │   ├── ClubContext.tsx     # Club management
│   │   ├── SettingsContext.tsx # User preferences
│   │   └── AnalyticsContext.tsx      # Event tracking
│   ├── services/               # Pure business logic
│   │   ├── location.ts         # GPS tracking with background support
│   │   ├── geo.ts              # Haversine distance
│   │   ├── trailDetection.ts   # Trail matching & anti-cheat
│   │   ├── weather.ts          # NWS weather integration
│   │   ├── dates.ts            # Date/week utilities
│   │   ├── trees.ts            # Symbolic tree grants
│   │   ├── records.ts          # Personal records
│   │   └── recap.ts            # Weekly recap builder
│   └── hooks/                  # Custom React hooks
├── server/                     # Optional Node.js backend
│   ├── index.js                # Express server
│   ├── routes.js               # API routes
│   ├── db.js                   # Neon PostgreSQL connection
│   └── migrate.js              # Database migrations
├── db/
│   ├── schema.sql              # Database schema
│   └── seed.sql                # Seed data
└── assets/                     # App icons and splash screen
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- For native: Expo Go app on your phone

### Install & Run

```bash
cd EcoTrek
npm install
npx expo start
```

Then scan the QR code with Expo Go (iOS/Android) or press `w` for web.

### Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API URL (optional — app works without it) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_*` | Google OAuth client IDs for each platform |
| `EXPO_PUBLIC_NWS_API_URL` | National Weather Service API (free, no key needed) |

See [docs/GOOGLE_OAUTH_SETUP.md](EcoTrek/docs/GOOGLE_OAUTH_SETUP.md) for Google sign-in setup.

---

## 🧪 Testing

```bash
# All tests
npm test

# Logic tests only (fast, no React)
npm run test:logic

# Render tests only
npm run test:render

# Type checking
npm run typecheck
```

**Test coverage:**
- 73 logic tests (pure functions: distance, streaks, challenges, trail detection, validation, records, recaps)
- 40 render tests (every screen renders on empty account, flow tests for activities, clubs, streaks, logbook)

---

## 🏔️ Anti-Cheat System

EcoTrek validates every activity to keep club leaderboards fair:

| Check | Hiking | Biking |
|-------|--------|--------|
| Max average speed | 20 mph | 30 mph |
| Max instant speed | 45 mph | 45 mph |
| Min duration | 60 seconds | 60 seconds |
| Strike system | 3 momentary violations forgiven | 3 momentary violations forgiven |

Activities that fail validation are saved but marked invalid — they don't count toward trees, points, streaks, or club totals. The user sees a clear, respectful explanation of why.

---

## 🔒 Privacy

- Location is used **only while recording** an activity
- All data is stored locally on the device by default
- No background tracking when not recording
- Google sign-in is optional — guest mode works fully offline
- See [docs/PRIVACY_POLICY.md](EcoTrek/docs/PRIVACY_POLICY.md)

---

## 📱 Accessibility

- **Large touch targets** — minimum 44px for all interactive elements
- **High contrast text** — all text meets WCAG AA contrast ratios
- **Clear typography** — 16px body text, 14px secondary text
- **Simple navigation** — 5 tabs, no nested menus
- **Plain language** — no jargon, every feature explained in context
- **Elderly-friendly** — big buttons, clear labels, no hidden gestures

---

## 📄 License

This project was created for the Congressional App Challenge.
