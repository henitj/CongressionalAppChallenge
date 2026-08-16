# EcoTrek

**Hike. Bike. Build the habit.**

EcoTrek is a React Native (Expo SDK 54) app for Austin, Texas. It tracks the
distance you cover under your own power, warns you when it is genuinely unsafe
to be outside, and gives you five small weekly challenges that add points to
your club's score.

One codebase runs on iOS, Android and the web.

Built for the Congressional App Challenge by Henit Jain, Matan Heber,
Arjun Averineni and Basil Vinesh.

---

## What it does

| | |
|---|---|
| **GPS activity tracking** | Distance, pace and route for hikes and rides, with accuracy and jitter filtering. |
| **Automatic trail detection** | Start within a third of a mile of a trailhead and EcoTrek recognises which of 14 Austin trails you are on. Cover 70% of its length and it logs a completion. |
| **Weather and safety warnings** | Live heat index, storms, air quality and UV, plus official National Weather Service flood, tornado and winter warnings. Dangerous conditions block the Start button behind an explanation. |
| **Daily login streaks** | A dedicated streak screen with a month calendar, seven milestones, thirteen streak badges and a growing bonus every seven days. |
| **Weekly challenges** | Five per week, the same five for everyone, reset Monday. Two tracked automatically, three you tick off yourself. Points go to you *and* your club. |
| **Clubs** | Invite-only: joining needs a six-character code. Owner-set member cap, ranked roster, contribution share, and a real worldwide top ten with your own position pinned below it. |
| **Impact profile** | A shareable card with your distance, trees, streak, badges, and any club you are currently topping. |
| **Trail assistant** | Ask questions in plain English. It resolves which trail you mean — including nicknames like "the greenbelt" or "the stairmaster" — and remembers it, so "is it dog friendly?" just works. Runs on-device with no API key. |
| **Local notifications** | Streak reminders, challenge reminders before the week resets, and severe weather alerts. |

### About the trees

Trees in EcoTrek are a **symbolic** measure of effort — one per mile hiked, one
per three miles biked. **No real trees are planted and no organisation is
involved.** The app says so in the Impact tab and on the Track screen. An
earlier version of this project implied a real planting partnership; that claim
has been removed everywhere.

---

## Running it

```bash
cd EcoTrek
npm install
npm start            # then press w for web, or scan the QR code
```

No configuration is needed. With an empty `.env` the app works fully offline on
the device — that includes clubs, streaks, challenges and leaderboards.

```bash
npm test             # 53 logic tests: streaks, weeks, detection, anti-cheat, assistant
npm run typecheck    # tsc --noEmit
```

---

## Configuration

Everything is optional. Copy `.env.example` to `.env` and fill in only what you
need.

| Variable | Turns on |
|---|---|
| `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | Google sign-in (guest mode works without it) |
| `EXPO_PUBLIC_API_URL` | Cloud sync via your Neon-backed API |
| `EXPO_PUBLIC_PRIVACY_URL` | Privacy policy link in Settings and sign-in |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Support link in Settings |

> Anything prefixed `EXPO_PUBLIC_` is bundled into the app and readable by
> anyone who downloads it. Never put a database URL or an API secret there.

---

## Architecture

```
App.tsx                     provider stack (order matters — see the comment)
src/
  components/
    Icon.tsx                ~70 SVG line icons. No emoji anywhere in the UI.
    ui.tsx                  Card, Button, Pill, Sheet, Banner, Segmented…
    ConditionsCard.tsx      the "should I go outside" card
    StreakStrip.tsx         streak calendar strip
    ChallengeItem.tsx       one weekly challenge
  hooks/
    useResponsive.ts        one place that decides what "tablet" means
  constants/
    theme.ts                colours, type scale, spacing, shadows
    challenges.ts           the challenge catalogue + weekly selection
    austinTrails.ts         14 real trails with trailhead coordinates
    ClubContext.tsx         clubs, local-first with API sync
    EcoPointsContext.tsx    points ledger and badges
  context/
    AuthContext, AppContext (location), StreakContext, ActivityContext,
    ChallengeContext, NotificationContext, WeatherContext
  services/
    api.ts                  backend adapter (the on/off switch)
    weather.ts              Open-Meteo + NWS → one safety verdict
    trailDetection.ts       trail matching, completion, anti-cheat
    assistant.ts            on-device trail Q&A with subject memory
    streaks.ts              streak runs, perfect weeks, milestones
    geo.ts / dates.ts       pure helpers, unit tested in plain Node
    notifications.ts        local scheduled notifications
db/                         Neon schema, seed data, column reference
server/                     the API that sits in front of Neon
docs/                       privacy policy, launch checklist, OAuth setup
```

### Two modes, one codebase

Every context reads and writes through `src/services/api.ts`. With
`EXPO_PUBLIC_API_URL` unset it falls back to `AsyncStorage`; with it set it
talks to your server. No screen knows the difference, and if the server is
unreachable the app quietly uses local data instead of crashing.

### Data sources

Both are free and need **no API key**, so nothing here expires or needs
renewing:

- [Open-Meteo](https://open-meteo.com) — conditions, forecast, UV, air quality
- [weather.gov](https://www.weather.gov/documentation/services-web-api) —
  official NWS watches, warnings and advisories

---

## Backend

See [`server/README.md`](./server/README.md) to run it, and
[`db/README.md`](./db/README.md) for the full column reference.

```bash
cd server && npm install
cp .env.example .env      # paste your Neon URL + Google client IDs
npm run migrate           # creates every table and seeds badges and trails
npm start
```

---

## Shipping

[`docs/LAUNCH_CHECKLIST.md`](./docs/LAUNCH_CHECKLIST.md) is the full list of
what is done and what still needs a human. The short version: publish the
privacy policy, create your own Google Cloud project with a release-keystore
SHA-1, and submit to internal testing early — the first Play review can take a
week.
