import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactPath = path.join(repoRoot, 'downloads', 'ecotrek.apk');
const releaseInfoPath = path.join(repoRoot, 'downloads', 'ecotrek-apk.json');

async function unusedPort() {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForDownload(url, child) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Site server exited early (code ${child.exitCode}).`);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) return response;
    } catch {
      // The server has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Site server did not start in time.');
}

test('the website serves a fresh, complete APK from /download', async (t) => {
  const port = await unusedPort();
  const child = spawn(process.execPath, ['serve-site.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
  });
  t.after(() => child.kill('SIGTERM'));

  const url = `http://127.0.0.1:${port}/download`;
  const head = await waitForDownload(url, child);
  const releaseInfo = JSON.parse(await readFile(releaseInfoPath, 'utf8'));
  const vercel = JSON.parse(await readFile(path.join(repoRoot, 'vercel.json'), 'utf8'));
  const siteConfig = await readFile(path.join(repoRoot, 'site-config.js'), 'utf8');
  const installPage = await readFile(path.join(repoRoot, 'install', 'android.html'), 'utf8');
  const downloadRewrite = vercel.rewrites.find((rule) => rule.source === '/download');
  const downloadHeaders = vercel.headers.find((rule) => rule.source === '/download')?.headers ?? [];
  const configuredHeaders = Object.fromEntries(downloadHeaders.map(({ key, value }) => [key.toLowerCase(), value]));
  const artifact = await readFile(artifactPath);
  const response = await fetch(url);

  assert.equal(downloadRewrite?.destination, '/downloads/ecotrek.apk');
  assert.match(siteConfig, /apkUrl:\s*'\/download'/);
  assert.match(installPage, /id="download-button" href="\/download"/);
  assert.match(installPage, /href="\/\?web=1"/);
  assert.match(installPage, /Install from the website instead/);
  assert.equal(configuredHeaders['content-type'], 'application/vnd.android.package-archive');
  assert.match(configuredHeaders['content-disposition'] ?? '', /attachment;\s*filename="EcoTrek\.apk"/i);
  assert.match(configuredHeaders['cache-control'] ?? '', /no-transform/);
  const downloaded = Buffer.from(await response.arrayBuffer());

  assert.equal(head.status, 200);
  assert.equal(response.status, 200);
  assert.match(head.headers.get('content-type') ?? '', /^application\/vnd\.android\.package-archive/i);
  assert.match(head.headers.get('content-disposition') ?? '', /attachment;\s*filename="EcoTrek\.apk"/i);
  assert.match(head.headers.get('cache-control') ?? '', /no-transform/);
  assert.equal(Number(head.headers.get('content-length')), releaseInfo.bytes);
  assert.deepEqual(downloaded.subarray(0, 4), Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  assert.equal(downloaded.length, releaseInfo.bytes);
  assert.equal(createHash('sha256').update(downloaded).digest('hex'), releaseInfo.sha256);
  assert.deepEqual(downloaded, artifact);
});
