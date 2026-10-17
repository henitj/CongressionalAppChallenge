# Optional Neon/API setup

The website and Android WebView app work without Neon or a backend. Profiles, activities, tree care, ratings, and settings are local to the device by default. The current app has local guest profiles and no Google sign-in; configuring an API does **not** make guest data sync across devices.

This guide is for a deployment operator who intentionally wants the optional server API, for example to serve an approved trail catalogue or support protected routes in a future/authenticated build. See [`../server/README.md`](../server/README.md) for current endpoint access and security details.

## 1. Create the database

1. Create a project at [console.neon.com](https://console.neon.com).
2. Choose a region appropriate for the API operator and users.
3. Copy the pooled connection string from Neon’s Connect panel. It typically contains `-pooler` and `?sslmode=require`.

## 2. Configure and migrate the API

```bash
cd EcoTrek/server
npm ci
cp .env.example .env
```

Set `DATABASE_URL` in the server-only `.env`. Keep it out of Git and out of all `EXPO_PUBLIC_*` variables. `GOOGLE_CLIENT_IDS` is only for protected routes that receive verified Google tokens; the current local-profile app does not initiate Google sign-in. `GROQ_API_KEY` is optional and enables only the bounded public trail-intelligence enrichment endpoint; it does not add chat to the app.

```bash
npm run migrate
npm run check
npm run pentest
npm start
```

Deploy `EcoTrek/server` on a Node 20+ host, set the server secrets in its dashboard, and configure CORS for the intended app origin where possible.

## 3. Optionally point a web build at the API

Set `EXPO_PUBLIC_API_URL` to the deployed API origin before building the app:

```dotenv
EXPO_PUBLIC_API_URL=https://your-api.example.com
```

The public approved-trail catalogue request does not send the user’s GPS coordinates. Nearby trail discovery remains a direct OpenStreetMap/Overpass lookup and filters results on-device. Protected routes continue to require a valid Google token; with local guest profiles, those private sync features are not available.

If `EXPO_PUBLIC_API_URL` is empty, the app does not contact the EcoTrek API. This is the default and no Neon setup is needed.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `DATABASE_URL is not set` | Set the Neon pooled URL in the backend environment, not in the app. |
| `password authentication failed` | Re-copy the current connection string from Neon. |
| `Missing tables` | Run `npm run migrate`, then `npm run check`. |
| `401 unauthorized` on protected routes | The request needs a verified bearer token and matching server `GOOGLE_CLIENT_IDS`; local guest profiles do not provide one. |
| The app still works locally after API failure | This is expected; local data and fallback behavior should remain usable. |
