import { createServer } from 'node:http';
import { sql, authenticate } from './db.js';
import { routes } from './routes.js';

/**
 * EcoTrek API.
 *
 * A single Node HTTP server, no framework. It runs anywhere that can run
 * Node — Render, Railway, Fly, a Raspberry Pi — and needs no build step.
 *
 *   npm install
 *   cp .env.example .env     # paste your Neon URL + Google client IDs
 *   npm run migrate          # creates the tables
 *   npm start
 *
 * Then put the public URL in the app's .env as EXPO_PUBLIC_API_URL and the
 * app switches from on-device storage to this server automatically.
 */

const PORT = process.env.PORT ?? 8787;

/** Routes that do not require a signed-in user. */
const PUBLIC_ROUTES = new Set(['GET /api/trails', 'GET /api/health']);

function send(res, status, body) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    // The app is not a browser, but Expo web is.
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN ?? '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // GPS paths can be chunky; anything past 2 MB is not legitimate.
    if (size > 2_000_000) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Body is not valid JSON');
  }
}

/** Matches '/api/clubs/:id/leave' style patterns and extracts params. */
function matchRoute(method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const pattern = route.path.split('/');
    const actual = pathname.split('/');
    if (pattern.length !== actual.length) continue;

    const params = {};
    let ok = true;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i].startsWith(':')) {
        params[pattern[i].slice(1)] = decodeURIComponent(actual[i]);
      } else if (pattern[i] !== actual[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return null;
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const key = `${req.method} ${pathname}`;

  if (pathname === '/' || pathname === '/api/health') {
    return send(res, 200, { ok: true, service: 'ecotrek-api' });
  }

  const matched = matchRoute(req.method, pathname);
  if (!matched) return send(res, 404, { error: 'not_found' });

  try {
    let user = null;
    if (!PUBLIC_ROUTES.has(key) && !matched.route.public) {
      user = await authenticate(req);
      if (!user) return send(res, 401, { error: 'unauthorized' });
      if (user.is_banned) return send(res, 403, { error: 'account_suspended' });
    }

    const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : {};
    const result = await matched.route.handler({
      user,
      body,
      params: matched.params,
      query: url.searchParams,
      sql,
    });

    if (result === undefined) return send(res, 204);
    send(res, result?.__status ?? 200, result?.__body ?? result);
  } catch (e) {
    console.error(`[${key}]`, e);
    const status = e.status ?? 500;
    send(res, status, { error: e.publicMessage ?? 'server_error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`EcoTrek API listening on http://0.0.0.0:${PORT}`);
});
