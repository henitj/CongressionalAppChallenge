# Optional EcoTrek API

The website and Android WebView app run local-first without this service, a database, or an EcoTrek account. Their live nearby-trail discovery contacts OpenStreetMap Overpass directly. Deploy this API only if you are intentionally enabling server-backed catalogue data or existing authenticated cloud features.

This is a small Node HTTP server backed by Neon Postgres. It does **not** serve the website or provide a user-facing chatbot.

## Configure and run

```bash
cd EcoTrek/server
npm ci
cp .env.example .env
# Set DATABASE_URL. Set GOOGLE_CLIENT_IDS only for protected account routes.
npm run migrate
npm start
```

The service listens on `0.0.0.0:${PORT:-8787}`. Check health at `/api/health`.

Example server-only environment:

```dotenv
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_IDS=your-google-oauth-client-id
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
```

`DATABASE_URL`, OAuth IDs, and `GROQ_API_KEY` belong only in the server environment. Never place them in a client `.env`, `EXPO_PUBLIC_*` variable, or committed file. Without a Groq key, the optional trail-intelligence route returns `501`; the app uses its local catalogue-derived fallback.

## Client configuration

The app reads the optional API origin from `EXPO_PUBLIC_API_URL`. Leave it blank for the default local-first experience. If configured, the client can fetch the public approved trail catalogue; it does not send the user’s GPS coordinates with that catalogue request. Nearby OSM lookup and location-specific filtering remain on-device.

This app build uses local guest profiles and does not offer Google sign-in. Protected data-sync routes therefore are not available to a newly created guest profile. Do not describe cloud sync as working unless you deliberately add and test a supported sign-in flow. Existing protected routes still require a verified Google token for deployments that use them.

## Authentication and route visibility

`GET /api/health`, `GET /api/trails`, and `POST /api/trail-intel` are public. Other data routes require a bearer Google ID or access token that the server verifies against `GOOGLE_CLIENT_IDS`. The API never trusts a user ID supplied in a request body.

`POST /api/trail-intel` accepts only bounded public catalogue fields for one selected trail. It does not accept or forward user questions, profiles, precise GPS, or activity routes. When `GROQ_API_KEY` is set, the server can send those catalogue facts to Groq to produce a concise summary; the public route is limited to eight requests per IP per minute in addition to the general API limiter. This is background trail-data enrichment, not a chat API. Do not configure it unless the provider, cost, and retention implications are acceptable to the deployment operator.

## Endpoints

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/health` | Public | Process health. |
| GET | `/api/trails` | Public | Active approved catalogue and photo metadata. No location query is needed. |
| POST | `/api/trail-intel` | Public, rate-limited | Optional model summary from bounded catalogue facts; `501` when no Groq key is configured. |
| GET/POST | `/api/activities` | Google token | Activity records. |
| DELETE | `/api/activities/:id` | Google token | Delete by client activity ID. |
| GET/POST | `/api/cleanups` | Google token | Cleanup records. |
| GET/POST | `/api/points` | Google token | Points ledger. |
| GET | `/api/streak` | Google token | Streak history. |
| POST | `/api/streak/check-in` | Google token | Recent-day upsert. |
| GET | `/api/challenges` | Google token | Weekly completion data. |
| POST | `/api/challenges/:slug/complete` | Google token | Record completion. |
| GET/POST | `/api/clubs` | Google token | List or create clubs. |
| POST | `/api/clubs/join` | Google token | Join by code. |
| POST | `/api/clubs/:id/leave` | Google token | Leave a club. |
| PATCH | `/api/clubs/:id/lock` | Google token | Owner-only lock change. |
| DELETE | `/api/clubs/:id` | Google token | Owner-only soft delete. |
| POST | `/api/clubs/:id/contribute` | Google token | Add club contributions. |
| GET | `/api/leaderboard/clubs`, `/api/leaderboard/users` | Google token | Leaderboard reads. |
| POST | `/api/devices` | Google token | Push-token registration. |

The route list is defined in `routes.js`; client path constants are in `src/services/api.ts`.

## Deploying

Use a Node 20+ host (for example, Render or Railway) with `EcoTrek/server` as the service directory. Set the required server variables in the host dashboard and keep `.env` out of Git. Restrict CORS with `CORS_ORIGIN` for the deployed app origin where appropriate, and use the platform’s rate limiting and secret-management features as well.

## Verification

```bash
npm run check      # database-backed check; requires configured DATABASE_URL
npm run pentest    # route validation and hostile-input checks
```

`npm run migrate` applies `../db/schema.sql` and `../db/seed.sql`. The `.env.example` file documents optional settings.
