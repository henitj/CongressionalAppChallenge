# EcoTrek

**Tap Start. Walk. We count the miles.**

A React Native app (Expo SDK 57) for Austin walkers, hikers, and cyclists. One codebase for iOS, Android, and web.

Built for the Congressional App Challenge by Henit Jain, Matan Heber, Arjun Averineni and Basil Vinesh.

---

## Sign in and first run

- **Google works for both signing in and signing up.** On a real device the button
  opens Google's account chooser. In the web demo (where an OAuth redirect can't
  come back to the preview origin) it opens a built-in account sheet instead:
  tap a previous account to sign in, or type a name + email to create one.
  Either way it is one tap to done.
- **Continue as guest** needs no account at all. The guest identity is stable per
  device, so signing out and back in as a guest keeps your walks, profile, and
  onboarding state — it never feels like re-registering.
- **Guest → Google** later: walks already on the phone are copied over when you
  sign in with Google.
- **First run, once per account:** sign in → **Get Started** (your name is
  pre-filled from your sign-in name; height/weight are optional) → home.
  Returning users go straight to home.
- **Your name is always yours.** Tap your name on the profile (pencil icon) to
  edit it any time; it updates the home screen and the share card.

---

## What it does now

| | |
|---|---|
| **One place to start** | The Start tab is a full screen: a drawn trail scene (it changes when you pick Bike), Walk/Bike, and one large Start button. No scrolling, no paragraph. Home stays a dashboard — no second start button to wonder which to press. |
| **Home** | Greeting, one tiny weather box, a compact "This week" card (distance, trees, streak), and your last walk. That's it. |
| **Three tabs** | Home · Start · More. More is grouped into You / Explore / App so it reads as sections, not a dump. |
| **Back button** | Every screen you open has a chevron at the top-left that takes you back. No dead ends. |
| **My walks** | This week's miles plus every saved walk. Recap and records are one tap away. |
| **Background recording** | Keeps measuring if you lock the phone. Android shows "EcoTrek is recording." Stops on Finish. |
| **Weather** | One tiny box on Home: temperature, condition, and a single friendly line. We are not a weather app. Full detail is one tap away. |
| **Safety** | A big one-tap Stop button at the top of the live screen, plus Call 911 (with a confirm step). Sit-down reminder after 25 minutes. |
| **Live map** | Real map tiles: Apple Maps on iOS, Google on Android, OpenStreetMap through Leaflet on web (bundled, not fetched from a CDN). If tiles cannot be reached, the screen draws the route it has recorded instead of a grey box. |
| **Trash pickup** | After a walk of ten minutes or more, EcoTrek asks how many pieces of litter you picked up. Answering adds bonus points, credits the extra minutes, and counts toward your Impact and badges. "None this time" is one tap. |
| **Simple mode** | Bigger text and bigger buttons everywhere, clubs and weekly goals hidden from Home and More, and three big numbers on the live walk screen instead of eight. |
| **Text size / look** | Normal, Large, Extra large. Light, Dark, or Sky (sunrise / afternoon / sunset in daytime only). |
| **Your photo** | Tap the avatar on your profile to pick or take your own picture. It becomes your profile logo everywhere. |
| **Share card** | A real picture — your photo plus your stats — sent through the system share sheet. If a device can't make a picture, it falls back to sharing the stats as text, and the card is always on screen to show someone directly. |
| **Trails** | 14 Austin trails, offline. Cards show area, distance (when location is on), easy/medium/hard, dogs, water, bathrooms. "Ask about a trail" goes straight to the assistant. |
| **Trees** | Symbolic only. 1 per mile walked, 1 per 3 miles biked. |

---

## Run

```bash
npm install
npm start            # tunnel — scan the QR with Expo Go
npm run start:lan    # same Wi‑Fi only (no tunnel)
npm run web          # web only
npm test
npm run typecheck
```

Expo Go on a phone cannot use `localhost`. If the browser preview works but the phone stays on a loading screen, use `npm start` (tunnel) and update Expo Go to SDK 57.

Copy `.env.example` to `.env` only if you need Google sign-in or `EXPO_PUBLIC_API_URL`. Empty env = full offline app.

---

## Tests

| Command | What it proves |
|---|---|
| `npm run test:logic` | Pure logic — dates, streaks, trails, anti-cheat, recap |
| `npm run test:render` | Every screen mounts on an empty account, plus sign-in, onboarding, setup, and profile flows |
| `npm run verify` | Typecheck with unused-code checks, then both suites |

---

## Important files

```
App.tsx                            providers + single font scaler + branded splash
src/navigation/RootNavigator.tsx   Home / Start / More tabs + stack
src/screens/SignInScreen.tsx       sign-in: Google (local account sheet on web) + guest
src/screens/SetupScreen.tsx        Get Started: name (pre-filled) → height/weight → step length
src/screens/OnboardingScreen.tsx   4-page intro, dots + Next + Skip
src/components/OnboardingGate.tsx  first-run order + once-per-account persistence
src/context/AuthContext.tsx        sessions, Google (real + local), stable guest id, migration
src/screens/HomeScreen.tsx         greeting, weather, this week, last walk
src/screens/TrackScreen.tsx        Start tab: Walk/Bike + one big Start button
src/screens/MoreScreen.tsx         You / Explore / App sections
src/screens/ProfileScreen.tsx      photo + editable name, level, weight, club, streak, badges
src/screens/HistoryScreen.tsx      My walks (this week + list)
src/screens/ActiveTrackingScreen.tsx  live GPS, 911, rest reminder, post-walk trash question
src/components/LiveMap.web.tsx     web map: bundled Leaflet + OpenStreetMap tiles
src/components/RouteSketch.tsx     drawn route, used when map tiles are unreachable
src/components/TrailScene.tsx      the Start tab illustration (SVG, re-themes itself)
src/services/cleanup.ts            when to ask about litter, and what it is worth
src/constants/SettingsContext.tsx  units, text size, theme
src/context/ThemeContext.tsx       light / dark / sky + scaled typography
src/services/location.ts           foreground watch + background task
src/services/locationTask.ts       TaskManager definition
src/services/storage.ts            per-user keys + guest → Google copy
src/hooks/useStartActivity.ts      shared Start logic
src/components/ShareCard.tsx       shareable progress picture (view-shot → share sheet)
src/services/avatar.ts             profile photo: pick/take, compress, store
```

---

## Theming and text size

- Every screen reads its colors and typography from `useTheme()`. Switching
  Light / Dark / Sky re-themes the whole app — no screen is left
  behind, and nothing is hard-coded per screen. Sky only tints during the day.
- The app owns text sizing: OS font scaling is turned off and the Settings
  text size (Normal / Large / Extra large) scales the entire type ramp through
  `ThemeContext` in one place. One scaler, so larger text can't blow up a layout.
- Brand pages (sign-in, intro, dark share card) are intentionally always dark.

---

## Accessibility notes

- Settings text size multiplies the whole type ramp (see above).
- Give feedback: the button at the bottom of Profile (and on the hike summary) opens the team's Google Form; the link is hardcoded in `src/constants/feedback.ts`.
- Tap targets meet the 52 pt minimum; icons always ship with labels.

---

## Backend (optional)

See `server/README.md` and `db/README.md`. The app does not need a server.

---

## Shipping

`docs/LAUNCH_CHECKLIST.md` — privacy policy, Google Cloud SHA-1, and store review.
