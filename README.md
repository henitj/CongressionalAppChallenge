# EcoTrek

**Tap Start. Walk. We count the miles.**

EcoTrek is a React Native (Expo) app for walkers, hikers, and cyclists in Austin, Texas. It measures how far you go, shows today’s weather, and keeps a simple record of your walks. It is built so older adults and people with disabilities can use it without extra help — large type, plain words, and a short path to Start.

Built for the Congressional App Challenge by Henit Jain, Matan Heber, Arjun Averineni and Basil Vinesh.

---

## What it does

- **Start a walk or ride from Home.** Pick Walk or Bike and tap one large button. No extra page required.
- **GPS tracking that keeps going** if you lock the phone. It stops when you tap Finish.
- **Weather on Home** — current temperature and the next few hours. A clear note if it is safer to stay inside.
- **Three tabs only** — Home, Start, and More. Trails, clubs, profile, and settings live under More.
- **My walks** — this week’s miles plus every walk you have saved, in one place.
- **Austin trails** — 14 trails with distance, easy / medium / hard, dogs, water, and bathrooms. Works offline.
- **Safety on the trail** — Call 911 and Text my contact on the live tracking screen. A sit-down reminder after 25 minutes.
- **Simple mode, large text, dark and high-contrast looks** — in Settings.
- **Guest or Google.** Start as a guest, then save with Google later. Walks already on the phone come with you.
- **Trees and points** are a fun way to see effort. No real trees are planted.

---

## Easy to use

- **Simple mode** hides clubs and weekly goals from More and bumps text size.
- **Text size** — Normal, Large, or Extra large. The phone’s own text size is also honored.
- **Dark** and **High contrast** themes.
- **Less motion** skips fades and slides (and follows the system setting).
- **Emergency contact** — save a name and number in Settings, then text them from a walk.
- Large tap targets and plain language throughout (“points,” “level,” “skip a week,” “your progress”).

---

## Tech

| Layer | Technology |
|-------|-----------|
| App | React Native + Expo SDK 54 |
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
npx expo start
```

Scan the QR code with Expo Go, or press `w` for web.

Copy `.env.example` to `.env` if you want Google sign-in or a backend. The app works offline with an empty `.env`.

```bash
npm test          # logic + render tests
npm run typecheck
```

---

## Privacy

Location is used **only while a walk or ride is recording**, including if the phone is locked. When you tap Finish, we stop. Data stays on the device unless you connect a backend. See `EcoTrek/docs/PRIVACY_POLICY.md`.

---

## Project layout

See `EcoTrek/README.md` for the full file tree, backend notes, and launch checklist.
