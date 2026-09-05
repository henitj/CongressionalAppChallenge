import './env.js';
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
 * Verifies a token from Google and returns the profile behind it.
 *
 * This is the security boundary of the whole system. The app sends a token,
 * never a user id — otherwise anyone could POST someone else's id and write to
 * their account.
 *
 * Two token types are accepted, because which one the app holds depends on the
 * platform and the OAuth flow:
 *
 *   1. An ID token — a signed JWT. Verified offline against Google's public
 *      keys. This is the preferred path.
 *   2. An access token — an opaque string. Validated by asking Google's
 *      tokeninfo endpoint who it belongs to.
 *
 * Both paths check the audience against our own client IDs, so a token minted
 * for some other app cannot be replayed against this API.
 */
export async function verifyGoogleToken(token) {
  if (CLIENT_IDS.length === 0) {
    throw new Error('GOOGLE_CLIENT_IDS is not configured on the server');
  }

  // An ID token is a JWT: three dot-separated segments.
  const looksLikeJwt = token.split('.').length === 3;

  if (looksLikeJwt) {
    const ticket = await oauth.verifyIdToken({ idToken: token, audience: CLIENT_IDS });
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

  return verifyAccessToken(token);
}

/**
 * Validates an opaque access token. tokeninfo tells us the audience and
 * subject; userinfo fills in the display name and picture.
 */
async function verifyAccessToken(accessToken) {
  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!infoRes.ok) throw new Error('Access token rejected by Google');

  const info = await infoRes.json();
  if (!info.sub) throw new Error('Access token has no subject');
  if (!CLIENT_IDS.includes(info.aud)) {
    throw new Error('Access token was issued for a different application');
  }
  if (info.expires_in != null && Number(info.expires_in) <= 0) {
    throw new Error('Access token has expired');
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : {};

  return {
    googleSub: info.sub,
    email: info.email ?? profile.email ?? null,
    emailVerified: info.email_verified === 'true' || profile.email_verified === true,
    name: profile.name ?? info.email ?? 'Trekker',
    picture: profile.picture ?? null,
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
