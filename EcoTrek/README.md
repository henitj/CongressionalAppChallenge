# 🌳 EcoTrek

> Hike. Bike. Grow Austin.

EcoTrek is a React Native (Expo **SDK 54**) app that promotes **green space safety** and **public health** in Austin, TX. Every mile a user bikes or hikes triggers a verified tree planting through our partnership with **[Veritree](https://www.veritree.com/)**.

Built with **Expo SDK 54 + React Native 0.81 + React 19.1** so the **same codebase runs on iOS, Android, and the Web**.

---

## ✨ Key features

| Feature | Description |
| --- | --- |
| 🔐 **Google Sign-In** | Real OAuth via `expo-auth-session` on iOS, Android, and Web. Session persisted with AsyncStorage. Guest mode also available. |
| 🛰️ **Live GPS tracking** | Real-time location tracking on iOS/Android (`expo-location` v19) and Web (`navigator.geolocation.watchPosition`) with accuracy + jitter filtering. |
| 🗺️ **Real interactive map** | OpenStreetMap tiles via Leaflet on web, Google Maps via `react-native-maps` on iOS/Android. |
| 🚴 **Bike & 🥾 hike modes** | Different miles-per-tree rules apply. |
| 🌳 **Veritree integration** | Each completed activity calls `commitPlanting()` to schedule a real, verified planting. |
| 🗺️ **Curated Austin trails** | Butler Trail, Barton Creek Greenbelt, Walnut Creek, McKinney Falls, the Veloway. |
| 🛡️ **Safety hub** | Emergency contacts, heat/hydration tips, wildlife alerts, weather guidance. |
| 📊 **Impact dashboard** | CO₂, O₂, full history with planting receipts. |

---

## 🔐 Authentication

EcoTrek now gates the app behind a sign-in screen.

* **Google Sign-In** — powered by `expo-auth-session/providers/google` with PKCE. Drop your Google OAuth client IDs into `src/constants/authConfig.ts`. See **[docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md)** for the 5-minute walkthrough.
* **Guest mode** — works out of the box so you can preview/test without OAuth credentials.
* **Persistence** — the session is stored in `@react-native-async-storage/async-storage` under `@ecotrek/auth_user`. Cold-start restore happens before the gate decides whether to show SignIn or the tab navigator.
* **Sign out** — tap the avatar in the top-right header.

The auth flow lives in `src/context/AuthContext.tsx`. After a successful Google sign-in, the access token is exchanged for the Google `userinfo` profile (`id`, `name`, `email`, `picture`) and saved as the active user.

---

## 📦 Stack (SDK 54)

| Package | Version |
| --- | --- |
| `expo` | `~54.0.0` |
| `react` / `react-dom` | `19.1.0` |
| `react-native` | `0.81.4` |
| `react-native-web` | `^0.21.0` |
| `expo-auth-session` | `~7.0.8` |
| `expo-web-browser` | `~15.0.7` |
| `expo-crypto` | `~15.0.7` |
| `expo-linking` | `~8.0.7` |
| `expo-location` | `~19.0.8` |
| `expo-status-bar` | `~3.0.7` |
| `@react-native-async-storage/async-storage` | `2.2.0` |
| `react-native-maps` | `1.26.14` |
| `react-native-safe-area-context` | `~5.6.0` |
| `react-native-screens` | `~4.16.0` |
| `react-native-svg` | `15.12.1` |
| `react-native-gesture-handler` | `~2.28.0` |
| `@react-navigation/*` | `^7.x` |
| Node minimum | **20.19.x** |

---

## 🌱 Planting rules

| Activity | Distance | Trees |
| --- | --- | --- |
| 🚴 Bike | 1.0 mile | 1 tree |
| 🥾 Hike | 0.5 mile | 1 tree |

Native species rotated for Austin's climate: Texas Live Oak, Cedar Elm, Mexican Plum, Bald Cypress, Texas Redbud, Anacacho Orchid Tree.

---

## 🛰️ How tracking works

`src/services/location.ts` exposes:

```ts
startTracking(onCoord, { mode: 'gps' | 'demo', onError })
```

* **iOS/Android** — `expo-location.watchPositionAsync` with `Accuracy.BestForNavigation`.
* **Web** — `navigator.geolocation.watchPosition` with `enableHighAccuracy: true`.
* **Demo** — simulated walker at ~12 mph starting at Lady Bird Lake.

`smoothDelta()` rejects bad fixes (>50 m accuracy), micro-jitter (<2 m), and teleports (>100 mph) before adding the Haversine distance to the total.

---

## 🚀 Run it on your phone

```bash
cd EcoTrek
rm -rf node_modules package-lock.json   # if upgrading from earlier
npm install
npx expo start
```

1. Install **Expo Go v54** (latest) from the App Store / Play Store.
2. Scan the QR.
3. **Sign in with Google** (after configuring OAuth — see docs) or **Continue as guest**.
4. Tap **Track → Start ride**.

Or on web:
```bash
npx expo start --web
```

---

## 🗂 Project structure

```
EcoTrek/
├── App.tsx                       # Providers + auth gate
├── app.json                      # Expo config + URL scheme for OAuth callback
├── package.json                  # SDK 54
├── docs/
│   └── GOOGLE_OAUTH_SETUP.md     # Step-by-step Google client ID setup
└── src/
    ├── components/
    │   ├── Header.tsx            # Now includes ProfileMenu
    │   ├── LiveMap.web.tsx       # Leaflet + OSM
    │   ├── LiveMap.native.tsx    # react-native-maps
    │   ├── ProfileMenu.tsx       # Avatar + signout modal
    │   ├── PrimaryButton.tsx
    │   ├── StatCard.tsx
    │   └── TreeIcon.tsx
    ├── constants/
    │   ├── authConfig.ts         # ← drop Google client IDs here
    │   ├── austinTrails.ts
    │   └── theme.ts
    ├── context/
    │   ├── AuthContext.tsx       # Google OAuth + guest + persistence
    │   └── ActivityContext.tsx   # Treks + Veritree commits
    ├── navigation/
    │   └── RootNavigator.tsx
    ├── screens/
    │   ├── SignInScreen.tsx      # Gate
    │   ├── HomeScreen.tsx        # Greeting personalized to signed-in user
    │   ├── TrackScreen.tsx
    │   ├── TrailsScreen.tsx
    │   ├── ImpactScreen.tsx
    │   └── SafetyScreen.tsx
    └── services/
        ├── location.ts
        └── veritree.ts
```

---

## 🔌 Wiring up the real Veritree API

Replace the body of `commitPlanting()` in `src/services/veritree.ts`:

```ts
const res = await fetch('https://api.veritree.com/v1/plantings', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.VERITREE_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(req),
});
return res.json();
```

---

## 📱 Platform notes

* **iOS** — `NSLocationWhenInUseUsageDescription` declared. For Google Sign-In in a standalone build, add the reversed client id to `CFBundleURLTypes` (see docs).
* **Android** — `ACCESS_FINE_LOCATION` + `ACCESS_BACKGROUND_LOCATION`. SDK 54 enables edge-to-edge by default. For Google Sign-In add the SHA-1 fingerprint when creating the OAuth Android client.
* **Web** — must be served over HTTPS (or `localhost`) for Geolocation. The Google popup opens at `accounts.google.com`.
