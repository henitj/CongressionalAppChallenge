import { neon } from '@neondatabase/serverless';
import { OAuth2Client } from 'google-auth-library';

/**
 * Database + auth plumbing.
 *
 * Two environment variables run this whole thing:
 *   DATABASE_URL              — Neon connection string (Dashboard → Connect)
 *   GOOGLE_CLIENT_IDS         — comma-separated OAuth client IDs to accept
 */

if (!process.env.DATABASE_URL) {
  console.error(
    '\n  DATABASE_URL is not set.\n' +
      '  Copy .env.example to .env and paste your Neon connection string.\n'
  );
  process.exit(1);
}

export const sql = neon(process.env.DATABASE_URL);

const CLIENT_IDS = (process.env.GOOGLE_CLIENT_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const oauth = new OAuth2Client();

/**
 * Verifies a Google ID token and returns the profile.
 *
 * This is the security boundary of the whole system. The app sends a token,
 * NOT a user id — otherwise anyone could POST someone else's user id and write
 * to their account. Google signs the token; we check that signature and that
 * it was issued for one of our clients.
 */
export async function verifyGoogleToken(idToken) {
  if (CLIENT_IDS.length === 0) {
    throw new Error('GOOGLE_CLIENT_IDS is not configured on the server');
  }
  const ticket = await oauth.verifyIdToken({ idToken, audience: CLIENT_IDS });
  const p = ticket.getPayload();
  if (!p?.sub) throw new Error('Token has no subject');
  return {
    googleSub: p.sub,
    email: p.email ?? null,
    emailVerified: !!p.email_verified,
    name: p.name ?? p.email ?? 'Trekker',
    picture: p.picture ?? null,
  };
}

/** Finds or creates the user row for a verified Google profile. */
export async function upsertUser(profile) {
  const rows = await sql`
    INSERT INTO users (google_sub, email, email_verified, display_name, avatar_url, provider, last_seen_at)
    VALUES (${profile.googleSub}, ${profile.email}, ${profile.emailVerified},
            ${profile.name}, ${profile.picture}, 'google', now())
    ON CONFLICT (google_sub) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          avatar_url   = EXCLUDED.avatar_url,
          email        = COALESCE(EXCLUDED.email, users.email),
          last_seen_at = now(),
          deleted_at   = NULL
    RETURNING *`;
  return rows[0];
}

/**
 * Resolves the caller from the Authorization header.
 * Returns null when there is no valid token — callers decide whether that is
 * a 401 or an anonymous read.
 */
export async function authenticate(req) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  try {
    const profile = await verifyGoogleToken(token);
    return await upsertUser(profile);
  } catch (e) {
    console.warn('[auth] rejected token:', e.message);
    return null;
  }
}
