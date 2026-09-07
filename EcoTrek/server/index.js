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

/**
 * Basic per-IP rate limit. The app makes short bursts (a sync is ~10
 * requests), so 240/min is generous for one person and hostile for a script.
 * Uses the socket address; behind a reverse proxy, front it with the
 * platform's own limiter or set the proxy's address limits instead.
 */
const RATE_LIMIT = 240;
const RATE_WINDOW_MS = 60_000;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.resetAt) {
    // Opportunistic cleanup so the map cannot grow without bound.
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  h.count += 1;
  return h.count > RATE_LIMIT;
}

function send(res, status, body, extraHeaders = {}) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    // The app is not a browser, but Expo web is.
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN ?? '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  res.end(payload);
}

/** Body-size and JSON errors carry their own status so they do not land as 500s. */
function bad(status, publicMessage) {
  const e = new Error(publicMessage);
  e.status = status;
  e.publicMessage = publicMessage;
  return e;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // GPS paths can be chunky; anything past 2 MB is not legitimate.
    if (size > 2_000_000) throw bad(413, 'body_too_large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw bad(400, 'invalid_json');
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
        // A malformed % sequence here must not take the process down.
        try {
          params[pattern[i].slice(1)] = decodeURIComponent(actual[i]);
        } catch {
          params[pattern[i].slice(1)] = actual[i];
        }
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

  if (isRateLimited(req.socket?.remoteAddress ?? 'unknown')) {
    return send(res, 429, { error: 'rate_limited', retryAfterSeconds: 60 }, { 'Retry-After': '60' });
  }

  // A hostile Host header or request line must not crash the process either.
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  } catch {
    return send(res, 400, { error: 'bad_request' });
  }
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const key = `${req.method} ${pathname}`;

  if (pathname === '/' || pathname === '/api/health') {
    return send(res, 200, { ok: true, service: 'ecotrek-api' });
  }

  let matched;
  try {
    matched = matchRoute(req.method, pathname);
  } catch {
    return send(res, 400, { error: 'bad_request' });
  }
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


// A client that disconnects mid-handshake would otherwise emit an error event
// nobody handled. Respond with a bare 400 and move on.
server.on('clientError', (err, socket) => {
  try {
    if (socket.writable) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    } else {
      socket.destroy();
    }
  } catch {
    try { socket.destroy(); } catch { /* nothing left to do */ }
  }
});

// One bad request must never take the whole API down. Log it, keep serving.
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaught exception (server kept alive):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandled rejection (server kept alive):', reason);
});

// Stop cleanly on shutdown signals so in-flight requests finish.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — closing server…`);
  server.close(() => process.exit(0));
  // If something hangs, exit anyway. Neon connections do not need ceremony.
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`EcoTrek API listening on http://0.0.0.0:${PORT}`);
});
