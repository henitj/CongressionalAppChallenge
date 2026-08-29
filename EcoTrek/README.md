# EcoTrek

**Tap Start. Walk. We count the miles.**

A React Native app (Expo SDK 54) for Austin walkers, hikers, and cyclists. One codebase for iOS, Android, and web.

Built for the Congressional App Challenge by Henit Jain, Matan Heber, Arjun Averineni and Basil Vinesh.

---

## What it does now

| | |
|---|---|
| **Start from Home** | Walk or Bike, then one large Start button. The Start tab is the same action with a bit more explanation. |
| **Three tabs** | Home · Start · More. More is grouped into You / Explore / App so it reads as sections, not a dump. |
| **Back button** | Every screen you open has a chevron at the top-left that takes you back. No dead ends. |
| **My walks** | This week’s miles plus every saved walk. Recap and records are one tap away. |
| **Background recording** | Keeps measuring if you lock the phone. Android shows “EcoTrek is recording.” Stops on Finish. |
| **Weather** | One tiny box on Home: temperature, condition, and a single friendly line. We are not a weather app. Full detail is one tap away. |
| **Safety** | Call 911 and Text my contact on the live screen. Sit-down reminder after 25 minutes. |
| **Simple mode** | Bigger text. Clubs and weekly goals stay out of the way. |
| **Text size / look** | Normal, Large, Extra large. Light, Dark, High contrast. Less motion. |
| **Guest → Google** | Walks already on the phone are copied when you save with Google. |
| **Skippable setup** | The first-run name and height questions can be skipped. |
| **Your photo** | Tap the avatar on your profile to pick or take your own picture. It becomes your profile logo everywhere. |
| **Share card** | A real picture — your photo plus your stats — sent through the system share sheet. If a device can’t make a picture, it falls back to sharing the stats as text, and the card is always on screen to show someone directly. |
| **Trails** | 14 Austin trails, offline. Cards show distance, easy/medium/hard, dogs, water, bathrooms. |
| **Trees** | Symbolic only. 1 per mile walked, 1 per 3 miles biked. |

---

## Run

```bash
npm install
npm start            # then w for web, or scan the QR code
npm test
npm run typecheck
```

Copy `.env.example` to `.env` only if you need Google sign-in or `EXPO_PUBLIC_API_URL`. Empty env = full offline app.

---

## Tests

| Command | What it proves |
|---|---|
| `npm run test:logic` | Pure logic — dates, streaks, trails, anti-cheat, recap |
| `npm run test:render` | Every screen mounts on an empty account |
| `npm run verify` | Typecheck with unused-code checks, then both suites |

---

## Important files

```
App.tsx                         providers + font scaling
src/navigation/RootNavigator.tsx  Home / Start / More + stack
src/screens/HomeScreen.tsx      greeting, weather, Start walk, last walk
src/screens/MoreScreen.tsx      trails, walks, clubs, profile, settings
src/screens/HistoryScreen.tsx   My walks (this week + list)
src/screens/ActiveTrackingScreen.tsx  live GPS, 911, rest reminder
src/constants/SettingsContext.tsx    units, simple mode, text size, theme
src/context/ThemeContext.tsx    light / dark / high contrast + font scale
src/services/location.ts        foreground watch + background task
src/services/locationTask.ts    TaskManager definition
src/services/storage.ts         per-user keys + guest → Google copy
src/hooks/useStartActivity.ts   shared Start logic for Home and Start tab
src/components/ShareCard.tsx    shareable progress picture (view-shot → share sheet)
src/services/avatar.ts          profile photo: pick/take, compress, store
```

---

## Accessibility notes

- `allowFontScaling` is on, with a 1.8× cap so layouts do not break.
- Settings text size multiplies type on Home and headers.
- Simple mode adds a little more scale and hides clubs/goals in More.
- Reduce motion skips stack animations and the sign-in fade.
- Emergency contact is stored on the profile and used from a live walk.

---

## Backend (optional)

See `server/README.md` and `db/README.md`. The app does not need a server.

---

## Shipping

`docs/LAUNCH_CHECKLIST.md` — privacy policy, Google Cloud SHA-1, and store review.
