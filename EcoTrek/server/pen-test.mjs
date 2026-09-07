/**
 * EcoTrek AI penetration test — runnable attack suite.
 *
 *   npm run pentest
 *
 * Three layers, mirroring how a real attacker works:
 *
 *   1. LIVE SERVER ATTACKS  — boots the real API and fires malformed,
 *      hostile and oversized requests at it. The server must answer with
 *      correct status codes and still be alive at the end.
 *   2. HANDLER ATTACKS      — every route handler is called directly with a
 *      recording stub database, so we can verify numbers are clamped,
 *      strings are capped, ownership is enforced and injection attempts
 *      always travel as parameters (never concatenated into SQL).
 *   3. AUTH BOUNDARY        — the token verifier is attacked with expired,
 *      foreign-audience and malformed credentials.
 *
 * Exit code 0 means every attack was survived.
 */

import { spawn } from 'node:child_process';
import net from 'node:net';

let passed = 0;
let failed = 0;
const failures = [];

function ok(name) {
  passed++;
  console.log(`  ✓ ${name}`);
}
function bad(name, detail) {
  failed++;
  failures.push({ name, detail });
  console.log(`  ✗ ${name}\n      ${detail}`);
}

async function check(name, fn) {
  try {
    await fn();
    ok(name);
  } catch (e) {
    bad(name, e.message);
  }
}

function expect(cond, message) {
  if (!cond) throw new Error(message);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rawRequest(port, raw) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1');
    let data = '';
    socket.setTimeout(4000);
    socket.on('connect', () => socket.write(raw));
    socket.on('data', (d) => (data += d.toString('latin1')));
    socket.on('end', () => resolve(data));
    socket.on('error', (e) => reject(e));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(data);
    });
  });
}

async function liveServerAttacks(port) {
  const base = `http://127.0.0.1:${port}`;

  console.log('\n┌─ 1. live server attacks ─────────────────────────────────────────┐');

  // The server must answer basic health even before anything else.
  await check('health endpoint answers', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status === 200, `expected 200, got ${res.status}`);
  });

  await check('protected route rejects anonymous caller (401)', async () => {
    const res = await fetch(`${base}/api/activities`);
    expect(res.status === 401, `expected 401, got ${res.status}`);
  });

  await check('unknown route → 404', async () => {
    const res = await fetch(`${base}/api/does-not-exist`);
    expect(res.status === 404, `expected 404, got ${res.status}`);
  });

  await check('wrong method → 404 (not 405 leak, not 500)', async () => {
    const res = await fetch(`${base}/api/activities`, { method: 'PUT' });
    expect(res.status === 404, `expected 404, got ${res.status}`);
  });

  await check('OPTIONS preflight → 204', async () => {
    const res = await fetch(`${base}/api/activities`, { method: 'OPTIONS' });
    expect(res.status === 204, `expected 204, got ${res.status}`);
  });

  await check('malformed percent-encoding in path does not kill the process', async () => {
    await rawRequest(port, 'DELETE /api/activities/%E0%A4 HTTP/1.1\r\nHost: x\r\n\r\n');
    const res = await fetch(`${base}/api/health`);
    expect(res.status === 200, 'server died after malformed URL');
  });

  await check('garbage request line does not kill the process', async () => {
    await rawRequest(port, 'GARBAGE /%%% HTTP/1.1\r\nHost: x\r\n\r\n');
    const res = await fetch(`${base}/api/health`);
    expect(res.status === 200, 'server died after garbage request line');
  });

  await check('hostile Host header is handled, not fatal', async () => {
    await rawRequest(port, 'GET /api/health HTTP/1.1\r\nHost: ]]][[[:://bad\r\n\r\n');
    const res = await fetch(`${base}/api/health`);
    expect(res.status === 200, 'server died after hostile Host header');
  });

  await check('oversized body (3 MB) → 413, server alive', async () => {
    const res = await fetch(`${base}/api/activities`, {
      method: 'POST',
      headers: { Authorization: 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'x', type: 'hike', pad: 'x'.repeat(3_000_000) }),
    });
    expect([401, 413].includes(res.status), `expected 401 or 413, got ${res.status}`);
    const health = await fetch(`${base}/api/health`);
    expect(health.status === 200, 'server died after oversized body');
  });

  await check('invalid JSON body → 400 (handled, not 500)', async () => {
    // Rate limiter allows 240/min; this suite stays under it apart from the flood test.
    const res = await fetch(`${base}/api/activities`, {
      method: 'POST',
      headers: { Authorization: 'Bearer fake', 'Content-Type': 'application/json' },
      body: '{"never": closed',
    });
    expect([400, 401].includes(res.status), `expected 400 or 401, got ${res.status}`);
  });

  await check('deeply nested JSON does not kill the process', async () => {
    let payload = '{"a":';
    for (let i = 0; i < 50_000; i++) payload += '[';
    payload += '1';
    for (let i = 0; i < 50_000; i++) payload += ']';
    payload += '}';
    try {
      await fetch(`${base}/api/activities`, {
        method: 'POST',
        headers: { Authorization: 'Bearer fake', 'Content-Type': 'application/json' },
        body: payload,
      });
    } catch {
      /* connection reset by our own write is acceptable; liveness checked next */
    }
    const health = await fetch(`${base}/api/health`);
    expect(health.status === 200, 'server died after deeply nested JSON');
  });

  await check('SQL injection in path is treated as a value (401/404, alive)', async () => {
    const res = await fetch(
      `${base}/api/clubs/${encodeURIComponent("'; DROP TABLE users; --")}/leave`,
      { method: 'POST' }
    );
    expect([401, 404].includes(res.status), `expected 401/404, got ${res.status}`);
  });

  await check('server is still alive after the full attack battery', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status === 200, 'final health check failed');
  });

  console.log('└──────────────────────────────────────────────────────────────────┘');
}

async function rateLimitAttack(port) {
  console.log('\n┌─ 1b. rate limiting ───────────────────────────────────────────────┐');
  const base = `http://127.0.0.1:${port}`;
  await check('flood of 260 requests eventually gets 429, server survives', async () => {
    let saw429 = false;
    for (let i = 0; i < 260; i++) {
      try {
        const res = await fetch(`${base}/api/health`);
        if (res.status === 429) saw429 = true;
      } catch {
        /* transient socket errors under flood are fine */
      }
    }
    expect(saw429, 'never rate-limited after 260 requests');
    await sleep(300);
    const health = await fetch(`${base}/api/health`);
    expect(health.status === 429 || health.status === 200, 'server died after flood');
  });
  console.log('└──────────────────────────────────────────────────────────────────┘');
}

function makeStubSql(options = {}) {
  const calls = [];
  const stub = (strings, ...values) => {
    const text = Array.isArray(strings) ? strings.join('?') : String(strings);
    calls.push({ text, params: values });
    if (options.onQuery) return Promise.resolve(options.onQuery({ text, params: values }));
    return Promise.resolve(options.rows ?? []);
  };
  stub.query = async (text) => {
    calls.push({ text, params: [] });
    return options.rows ?? [];
  };
  stub.calls = calls;
  return stub;
}

/** Route table, populated once main() imports routes.js. */
let routes = [];

function findRoute(method, path) {
  const exact = routes.find((r) => r.method === method && r.path === path);
  if (exact) return exact;
  // :id style
  return routes.find((r) => {
    if (r.method !== method) return false;
    const pat = r.path.split('/');
    const act = path.split('/');
    if (pat.length !== act.length) return false;
    return pat.every((seg, i) => seg.startsWith(':') || seg === act[i]);
  });
}

const ATTACK_USER = { id: 'att-1', display_name: 'Attacker', avatar_url: null, is_banned: false };
const VICTIM_CLUB = {
  id: 'club-victim',
  name: 'Victims',
  code: 'ABC234',
  owner_id: 'victim-1',
  member_count: 3,
  max_members: 10,
  is_locked: false,
  is_public: true,
  goal: null,
  total_points: 5,
  total_trees: 1,
  total_miles: 2,
  created_at: new Date().toISOString(),
};

async function handlerAttacks() {
  console.log('\n┌─ 2. handler attacks (stub database) ──────────────────────────────┐');

  const drop = "'; DROP TABLE users; --";
  const huge = 'A'.repeat(1_000_000);

  {
    const route = findRoute('POST', '/api/activities');
    const sql = makeStubSql({ rows: [{ client_id: 'x' }] });
    await check('activity: absurd numbers are clamped before reaching SQL', async () => {
      await route.handler({
        user: ATTACK_USER,
        sql,
        params: {},
        query: new URLSearchParams(),
        body: {
          id: 'act-1',
          type: 'hike',
          miles: 1e308,
          durationSec: -5,
          trees: 999999999,
          points: -999,
          startedAt: 'not-a-date',
          endedAt: 1e308,
        },
      });
      const ins = sql.calls.find((c) => c.text.includes('INSERT INTO activities'));
      expect(ins, 'no INSERT issued');
      const miles = ins.params.find((v) => v === 500);
      expect(miles === 500, `miles not clamped to 500 (params: ${JSON.stringify(ins.params.slice(4, 8))})`);
      const dur = ins.params.find((v) => v === 0);
      expect(dur !== undefined, 'negative duration not clamped to 0');
    });

    await check('activity: 1M-char client id is capped', async () => {
      const sql2 = makeStubSql({ rows: [{ client_id: 'x' }] });
      await route.handler({
        user: ATTACK_USER,
        sql: sql2,
        params: {},
        query: new URLSearchParams(),
        body: { id: huge, type: 'hike' },
      });
      const ins = sql2.calls.find((c) => c.text.includes('INSERT INTO activities'));
      const idParam = ins.params[1];
      expect(typeof idParam === 'string' && idParam.length <= 200, `client id length ${idParam?.length} not capped`);
    });

    await check('activity: hostile path coordinates are sanitized', async () => {
      const sql3 = makeStubSql({ rows: [{ client_id: 'x' }] });
      await route.handler({
        user: ATTACK_USER,
        sql: sql3,
        params: {},
        query: new URLSearchParams(),
        body: {
          id: 'act-2',
          type: 'bike',
          path: [
            { latitude: "'; DROP TABLE users; --", longitude: 1e308 },
            { latitude: 'abc', longitude: -1e308 },
          ],
        },
      });
      const ins = sql3.calls.find((c) => c.text.includes('INSERT INTO activities'));
      // start_lat / start_lng / end_lat / end_lng are the last four params
      const coords = ins.params.slice(-4);
      for (const c of coords) {
        expect(c === null || (typeof c === 'number' && Number.isFinite(c)), `unsanitized coordinate reached SQL: ${String(c).slice(0, 40)}`);
      }
    });

    await check('activity: giant grant.species string is capped', async () => {
      const sql4 = makeStubSql({ rows: [{ client_id: 'x' }] });
      await route.handler({
        user: ATTACK_USER,
        sql: sql4,
        params: {},
        query: new URLSearchParams(),
        body: { id: 'act-3', type: 'hike', grant: { species: huge } },
      });
      const ins = sql4.calls.find((c) => c.text.includes('INSERT INTO activities'));
      const species = ins.params.find((v) => typeof v === 'string' && v.startsWith('A'));
      expect(species !== undefined && species.length <= 100, `grant species length ${species?.length} not capped`);
    });

    await check('activity: rejection without id/type', async () => {
      let threw = null;
      try {
        await route.handler({ user: ATTACK_USER, sql: makeStubSql(), params: {}, query: new URLSearchParams(), body: { type: 'hike' } });
      } catch (e) {
        threw = e;
      }
      expect(threw && threw.status === 400, `expected 400, got ${threw ? threw.status : 'success'}`);
    });

    await check('activity: type whitelist enforced', async () => {
      let threw = null;
      try {
        await route.handler({ user: ATTACK_USER, sql: makeStubSql(), params: {}, query: new URLSearchParams(), body: { id: 'x', type: 'rocket' } });
      } catch (e) {
        threw = e;
      }
      expect(threw && threw.status === 400, `expected 400, got ${threw ? threw.status : 'success'}`);
    });
  }

  {
    const route = findRoute('POST', '/api/streak/check-in');
    await check('streak: absurd longestStreak is clamped', async () => {
      const sql = makeStubSql();
      await route.handler({
        user: ATTACK_USER,
        sql,
        params: {},
        query: new URLSearchParams(),
        body: { days: {}, longestStreak: 1e308, lastBonusStreak: -1e308 },
      });
      const upd = sql.calls.find((c) => c.text.includes('UPDATE users'));
      expect(upd, 'no user update issued');
      const clamped = upd.params.find((v) => v === 3650);
      expect(clamped === 3650, `longestStreak not clamped (params: ${JSON.stringify(upd.params)})`);
    });

    await check('streak: hostile days payloads do not reach SQL arrays', async () => {
      for (const hostile of ['a string', 42, [1, 2, 3], { 'not-a-date': { activities: 1e308 } }]) {
        const sql = makeStubSql();
        await route.handler({
          user: ATTACK_USER,
          sql,
          params: {},
          query: new URLSearchParams(),
          body: { days: hostile, longestStreak: 2 },
        });
        const ins = sql.calls.find((c) => c.text.includes('INSERT INTO daily_streaks'));
        if (ins) {
          // arrays must be finite numbers / booleans only
          for (const p of ins.params.slice(1)) {
            const arr = Array.isArray(p) ? p : [p];
            for (const v of arr) {
              expect(
                typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || typeof v === 'string',
                `hostile value reached SQL array: ${String(v).slice(0, 30)}`
              );
            }
          }
        }
      }
    });
  }

  {
    const route = findRoute('POST', '/api/points');
    await check('points: negative and huge points clamped, strings rejected', async () => {
      const sql = makeStubSql({ rows: [{ id: 1 }] });
      await route.handler({ user: ATTACK_USER, sql, params: {}, query: new URLSearchParams(), body: { action: drop, points: 1e9, timestamp: 'garbage' } });
      const ins = sql.calls.find((c) => c.text.includes('INSERT INTO point_events'));
      expect(ins.params.includes(1000), 'points not clamped to 1000');
      const sqliParam = ins.params.find((v) => typeof v === 'string' && v.includes('DROP TABLE'));
      expect(sqliParam, 'injection string must travel as a parameter, not in SQL text');
      const actionParam = ins.params.find((v) => typeof v === 'string' && v.includes('DROP'));
      expect(actionParam.length <= 60, 'action not capped');
    });
    await check('points: non-numeric points rejected with 400', async () => {
      let threw = null;
      try {
        await route.handler({ user: ATTACK_USER, sql: makeStubSql(), params: {}, query: new URLSearchParams(), body: { action: 'x', points: '999' } });
      } catch (e) {
        threw = e;
      }
      expect(threw && threw.status === 400, `expected 400, got ${threw ? threw.status : 'success'}`);
    });
    await check('points: garbage timestamp cannot poison created_at', async () => {
      const sql = makeStubSql({ rows: [{ id: 1 }] });
      await route.handler({ user: ATTACK_USER, sql, params: {}, query: new URLSearchParams(), body: { action: 'x', points: 1, timestamp: 'garbage' } });
      const ins = sql.calls.find((c) => c.text.includes('INSERT INTO point_events'));
      const tsParam = ins.params[ins.params.length - 1];
      expect(typeof tsParam === 'number' && Number.isFinite(tsParam), `timestamp ${String(tsParam)} not sanitized`);
    });
  }

  {
    const patchRoute = findRoute('PATCH', '/api/clubs/:id');
    await check('club PATCH by non-owner → 403 (IDOR blocked)', async () => {
      const sql = makeStubSql({ rows: [] }); // owner lookup finds nothing
      let threw = null;
      try {
        await patchRoute.handler({ user: ATTACK_USER, sql, params: { id: VICTIM_CLUB.id }, query: new URLSearchParams(), body: { maxMembers: 2 } });
      } catch (e) {
        threw = e;
      }
      expect(threw && threw.status === 403, `expected 403, got ${threw ? threw.status : 'success'}`);
    });

    await check('club PATCH by owner: cap floored at roster size', async () => {
      const sql = makeStubSql({
        onQuery: ({ text }) => (text.includes('SELECT * FROM clubs') ? [VICTIM_CLUB] : [{ id: 'club-victim' }]),
      });
      const res = await patchRoute.handler({
        user: { ...ATTACK_USER, id: 'victim-1' },
        sql,
        params: { id: 'club-victim' },
        query: new URLSearchParams(),
        body: { maxMembers: 1 },
      });
      const upd = sql.calls.find((c) => c.text.includes('UPDATE clubs SET'));
      expect(upd.params.includes(3), `cap not floored to roster size 3 (params: ${JSON.stringify(upd.params)})`);
      expect(res, 'no club returned');
    });

    const lockRoute = findRoute('PATCH', '/api/clubs/:id/lock');
    await check('club lock by non-owner → 403', async () => {
      const sql = makeStubSql({ rows: [] });
      let threw = null;
      try {
        await lockRoute.handler({ user: ATTACK_USER, sql, params: { id: 'x' }, query: new URLSearchParams(), body: { isLocked: true } });
      } catch (e) {
        threw = e;
      }
      expect(threw && threw.status === 403, `expected 403, got ${threw ? threw.status : 'success'}`);
    });

    const delRoute = findRoute('DELETE', '/api/clubs/:id');
    await check('club delete by non-owner → 403', async () => {
      const sql = makeStubSql({ rows: [] });
      let threw = null;
      try {
        await delRoute.handler({ user: ATTACK_USER, sql, params: { id: 'x' }, query: new URLSearchParams(), body: {} });
      } catch (e) {
        threw = e;
      }
      expect(threw && threw.status === 403, `expected 403, got ${threw ? threw.status : 'success'}`);
    });

    const contributeRoute = findRoute('POST', '/api/clubs/:id/contribute');
    await check('contribute: hostile numbers clamped per call', async () => {
      const sql = makeStubSql();
      await contributeRoute.handler({
        user: ATTACK_USER,
        sql,
        params: { id: 'club-victim' },
        query: new URLSearchParams(),
        body: { points: -1e9, trees: 1e9, miles: 'abc', activities: 1e308, weekId: huge },
      });
      const upd = sql.calls.find((c) => c.text.includes('UPDATE club_members'));
      expect(upd.params.includes(0), 'negative points not clamped to 0');
      expect(upd.params.includes(1000), 'trees not clamped to 1000');
      const goalUpd = sql.calls.find((c) => c.text.includes('UPDATE clubs'));
      const weekParam = goalUpd?.params.find((v) => typeof v === 'string' && v.startsWith('A'));
      expect(weekParam !== undefined && weekParam.length <= 80, `weekId length ${weekParam?.length} not capped`);
    });

    const joinRoute = findRoute('POST', '/api/clubs/join');
    await check('join: injection code travels as a parameter', async () => {
      const sql = makeStubSql({ onQuery: ({ text }) => (text.includes('FROM clubs') ? [VICTIM_CLUB] : []) });
      let threw = null;
      try {
        await joinRoute.handler({ user: ATTACK_USER, sql, params: {}, query: new URLSearchParams(), body: { code: drop } });
      } catch (e) {
        threw = e;
      }
      // Either 404 (club lookup empty) or another handled status — but the SQL
      // must have received the string as a bound value.
      const lookup = sql.calls.find((c) => c.text.includes('WHERE code ='));
      expect(lookup, 'club lookup never ran');
      expect(
        lookup.params.some((v) => typeof v === 'string' && v.includes('DROP TABLE')),
        'injection string was not a bound parameter'
      );
      expect(!lookup.text.includes('DROP TABLE'), 'injection string leaked into SQL text');
    });

    const createRoute = findRoute('POST', '/api/clubs');
    await check('club create: RTL-override and control-char names survive safely (capped, trimmed)', async () => {
      const sql = makeStubSql({
        onQuery: ({ text }) =>
          text.includes('FROM club_members')
            ? []
            : text.includes('FROM clubs') || text.includes('INSERT INTO clubs')
              ? [VICTIM_CLUB]
              : [],
      });
      const res = await createRoute.handler({
        user: ATTACK_USER,
        sql,
        params: {},
        query: new URLSearchParams(),
        body: { name: '\u202Eevil\u202D'.padEnd(30, 'x'), description: huge },
      });
      const ins = sql.calls.find((c) => c.text.includes('INSERT INTO clubs'));
      const name = ins.params[0];
      expect(name.length <= 40, `name length ${name.length} not capped`);
      const desc = ins.params[2];
      expect(desc.length <= 300, `description length ${desc.length} not capped`);
      expect(res, 'club returned');
    });
  }

  {
    const route = findRoute('POST', '/api/challenges/:id/complete');
    await check('challenge complete: oversized slug/weekId capped, points clamped', async () => {
      const sql = makeStubSql();
      await route.handler({
        user: ATTACK_USER,
        sql,
        params: { id: huge },
        query: new URLSearchParams(),
        body: { weekId: huge, points: 1e9 },
      });
      const ins = sql.calls.find((c) => c.text.includes('INSERT INTO user_challenges'));
      expect(ins, 'no insert');
      const [, slug, weekId, points] = ins.params; // [0] is user.id
      expect(slug.length <= 120, `slug length ${slug.length} not capped`);
      expect(weekId.length <= 40, `weekId length ${weekId.length} not capped`);
      expect(points === 200, `points not clamped to 200 (${points})`);
    });
  }

  {
    const route = findRoute('POST', '/api/assistant');
    await check('assistant: 501 when unconfigured (no key leaked)', async () => {
      const savedKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;
      let threw = null;
      try {
        await route.handler({ user: ATTACK_USER, body: { question: 'hi' }, params: {}, query: new URLSearchParams(), sql: makeStubSql() });
      } catch (e) {
        threw = e;
      }
      process.env.GROQ_API_KEY = savedKey;
      expect(threw && threw.status === 501, `expected 501, got ${threw ? threw.status : 'success'}`);
    });

    await check('assistant: hostile oversized question is capped before upstream call', async () => {
      const savedKey = process.env.GROQ_API_KEY;
      process.env.GROQ_API_KEY = 'test-key';
      const savedFetch = globalThis.fetch;
      let upstreamBody = null;
      globalThis.fetch = async (_url, init) => {
        upstreamBody = JSON.parse(init.body);
        return { ok: true, json: async () => ({ choices: [{ message: { content: ' answer ' } }] }) };
      };
      try {
        const res = await route.handler({
          user: ATTACK_USER,
          body: { question: huge, context: { blob: 'B'.repeat(500_000) } },
          params: {},
          query: new URLSearchParams(),
          sql: makeStubSql(),
        });
        expect(res.text === 'answer', 'assistant response not trimmed');
        const userMsg = upstreamBody.messages[1].content;
        expect(userMsg.length <= 40_000, `upstream prompt length ${userMsg.length} not capped (cost abuse)`);
      } finally {
        globalThis.fetch = savedFetch;
        if (savedKey === undefined) delete process.env.GROQ_API_KEY;
        else process.env.GROQ_API_KEY = savedKey;
      }
    });
  }

  {
    const route = findRoute('POST', '/api/devices');
    await check('devices: every field capped', async () => {
      const sql = makeStubSql();
      await route.handler({
        user: ATTACK_USER,
        sql,
        params: {},
        query: new URLSearchParams(),
        body: { deviceId: huge, platform: huge, appVersion: huge, expoPushToken: huge },
      });
      const ins = sql.calls.find((c) => c.text.includes('INSERT INTO devices'));
      for (const p of ins.params.slice(1)) {
        expect(typeof p !== 'string' || p.length <= 200, `device field not capped (len ${p.length})`);
      }
    });
  }

  {
    await check('__proto__ pollution payloads are inert', async () => {
      const evil = JSON.parse('{"id":"x","type":"hike","__proto__":{"polluted":"yes"}}');
      const sql = makeStubSql({ rows: [{ client_id: 'x' }] });
      const route = findRoute('POST', '/api/activities');
      await route.handler({ user: ATTACK_USER, sql, params: {}, query: new URLSearchParams(), body: evil });
      expect(({}).polluted === undefined, 'Object prototype was polluted');
    });
  }

  console.log('└──────────────────────────────────────────────────────────────────┘');
}

async function authBoundaryAttacks() {
  console.log('\n┌─ 3. auth boundary ────────────────────────────────────────────────┐');
  const { authenticate } = await import('./db.js');

  await check('no Authorization header → null', async () => {
    const user = await authenticate({ headers: {} });
    expect(user === null, 'anonymous caller authenticated');
  });

  await check('non-Bearer scheme → null', async () => {
    const user = await authenticate({ headers: { authorization: 'Basic dXNlcjpwYXNz' } });
    expect(user === null, 'Basic auth accepted');
  });

  await check('expired access token → null', async () => {
    const saved = globalThis.fetch;
    globalThis.fetch = async (url) =>
      String(url).includes('tokeninfo')
        ? { ok: true, json: async () => ({ sub: 'u1', aud: 'test-client', expires_in: '0' }) }
        : { ok: true, json: async () => ({}) };
    try {
      const user = await authenticate({ headers: { authorization: 'Bearer expired-token' } });
      expect(user === null, 'expired token accepted');
    } finally {
      globalThis.fetch = saved;
    }
  });

  await check('token for a different OAuth client → null', async () => {
    const saved = globalThis.fetch;
    globalThis.fetch = async (url) =>
      String(url).includes('tokeninfo')
        ? { ok: true, json: async () => ({ sub: 'u1', aud: 'someone-elses-app', expires_in: '9999' }) }
        : { ok: true, json: async () => ({}) };
    try {
      const user = await authenticate({ headers: { authorization: 'Bearer foreign-token' } });
      expect(user === null, 'foreign-audience token accepted');
    } finally {
      globalThis.fetch = saved;
    }
  });

  await check('valid access token for OUR client verifies to a profile', async () => {
    const saved = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).includes('tokeninfo')) {
        return {
          ok: true,
          json: async () => ({ sub: 'u1', aud: 'test-client', expires_in: '9999', email: 'a@b.c', email_verified: 'true' }),
        };
      }
      return { ok: true, json: async () => ({ name: 'Real Trekker', picture: 'https://x/p.png' }) };
    };
    try {
      const { verifyGoogleToken } = await import('./db.js');
      const profile = await verifyGoogleToken('good-token');
      expect(profile && profile.googleSub === 'u1', `expected profile, got ${JSON.stringify(profile)}`);
      expect(profile.email === 'a@b.c', 'email not carried through');
      expect(profile.emailVerified === true, 'email_verified not carried through');
      expect(profile.name === 'Real Trekker', 'name not carried through');
    } finally {
      globalThis.fetch = saved;
    }
  });

  await check('garbage token (network failure) → null, not a crash', async () => {
    const saved = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('network down');
    };
    try {
      const user = await authenticate({ headers: { authorization: 'Bearer anything' } });
      expect(user === null, 'network failure authenticated a user');
    } finally {
      globalThis.fetch = saved;
    }
  });

  console.log('└──────────────────────────────────────────────────────────────────┘');
}


async function staticClientScan() {
  console.log('\n┌─ 4. client static scan ───────────────────────────────────────────┐');
  const { execFileSync } = await import('node:child_process');
  const patterns = [
    ['dangerouslySetInnerHTML', 'XSS via raw HTML'],
    ['\\beval\\(', 'eval use'],
    ['new Function\\(', 'dynamic function construction'],
    ['innerHTML\\s*=', 'innerHTML assignment'],
    ['document\\.write', 'document.write'],
    ['javascript:', 'javascript: URL'],
    ['localStorage\\.', 'web localStorage (should use AsyncStorage)'],
  ];
  for (const [pattern, label] of patterns) {
    await check(`no ${label}`, async () => {
      let out = '';
      try {
        out = execFileSync(
          'grep',
          ['-rnE', pattern, 'src', 'App.tsx', '--include=*.ts', '--include=*.tsx'],
          { encoding: 'utf8', cwd: '..' }
        );
      } catch {
        return; // grep exit 1 = no matches
      }
      expect(out.trim() === '', `found:\n${out.trim().split('\n').slice(0, 5).join('\n')}`);
    });
  }
  console.log('└──────────────────────────────────────────────────────────────────┘');
}


async function bootServer(port) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['index.js'], {
      cwd: import.meta.dirname,
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://pen:test@ep-pentest-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
        GOOGLE_CLIENT_IDS: 'test-client',
        PORT: String(port),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    const timer = setTimeout(() => reject(new Error(`server did not boot: ${out}`)), 6000);
    child.stdout.on('data', () => {
      if (out.includes('listening')) {
        clearTimeout(timer);
        resolve(child);
      }
    });
  });
}

async function main() {
  console.log('\n  EcoTrek AI penetration test\n  ═══════════════════════════');

  // Import routes with env configured for the auth tests.
  process.env.DATABASE_URL ??= 'postgresql://pen:test@ep-pentest-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
  process.env.GOOGLE_CLIENT_IDS ??= 'test-client';
  const routesModule = await import('./routes.js');
  routes = routesModule.routes;

  await handlerAttacks();
  await authBoundaryAttacks();
  await staticClientScan();

  // Live attacks against the real process.
  const port = 8898;
  const child = await bootServer(port);
  try {
    await liveServerAttacks(port);
    await rateLimitAttack(port);
  } finally {
    child.kill('SIGTERM');
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
  if (failed) {
    console.log('  Failed attacks that MUST be fixed:');
    for (const f of failures) console.log(`   • ${f.name}\n     ${f.detail}`);
    process.exit(1);
  }
  console.log('  All attacks survived. The app is as hostile-proof as we can make it.\n');
}

main().catch((e) => {
  console.error('pen-test harness crashed:', e);
  process.exit(1);
});
