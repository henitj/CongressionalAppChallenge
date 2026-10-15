import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('app deep links, local SDK and selected artwork are served as real assets', async (t) => {
  const probe = createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  const server = spawn(process.execPath, ['serve-site.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) } });
  t.after(() => server.kill('SIGTERM'));
  await once(server.stdout, 'data');
  const base = `http://127.0.0.1:${port}`;
  const exported = await readFile(path.join(root, 'app/index.html'), 'utf8');
  const rootPage = await (await fetch(`${base}/?web=1`)).text();
  const sdk = exported.match(/__ECOTREK_PUTER_SDK_URL__="([^"]+)"/)[1];
  assert.ok(rootPage.includes(sdk));

  for (const route of ['/app/', '/home', '/track', '/more', '/tree', '/assistant', '/active-tracking', '/activity/fixture']) {
    const response = await fetch(`${base}${route}?web=1`);
    assert.equal(response.status, 200, route);
    assert.equal(await response.text(), exported, route);
  }
  for (const route of [sdk, `/app${sdk}`, '/assets/vendor/THIRD_PARTY_NOTICES.txt']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200, route);
    assert.doesNotMatch(response.headers.get('content-type'), /html/, route);
    assert.ok((await response.text()).length > 1000, route);
  }
  const bundle = exported.match(/src="(\/_expo\/static\/js\/web\/index-[^" ]+\.js)"/)[1];
  const source = await (await fetch(`${base}${bundle}`)).text();
  const cutouts = [...source.matchAll(/"(\/assets\/assets\/(?:biker|hiker)\.[a-f0-9]+\.png)"/g)].map((match) => match[1]);
  assert.equal(new Set(cutouts).size, 2);
  for (const image of new Set(cutouts)) {
    const response = await fetch(`${base}${image}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/png');
    assert.ok(Number(response.headers.get('content-length')) > 200000);
  }
  assert.equal((await fetch(`${base}/not-a-screen`)).status, 404);
});
