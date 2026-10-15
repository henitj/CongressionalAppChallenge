# Launch checklist

Everything left between here and a live Play Store listing. Ordered so nothing
blocks on something later in the list.

Legend: **[you]** needs an account or a decision only you can make · **[done]**
already handled in the code.

---

## 1. Accounts and money

- [ ] **[you]** Google Play Developer account — **$25, one time**. If you are
      under 18 the account has to be registered by an adult (a parent or a
      teacher), because it is a legal agreement. Do this first: identity
      verification can take a few days and everything else waits on it.
      https://play.google.com/console/signup
- [ ] **[you]** Decide the developer name shown publicly on the listing. Use the
      team or school name, not a personal address.
- [ ] **[you]** Create a support email you actually check. Put it in
      `EXPO_PUBLIC_SUPPORT_EMAIL` and in `src/constants/appInfo.ts`.

## 2. Privacy policy (hard blocker)

- [ ] **[done]** Draft written — `docs/PRIVACY_POLICY.md`.
- [ ] **[you]** Publish it at a public URL. Free option: repo Settings → Pages →
      deploy from `/docs`. You get
      `https://henitj.github.io/CongressionalAppChallenge/PRIVACY_POLICY`.
- [ ] **[you]** Put that URL in `.env` as `EXPO_PUBLIC_PRIVACY_URL` and in the
      Play Console listing.

## 3. Local profiles and optional AI authentication

The current app has no EcoTrek account login. Google OAuth is **not** a launch blocker for the website or downloadable WebView APK. Do not show unconfigured sign-in or claim cross-device sync. See `GOOGLE_OAUTH_SETUP.md` only if deliberately restoring that separate feature.

- [x] Local profiles work without an account.
- [x] Grok uses an explicit Puter Connect/Test flow and only reports Connected after a model reply.
- [ ] **[you]** With a real Puter account, complete sign-in and a custom Grok question on the deployed HTTPS site and the signed APK. Account/credit limits may apply.
- [ ] **[you]** Check cancelled/blocked popups and retry, not just a successful login. The Android child-window bridge assembles, but still needs physical-device verification.

## 4. Neon database (optional for launch, needed for shared clubs)

Without it the app works fully — clubs just live on one device. Full
step-by-step guide with screenshots-level detail: **`docs/NEON_SETUP.md`**.

- [ ] **[you]** Create a Neon project at https://neon.com and copy the **pooled**
      connection string.
- [ ] **[you]** `cd server && cp .env.example .env`, paste `DATABASE_URL` (and
      `GOOGLE_CLIENT_IDS` when you switch sign-in on).
- [ ] **[you]** `npm install && npm run migrate && npm run check` — migrate
      creates every table; check proves the connection and says exactly what is
      wrong if it is not.
- [ ] **[you]** Deploy `server/` anywhere that runs Node (Render and Railway
      both have free tiers). Set the same env vars there.
- [ ] **[you]** Put the deployed URL in the app's `.env` as
      `EXPO_PUBLIC_API_URL`. That single line flips the whole app from
      on-device to cloud. No other change. With the line left empty the app
      stays local-first and nothing breaks.
- [ ] **[done]** Schema, migration script, API and client adapter all written.
- [ ] **[done]** `.env` is loaded automatically by the server; `npm run check`
      validates the link end to end.

## 5. Map display and GPS

The website/downloadable WebView APK use bundled Leaflet and keyless OpenStreetMap tiles. A Google browser key is **not** required.

- [x] About two-thirds of the tracking area is reserved for the map, with a landscape split, independent stats scrolling and reachable stop controls.
- [x] Tile failure shows a route-only view and retry without stopping GPS; the tile watchdog is bounded.
- [ ] **[you]** On real hardware with the network enabled, confirm OSM tiles, current-location accuracy, route lines, drag/zoom/recenter and rotation.
- [ ] **[you]** Revoke location and disable network separately; check that GPS and tile errors are distinguished.
- [ ] **[you]** For a larger deployment, choose a tile service appropriate for traffic and review its usage terms. No prefetch/bulk download is implemented.

Only a **separate native Android/EAS build** uses `react-native-maps`/Google Maps and needs `GOOGLE_MAPS_ANDROID_KEY` with Maps SDK for Android enabled and a package/signing-certificate restriction. Native iOS uses Apple Maps.

## 6. Store assets

- [ ] **[done]** App icon, adaptive icon, splash, favicon, notification icon —
      all generated in `assets/`.
- [ ] **[you]** Replace the icon with something nicer if you have a designer on
      the team. The current one is clean and ships fine as is.
- [ ] **[you]** Feature graphic, 1024 × 500 PNG. Required.
- [ ] **[you]** At least 2 phone screenshots (Play allows up to 8 — use them
      all). Best six: Home with a weather warning showing, Track mid-activity,
      Weekly challenges, Clubs roster, Profile impact card, Conditions report.
- [ ] **[you]** Short description, 80 characters max.
- [ ] **[you]** Full description, 4000 characters max.
- [ ] **[done]** Give feedback: a popup after a counted walk, plus a button
      at the bottom of the More page, opens the team's Google Form (link
      hardcoded in `src/constants/feedback.ts`). To point it at a different
      form, change that one URL — nothing else.

## 7. Play Console forms

- [ ] **[you]** **Data safety** — review the actual native release and current Play guidance, not a generic checklist. Disclose off-device location/viewport requests to map, trail and weather providers and optional prompts/account data handled by Puter or a selected AI provider. Local profiles do not use Google sign-in in this release. Verify HTTPS, deletion controls and each SDK’s practices against `PRIVACY_POLICY.md`.
- [ ] **[you]** **Content rating questionnaire** — answer honestly. EcoTrek
      lands at Everyone / PEGI 3.
- [ ] **[you]** **Target audience** — select **13 and over**. Do not opt into
      the Families programme; it triggers a much stricter review and COPPA
      obligations you do not want.
- [ ] **[you]** **App access** — explain the local-profile onboarding (no EcoTrek login) and separate optional Puter login. Give reviewers clear instructions to test both local answers and online Grok.
- [ ] **[you]** **Ads** — declare none. There are none.

## 8. Build and submit

```bash
npm install -g eas-cli
eas login
eas build:configure          # writes the projectId into app.json
eas build --platform android --profile production
eas submit --platform android
```

- [ ] **[done]** `eas.json` written with development / preview / production
      profiles.
- [ ] **[you]** Run `eas build:configure` once — it fills in the empty
      `extra.eas.projectId` in `app.json`.
- [ ] **[you]** Test the **production APK on a real Android phone** before
      submitting, not just Expo Go. Specifically check: location permission,
      actual map tiles, a saved walk, persistent tree care, and optional Puter
      sign-in plus a real Grok reply. Web mocks do not prove these services work.
- [ ] **[you]** Use **internal testing** first. It reviews in hours instead of
      days and catches the obvious rejections.

## 9. Timing

Checklist refreshed **14 October 2026**. Confirm your district’s official Congressional App Challenge deadline before choosing a release date. Allow time for physical-device testing and any store review; do not represent a sideload APK as an approved Play Store release. Record the demo on the tested release build.

---

## Already handled in the code

| Was a problem | Now |
|---|---|
| `assets/icon.png`, `splash.png`, `favicon.png` missing — EAS build fails | Generated, plus adaptive and notification icons |
| `ACCESS_BACKGROUND_LOCATION` declared with no background task | Removed from `android.permissions` AND hard-blocked with `tools:node=\"remove\"` in the manifest, so no library can re-add it; Play scrutinises this heavily |
| Legacy permissions (`RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`) leaked into the manifest from the template | All four blocked via `android.blockedPermissions`; final manifest carries only the six permissions the app actually uses |
| A render error in any screen took the whole app down | Root `ErrorBoundary` shows a calm retry screen; fallback is self-contained (no theme/context) so it renders even when providers crash |
| Corrupted stored data (truncated JSON, wrong-shape payloads, `null`) crashed `ChallengeContext`, `ProfileContext`, `StreakContext`, `ActivityContext`, `ClubContext`, `EcoPointsContext` | Every storage load is shape-validated (`isArray`/`isObject`) and contexts normalize hostile-but-valid data; covered by a 17-test resilience suite |
| The API process died on bad sockets or unexpected errors | `clientError` handler, `uncaughtException`/`unhandledRejection` guards, graceful SIGTERM/SIGINT shutdown |
| `server/.env` was never loaded — pasting the Neon URL did nothing | Zero-dependency env loader; `npm run check` validates the Neon link end to end |
| Firebase imported but not installed — Clubs tab crashed | Firebase gone entirely; clubs are local-first with an API adapter |
| Public Firebase "playground" database, open read/write to the world | Deleted |
| Groq API key bundled into the client | Client-side call removed; belongs behind the API |
| Activity history lost on every app close | Persisted, namespaced per user |
| `userId: 'demo-user'` hardcoded | Real signed-in user id |
| Location permission requested on app boot | Requested when a feature needs it, with an explanation |
| Fake Veritree receipts implying real trees were planted | Replaced with clearly-labelled symbolic trees |
| Hardcoded mock global leaderboard presented as real | Real data only, with an honest note when it is device-local |
| No account deletion | Settings → Delete account |
| Unused `@expo/ngrok` and `@google/genai` dependencies | Removed |
| Website/WebView map depended on a missing Google key | Bundled Leaflet + OSM tiles; route-only retry if offline. Native Android keys remain separately configurable. |
| Default account sign-in was unconfigured | Current release uses local profiles. Puter authentication is separate and optional for online Grok. |
| `PATCH /api/clubs/:id` did not exist, so member caps silently failed in cloud mode | Route added; cap round-trips correctly |
| Streak sync made up to 60 HTTP round trips per check-in | Collapsed into a single batched upsert |
| The API auth token was never attached to any request, so every backend call would have failed with 401 | `setAuthTokenProvider` is now wired from AuthContext |
| Client held a Google *access* token while the server verified an *ID* token | Server accepts and validates either, checking the audience both ways |
| Location fell back to a simulated walker when permission was denied, inventing distance and awarding real trees | Simulator deleted; failures now surface an error and record nothing |
| `club_joined`, `plant_identified`, `photo_uploaded` and `cleanup` were scoring rules with no feature behind them | All now have features, except `photo_uploaded` which was removed |
| Leaderboard ranked every club on the phone | Ranking moved into Postgres, top ten plus your own row |

## Second-pass review fixes

| Was a problem | Now |
|---|---|
| Pushed screens (Trails, Clubs, Profile) had no back button, so people could get stuck | Every pushed screen's header has a back chevron; if there is no history it returns to the tabs instead of doing nothing |
| More tab was one flat list of seven unrelated things | Grouped into You / Explore / App sections |
| Home weather showed a status banner, a headline, feels-like, and an hourly strip, and the Conditions page repeated it | Home is one tiny box — temperature, condition, one friendly sentence; the full report lives one tap away and nothing is shown twice |
| Weather verdicts read "Stay inside today / Poor conditions" like an alarm | Calm, useful copy: "You can head out — maybe go in the morning and carry extra water". A test locks the tone in |
| Streak reminder said "your 4-day streak" when streaks are measured in weeks, and the other reminders were vague | Three accurate streak states (safe this week / keep it going / start one), and the challenge and recap reminders now say exactly what is left and where to look |
| Share sent plain text and the "picture" was only described, not produced | Share captures the card (photo, name, stats) into a PNG and sends it through the system share sheet; if a device cannot make a picture it falls back to text and says so; the card is always on screen to show someone directly |
| Profile logo was only the Google sign-in picture | Tap the avatar to pick a photo or take one; it is compressed, square-cropped on native, stored in the app's documents, and used everywhere the avatar appears |
| A flagged "drive" (40 mph average) still completed an auto weekly challenge and awarded 25 points | `weekStats` only counts valid activities; the regression is covered by the flow test |
