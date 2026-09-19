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
- **Trails near you** — named walks and rides around the phone (OpenStreetMap) in the US, Canada, and Mexico. Austin's 14 trails ship as richer cards when you are actually in Austin. Area, distance, easy / medium / hard, dogs, water, and bathrooms. The first visit automatically performs up to three bounded lookup attempts, so users do not need to press Retry repeatedly.
- **Safety on the trail** — a big one-tap Stop button always at the top of the live tracking screen, plus Call 911 (with a confirm step). A sit-down reminder after 25 minutes.
- **Simple mode, large text, dark and high-contrast looks** — in Settings.
- **Google sign-in works for both signing in and signing up** — one tap, seamless. On the web demo a built-in account sheet stands in for the Google popup. Guest needs no account at all, and a guest's data is copied when you later sign in with Google.
- **First run, once per account** — sign in → a five-page Start tutorial → Get Started → home. The tutorial demonstrates the honesty policy and 0–99 trash range; Done or Skip is stored for that account, so it never replays.
- **Every valid trail asks about cleanup** — after the trail, the exact question is **“How many pieces of trash do you pick up?”** Enter an honest 0–99 count, or choose **None this time**. More pieces earn more points and help your club compete; rejected activities do not receive rewards.
- **Share your progress** — a readable summary sheet with your name, level, miles, trees, streak and trails, ready to show someone.
- **Trees and points** are a fun way to see effort. No real trees are planted.

---

## Easy to use

- **Simple mode** hides clubs and weekly goals from More and bumps text size.
- **Text size** — Normal, Large, or Extra large. One app-wide scaler applies the size to every screen, so larger text never breaks a layout.
- **Dark** and **High contrast** themes re-theme the whole app — no screen is left behind.
- **Less motion** skips fades and slides (and follows the system setting).
- **Give feedback** — after a counted walk a popup asks how it went; there is also a Give Feedback button right at the bottom of the More page. Both open the team's Google Form. The link is hardcoded in `EcoTrek/src/constants/feedback.ts` — the one place to change it.
- Large tap targets and plain language throughout ("points," "level," "skip a week," "your progress").

---

## Play-ready behavior

- **Trail photos are ranked and safe.** The client prefers active, curated `trail_photos`
  rows from the API/database, then ranks relevant Wikimedia Commons results and filters
  out map, sign, and logo files. It uses thumbnails when available and replaces broken
  images with a neutral fallback instead of showing a broken-image icon. Curated photo
  metadata is maintained in `EcoTrek/db/schema.sql`; see `EcoTrek/db/README.md`.
- **No error wall on first trail entry.** Austin's vetted bundled trails appear immediately
  while the live lookup retries in the background. Other locations show a loading or safe
  empty state rather than exposing raw network errors. The app retries automatically.
- **Render failures have a recovery page.** The user-facing fallback says **“Sorry, something
  went wrong”**, protects saved walks, and offers **Try again** and **Report error** actions.
- **Local-first, backend-optional.** The app can run without Neon. With the API configured,
  positive cleanup answers sync idempotently to `cleanup_records`, points are auditable in
  `point_events`, clubs share competition totals, and active curated photos are returned by
  `GET /api/trails`. A zero cleanup answer is intentionally not persisted or rewarded.

See `EcoTrek/README.md` for the complete behavior reference. Database/API setup and photo
maintenance are documented in `EcoTrek/server/README.md` and `EcoTrek/db/README.md`.

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
npm start            # Expo tunnel — scan the QR with Expo Go
npm run start:lan    # same Wi-Fi only
npm run web          # browser preview
```

Scan the QR code with Expo Go (keep Expo Go updated for SDK 57). Use the tunnel so the
phone can reach the bundler — `localhost` in a browser does not mean the phone can load
the app. An empty app `.env` keeps EcoTrek fully usable offline.

### Optional app configuration

```bash
cd EcoTrek
cp .env.example .env
# add Google client IDs for Google sign-in, if needed
```

For shared clubs, leaderboards, cleanup sync, cross-device data, and curated trail photos,
set `EXPO_PUBLIC_API_URL` in `EcoTrek/.env` after deploying the API below. Never put
`DATABASE_URL` in this app `.env`.

### Link your Neon database (5 minutes)

The backend in `EcoTrek/server/` is already written for [Neon](https://neon.com) Postgres.
The server requires Node 20+ and keeps the database credential off the phone:

```bash
cd EcoTrek/server
cp .env.example .env
# add DATABASE_URL (use Neon’s POOLED connection string)
# add GOOGLE_CLIENT_IDS (comma-separated web, iOS, and Android client IDs)
npm install
npm run migrate    # creates tables and seeds badges/trails
npm run check      # checks the database, auth configuration, and schema
```

Then put the deployed API's public URL in the app configuration:

```text
EXPO_PUBLIC_API_URL=https://your-api.example.com
```

`npm run check` tells you exactly what is wrong if anything is missing. Full walkthrough:
**`EcoTrek/docs/NEON_SETUP.md`**. The complete endpoint and curated-photo instructions
are in **`EcoTrek/server/README.md`** and **`EcoTrek/db/README.md`**.

```bash
cd EcoTrek
npm test          # logic + render tests
npm run typecheck # TypeScript checks
npm run verify    # strict typecheck + both suites
```

---

## Privacy

Location is used **only while a walk or ride is recording**, including if the phone is locked. When you tap Finish, we stop. Data stays on the device unless you connect a backend. See `EcoTrek/docs/PRIVACY_POLICY.md`.

---

## Project layout

See `EcoTrek/README.md` for the full file tree, theming notes, backend notes, and launch checklist.
