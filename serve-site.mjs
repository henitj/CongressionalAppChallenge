#!/usr/bin/env node
/**
 * Local preview server for the EcoTrek site — the same routing the site gets on
 * Vercel, so what you see here is what deploys.
 *
 *   node serve-site.mjs          # http://localhost:8000
 *   PORT=4000 node serve-site.mjs
 *
 * It mirrors the rewrites in vercel.json: the app is exported under /app/, but
 * the app bundle addresses its own images as /assets/..., so those requests are
 * served from /app/assets/. No dependencies, no build step.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8000);

const rewrites = [
  [/^\/privacy$/, '/privacy.html'],
  [/^\/app\/?$/, '/app/index.html'],
  [/^\/apk$/, '/downloads/ecotrek.apk'],
  [/^\/_expo\//, (p) => `/app${p}`],
  [/^\/favicon\.ico$/, '/app/favicon.ico'],
  [/^\/metadata\.json$/, '/app/metadata.json'],
  [/^\/assets\//, (p) => `/app${p}`],
];

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.apk': 'application/vnd.android.package-archive',
  '.xml': 'application/xml; charset=utf-8',
};

function resolve(urlPath) {
  let target = urlPath;
  for (const [pattern, replacement] of rewrites) {
    if (pattern.test(target)) {
      target = typeof replacement === 'string' ? replacement : replacement(target);
      break;
    }
  }
  let file = path.join(root, path.normalize(target).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(root)) return null;
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  // clean URLs: /install/android serves install/android.html
  if (!existsSync(file) && !path.extname(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

const server = createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve(urlPath);
  if (!file) {
    response.writeHead(404, { 'Content-Type': types['.html'] });
    response.end(
      `<!doctype html><meta charset="utf-8"><title>404 · EcoTrek</title>` +
        `<body style="font:16px system-ui;padding:40px;max-width:40rem;margin:auto">` +
        `<h1>404</h1><p><code>${urlPath}</code> is not part of the site.</p>` +
        `<p>Try the <a href="/">app</a>, <a href="/install/android.html">Android install guide</a>, ` +
        `<a href="/install/ios.html">iPhone guide</a> or <a href="/api-key.html">AI key page</a>.</p></body>`
    );
    return;
  }
  const headers = {
    'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  };
  if (request.method === 'HEAD') {
    headers['Content-Length'] = String(statSync(file).size);
    response.writeHead(200, headers);
    response.end();
    return;
  }
  response.writeHead(200, headers);
  createReadStream(file).pipe(response);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`EcoTrek site preview: http://localhost:${port}  (app: / · Android guide: /install/android.html)`);
});
