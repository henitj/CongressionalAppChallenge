# EcoTrek

**Tap Start. Walk. We count the miles.**

EcoTrek is a React Native (Expo) app for walkers, hikers, and cyclists. It measures how far you go, shows today's weather, and keeps a simple record of your walks. Trails are looked up around the phone in the United States, Canada, and Mexico, so someone in New York sees their local walks rather than Austin's. It is built so older adults and people with disabilities can use it without extra help — large type, plain words, and a short path to Start.

Built for the Congressional App Challenge by Henit Jain, Matan Heber, Arjun Averineni and Basil Vinesh.

---

## What it does

- **One big Start button.** The Start tab: pick Walk or Bike, tap Start, put the phone away. Home stays a quiet dashboard (weather, this week, last walk).
- **GPS tracking that keeps going** if you lock the phone. It stops when you tap Finish.
- **Weather on Home** — one tiny box: temperature, condition, and a single friendly line. Full detail is one tap away.
- **Three tabs only** — Home, Start, and More. Profile, walks, impact, trails, clubs, safety, and settings live under More.
- **My walks** — this week's miles plus every walk you have saved, in one place.
- **Trails near you** — named walks and rides around the phone (OpenStreetMap) in the US, Canada, and Mexico. Austin's 14 trails ship as richer cards when you are actually in Austin. Area, distance, easy / medium / hard, dogs, water, and bathrooms.
- **Safety on the trail** — a big one-tap Stop button always at the top of the live tracking screen, plus Call 911 (with a confirm step). A sit-down reminder after 25 minutes.
- **Simple mode, large text, dark and high-contrast looks** — in Settings.
- **Google sign-in works for both signing in and signing up** — one tap, seamless. On the web demo a built-in account sheet stands in for the Google popup. Guest needs no account at all, and a guest's data is copied when you later sign in with Google.
- **First run, once per account** — Get Started (your name is pre-filled) → a four-page intro you can skip → home. You never do it again. Your name stays editable on your profile.
- **Share your progress** — a readable summary sheet with your name, level, miles, trees, streak and trails, ready to show someone.
- **Trees and points** are a fun way to see effort. No real trees are planted.

---

## Easy to use

- **Simple mode** hides clubs and weekly goals from More and bumps text size.
- **Text size** — Normal, Large, or Extra large. One app-wide scaler applies the size to every screen, so larger text never breaks a layout.
- **Dark** and **High contrast** themes re-theme the whole app — no screen is left behind.
- **Less motion** skips fades and slides (and follows the system setting).
- **Give feedback** — after a counted walk a popup asks how it went; there is also a Give Feedback button at the bottom of the Profile page. Both open the team's Google Form. The link is hardcoded in `EcoTrek/src/constants/feedback.ts` — the one place to change it.
- Large tap targets and plain language throughout ("points," "level," "skip a week," "your progress").

---

## Tech

| Layer | Technology |
|-------|-----------|
| App | React Native + Expo SDK 57 |
| Language | TypeScript |
| Navigation | React Navigation (3 tabs + stack) |
| State | React Context |
| Storage | AsyncStorage (local-first, per account) |
| Maps | react-native-maps (native), Leaflet (web) |
| Location | expo-location + expo-task-manager (recording only) |
| Auth | Google OAuth + guest, with guest → Google data copy |
| Weather | Open-Meteo + National Weather Service |
| Tests | Jest + React Testing Library + logic tests |

---

## Run it

```bash
cd EcoTrek
npm install
npx expo start --tunnel
```

Scan the QR code with Expo Go (keep Expo Go updated for SDK 57). Use the tunnel so the phone can reach the bundler — localhost in a browser does not mean the phone can load the app. Same Wi‑Fi only: `npm run start:lan`.

Copy `.env.example` to `.env` if you want Google sign-in or a backend. The app works offline with an empty `.env`.

### Link your Neon database (5 minutes)

The backend in `EcoTrek/server/` is already written for [Neon](https://neon.com) Postgres. Three commands after pasting your connection string:

```bash
cd EcoTrek/server
cp .env.example .env    # paste your Neon POOLED connection string as DATABASE_URL
npm install && npm run migrate && npm run check   # creates tables, then proves the link
```

`npm run check` tells you exactly what is wrong if anything is missing. Full walkthrough: **`EcoTrek/docs/NEON_SETUP.md`**.

```bash
npm test          # logic + render tests
npm run verify    # strict typecheck + both suites
```

---

## Privacy

Location is used **only while a walk or ride is recording**, including if the phone is locked. When you tap Finish, we stop. Data stays on the device unless you connect a backend. See `EcoTrek/docs/PRIVACY_POLICY.md`.

---

## Project layout

See `EcoTrek/README.md` for the full file tree, theming notes, backend notes, and launch checklist.
