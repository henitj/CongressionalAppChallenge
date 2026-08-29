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

## 3. Google sign-in for a real build

This is where most first submissions break.

- [ ] **[you]** Make your own Google Cloud project. The client IDs currently in
      the code belong to project `140635508834`, which is not yours.
- [ ] **[you]** Configure the OAuth consent screen. External, published. Scopes:
      only `email`, `profile`, `openid` — these are non-sensitive, so you skip
      Google's verification review entirely. Do not add anything else.
- [ ] **[you]** Create three OAuth clients:
      - Web — redirect URI `https://auth.expo.io/@<expo-username>/ecotrek`
      - iOS — bundle ID `com.ecotrek.app`
      - Android — package `com.ecotrek.app`, SHA-1 from **`eas credentials`**
- [ ] **[you]** Use the **release** keystore SHA-1 for the Android client, not
      the debug one. Debug works in Expo Go and fails on the Play build, which
      is a miserable bug to find after submitting.
- [ ] **[you]** Paste all three into `.env`.
- [ ] **[done]** `authConfig.ts` reads them from `.env` and reports per-platform
      what is missing.

## 4. Neon database (optional for launch, needed for shared clubs)

Without it the app works fully — clubs just live on one device.

- [ ] **[you]** Create a Neon project at https://neon.com and copy the **pooled**
      connection string.
- [ ] **[you]** `cd server && cp .env.example .env`, paste `DATABASE_URL` and
      `GOOGLE_CLIENT_IDS`.
- [ ] **[you]** `npm install && npm run migrate` — creates every table and seeds
      badges, trails and a sample challenge.
- [ ] **[you]** Deploy `server/` anywhere that runs Node (Render and Railway
      both have free tiers). Set the same two env vars there.
- [ ] **[you]** Put the deployed URL in the app's `.env` as
      `EXPO_PUBLIC_API_URL`. That single line flips the whole app from
      on-device to cloud. No other change.
- [ ] **[done]** Schema, migration script, API and client adapter all written.

## 5. Android map key (hard blocker for a usable build)

react-native-maps on Android needs a Google Maps key or the map is a blank
grey rectangle. It is free for mobile map display.

- [ ] **[you]** In your Cloud project, enable **Maps SDK for Android**.
- [ ] **[you]** Create an API key, then restrict it: Application restriction →
      Android apps → add package `com.ecotrek.app` with your release SHA-1.
      An unrestricted key can be lifted out of your APK and used by anyone.
- [ ] **[you]** Put it in `.env` as `GOOGLE_MAPS_ANDROID_KEY`, and add the same
      value as an EAS secret so release builds pick it up:
      `eas secret:create --name GOOGLE_MAPS_ANDROID_KEY --value <key>`
- [ ] **[done]** `app.config.js` injects it at build time and warns during an
      Android EAS build if it is missing.
- iOS needs nothing here — it uses Apple Maps, which requires no key.

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
- [ ] **[done]** Give feedback: the button opens the team's Google Form
      (link hardcoded in `src/constants/feedback.ts`). To point it at a
      different form, change that one URL — nothing else.

## 7. Play Console forms

- [ ] **[you]** **Data safety** — declare exactly this:
      - Location (approximate + precise): collected, **not** shared, optional,
        used for App functionality. Not linked to advertising.
      - Personal info (name, email): collected only for Google sign-in, not
        shared, used for App functionality and Account management.
      - Data is encrypted in transit: **yes**.
      - Users can request deletion: **yes** (Settings → Delete account).
- [ ] **[you]** **Content rating questionnaire** — answer honestly. EcoTrek
      lands at Everyone / PEGI 3.
- [ ] **[you]** **Target audience** — select **13 and over**. Do not opt into
      the Families programme; it triggers a much stricter review and COPPA
      obligations you do not want.
- [ ] **[you]** **App access** — Play reviewers need to get in. Either point them
      at the "Continue as guest" button (say so in the notes) or give test
      credentials.
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
      submitting, not just Expo Go. Specifically check: Google sign-in works,
      location permission prompt appears with your wording, and a tracked
      activity saves.
- [ ] **[you]** Use **internal testing** first. It reviews in hours instead of
      days and catches the obvious rejections.

## 9. Timing

Today is **16 August 2026**. The Congressional App Challenge closes in
**late October**.

- First Play review commonly takes **3–7 days**, occasionally longer for a brand
  new developer account.
- Submit to internal testing by **mid September**. That leaves room for one
  rejection, a fix, and a resubmission without touching your deadline.
- Record your CAC demo video from a **real device running the release build**.
  Judges notice a simulator.

---

## Already handled in the code

| Was a problem | Now |
|---|---|
| `assets/icon.png`, `splash.png`, `favicon.png` missing — EAS build fails | Generated, plus adaptive and notification icons |
| `ACCESS_BACKGROUND_LOCATION` declared with no background task | Removed and explicitly blocked; Play scrutinises this heavily |
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
| Android map had no API key configured — blank grey box on release | `app.config.js` injects it and warns if absent |
| iOS Google sign-in URL scheme was missing from the config | Derived automatically from the iOS client id |
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
