#!/usr/bin/env node
/**
 * Regenerates the site's app pages from the *existing* web export, without
 * running a full `expo export`.
 *
 *   node scripts/rebuild-site-pages.mjs        # from EcoTrek/
 *   npm run site:pages
 *
 * `npm run export:web` already does this as its last step. This script is for
 * the case where only the pages changed — the launcher bar, the redirect, the
 * stylesheet comments — and re-bundling the whole app would take minutes for
 * no reason. It writes:
 *
 *   app/index.html   the exported app with the compat prelude, splash and
 *                    watchdog (the exact copy the APK bundles)
 *   index.html       the repository root page: the same app, addressed from
 *                    "/" with the site-only head tags
 *
 * Both writes are idempotent, so running it twice changes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { patchIndexHtml, writeRootAppPage, pathExists } from './web-compat.mjs';

const ecoTrek = process.cwd();
const repoRoot = path.resolve(ecoTrek, '..');
const dist = path.join(repoRoot, 'app');
const webDirectory = path.join(dist, '_expo', 'static', 'js', 'web');

if (!(await pathExists(webDirectory))) {
  console.error(`${path.relative(repoRoot, webDirectory)} not found — run \`npm run export:web\` first.`);
  process.exit(1);
}

const files = fs.readdirSync(webDirectory);
const polyfillsName = files.find((name) => name.startsWith('ecotrek-polyfills-') && name.endsWith('.js'));
const bundleName = files.find((name) => name.endsWith('.js') && !name.startsWith('ecotrek-polyfills-'));

if (!bundleName || !polyfillsName) {
  console.error(`No app bundle/polyfills in ${webDirectory} (found: ${files.join(', ') || 'nothing'}).`);
  process.exit(1);
}

await patchIndexHtml(dist, { bundleName, polyfillsName });
console.log(`patched app/index.html (bundle ${bundleName}, polyfills ${polyfillsName})`);

const rootPage = path.join(repoRoot, 'index.html');
const written = await writeRootAppPage(dist, { destination: rootPage });
console.log(`wrote ${path.relative(repoRoot, rootPage)} (${written.bytes.toLocaleString()} bytes)`);
