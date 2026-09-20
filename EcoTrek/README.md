# EcoTrek

**Tap Start. Walk. We count the miles.**

A React Native app (Expo SDK 57) for walkers, hikers, and cyclists. Trails are looked up around the phone in the United States, Canada, and Mexico, so a walker in New York sees their local routes rather than Austin's. One codebase for iOS, Android, and web.

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
- **First run, once per account:** sign in → the five-page **Start tutorial** →
  **Get Started** (your name is pre-filled from your sign-in name; height/weight
  are optional) → home. The tutorial includes the honesty prompt and shows the
  0–99 trash count. Done and Skip are both persisted per account, so it is shown
  only once. Returning users go straight to home.
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
| **Trash pickup** | After every valid trail, EcoTrek asks, "How many pieces of trash do you pick up?" Enter an honest number from 0 to 99. More pieces earn more points, contribute to your club, and count toward Impact and badges. "None this time" is one tap. |
| **Simple mode** | Bigger text and bigger buttons everywhere, clubs and weekly goals hidden from Home and More, and three big numbers on the live walk screen instead of eight. |
| **Text size / look** | Normal, Large, Extra large. Light, Dark, or Sky (sunrise / afternoon / sunset in daytime only). |
| **Your photo** | Tap the avatar on your profile to pick or take your own picture. It becomes your profile logo everywhere. |
| **Share card** | A real picture — your photo plus your stats — sent through the system share sheet. If a device can't make a picture, it falls back to sharing the stats as text, and the card is always on screen to show someone directly. |
| **Trails** | Named walks and rides near you in the US, Canada, and Mexico, looked up from OpenStreetMap using live GPS. Austin's 14 trails ship as richer cards when you are actually in Austin. Cards show area, distance, easy/medium/hard, dogs, water, bathrooms. "Ask about a trail" goes straight to the assistant. |
| **Trees** | Symbolic only. 1 per mile walked, 1 per 3 miles biked. |

---

## Release behavior and reliability

### Post-trail trash honesty prompt

Every valid trail activity opens a post-trail sheet with the exact question:

> **How many pieces of trash do you pick up?**

The answer is self-reported and limited to **0–99 pieces**. The sheet includes quick
choices for 1, 10, 50, and 99, accepts keyboard entry, and explains the honesty policy.
More pieces earn more EcoPoints, contribute to the user's club, and appear in Impact,
badges, and the points ledger. **None this time** closes the question without inventing
a number. Activities rejected by the anti-cheat checks do not receive the prompt or rewards.

The UI and local-first logbook normalize every answer through `MAX_CLEANUP_PIECES = 99`.
A positive answer is saved and synced as one idempotent `cleanup_records` row; choosing
zero / **None this time** intentionally closes the prompt without creating a cleanup
record or awarding points.

### One-time start tutorial

The five-page Start tutorial appears between sign-in and profile setup. Its final page
shows the 0–99 trash input, the honesty policy, and the club-points relationship. The
Done/Skip choice is stored under the signed-in account's namespaced storage key:

```text
@ecotrek/<account-id>/start_tutorial_complete
```

That makes it a once-per-account experience: signing out and back in does not replay it,
and a returning account goes straight to the app after the flag is present.

### Trail loading without repeated taps

Opening the Trails page automatically requests location and starts the catalogue lookup.
The lookup runs up to three bounded attempts in the background, equivalent to the old
manual Retry, Retry, Retry flow. Austin's verified bundled catalogue appears immediately
while the live OpenStreetMap/Nominatim result is loading. A stale or empty network result
never replaces a working bundled result with an error screen.

### Real-photo rules

Trail photos are real image URLs, not AI-generated scenery presented as fact. The client
prefers approved `trail_photos` rows returned by the optional API, then uses Wikimedia
Commons as the offline/no-backend source. Photo titles are ranked for trail relevance,
map/sign/logo files are filtered out, thumbnails are used where available, and a failed
image becomes a neutral placeholder instead of a broken image. See `db/README.md` for
how to add an approved photo without changing the app build.

### Error fallback

The root `ErrorBoundary` catches render-time failures and shows a self-contained screen:

> **Sorry, something went wrong**

It includes a working **Try again** retry button, protects saved walks, and provides a
Report error action if the problem persists. Network-backed features use local fallback
or a safe empty state rather than surfacing raw fetch/API errors to the user.

---

## Run

```bash
npm install
npm start            # tunnel — scan the QR with Expo Go
npm run start:lan    # same Wi‑Fi only (no tunnel)
npm run web          # web only
npm test
npm run typecheck
npm run verify      # strict typecheck + logic + render suites
```

Expo Go on a phone cannot use `localhost`. If the browser preview works but the phone stays on a loading screen, use `npm start` (tunnel) and update Expo Go to SDK 57.

### Troubleshooting: `java.io.IOException: Failed to download remote update`

This error appears **on the phone inside Expo Go**, not in the project. It means Expo
Go could not reach the Metro bundler on your computer to download the JS bundle. It is a
network/environment issue, not a code bug. Fix it in this order:

1. **Run through the tunnel** (this repo's default): `npm start`. Plain `npx expo start`
   uses LAN mode, which needs the phone and PC to reach each other directly. The tunnel
   routes through Expo's servers and sidesteps most of these problems. Let it install
   `@expo/ngrok` the first time if it asks. (Watch for typos — the command is
   `expo`, not `epxo`/`espo`.)
2. **Windows Firewall / antivirus** is the most common cause on Windows. Open "Allow an
   app through Windows Firewall", find every **Node.js JavaScript Runtime** entry and
   tick both **Private** and **Public**. Also set your Wi-Fi to a **Private** network
   (Settings → Network & Internet → Wi-Fi → your network → Private).
3. **SDK mismatch.** This project targets **Expo SDK 57**. If Expo Go on the phone was
   updated past SDK 57 it cannot load the project. Update/reinstall Expo Go and clear its
   cache (long-press the app → App info → Storage → Clear cache).
4. **Same network.** In LAN mode both devices must be on the same network — no VPN, no
   guest/"AP isolation" Wi-Fi, and not one on Ethernet while the other is on Wi-Fi. A
   reliable fallback is to make the phone a hotspot and connect the PC to it, then
   `npm start`.
5. **Clear the Metro cache** if a stale bundle is suspected: `npx expo start --tunnel --clear`.

### Optional configuration

Copy `.env.example` to `.env`. With an empty app `.env`, EcoTrek remains a fully usable
local-first app: walks, trash answers, points, clubs, photos, and tutorial state work on
the device without a server.

For Google sign-in, paste the three client IDs into `.env`. Full walkthrough:
`docs/GOOGLE_OAUTH_SETUP.md`.

For shared clubs, leaderboards, cleanup records, curated photos, and cross-device sync:

```bash
cd server
cp .env.example .env
# add DATABASE_URL and GOOGLE_CLIENT_IDS
npm install
npm run migrate
npm run check
```

Then set the public API URL in `EcoTrek/.env`:

```text
EXPO_PUBLIC_API_URL=https://your-api.example.com
```

Full database walkthrough: `docs/NEON_SETUP.md`. Never put `DATABASE_URL` in the Expo
app; it belongs only in `server/.env`.

---

## Tests

| Command | What it proves |
|---|---|
| `npm run test:logic` | Pure logic — dates, streaks, trails, anti-cheat, recap, 0–99 cleanup rules, and photo parsing |
| `npm run test:render` | Every screen mounts on an empty account, plus sign-in, one-time tutorial, setup, profile, cleanup, and error-boundary flows |
| `npm run verify` | Strict typecheck with unused-code checks, then both suites |

The release verification includes an explicit test that the tutorial is persisted after
Skip and does not appear on the next launch, a test that the tutorial visibly shows the
0–99 trash range, cleanup reward tests, and render tests for the working retry fallback.

---

## Important files

```
App.tsx                            providers + single font scaler + branded splash
src/navigation/RootNavigator.tsx   Home / Start / More tabs + stack
src/screens/SignInScreen.tsx       sign-in: Google (local account sheet on web) + guest
src/screens/SetupScreen.tsx        Get Started: name (pre-filled) → height/weight → step length
src/screens/OnboardingScreen.tsx   5-page intro, 0–99 trash demo, dots + Next + Skip
src/components/OnboardingGate.tsx  one-time tutorial → profile setup, per-account persistence
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
src/services/cleanup.ts            0–99 cleanup normalization, prompt rules, and rewards
src/services/trailPhotos.ts         Commons/admin photo lookup, relevance ranking, and fallbacks
src/constants/SettingsContext.tsx  units, text size, theme
db/schema.sql                      trails, approved trail photos, cleanups, activities, clubs
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
- Give feedback: after a counted walk a popup asks how it went; the More page also has a Give Feedback button right at the bottom. Both open the team's Google Form; the link is hardcoded in `src/constants/feedback.ts`.
- Tap targets meet the 52 pt minimum; icons always ship with labels.

---

## Backend and database (optional but Play-ready)

The app does not need a server to run. Local-first storage means a user can walk,
answer the cleanup question, earn points, and view trails offline. When the API is
configured, the same records sync to Neon:

- `activities` — validated hikes/rides and their paths
- `cleanup_records` — one idempotent 1–99 cleanup count per answer
- `point_events` — auditable personal points ledger
- `clubs` / `club_members` — shared club competition
- `trails` — approved trail catalogue rows
- `trail_photos` — approved image URLs, thumbnails, attribution, and scenery/path kind

To add a curated photo, insert a URL and optional thumbnail into `trail_photos`, set
`is_active = true`, and the API automatically includes it in `/api/trails`. Image bytes
stay in Wikimedia/object storage; Postgres stores metadata and URLs only. This avoids
shipping a new APK just to replace a strange or outdated image.

See `server/README.md` and `db/README.md` for the complete setup and endpoint list.

---

## Shipping

`docs/LAUNCH_CHECKLIST.md` — privacy policy, Google Cloud SHA-1, EAS credentials,
Neon/API configuration, Play data-safety answers, and store review. Before uploading,
run `npm run verify`, configure production environment variables, run the API migration,
and test the release build on a physical Android device with location permission,
background recording, offline mode, cleanup prompt, photo fallback, and the error retry
screen.
