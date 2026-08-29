# EcoTrek security review (AI penetration test)

**Date:** 2026-08-29 · **Scope:** `EcoTrek/` app (Expo/React Native + web) and `EcoTrek/server/` API
**Method:** manual code audit of every server route and the auth boundary, client-side static review (URL handling, storage, injection surfaces), secret scanning of the working tree and full git history, dependency audit, and **live exploitation** of the running API (Node 22) with crafted requests.

---

## Summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Unauthenticated remote crash (DoS) via malformed URL encoding | **High** | ✅ Fixed + retested live |
| 2 | No rate limiting on any endpoint | Medium | ✅ Fixed + retested live |
| 3 | Client-trusted scores (integrity of leaderboards) | Medium | 🟡 Partial (clamps added; see recommendation) |
| 4 | Oversized/invalid bodies returned 500 instead of 413/400 | Low | ✅ Fixed |
| 5 | Missing `X-Content-Type-Options: nosniff` | Low | ✅ Fixed |
| 6 | CORS defaults to `*` | Low | 📝 Documented (acceptable; see note) |
| 7 | Google tokens stored in AsyncStorage (plaintext on device) | Info | 📝 Standard practice, accepted |
| 8 | Dependency advisories (9 high) | Info | 📝 All build-toolchain, not shipped; see note |
| 9 | Secret leakage / committed credentials | Info | ✅ Clean (tree + full git history) |
| 10 | Outbound URL surfaces (`tel:`, maps, feedback form) | Info | ✅ All constant; maps query now encoded |

No SQL injection, no IDOR, no XSS, no open redirect, no path traversal found. Details below.

---

## Finding 1 — Unauthenticated remote crash (HIGH, fixed)

`server/index.js` decoded URL params with `decodeURIComponent` **outside** the
request try/catch. A malformed percent sequence (e.g. `%E0%A4`) in a *param
position* throws `URIError` as an unhandled rejection, and Node 15+ kills the
process. One request from anyone, no token needed, kills the whole API.

**Reproduced live (before the fix):**

```
$ curl -X DELETE http://localhost:8791/api/activities/%E0%A4
URIError: URI malformed
    at decodeURIComponent (<anonymous>)
    at matchRoute (server/index.js:68:39)
Node.js v22.22.3            ← process died; subsequent requests: connection reset
```

**Fix:** param decoding is now inside its own try/catch (raw value is kept on
failure), route matching and URL parsing are wrapped, and the request handler
can no longer throw outside its error envelope.

**Retest (after):** the same request now returns `401` (no token), the process
stays up, and `/api/health` keeps answering.

## Finding 2 — No rate limiting (MEDIUM, fixed)

Every endpoint, including token verification (which triggers network calls to
Google), was unlimited — brute-force and flood friendly.

**Fix:** per-IP sliding window: 240 requests/minute (a real sync is ~10),
then `429 {"error":"rate_limited"}` with `Retry-After: 60`. The window map
self-cleans and is capped. Retested live with a 300-request flood: 429s begin
exactly at the limit and the server stays healthy.

## Finding 3 — Client-trusted scores (MEDIUM, partially fixed)

The API stores what the client claims: `POST /api/activities` (miles, trees,
points, valid), `POST /api/points`, `POST /api/challenges/:id/complete`, and
`POST /api/clubs/:id/contribute` all take numbers on faith. The app's own
anti-cheat (speed limits, strikes) runs *on the phone*, so a crafted client
can post fake numbers and top shared club leaderboards.

**Fixed now (defence in depth):** every numeric field is clamped to a sane
range (e.g. miles 0–500, points per event 0–1000, challenge points 0–200,
contributions capped), `type` must be `hike`|`bike`, `path` is capped at 2000
points, and all strings (names, labels, device ids) are length-capped. A
crafted client can no longer deposit absurd values; normal app traffic is
unaffected.

**Recommended next step (not implemented):** recompute plausibility
server-side from the stored GPS `path` (the server already receives it) the
same way `services/trailDetection.ts` does on the phone. Until then, treat
leaderboards as friendly competition, not audited records.

## Finding 4 — Wrong status codes (LOW, fixed)

A body over 2 MB or invalid JSON threw generic errors that surfaced as `500`.
Now `413 body_too_large` and `400 invalid_json` respectively.

## Finding 5 — Missing nosniff header (LOW, fixed)

All responses now send `X-Content-Type-Options: nosniff` (plus the existing
`Cache-Control: no-store`). Verified with `curl -I`.

## Finding 6 — CORS `*` (LOW, documented)

The default `Access-Control-Allow-Origin: *` is acceptable here: the API uses
bearer tokens held by the app, **no cookies**, so a random website cannot
authenticate as a visitor. `CORS_ORIGIN` is already supported — set it to the
Expo web origin in production (documented in `server/.env.example`).

## Finding 7 — Token storage (INFO)

Google ID/access tokens are kept in the app's AsyncStorage (device-sandboxed,
per-user namespaced, cleared on sign-out). This is the standard React Native
pattern; nothing actioned.

## Finding 8 — Dependency audit (INFO)

`npm audit`: 20 advisories (9 high). Every high is in the **build toolchain**
(metro, expo-cli, postcss, image-size) — used to bundle the app, never shipped
inside it. No runtime criticals. They resolve with the next Expo SDK bump;
nothing to action in this repo.

## Finding 9 — Secret scanning (INFO, clean)

- Working tree: no API keys, private keys, connection strings, or tokens
  (pattern scan for `AIza…`, `sk-…`, `BEGIN PRIVATE KEY`, `postgres://…`,
  `ghp_…`, `xox…`).
- Full git history: no `.env` ever committed (only `.env.example` placeholders);
  no key-like strings in any past commit.
- Client env discipline is correct: only `EXPO_PUBLIC_*` values ship in the
  bundle; secrets belong to `server/.env`, which is gitignored.

## Finding 10 — Outbound URL surfaces (INFO, clean)

Every `Linking.openURL` target is a hardcoded constant: `tel:911`, the privacy
policy, the support email, and the feedback Google Form. The one dynamic
target (Maps directions) is built from numeric trail coordinates and is now
`encodeURIComponent`-wrapped as belt-and-braces. No user-controlled URLs → no
open-redirect or scheme-injection surface.

---

## Also verified (no findings)

- **SQL injection:** every query in `server/routes.js` and `db.js` uses Neon's
  tagged-template parameterization — no string-built SQL anywhere.
- **IDOR / broken access control:** every mutation is scoped by `user.id`
  derived from the **verified Google token** (never a client-sent id); club
  admin actions check `owner_id`. Tokens are audience-checked against our own
  client IDs, so tokens minted for other apps are rejected.
- **XSS:** no WebView, no `dangerouslySetInnerHTML`, no `eval`/`new Function`;
  React Native (web included) escapes all rendered text.
- **Information disclosure:** error responses return short public codes, never
  stack traces (details go to server logs only).
- **Request routing:** unknown routes → 404; OPTIONS preflight → 204.

## How to re-run the live tests

```bash
cd EcoTrek/server && npm install
DATABASE_URL="postgresql://fake:fake@ep-x-pooler.us-east-2.aws.neon.tech/db?sslmode=require" \
  GOOGLE_CLIENT_IDS="fake.apps.googleusercontent.com" PORT=8790 node index.js &
curl -X DELETE --path-as-is http://localhost:8790/api/activities/%E0%A4   # 401, server alive
head -c 3000000 /dev/zero | curl -X POST --data-binary @- http://localhost:8790/api/clubs  # 401/413
for i in $(seq 1 300); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8790/api/trails; done  # 429s after 240
```
