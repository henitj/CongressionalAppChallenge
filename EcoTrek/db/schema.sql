-- ============================================================================
-- EcoTrek — Neon Postgres schema
-- Run this whole file once in the Neon SQL Editor (or `psql $DATABASE_URL -f schema.sql`).
-- Safe to re-run: everything uses IF NOT EXISTS / CREATE OR REPLACE.
--
-- NOTE ON TREES: EcoTrek's trees are a VIRTUAL/SYMBOLIC reward earned by miles.
-- No real trees are planted and no planting organization is involved.
-- Columns are named `trees_earned` (not "planted") on purpose.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email

-- ---------------------------------------------------------------------------
-- Shared helper: keep updated_at fresh
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- ENUM types (safer than free text; add values later with ALTER TYPE)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE activity_type   AS ENUM ('hike','bike');                        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE trail_type      AS ENUM ('hike','bike','mixed');                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE difficulty      AS ENUM ('Easy','Moderate','Hard');             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE auth_provider   AS ENUM ('google','guest');                     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE club_role       AS ENUM ('owner','admin','member');             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE eco_action      AS ENUM (
    'hike_mile','bike_mile','tree_earned','plant_identified','photo_uploaded',
    'trail_completed','cleanup','challenge_completed','club_joined','daily_login',
    'streak_bonus'
  );                                                                          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE challenge_period AS ENUM ('daily','weekly','monthly','special'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===========================================================================
-- 1. users
-- One row per signed-in person. `google_sub` is the stable Google account id
-- ("sub" claim) — match on that, NOT on email (emails can change).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub         TEXT UNIQUE,                 -- NULL for guest accounts
  email              CITEXT UNIQUE,               -- NULL for guests
  email_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
  display_name       TEXT         NOT NULL,
  avatar_url         TEXT,
  provider           auth_provider NOT NULL DEFAULT 'google',
  is_guest           BOOLEAN      NOT NULL DEFAULT FALSE,

  -- denormalized lifetime totals (kept in sync by triggers below; makes
  -- leaderboards fast so you never SUM() the whole activities table)
  total_points       INTEGER      NOT NULL DEFAULT 0,
  total_miles        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_trees        INTEGER      NOT NULL DEFAULT 0,
  total_activities   INTEGER      NOT NULL DEFAULT 0,
  level_index        SMALLINT     NOT NULL DEFAULT 0,

  -- streaks
  current_streak     INTEGER      NOT NULL DEFAULT 0,
  longest_streak     INTEGER      NOT NULL DEFAULT 0,
  last_active_date   DATE,
  -- streak length the last 7-day bonus was paid for, so it pays once only
  last_bonus_streak  INTEGER      NOT NULL DEFAULT 0,

  -- settings (mirrors SettingsContext)
  units              TEXT         NOT NULL DEFAULT 'imperial'  CHECK (units IN ('imperial','metric')),
  temperature_unit   TEXT         NOT NULL DEFAULT 'F'         CHECK (temperature_unit IN ('F','C')),
  notifications_enabled BOOLEAN   NOT NULL DEFAULT TRUE,
  home_city          TEXT         DEFAULT 'Austin, TX',

  -- account state / moderation / legal
  is_banned          BOOLEAN      NOT NULL DEFAULT FALSE,
  privacy_accepted_at TIMESTAMPTZ,                -- Play Store: log consent
  deleted_at         TIMESTAMPTZ,                 -- soft delete (Play requires account deletion)
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_seen_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS users_total_points_idx ON users (total_points DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS users_last_seen_idx    ON users (last_seen_at DESC);
DROP TRIGGER IF EXISTS users_touch ON users;
CREATE TRIGGER users_touch BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===========================================================================
-- 2. devices  (push tokens + analytics device ids)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS devices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id      TEXT NOT NULL,                    -- @ecotrek/device_id from AnalyticsContext
  platform       TEXT CHECK (platform IN ('ios','android','web')),
  app_version    TEXT,
  os_version     TEXT,
  expo_push_token TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
CREATE INDEX IF NOT EXISTS devices_push_idx ON devices (expo_push_token) WHERE expo_push_token IS NOT NULL;

-- ===========================================================================
-- 3. trails  (replaces the hardcoded AUSTIN_TRAILS array)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS trails (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT UNIQUE NOT NULL,        -- 'lady-bird-lake-hike-and-bike'
  name                TEXT NOT NULL,
  type                trail_type  NOT NULL DEFAULT 'mixed',
  distance_miles      NUMERIC(6,2) NOT NULL,
  difficulty          difficulty  NOT NULL DEFAULT 'Easy',
  area                TEXT,                        -- 'Downtown Austin'
  description         TEXT,
  image_url           TEXT,
  rating              NUMERIC(2,1) CHECK (rating BETWEEN 0 AND 5),
  rating_count        INTEGER NOT NULL DEFAULT 0,
  elevation_gain_ft   INTEGER,
  estimated_minutes   INTEGER,
  eco_points          INTEGER NOT NULL DEFAULT 10, -- awarded on completion

  pet_friendly        BOOLEAN NOT NULL DEFAULT FALSE,
  family_friendly     BOOLEAN NOT NULL DEFAULT FALSE,
  stroller_friendly   BOOLEAN NOT NULL DEFAULT FALSE,
  restrooms_available BOOLEAN NOT NULL DEFAULT FALSE,
  water_stations      BOOLEAN NOT NULL DEFAULT FALSE,

  safety_tips         TEXT[]  NOT NULL DEFAULT '{}',
  plants              TEXT[]  NOT NULL DEFAULT '{}',
  animals             TEXT[]  NOT NULL DEFAULT '{}',

  -- geo (plain lat/lng so you don't need PostGIS)
  start_lat           DOUBLE PRECISION,
  start_lng           DOUBLE PRECISION,
  end_lat             DOUBLE PRECISION,
  end_lng             DOUBLE PRECISION,
  is_loop             BOOLEAN NOT NULL DEFAULT FALSE,
  geojson             JSONB,                       -- optional full path for map overlay

  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  source              TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed','ai','admin','user')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trails_area_idx ON trails (area) WHERE is_active;
CREATE INDEX IF NOT EXISTS trails_geo_idx  ON trails (start_lat, start_lng);
DROP TRIGGER IF EXISTS trails_touch ON trails;
CREATE TRIGGER trails_touch BEFORE UPDATE ON trails
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===========================================================================
-- 4. activities  (one finished hike/bike — replaces in-memory ActivityContext)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail_id        UUID REFERENCES trails(id) ON DELETE SET NULL,
  trail_slug      TEXT,                            -- slug the app matched, e.g. 'barton-creek'
  trail_name      TEXT,
  trail_completed BOOLEAN NOT NULL DEFAULT FALSE,
  coverage_pct    NUMERIC(5,2),
  grant_species   TEXT,                            -- cosmetic tree label for this activity
  client_id       TEXT NOT NULL,                   -- 'act-<startedAt>' from the app: makes uploads idempotent
  type            activity_type NOT NULL,

  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ NOT NULL,
  duration_sec    INTEGER NOT NULL CHECK (duration_sec >= 0),
  miles           NUMERIC(8,3) NOT NULL CHECK (miles >= 0),
  avg_mph         NUMERIC(5,2) GENERATED ALWAYS AS (
                    CASE WHEN duration_sec > 0
                         THEN ROUND((miles / (duration_sec / 3600.0))::numeric, 2)
                         ELSE 0 END) STORED,
  elevation_gain_ft INTEGER,
  calories        INTEGER,

  trees_earned    INTEGER NOT NULL DEFAULT 0,      -- virtual trees (miles ÷ rule)
  points_earned   INTEGER NOT NULL DEFAULT 0,

  start_lat       DOUBLE PRECISION,
  start_lng       DOUBLE PRECISION,
  end_lat         DOUBLE PRECISION,
  end_lng         DOUBLE PRECISION,
  path            JSONB NOT NULL DEFAULT '[]',     -- [{lat,lng,t,accuracy}, ...]
  city            TEXT DEFAULT 'Austin, TX',

  -- anti-cheat
  source          TEXT NOT NULL DEFAULT 'gps' CHECK (source IN ('gps','demo','manual')),
  is_valid        BOOLEAN NOT NULL DEFAULT TRUE,   -- FALSE = didn't count toward leaderboard
  flag_reason     TEXT,                            -- 'speed_too_high','teleport','low_accuracy'

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id),
  CHECK (ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS activities_user_time_idx ON activities (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS activities_trail_idx     ON activities (trail_id);
CREATE INDEX IF NOT EXISTS activities_valid_idx     ON activities (is_valid, started_at DESC);
DROP TRIGGER IF EXISTS activities_touch ON activities;
CREATE TRIGGER activities_touch BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===========================================================================
-- 5. point_events  (ledger — the source of truth for EcoPoints)
-- Never store only a total: store every award so you can rebuild/audit.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS point_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action       eco_action NOT NULL,
  points       INTEGER NOT NULL,                   -- may be negative (corrections)
  multiplier   NUMERIC(4,2) NOT NULL DEFAULT 1,
  label        TEXT NOT NULL,
  activity_id  UUID REFERENCES activities(id) ON DELETE CASCADE,
  club_id      UUID,                               -- FK added after clubs table
  metadata     JSONB NOT NULL DEFAULT '{}',
  idempotency_key TEXT,                            -- e.g. 'daily_login:2026-08-16:<user>'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS point_events_user_idx ON point_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS point_events_action_idx ON point_events (action, created_at DESC);

-- ===========================================================================
-- 6. tree_grants  (virtual trees — the "planting" record, no org involved)
-- Keep it separate from activities so you can also grant trees from
-- challenges, badges, or club bonuses.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS tree_grants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id  UUID REFERENCES activities(id) ON DELETE CASCADE,
  trees        INTEGER NOT NULL CHECK (trees > 0),
  reason       TEXT NOT NULL DEFAULT 'activity'
                 CHECK (reason IN ('activity','challenge','badge','club_bonus','admin')),
  species      TEXT,                               -- cosmetic label, e.g. 'Texas Live Oak'
  receipt_code TEXT UNIQUE,                        -- 'VT-XXXXX' style display code
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tree_grants_user_idx ON tree_grants (user_id, granted_at DESC);

-- ===========================================================================
-- 7. clubs  (replaces the Firebase playground DB)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS clubs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  code         TEXT NOT NULL UNIQUE,               -- 6-char join code, store UPPERCASE
  description  TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT,
  owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_locked    BOOLEAN NOT NULL DEFAULT FALSE,     -- locked = no new joins
  is_public    BOOLEAN NOT NULL DEFAULT TRUE,      -- shows in "discover clubs" list
  max_members  INTEGER NOT NULL DEFAULT 100,
  -- Shared weekly target: { metric, target, weekId, progress, metAt }.
  -- Stored as JSONB because it is read and written as one unit and never
  -- queried field by field.
  goal         JSONB,
  city         TEXT DEFAULT 'Austin, TX',

  -- denormalized totals, maintained by trigger
  member_count INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_trees  INTEGER NOT NULL DEFAULT 0,
  total_miles  NUMERIC(10,2) NOT NULL DEFAULT 0,

  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (code = upper(code))
);
CREATE INDEX IF NOT EXISTS clubs_points_idx ON clubs (total_points DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS clubs_owner_idx  ON clubs (owner_id);
DROP TRIGGER IF EXISTS clubs_touch ON clubs;
CREATE TRIGGER clubs_touch BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE point_events
  DROP CONSTRAINT IF EXISTS point_events_club_id_fkey,
  ADD  CONSTRAINT point_events_club_id_fkey
       FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL;

-- ===========================================================================
-- 8. club_members  (join table + per-club contribution stats)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS club_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      UUID NOT NULL REFERENCES clubs(id)  ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  role         club_role NOT NULL DEFAULT 'member',
  display_name TEXT NOT NULL,                      -- snapshot of name at join time
  points       INTEGER NOT NULL DEFAULT 0,         -- contributed WHILE in this club
  trees        INTEGER NOT NULL DEFAULT 0,
  miles        NUMERIC(10,2) NOT NULL DEFAULT 0,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at      TIMESTAMPTZ,                        -- NULL = still a member
  UNIQUE (club_id, user_id)
);
CREATE INDEX IF NOT EXISTS club_members_user_idx  ON club_members (user_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS club_members_board_idx ON club_members (club_id, points DESC) WHERE left_at IS NULL;

-- keep clubs.member_count / totals correct automatically
CREATE OR REPLACE FUNCTION refresh_club_totals() RETURNS trigger AS $$
DECLARE cid UUID;
BEGIN
  cid := COALESCE(NEW.club_id, OLD.club_id);
  UPDATE clubs c SET
    member_count = (SELECT count(*)            FROM club_members m WHERE m.club_id = cid AND m.left_at IS NULL),
    total_points = (SELECT COALESCE(sum(points),0) FROM club_members m WHERE m.club_id = cid AND m.left_at IS NULL),
    total_trees  = (SELECT COALESCE(sum(trees),0)  FROM club_members m WHERE m.club_id = cid AND m.left_at IS NULL),
    total_miles  = (SELECT COALESCE(sum(miles),0)  FROM club_members m WHERE m.club_id = cid AND m.left_at IS NULL)
  WHERE c.id = cid;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS club_members_totals ON club_members;
CREATE TRIGGER club_members_totals AFTER INSERT OR UPDATE OR DELETE ON club_members
  FOR EACH ROW EXECUTE FUNCTION refresh_club_totals();

-- ===========================================================================
-- 9. badges + user_badges
-- ===========================================================================
CREATE TABLE IF NOT EXISTS badges (
  id           TEXT PRIMARY KEY,                   -- 'first_hike', matches app ids
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  icon         TEXT NOT NULL,                      -- emoji or asset key
  tier         SMALLINT NOT NULL DEFAULT 1,
  criteria     JSONB NOT NULL DEFAULT '{}',        -- {"metric":"total_miles","gte":25}
  points_bonus INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id     UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  badge_id    TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  progress    NUMERIC(6,2) NOT NULL DEFAULT 100,   -- for partially-earned badges
  PRIMARY KEY (user_id, badge_id)
);

-- ===========================================================================
-- 10. challenges + user_challenges  (daily / weekly)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,                     -- '3 miles on the Greenbelt'
  description   TEXT NOT NULL DEFAULT '',
  period        challenge_period NOT NULL DEFAULT 'weekly',
  metric        TEXT NOT NULL CHECK (metric IN ('miles','activities','trees','points','trail_completions','streak_days')),
  target_value  NUMERIC(10,2) NOT NULL,
  activity_type activity_type,                     -- NULL = any
  trail_id      UUID REFERENCES trails(id) ON DELETE SET NULL,
  reward_points INTEGER NOT NULL DEFAULT 30,
  reward_trees  INTEGER NOT NULL DEFAULT 0,
  badge_id      TEXT REFERENCES badges(id),
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at       TIMESTAMPTZ NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS challenges_window_idx ON challenges (is_active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS user_challenges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  challenge_id  UUID REFERENCES challenges(id) ON DELETE CASCADE,
  -- The app generates its weekly set locally from a fixed catalogue, so it
  -- identifies challenges by slug + ISO week rather than a database row.
  challenge_slug TEXT NOT NULL,
  week_id        TEXT NOT NULL,                    -- '2026-W34'
  points         INTEGER NOT NULL DEFAULT 0,
  progress      NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_complete   BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  claimed_at    TIMESTAMPTZ,                       -- when reward was granted
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_slug, week_id)
);
CREATE INDEX IF NOT EXISTS user_challenges_week_idx ON user_challenges (user_id, week_id);
DROP TRIGGER IF EXISTS user_challenges_touch ON user_challenges;
CREATE TRIGGER user_challenges_touch BEFORE UPDATE ON user_challenges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===========================================================================
-- 11. trail_completions  (verified "you actually did this trail")
-- ===========================================================================
CREATE TABLE IF NOT EXISTS trail_completions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  trail_id       UUID NOT NULL REFERENCES trails(id)      ON DELETE CASCADE,
  activity_id    UUID NOT NULL REFERENCES activities(id)  ON DELETE CASCADE,
  miles_covered  NUMERIC(8,3) NOT NULL,
  coverage_pct   NUMERIC(5,2) NOT NULL DEFAULT 0,   -- % of trail distance covered
  duration_sec   INTEGER NOT NULL,
  verified       BOOLEAN NOT NULL DEFAULT FALSE,    -- passed the start/end + distance check
  completed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id)
);
CREATE INDEX IF NOT EXISTS trail_completions_user_idx  ON trail_completions (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS trail_completions_trail_idx ON trail_completions (trail_id);

-- ===========================================================================
-- 12. daily_streaks  (one row per user per active day → powers the calendar)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS daily_streaks (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day          DATE NOT NULL,
  miles        NUMERIC(8,3) NOT NULL DEFAULT 0,
  activities   INTEGER NOT NULL DEFAULT 0,
  points       INTEGER NOT NULL DEFAULT 0,
  trees        INTEGER NOT NULL DEFAULT 0,
  opened_app   BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, day)
);

-- ===========================================================================
-- 13. plant_ids  (photo → AI identification, awards plant_identified)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS plant_ids (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id   UUID REFERENCES activities(id) ON DELETE SET NULL,
  trail_id      UUID REFERENCES trails(id)     ON DELETE SET NULL,
  photo_url     TEXT NOT NULL,                   -- object storage URL, not the bytes
  common_name   TEXT,
  scientific_name TEXT,
  confidence    NUMERIC(4,3),
  is_native     BOOLEAN,
  is_invasive   BOOLEAN,
  model         TEXT,                            -- 'gemini-2.0-flash', 'groq/llama-...'
  raw_response  JSONB,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plant_ids_user_idx ON plant_ids (user_id, created_at DESC);

-- ===========================================================================
-- 14. analytics_events  (mirrors AnalyticsContext.logEvent)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  device_id   TEXT,
  name        TEXT NOT NULL,                     -- 'screen_view','activity_start',...
  properties  JSONB NOT NULL DEFAULT '{}',
  session_id  TEXT,
  app_version TEXT,
  platform    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_name_time_idx ON analytics_events (name, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_user_idx      ON analytics_events (user_id, created_at DESC);

-- ===========================================================================
-- 15. reports  (Play Store wants a way to report user-generated content:
--     club names/descriptions and display names count as UGC)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  target_type   TEXT NOT NULL CHECK (target_type IN ('user','club','activity','plant_id')),
  target_id     UUID NOT NULL,
  reason        TEXT NOT NULL,
  details       TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','actioned','dismissed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);

-- ===========================================================================
-- 16. Auto-maintain user totals from activities
-- ===========================================================================
CREATE OR REPLACE FUNCTION refresh_user_totals() RETURNS trigger AS $$
DECLARE uid UUID;
BEGIN
  uid := COALESCE(NEW.user_id, OLD.user_id);
  UPDATE users u SET
    total_miles      = (SELECT COALESCE(sum(miles),0)        FROM activities a WHERE a.user_id = uid AND a.is_valid),
    total_trees      = (SELECT COALESCE(sum(trees_earned),0) FROM activities a WHERE a.user_id = uid AND a.is_valid),
    total_activities = (SELECT count(*)                      FROM activities a WHERE a.user_id = uid AND a.is_valid),
    total_points     = (SELECT COALESCE(sum(points),0)       FROM point_events p WHERE p.user_id = uid)
  WHERE u.id = uid;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS activities_user_totals ON activities;
CREATE TRIGGER activities_user_totals AFTER INSERT OR UPDATE OR DELETE ON activities
  FOR EACH ROW EXECUTE FUNCTION refresh_user_totals();
DROP TRIGGER IF EXISTS point_events_user_totals ON point_events;
CREATE TRIGGER point_events_user_totals AFTER INSERT OR UPDATE OR DELETE ON point_events
  FOR EACH ROW EXECUTE FUNCTION refresh_user_totals();

-- ===========================================================================
-- 17. Leaderboard views  (replaces the hardcoded mock in LeaderboardScreen)
-- ===========================================================================
CREATE OR REPLACE VIEW global_user_leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY u.total_points DESC, u.total_miles DESC) AS rank,
  u.id, u.display_name, u.avatar_url,
  u.total_points, u.total_trees, u.total_miles, u.level_index
FROM users u
WHERE u.deleted_at IS NULL AND NOT u.is_banned AND NOT u.is_guest;

CREATE OR REPLACE VIEW global_club_leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY c.total_points DESC, c.total_trees DESC) AS rank,
  c.id, c.name, c.description, c.member_count,
  c.total_points, c.total_trees, c.total_miles
FROM clubs c
WHERE c.deleted_at IS NULL AND c.is_public;

CREATE OR REPLACE VIEW weekly_user_leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY SUM(p.points) DESC) AS rank,
  u.id, u.display_name, u.avatar_url, SUM(p.points)::int AS points_this_week
FROM point_events p
JOIN users u ON u.id = p.user_id
WHERE p.created_at >= date_trunc('week', now())
  AND u.deleted_at IS NULL AND NOT u.is_banned
GROUP BY u.id, u.display_name, u.avatar_url;
