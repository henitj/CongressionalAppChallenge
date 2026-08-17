/**
 * Route handlers.
 *
 * Each handler receives { user, body, params, query, sql } and returns the
 * JSON body. Throwing an error with `.status` and `.publicMessage` produces a
 * clean HTTP error.
 *
 * The shapes returned here match exactly what the app's contexts expect, so
 * turning the backend on is a one-line change in the app and nothing else.
 */

function fail(status, publicMessage) {
  const e = new Error(publicMessage);
  e.status = status;
  e.publicMessage = publicMessage;
  return e;
}

const ms = (v) => (v ? new Date(v).getTime() : 0);

/* ── Mappers: database row → the shape the app already uses ───────────────── */

function toActivity(r) {
  return {
    id: r.client_id,
    userId: r.user_id,
    type: r.type,
    startedAt: ms(r.started_at),
    endedAt: ms(r.ended_at),
    miles: Number(r.miles),
    durationSec: r.duration_sec,
    trees: r.trees_earned,
    points: r.points_earned,
    path: r.path ?? [],
    trailId: r.trail_slug ?? undefined,
    trailName: r.trail_name ?? undefined,
    trailCompleted: r.trail_completed,
    coveragePercent: r.coverage_pct == null ? undefined : Number(r.coverage_pct),
    valid: r.is_valid,
    flagReason: r.flag_reason,
    avgMph: Number(r.avg_mph ?? 0),
    grant: r.grant_species
      ? {
          id: `grant-${r.client_id}`,
          trees: r.trees_earned,
          species: r.grant_species,
          earnedAt: new Date(r.created_at).toISOString(),
          reason: 'activity',
        }
      : undefined,
  };
}

function toPointEvent(r) {
  return {
    id: r.id,
    action: r.action,
    points: r.points,
    label: r.label,
    timestamp: ms(r.created_at),
  };
}

function toClub(club, members) {
  return {
    id: club.id,
    name: club.name,
    code: club.code,
    description: club.description ?? '',
    isLocked: club.is_locked,
    isPublic: club.is_public,
    ownerId: club.owner_id,
    createdAt: ms(club.created_at),
    maxMembers: club.max_members,
    goal: club.goal ?? null,
    totalPoints: club.total_points,
    totalTrees: club.total_trees,
    totalMiles: Number(club.total_miles),
    members: members.map((m) => ({
      id: m.user_id,
      name: m.display_name,
      avatarUrl: m.avatar_url ?? null,
      points: m.points,
      trees: m.trees,
      miles: Number(m.miles),
      joinedAt: ms(m.joined_at),
      role: m.role,
    })),
  };
}

/** Loads full club objects (with rosters) in two queries, not N+1. */
async function loadClubs(sql, whereIds = null) {
  const clubs = whereIds
    ? await sql`SELECT * FROM clubs WHERE deleted_at IS NULL AND id = ANY(${whereIds})`
    : await sql`SELECT * FROM clubs WHERE deleted_at IS NULL ORDER BY total_points DESC LIMIT 200`;
  if (clubs.length === 0) return [];

  const ids = clubs.map((c) => c.id);
  const members = await sql`
    SELECT m.*, u.avatar_url
    FROM club_members m
    LEFT JOIN users u ON u.id = m.user_id
    WHERE m.club_id = ANY(${ids}) AND m.left_at IS NULL
    ORDER BY m.points DESC`;

  return clubs.map((c) =>
    toClub(
      c,
      members.filter((m) => m.club_id === c.id)
    )
  );
}

const MIN_MEMBER_CAP = 2;
const MAX_MEMBER_CAP = 500;

/** Mirrors clampCap in the app so both ends agree on what a legal cap is. */
function clampCap(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 100;
  return Math.min(MAX_MEMBER_CAP, Math.max(MIN_MEMBER_CAP, Math.round(v)));
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* ── Routes ───────────────────────────────────────────────────────────────── */

export const routes = [
  /* ── Identity ──────────────────────────────────────────────────────────── */
  {
    method: 'GET',
    path: '/api/me',
    handler: async ({ user }) => ({
      id: user.id,
      name: user.display_name,
      email: user.email,
      picture: user.avatar_url,
      provider: user.provider,
      totalPoints: user.total_points,
      totalMiles: Number(user.total_miles),
      totalTrees: user.total_trees,
      currentStreak: user.current_streak,
      longestStreak: user.longest_streak,
    }),
  },
  {
    method: 'POST',
    path: '/api/me/sync',
    // authenticate() already upserted the row; this just confirms it.
    handler: async ({ user }) => ({ id: user.id, name: user.display_name }),
  },

  /* ── Activities ────────────────────────────────────────────────────────── */
  {
    method: 'GET',
    path: '/api/activities',
    handler: async ({ user, sql }) => {
      const rows = await sql`
        SELECT * FROM activities
        WHERE user_id = ${user.id}
        ORDER BY started_at DESC
        LIMIT 500`;
      return rows.map(toActivity);
    },
  },
  {
    method: 'POST',
    path: '/api/activities',
    handler: async ({ user, body, sql }) => {
      const a = body;
      if (!a?.id || !a.type) throw fail(400, 'invalid_activity');

      const rows = await sql`
        INSERT INTO activities (
          user_id, client_id, type, started_at, ended_at, duration_sec, miles,
          trees_earned, points_earned, path, source, is_valid, flag_reason,
          trail_slug, trail_name, trail_completed, coverage_pct, grant_species,
          start_lat, start_lng, end_lat, end_lng
        ) VALUES (
          ${user.id}, ${a.id}, ${a.type},
          to_timestamp(${a.startedAt} / 1000.0), to_timestamp(${a.endedAt} / 1000.0),
          ${a.durationSec}, ${a.miles}, ${a.trees ?? 0}, ${a.points ?? 0},
          ${JSON.stringify(a.path ?? [])}::jsonb, 'gps', ${a.valid !== false},
          ${a.flagReason ?? null}, ${a.trailId ?? null}, ${a.trailName ?? null},
          ${!!a.trailCompleted}, ${a.coveragePercent ?? null},
          ${a.grant?.species ?? null},
          ${a.path?.[0]?.latitude ?? null}, ${a.path?.[0]?.longitude ?? null},
          ${a.path?.at(-1)?.latitude ?? null}, ${a.path?.at(-1)?.longitude ?? null}
        )
        -- Re-sending the same activity (offline retry) updates instead of
        -- duplicating. This is what client_id is for.
        ON CONFLICT (user_id, client_id) DO UPDATE
          SET miles = EXCLUDED.miles,
              path = EXCLUDED.path,
              trees_earned = EXCLUDED.trees_earned,
              points_earned = EXCLUDED.points_earned,
              updated_at = now()
        RETURNING *`;
      return toActivity(rows[0]);
    },
  },
  {
    method: 'DELETE',
    path: '/api/activities/:id',
    handler: async ({ user, params, sql }) => {
      await sql`DELETE FROM activities WHERE user_id = ${user.id} AND client_id = ${params.id}`;
      return undefined;
    },
  },

  /* ── Points ────────────────────────────────────────────────────────────── */
  {
    method: 'GET',
    path: '/api/points',
    handler: async ({ user, sql }) => {
      const rows = await sql`
        SELECT * FROM point_events
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 1000`;
      return rows.map(toPointEvent);
    },
  },
  {
    method: 'POST',
    path: '/api/points',
    handler: async ({ user, body, sql }) => {
      const e = body;
      if (!e?.action || typeof e.points !== 'number') throw fail(400, 'invalid_event');
      const rows = await sql`
        INSERT INTO point_events (user_id, action, points, label, idempotency_key, created_at)
        VALUES (${user.id}, ${e.action}, ${e.points}, ${e.label ?? e.action}, ${e.id ?? null},
                to_timestamp(${e.timestamp ?? Date.now()} / 1000.0))
        ON CONFLICT (user_id, idempotency_key) DO NOTHING
        RETURNING *`;
      return rows[0] ? toPointEvent(rows[0]) : { ok: true, duplicate: true };
    },
  },

  /* ── Streak ────────────────────────────────────────────────────────────── */
  {
    method: 'GET',
    path: '/api/streak',
    handler: async ({ user, sql }) => {
      const rows = await sql`
        SELECT to_char(day, 'YYYY-MM-DD') AS day, opened_app, activities, miles, trees
        FROM daily_streaks WHERE user_id = ${user.id}
        ORDER BY day DESC LIMIT 400`;
      const days = {};
      for (const r of rows) {
        days[r.day] = {
          opened: r.opened_app,
          activities: r.activities,
          miles: Number(r.miles),
          trees: r.trees,
        };
      }
      return {
        days,
        longestStreak: user.longest_streak,
        lastBonusStreak: user.last_bonus_streak,
      };
    },
  },
  {
    method: 'POST',
    path: '/api/streak/check-in',
    handler: async ({ user, body, sql }) => {
      const { days = {}, longestStreak = 0, lastBonusStreak = 0 } = body;

      // Only the recent window is written; the client keeps the full history.
      // These go up as ONE statement — a row-at-a-time loop meant up to 60
      // HTTP round trips on every single check-in.
      const entries = Object.entries(days)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .slice(-60);

      if (entries.length) {
        await sql`
          INSERT INTO daily_streaks (user_id, day, opened_app, activities, miles, trees)
          SELECT ${user.id}, d::date, o, a, m, t
          FROM unnest(
            ${entries.map(([d]) => d)}::date[],
            ${entries.map(([, r]) => !!r.opened)}::boolean[],
            ${entries.map(([, r]) => r.activities ?? 0)}::int[],
            ${entries.map(([, r]) => r.miles ?? 0)}::numeric[],
            ${entries.map(([, r]) => r.trees ?? 0)}::int[]
          ) AS s(d, o, a, m, t)
          ON CONFLICT (user_id, day) DO UPDATE
            SET opened_app = daily_streaks.opened_app OR EXCLUDED.opened_app,
                activities = GREATEST(daily_streaks.activities, EXCLUDED.activities),
                miles      = GREATEST(daily_streaks.miles, EXCLUDED.miles),
                trees      = GREATEST(daily_streaks.trees, EXCLUDED.trees)`;
      }

      await sql`
        UPDATE users
        SET longest_streak = GREATEST(longest_streak, ${longestStreak}),
            last_bonus_streak = GREATEST(last_bonus_streak, ${lastBonusStreak}),
            last_active_date = CURRENT_DATE
        WHERE id = ${user.id}`;

      return { ok: true };
    },
  },

  /* ── Challenges ────────────────────────────────────────────────────────── */
  {
    method: 'GET',
    path: '/api/challenges',
    handler: async ({ user, query, sql }) => {
      const weekId = query.get('week');
      const rows = weekId
        ? await sql`SELECT * FROM user_challenges WHERE user_id = ${user.id} AND week_id = ${weekId}`
        : await sql`SELECT * FROM user_challenges WHERE user_id = ${user.id} ORDER BY updated_at DESC LIMIT 50`;

      const totals = await sql`
        SELECT COUNT(*)::int AS n, COALESCE(SUM(points), 0)::int AS pts
        FROM user_challenges WHERE user_id = ${user.id} AND is_complete`;

      const completed = {};
      let currentWeek = weekId ?? rows[0]?.week_id ?? null;
      for (const r of rows) {
        if (r.week_id === currentWeek && r.is_complete) {
          completed[r.challenge_slug] = ms(r.completed_at);
        }
      }

      return {
        weekId: currentWeek,
        completed,
        lifetimeCompleted: totals[0].n,
        lifetimePoints: totals[0].pts,
      };
    },
  },
  {
    method: 'POST',
    path: '/api/challenges/:id/complete',
    handler: async ({ user, params, body, sql }) => {
      const { weekId, points = 0 } = body;
      if (!weekId) throw fail(400, 'week_required');
      await sql`
        INSERT INTO user_challenges (user_id, challenge_slug, week_id, points, is_complete, completed_at, progress)
        VALUES (${user.id}, ${params.id}, ${weekId}, ${points}, TRUE, now(), 100)
        ON CONFLICT (user_id, challenge_slug, week_id) DO UPDATE
          SET is_complete = TRUE, completed_at = now(), points = EXCLUDED.points`;
      return { ok: true };
    },
  },

  /* ── Clubs ─────────────────────────────────────────────────────────────── */
  {
    method: 'GET',
    path: '/api/clubs',
    handler: async ({ sql }) => loadClubs(sql),
  },
  {
    method: 'POST',
    path: '/api/clubs',
    handler: async ({ user, body, sql }) => {
      const name = (body.name ?? '').trim();
      if (name.length < 3) throw fail(400, 'name_too_short');

      const existing = await sql`
        SELECT 1 FROM club_members WHERE user_id = ${user.id} AND left_at IS NULL LIMIT 1`;
      if (existing.length) throw fail(409, 'already_in_a_club');

      // Retry on the astronomically unlikely code collision.
      let club = null;
      for (let i = 0; i < 5 && !club; i++) {
        try {
          const rows = await sql`
            INSERT INTO clubs (name, code, description, owner_id, is_locked, max_members)
            VALUES (${name}, ${generateCode()}, ${(body.description ?? '').trim()},
                    ${user.id}, ${!!body.isLocked}, ${clampCap(body.maxMembers)})
            RETURNING *`;
          club = rows[0];
        } catch (e) {
          if (!String(e.message).includes('clubs_code_key')) throw e;
        }
      }
      if (!club) throw fail(500, 'could_not_allocate_code');

      await sql`
        INSERT INTO club_members (club_id, user_id, role, display_name)
        VALUES (${club.id}, ${user.id}, 'owner', ${user.display_name})`;

      const [full] = await loadClubs(sql, [club.id]);
      return full;
    },
  },
  {
    method: 'POST',
    path: '/api/clubs/join',
    handler: async ({ user, body, sql }) => {
      const code = (body.code ?? '').trim().toUpperCase();
      if (!code) throw fail(400, 'code_required');

      const [club] = await sql`
        SELECT * FROM clubs WHERE code = ${code} AND deleted_at IS NULL LIMIT 1`;
      if (!club) throw fail(404, 'club_not_found');
      if (club.is_locked) throw fail(403, 'club_locked');
      if (club.member_count >= club.max_members) throw fail(403, 'club_full');

      const mine = await sql`
        SELECT club_id FROM club_members WHERE user_id = ${user.id} AND left_at IS NULL LIMIT 1`;
      if (mine.length && mine[0].club_id !== club.id) throw fail(409, 'already_in_a_club');

      await sql`
        INSERT INTO club_members (club_id, user_id, role, display_name)
        VALUES (${club.id}, ${user.id}, 'member', ${user.display_name})
        ON CONFLICT (club_id, user_id) DO UPDATE SET left_at = NULL`;

      const [full] = await loadClubs(sql, [club.id]);
      return full;
    },
  },
  {
    method: 'POST',
    path: '/api/clubs/:id/leave',
    handler: async ({ user, params, sql }) => {
      await sql`
        UPDATE club_members SET left_at = now()
        WHERE club_id = ${params.id} AND user_id = ${user.id} AND left_at IS NULL`;

      // Hand ownership to the longest-standing remaining member.
      const [club] = await sql`SELECT * FROM clubs WHERE id = ${params.id}`;
      if (club?.owner_id === user.id) {
        const [heir] = await sql`
          SELECT user_id FROM club_members
          WHERE club_id = ${params.id} AND left_at IS NULL
          ORDER BY joined_at ASC LIMIT 1`;
        if (heir) {
          await sql`UPDATE clubs SET owner_id = ${heir.user_id} WHERE id = ${params.id}`;
          await sql`UPDATE club_members SET role = 'owner'
                    WHERE club_id = ${params.id} AND user_id = ${heir.user_id}`;
        } else {
          await sql`UPDATE clubs SET deleted_at = now() WHERE id = ${params.id}`;
        }
      }
      return { ok: true };
    },
  },
  {
    method: 'PATCH',
    path: '/api/clubs/:id/lock',
    handler: async ({ user, params, body, sql }) => {
      const rows = await sql`
        UPDATE clubs SET is_locked = ${!!body.isLocked}
        WHERE id = ${params.id} AND owner_id = ${user.id}
        RETURNING id`;
      if (!rows.length) throw fail(403, 'not_the_owner');
      return { ok: true };
    },
  },
  {
    method: 'PATCH',
    path: '/api/clubs/:id',
    handler: async ({ user, params, body, sql }) => {
      const [club] = await sql`
        SELECT * FROM clubs WHERE id = ${params.id} AND owner_id = ${user.id}`;
      if (!club) throw fail(403, 'not_the_owner');

      // A cap below the current headcount would leave members stranded
      // outside their own club, so it is floored at the roster size.
      const cap =
        body.maxMembers == null
          ? club.max_members
          : Math.max(clampCap(body.maxMembers), club.member_count);

      // `goal` is deliberately three-valued: absent leaves it alone, null
      // clears it, an object replaces it.
      const goal =
        body.goal === undefined ? club.goal : body.goal === null ? null : JSON.stringify(body.goal);

      const rows = await sql`
        UPDATE clubs SET
          name         = COALESCE(${body.name ?? null}, name),
          description  = COALESCE(${body.description ?? null}, description),
          max_members  = ${cap},
          is_locked    = COALESCE(${body.isLocked ?? null}, is_locked),
          goal         = ${goal}::jsonb
        WHERE id = ${params.id}
        RETURNING id`;
      if (!rows.length) throw fail(404, 'club_not_found');

      const [full] = await loadClubs(sql, [params.id]);
      return full;
    },
  },
  {
    method: 'DELETE',
    path: '/api/clubs/:id',
    handler: async ({ user, params, sql }) => {
      const rows = await sql`
        UPDATE clubs SET deleted_at = now()
        WHERE id = ${params.id} AND owner_id = ${user.id}
        RETURNING id`;
      if (!rows.length) throw fail(403, 'not_the_owner');
      return undefined;
    },
  },
  {
    method: 'POST',
    path: '/api/clubs/:id/contribute',
    handler: async ({ user, params, body, sql }) => {
      const { points = 0, trees = 0, miles = 0 } = body;
      const { activities = 0, weekId = null } = body;

      await sql`
        UPDATE club_members
        SET points = GREATEST(0, points + ${points}),
            trees  = GREATEST(0, trees + ${trees}),
            miles  = GREATEST(0, miles + ${miles})
        WHERE club_id = ${params.id} AND user_id = ${user.id} AND left_at IS NULL`;

      // Advance the shared weekly goal. Progress resets automatically when the
      // stored weekId no longer matches the caller's, so no scheduled job is
      // needed to roll it over.
      if (weekId) {
        const amount =
          { miles, trees, activities, points }[
            (await sql`SELECT goal->>'metric' AS m FROM clubs WHERE id = ${params.id}`)[0]?.m ??
              'points'
          ] ?? 0;

        await sql`
          UPDATE clubs
          SET goal = jsonb_build_object(
                'metric',   goal->>'metric',
                'target',   (goal->>'target')::numeric,
                'weekId',   ${weekId}::text,
                'progress', CASE WHEN goal->>'weekId' = ${weekId}
                                 THEN (goal->>'progress')::numeric + ${amount}
                                 ELSE ${amount} END,
                'metAt',    CASE
                              WHEN goal->>'weekId' = ${weekId} AND goal->>'metAt' <> 'null'
                                THEN goal->'metAt'
                              WHEN (CASE WHEN goal->>'weekId' = ${weekId}
                                         THEN (goal->>'progress')::numeric + ${amount}
                                         ELSE ${amount} END) >= (goal->>'target')::numeric
                                THEN to_jsonb(EXTRACT(EPOCH FROM now()) * 1000)
                              ELSE 'null'::jsonb END
              )
          WHERE id = ${params.id} AND goal IS NOT NULL`;
      }

      // clubs.total_* are maintained by the refresh_club_totals trigger.
      return { ok: true };
    },
  },

  /* ── Leaderboards ──────────────────────────────────────────────────────── */
  {
    method: 'GET',
    path: '/api/leaderboard/clubs',
    handler: async ({ user, query, sql }) => {
      const limit = Math.min(50, Math.max(1, Number(query.get('limit')) || 10));

      // Ranking happens in Postgres. The app used to download every club and
      // sort on the phone, which stops working the moment there are more than
      // a few hundred.
      const ranked = await sql`
        WITH ranked AS (
          SELECT c.*,
                 ROW_NUMBER() OVER (
                   ORDER BY c.total_points DESC, c.total_trees DESC, c.created_at ASC
                 ) AS rank
          FROM clubs c
          WHERE c.deleted_at IS NULL AND c.is_public
        )
        SELECT * FROM ranked WHERE rank <= ${limit}`;

      const mine = await sql`
        WITH ranked AS (
          SELECT c.id,
                 ROW_NUMBER() OVER (
                   ORDER BY c.total_points DESC, c.total_trees DESC, c.created_at ASC
                 ) AS rank
          FROM clubs c
          WHERE c.deleted_at IS NULL AND c.is_public
        )
        SELECT r.rank, r.id
        FROM ranked r
        JOIN club_members m ON m.club_id = r.id AND m.user_id = ${user.id} AND m.left_at IS NULL
        LIMIT 1`;

      const [{ count }] = await sql`
        SELECT COUNT(*)::int AS count FROM clubs WHERE deleted_at IS NULL AND is_public`;

      const ids = [...new Set([...ranked.map((c) => c.id), ...mine.map((m) => m.id)])];
      const full = ids.length ? await loadClubs(sql, ids) : [];
      const byId = new Map(full.map((c) => [c.id, c]));

      return {
        total: count,
        top: ranked
          .filter((c) => byId.has(c.id))
          .map((c) => ({ rank: Number(c.rank), club: byId.get(c.id) })),
        me: mine.length && byId.has(mine[0].id)
          ? { rank: Number(mine[0].rank), club: byId.get(mine[0].id) }
          : null,
      };
    },
  },
  {
    method: 'GET',
    path: '/api/leaderboard/users',
    handler: async ({ sql }) => sql`SELECT * FROM global_user_leaderboard LIMIT 100`,
  },

  /* ── Trails (public) ───────────────────────────────────────────────────── */
  {
    method: 'GET',
    path: '/api/trails',
    public: true,
    handler: async ({ sql }) => {
      const rows = await sql`SELECT * FROM trails WHERE is_active ORDER BY name`;
      return rows.map((t) => ({
        id: t.slug,
        slug: t.slug,
        name: t.name,
        type: t.type,
        distanceMiles: Number(t.distance_miles),
        difficulty: t.difficulty,
        area: t.area,
        description: t.description,
        safetyTips: t.safety_tips ?? [],
        imageUrl: t.image_url ?? undefined,
        rating: t.rating == null ? undefined : Number(t.rating),
        petFriendly: t.pet_friendly,
        familyFriendly: t.family_friendly,
        strollerFriendly: t.stroller_friendly,
        restroomsAvailable: t.restrooms_available,
        waterStations: t.water_stations,
        elevationGainFt: t.elevation_gain_ft ?? undefined,
        estimatedMinutes: t.estimated_minutes ?? undefined,
        plants: t.plants ?? [],
        animals: t.animals ?? [],
        ecoPoints: t.eco_points,
        startLat: t.start_lat,
        startLng: t.start_lng,
        endLat: t.end_lat ?? undefined,
        endLng: t.end_lng ?? undefined,
        isLoop: t.is_loop,
      }));
    },
  },

  /* ── Trail assistant (optional AI upgrade) ─────────────────────────────── */
  {
    method: 'POST',
    path: '/api/assistant',
    handler: async ({ body }) => {
      const key = process.env.GROQ_API_KEY;
      // No key configured is not an error — the app has a full on-device
      // assistant and simply keeps using it.
      if (!key) throw fail(501, 'assistant_not_configured');

      const { question, context } = body;
      if (!question) throw fail(400, 'question_required');

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant',
          temperature: 0.3,
          max_tokens: 320,
          messages: [
            {
              role: 'system',
              content:
                'You are the trail assistant inside EcoTrek, a hiking app for Austin, Texas. ' +
                'Answer ONLY from the trail data and weather provided. If the data does not ' +
                'contain the answer, say so plainly rather than guessing — never invent a trail, ' +
                'a distance, or a rule. Be brief: two or three sentences. Write plainly, no ' +
                'bullet lists unless asked, no emoji. Safety comes before encouragement: if the ' +
                'weather is dangerous, say so first.',
            },
            {
              role: 'user',
              content: `Trail and conditions data:\n${JSON.stringify(context ?? {})}\n\nQuestion: ${question}`,
            },
          ],
        }),
      });

      if (!res.ok) throw fail(502, 'assistant_upstream_error');
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw fail(502, 'assistant_empty_response');
      return { text };
    },
  },

  /* ── Devices (push tokens) ─────────────────────────────────────────────── */
  {
    method: 'POST',
    path: '/api/devices',
    handler: async ({ user, body, sql }) => {
      await sql`
        INSERT INTO devices (user_id, device_id, platform, app_version, expo_push_token)
        VALUES (${user.id}, ${body.deviceId}, ${body.platform ?? null},
                ${body.appVersion ?? null}, ${body.expoPushToken ?? null})
        ON CONFLICT (user_id, device_id) DO UPDATE
          SET expo_push_token = EXCLUDED.expo_push_token,
              app_version = EXCLUDED.app_version,
              last_seen_at = now()`;
      return { ok: true };
    },
  },
];
