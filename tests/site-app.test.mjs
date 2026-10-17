import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the site root opens the app directly and serves the exported routes/assets', async (t) => {
  const probe = createServer().listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  const server = spawn(process.execPath, ['serve-site.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) } });
  t.after(() => server.kill('SIGTERM'));
  await once(server.stdout, 'data');
  const base = `http://127.0.0.1:${port}`;
  const exported = await readFile(path.join(root, 'app/index.html'), 'utf8');
  const rootPage = await (await fetch(`${base}/`)).text();

  assert.match(rootPage, /id="root"/);
  assert.match(rootPage, /id="ecotrek-bootstrap"/);
  assert.doesNotMatch(rootPage, /ecotrek-redirect|ecotrek-launcher|install\/android|install\/ios|Puter|Grok/i);
  assert.doesNotMatch(rootPage, /\?web=1/);

  for (const route of ['/app/', '/home', '/track', '/more', '/tree', '/active-tracking', '/activity/fixture']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200, route);
    assert.equal(await response.text(), exported, route);
  }
  for (const route of ['/assistant', '/api/assistant', '/install/android.html', '/install/ios.html', '/api-key.html']) {
    assert.equal((await fetch(`${base}${route}`)).status, 404, route);
  }

  assert.doesNotMatch(exported, /ecotrek-redirect|ecotrek-launcher|install\/android|install\/ios|Puter|Grok/i);
  const bundle = exported.match(/src="(\/_expo\/static\/js\/web\/index-[^" ]+\.js)"/)[1];
  const rootBundle = rootPage.match(/src="(\/app\/_expo\/static\/js\/web\/index-[^" ]+\.js)"/)[1];
  assert.equal(rootBundle.replace('/app', ''), bundle, 'root shell and /app export must use the same app bundle');
  assert.equal((await fetch(`${base}${rootBundle}`)).status, 200);
  const source = await (await fetch(`${base}${bundle}`)).text();
  assert.doesNotMatch(source, /\bPuter(?:\.com|\.js)?\b|Connect Grok|What do you want to know/i);
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
