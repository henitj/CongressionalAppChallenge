# EcoTrek

**Tap Start. Walk. We count the miles.**

A React Native app (Expo SDK 54) for Austin walkers, hikers, and cyclists. One codebase for iOS, Android, and web.

Built for the Congressional App Challenge by Henit Jain, Matan Heber, Arjun Averineni and Basil Vinesh.

---

## What it does now

| | |
|---|---|
| **Start from Home** | Walk or Bike, then one large Start button. The Start tab is the same action with a bit more explanation. |
| **Three tabs** | Home · Start · More. Trails, clubs, profile, settings, and My walks live under More. |
| **My walks** | This week’s miles plus every saved walk. Recap and records are one tap away. |
| **Background recording** | Keeps measuring if you lock the phone. Android shows “EcoTrek is recording.” Stops on Finish. |
| **Weather** | Temperature and the next few hours on Home. No extra report page. |
| **Safety** | Call 911 and Text my contact on the live screen. Sit-down reminder after 25 minutes. |
| **Simple mode** | Bigger text. Clubs and weekly goals stay out of the way. |
| **Text size / look** | Normal, Large, Extra large. Light, Dark, High contrast. Less motion. |
| **Guest → Google** | Walks already on the phone are copied when you save with Google. |
| **Share card** | A simple picture-style card you send to family. |
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
src/components/ShareCard.tsx    shareable progress card
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
