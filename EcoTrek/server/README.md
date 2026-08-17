# EcoTrek API

The thin layer between the app and Neon Postgres. Plain Node, no framework, no
build step.

## Why it exists

The app must never hold your Neon connection string. Anything shipped in an
Expo app is readable by anyone who downloads the APK — that includes every
`EXPO_PUBLIC_*` variable. If the database URL were in there, someone could
connect directly and drop your tables.

So the app talks to this, and only this holds the credentials.

```
  Phone  ──HTTPS + Google ID token──▶  this API  ──DATABASE_URL──▶  Neon
```

## Run it

```bash
cd server
npm install
cp .env.example .env      # paste DATABASE_URL and GOOGLE_CLIENT_IDS
npm run migrate           # creates every table, seeds badges + trails
npm start                 # http://localhost:8787
```

Check it: `curl http://localhost:8787/api/health`

## Connect the app

Put the public URL in the **app's** `.env`:

```
EXPO_PUBLIC_API_URL=https://your-api.onrender.com
```

That is the entire integration. Every context in the app already tries the API
first and falls back to on-device storage if it is unreachable, so a backend
outage degrades quietly instead of crashing.

## Deploy

Anywhere that runs Node 20+. Free options:

- **Render** — New Web Service, point at this repo, root directory `EcoTrek/server`,
  build `npm install`, start `npm start`.
- **Railway** — same idea, detects Node automatically.

Set `DATABASE_URL` and `GOOGLE_CLIENT_IDS` in the host's environment variables.
Do not commit `.env`.

## How auth works

Every protected request carries the user's **Google ID token**:

```
Authorization: Bearer <id_token>
```

`db.js` verifies that token's signature against Google's public keys and checks
it was issued for one of your client IDs, then upserts the user row keyed on
`google_sub`.

The API never trusts a user id sent in a request body. If it did, anyone could
POST someone else's id and write to their account.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | public |
| GET | `/api/me` | current user |
| POST | `/api/me/sync` | upsert from token |
| GET/POST | `/api/activities` | POST is idempotent on `client_id` |
| DELETE | `/api/activities/:id` | `:id` is the client id (`act-…`) |
| GET/POST | `/api/points` | points ledger |
| GET | `/api/streak` | day map + longest streak |
| POST | `/api/streak/check-in` | upserts recent days |
| GET | `/api/challenges` | completions for a week |
| POST | `/api/challenges/:slug/complete` | |
| GET/POST | `/api/clubs` | list / create |
| POST | `/api/clubs/join` | by code |
| POST | `/api/clubs/:id/leave` | reassigns ownership |
| PATCH | `/api/clubs/:id/lock` | owner only |
| DELETE | `/api/clubs/:id` | owner only, soft delete |
| POST | `/api/clubs/:id/contribute` | adds points/trees/miles |
| GET | `/api/leaderboard/clubs` · `/users` | |
| GET | `/api/trails` | public |
| POST | `/api/devices` | push token registration |

Paths are defined once in `routes.js` and mirrored in the app at
`src/services/api.ts` → `ROUTES`, so the two cannot drift apart silently.

## Files

- `index.js` — HTTP server, routing, CORS, error handling
- `db.js` — Neon client + Google token verification
- `routes.js` — every handler, and the row → app-shape mappers
- `migrate.js` — applies `../db/schema.sql` and `../db/seed.sql`
