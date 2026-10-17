#!/usr/bin/env node
/**
 * Post-processes the `expo export --platform web` output in dist/ so the
 * bundle renders correctly inside the Android WebView shell APK and as the
 * hosted web app:
 *
 *   1. Locks the viewport (no accidental pinch-zoom state, no font boosting,
 *      proper notch handling via viewport-fit=cover).
 *   2. Disables mobile browser "text inflation" which stretched layouts.
 *   3. Stops overscroll rubber-banding so the app feels native.
 *   4. Runs scripts/web-compat.mjs: transpiles the bundle for older Android
 *      System WebViews, adds the ES5 polyfill prelude, and injects the boot
 *      watchdog (a branded splash that turns into an explanation if the app
 *      ever fails to start, instead of a white screen).
 *   5. Checks that every asset the bundle asks for exists in the export; a
 *      missing file fails the export instead of leaving a stale deployment.
 *   6. Writes the repository-root page and syncs the /app asset tree so both
 *      Vercel app entry paths stay in lockstep.
 *      missing icon is a silent 404 on the site and inside the APK.
 *
 * Run automatically by `npm run export:web`.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  patchIndexHtml,
  transpileBundles,
  writePolyfills,
  writeRootAppPage,
  pathExists,
} from './web-compat.mjs';

const dist = path.join(process.cwd(), 'dist');
const indexPath = path.join(dist, 'index.html');
const repoRoot = path.resolve(process.cwd(), '..');
const standalone = process.env.ECOTREK_STANDALONE_WEB === '1';

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found — run `npx expo export --platform web` first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(
  /<meta name="viewport"[^>]*\/?>(\n)?/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, shrink-to-fit=no" />\n'
);

const extraCss = `
      /* EcoTrek: keep mobile engines from inflating text ("stretched" UI) */
      html {
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }
      body {
        overscroll-behavior: none;
        -webkit-tap-highlight-color: transparent;
      }
`;

html = html.replace('</style>', `${extraCss}    </style>`);
fs.writeFileSync(indexPath, html);
console.log('dist/index.html patched for mobile WebView rendering.');

// --- 4. compatibility pass -------------------------------------------------
const transpiled = await transpileBundles(dist);
for (const bundle of transpiled.written) {
  const change = ((bundle.bytesAfter / bundle.bytesBefore - 1) * 100).toFixed(1);
  console.log(
    `compat: ${bundle.originalName} → ${bundle.name} (${bundle.bytesBefore.toLocaleString()} → ${bundle.bytesAfter.toLocaleString()} bytes, ${change}%)`
  );
}
const polyfills = await writePolyfills(dist);
const bundleName = transpiled.written[0]?.name;
if (!bundleName) {
  console.error('No web bundle found in dist — the export looks incomplete.');
  process.exit(1);
}
await patchIndexHtml(dist, { bundleName, polyfillsName: polyfills.name, standalone });
console.log(
  `compat: polyfills ${polyfills.name} (${polyfills.bytes.toLocaleString()} bytes), splash + watchdog injected.`
);
if (standalone) {
  const standaloneHtml = fs.readFileSync(indexPath, 'utf8');
  if (standaloneHtml.includes('id="ecotrek-redirect"') || standaloneHtml.includes('id="ecotrek-launcher"')) {
    throw new Error('Standalone export must not redirect to or link to repository install pages.');
  }
  console.log('standalone: omitted repository install redirect and launcher.');
}

// --- 5. every asset the bundle asks for must exist --------------------------
const bundleSource = fs.readFileSync(path.join(dist, '_expo', 'static', 'js', 'web', bundleName), 'utf8');
const assetUrls = new Set(
  (bundleSource.match(/"(?:\.\/|\/)?assets\/[A-Za-z0-9@._/\[\]#+-]+"/g) ?? []).map((value) =>
    value.slice(1, -1).replace(/^\.?\//, '')
  )
);
// Metro copies hashed assets into dist/assets/**, but the app's own artwork
// (icon, splash, favicon) is referenced by bare name from the app config and is
// never emitted — those three used to 404 on the site and inside the APK. Copy
// them across when the bundle asks for them.
const appAssetDirectory = path.join(process.cwd(), 'assets');
const repaired = [];
const missing = [];
for (const url of assetUrls) {
  const target = path.join(dist, url);
  if (fs.existsSync(target)) continue;
  const candidate = path.join(appAssetDirectory, path.basename(url));
  if (fs.existsSync(candidate)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(candidate, target);
    repaired.push(url);
  } else {
    missing.push(url);
  }
}
if (repaired.length) {
  console.log(`assets: copied ${repaired.length} app asset(s) the bundler does not emit: ${repaired.join(', ')}`);
}
if (missing.length) {
  console.error(
    `\nExport blocked: ${missing.length} asset file(s) requested by the app are missing from dist/.\n` +
      'The root site and /app build were not updated. Run the export again with app assets available:'
  );
  for (const url of missing.slice(0, 10)) console.error(`  - ${url}`);
  process.exit(1);
}
console.log(`assets: all ${assetUrls.size} referenced asset files are present in the export.`);

// --- 6. keep both Vercel entry paths on the same fresh app build ------------
if (!standalone && (await pathExists(path.join(repoRoot, '.git')) || await pathExists(path.join(repoRoot, 'vercel.json')))) {
  // The root host page deliberately loads assets from /app/_expo and /app/assets
  // so existing Vercel cache rules remain safe. Keep that static tree in sync;
  // otherwise a fresh HTML shell can silently execute an old JavaScript bundle.
  const appOutput = path.join(repoRoot, 'app');
  await fs.promises.rm(appOutput, { recursive: true, force: true });
  await fs.promises.cp(dist, appOutput, { recursive: true });
  console.log(`synced ${path.relative(process.cwd(), appOutput)} with this app export.`);

  const rootPage = path.join(repoRoot, 'index.html');
  await writeRootAppPage(dist, { destination: rootPage });
  console.log(`wrote ${path.relative(process.cwd(), rootPage)} (the site root serves this app build).`);
}
