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

## 5. Store assets

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

## 6. Play Console forms

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

## 7. Build and submit

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

## 8. Timing

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
