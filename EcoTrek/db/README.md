# EcoTrek — Neon Postgres schema reference

Run `db/schema.sql` in the Neon SQL Editor, then `db/seed.sql`. Both are re-runnable.

**Trees are virtual.** They're a symbolic reward for miles. No real trees are planted and no
organization is involved, so nothing in the DB says "planted by X" — the column is
`trees_earned` and the table is `tree_grants`. Keep the UI wording the same
("trees earned", "your virtual forest").

---

## Table map (what replaces what in the app)

| Table | Replaces | Used by |
|---|---|---|
| `users` | `AsyncStorage @ecotrek/auth_user`, `'demo-user'` | AuthContext, everything |
| `devices` | `@ecotrek/device_id` | AnalyticsContext, push notifications |
| `trails` | hardcoded `AUSTIN_TRAILS` array | TrailsScreen, HomeScreen |
| `activities` | in-memory `ActivityContext.history` | TrackScreen, ImpactScreen |
| `point_events` | `@ecotrek/ecopoints` | EcoPointsContext |
| `tree_grants` | fake `services/veritree.ts` receipts | ImpactScreen |
| `clubs` / `club_members` | Firebase playground DB | LeaderboardScreen, ClubContext |
| `badges` / `user_badges` | `@ecotrek/badges` | ImpactScreen |
| `challenges` / `user_challenges` | nothing yet (new feature) | HomeScreen |
| `trail_completions` | nothing yet (new feature) | TrailsScreen |
| `daily_streaks` | nothing yet (new feature) | HomeScreen streak calendar |
| `plant_ids` | nothing yet (new feature) | photo plant ID |
| `analytics_events` | `@ecotrek/analytics` | AnalyticsContext |
| `reports` | nothing | required-ish for Play UGC policy |

---

## 1. `users`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | your internal id — use this everywhere, not the Google id |
| `google_sub` | text unique | Google's `sub` claim. **Match on this, never email** |
| `email` | citext unique | case-insensitive; null for guests |
| `email_verified` | bool | from the Google token |
| `display_name` | text | |
| `avatar_url` | text | Google profile picture |
| `provider` | enum | `google` \| `guest` |
| `is_guest` | bool | guests excluded from global leaderboard |
| `total_points` `total_miles` `total_trees` `total_activities` | int/numeric | cached totals, auto-updated by trigger |
| `level_index` | smallint | index into your LEVELS array |
| `current_streak` `longest_streak` `last_active_date` | int/int/date | streak feature |
| `units` `temperature_unit` `notifications_enabled` `home_city` | | SettingsContext, synced per account |
| `is_banned` | bool | moderation |
| `privacy_accepted_at` | timestamptz | log consent — Play asks about this |
| `deleted_at` | timestamptz | soft delete. **Play requires in-app account deletion** |
| `created_at` `updated_at` `last_seen_at` | timestamptz | |

## 2. `devices`
`id`, `user_id`, `device_id`, `platform` (ios/android/web), `app_version`, `os_version`,
`expo_push_token`, `created_at`, `last_seen_at`. Unique on `(user_id, device_id)`.

## 3. `trails`
`id`, `slug` (unique), `name`, `type` (hike/bike/mixed), `distance_miles`, `difficulty`,
`area`, `description`, `image_url`, `rating`, `rating_count`, `elevation_gain_ft`,
`estimated_minutes`, `eco_points`, `pet_friendly`, `family_friendly`, `stroller_friendly`,
`restrooms_available`, `water_stations`, `safety_tips text[]`, `plants text[]`,
`animals text[]`, `start_lat`, `start_lng`, `end_lat`, `end_lng`, `is_loop`,
`geojson jsonb`, `is_active`, `source` (seed/ai/admin/user), `created_at`, `updated_at`.

Store AI-generated trails with `source='ai'` so you can wipe them if the model hallucinates.

## 4. `activities`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `trail_id` | uuid FK null | which trail they were on, if known |
| `client_id` | text | the app's `act-<startedAt>`. `UNIQUE(user_id, client_id)` makes retries/offline sync idempotent |
| `type` | enum | hike \| bike |
| `started_at` `ended_at` `duration_sec` | | |
| `miles` | numeric(8,3) | |
| `avg_mph` | generated | computed by Postgres, don't insert it |
| `elevation_gain_ft` `calories` | int | optional |
| `trees_earned` `points_earned` | int | |
| `start_lat/lng` `end_lat/lng` | float8 | |
| `path` | jsonb | `[{lat,lng,t,accuracy}]` — trim to ~1 point/5s before upload |
| `city` | text | |
| `source` | text | `gps` \| `demo` \| `manual`. **Demo-mode runs must not count** |
| `is_valid` | bool | false = flagged, excluded from totals/leaderboard |
| `flag_reason` | text | `speed_too_high`, `teleport`, `low_accuracy` |

## 5. `point_events` (ledger)
`id`, `user_id`, `action` (enum), `points`, `multiplier`, `label`, `activity_id`, `club_id`,
`metadata jsonb`, `idempotency_key`, `created_at`.

`idempotency_key` is the trick that stops double-awards: use
`'daily_login:2026-08-16:<user_id>'` or `'activity:<activity_id>:miles'`. Unique per user.

## 6. `tree_grants`
`id`, `user_id`, `activity_id`, `trees`, `reason` (activity/challenge/badge/club_bonus/admin),
`species` (cosmetic label), `receipt_code` (display-only code), `granted_at`.

## 7. `clubs`
`id`, `name`, `code` (unique, uppercase, 6 chars), `description`, `avatar_url`, `owner_id`,
`is_locked`, `is_public`, `max_members`, `city`, `member_count`, `total_points`,
`total_trees`, `total_miles`, `deleted_at`, `created_at`, `updated_at`.
Totals are maintained by a trigger on `club_members` — never write them by hand.

## 8. `club_members`
`id`, `club_id`, `user_id`, `role` (owner/admin/member), `display_name`, `points`, `trees`,
`miles`, `joined_at`, `left_at`. Unique `(club_id, user_id)`.
Leaving sets `left_at` instead of deleting — that fixes the current bug where
`leaveClub` only clears local state.

## 9. `badges` / `user_badges`
`badges`: `id` (text, matches app ids like `first_hike`), `name`, `description`, `icon`,
`tier`, `criteria jsonb`, `points_bonus`, `sort_order`, `is_active`.
`user_badges`: `user_id`, `badge_id`, `unlocked_at`, `progress`.

## 10. `challenges` / `user_challenges`
`challenges`: `id`, `slug`, `title`, `description`, `period` (daily/weekly/monthly/special),
`metric` (miles/activities/trees/points/trail_completions/streak_days), `target_value`,
`activity_type`, `trail_id`, `reward_points`, `reward_trees`, `badge_id`, `starts_at`,
`ends_at`, `is_active`, `created_at`.
`user_challenges`: `id`, `user_id`, `challenge_id`, `progress`, `is_complete`,
`completed_at`, `claimed_at`, `updated_at`.

## 11. `trail_completions`
`id`, `user_id`, `trail_id`, `activity_id` (unique), `miles_covered`, `coverage_pct`,
`duration_sec`, `verified`, `completed_at`.

## 12. `daily_streaks`
PK `(user_id, day)`, plus `miles`, `activities`, `points`, `trees`, `opened_app`.
One row per active day = your streak calendar renders straight from this.

## 13. `plant_ids`
`id`, `user_id`, `activity_id`, `trail_id`, `photo_url`, `common_name`, `scientific_name`,
`confidence`, `is_native`, `is_invasive`, `model`, `raw_response jsonb`, `lat`, `lng`,
`created_at`. Store the photo in object storage (Cloudflare R2 / S3), the URL in Postgres.

## 14. `analytics_events`
`id bigserial`, `user_id`, `device_id`, `name`, `properties jsonb`, `session_id`,
`app_version`, `platform`, `created_at`.

## 15. `reports`
`id`, `reporter_id`, `target_type`, `target_id`, `reason`, `details`, `status`, `created_at`,
`resolved_at`. Club names and display names are user-generated content — Play wants a
report path for that.

---

## Views you get for free

- `global_user_leaderboard` — ranked users, excludes guests/banned/deleted
- `global_club_leaderboard` — ranked public clubs (replaces the hardcoded mock list)
- `weekly_user_leaderboard` — points since Monday

---

## Things to get right when you wire it up

1. **Never put `DATABASE_URL` in the app.** Anything prefixed `EXPO_PUBLIC_` ships to users'
   phones. Put a tiny API in front of Neon (Vercel/Cloudflare/Render), and have the app call
   that with the Google ID token in an `Authorization: Bearer` header.
2. **Verify the Google ID token server-side** (`tokeninfo` endpoint or `google-auth-library`),
   then upsert on `google_sub`. Don't trust a user id sent from the client.
3. Use `@neondatabase/serverless` on the API side — it's HTTP, works in edge/serverless with
   no connection pool headaches.
4. Same for `EXPO_PUBLIC_GROQ_API_KEY` — move that behind the API before you publish.
5. Guests: create a real `users` row with `is_guest=true` so their data can be merged if
   they sign in later.

## Upsert pattern for offline-safe activity sync

```sql
INSERT INTO activities (user_id, client_id, type, started_at, ended_at,
                        duration_sec, miles, trees_earned, points_earned, path, source)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
ON CONFLICT (user_id, client_id) DO UPDATE
  SET miles = EXCLUDED.miles, path = EXCLUDED.path, updated_at = now()
RETURNING *;
```
