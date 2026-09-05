# Link EcoTrek to Neon — step by step

The app already works fully offline with on-device storage. Linking Neon
switches on the cloud: sign-in that syncs, clubs, leaderboards, and walks
stored safely across devices. It takes about five minutes.

---

## 1. Create the database (2 minutes)

1. Go to **[console.neon.com](https://console.neon.com)** and sign up (free —
   no credit card).
2. Click **Create project**. Name it `ecotrek`. Leave the region Neon picks
   (or choose one close to your users, e.g. US East).
3. After it creates the project, click the **Connect** button (or
   **Dashboard → Connection Details**).

## 2. Copy the POOLED connection string

In the Connect panel:

- Choose **Pooled connection** (the host contains `-pooler`).
- Copy the string. It looks like:

  ```
  postgresql://user:password@ep-cool-name-a1b2c3d4-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
  ```

Keep `?sslmode=require` on the end — Neon requires TLS.

## 3. Paste it into the server

```bash
cd EcoTrek/server
cp .env.example .env
```

Open `server/.env` and paste your string as `DATABASE_URL`. That is the only
line you must change. (Optionally set `GOOGLE_CLIENT_IDS` later — it gates
Google sign-in on the API, but the app works locally without it.)

## 4. Run the setup + check

```bash
npm install
npm run migrate     # creates the EcoTrek tables (safe to run more than once)
npm run check       # proves the connection + tables are ready
```

`npm run check` prints exactly what is wrong if anything is missing — a bad
string, a missing table, an archived branch — and what to do next. When it
says **READY**, you are done.

## 5. Run the API

```bash
npm start           # EcoTrek API listening on http://0.0.0.0:8787
```

For real phones to reach it, deploy it somewhere public — Render, Railway or
Fly all run it with zero changes (they inject `DATABASE_URL` themselves, which
the server also accepts). Then put that public URL in the app's `.env`:

```
EXPO_PUBLIC_API_URL=https://your-api.example.com
```

Rebuild the app, and clubs / sign-in / leaderboards switch to the cloud. With
`EXPO_PUBLIC_API_URL` empty the app silently stays local-first, so nothing
breaks while the server is down or not yet linked.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `password authentication failed` | Re-copy the string from the Connect panel — the password is generated per-branch. |
| `fetch failed` / connect timeout | Use the **pooled** host (`-pooler`); check the branch isn't suspended in Neon. |
| `sslmode` error | Keep `?sslmode=require` at the end of the string. |
| `Missing tables: users, clubs…` | Run `npm run migrate`, then `npm run check` again. |
| Works locally, fails deployed | Set `DATABASE_URL` in the hosting platform's env vars (it overrides `.env`). |

## Where this leaves the app

- **No `EXPO_PUBLIC_API_URL`** → the app stores everything on the device. The
  Play Store build works exactly the same. This is the current default.
- **With it** → the same screens read/write your Neon database through the
  API. Nothing else about the app changes.
