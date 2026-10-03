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
 *   5. Writes the repository-root page — the same app, served from "/" — so
 *      the website front door *is* the app instead of a landing page.
 *   6. Checks that every asset the bundle asks for exists in the export; a
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
await patchIndexHtml(dist, { bundleName, polyfillsName: polyfills.name });
console.log(`compat: polyfills ${polyfills.name} (${polyfills.bytes.toLocaleString()} bytes), splash + watchdog injected.`);

// --- 5. the website front door is the app ----------------------------------
const rootPage = path.join(repoRoot, 'index.html');
if (await pathExists(path.join(repoRoot, '.git')) || await pathExists(path.join(repoRoot, 'vercel.json'))) {
  await writeRootAppPage(dist, { destination: rootPage });
  console.log(`wrote ${path.relative(process.cwd(), rootPage)} (the site root serves this app build).`);
}

// --- 6. every asset the bundle asks for must exist --------------------------
const bundleSource = fs.readFileSync(path.join(dist, '_expo', 'static', 'js', 'web', bundleName), 'utf8');
const assetUrls = new Set(
  (bundleSource.match(/"(?:\.\/|\/)?assets\/[A-Za-z0-9@._/\[\]#+-]+"/g) ?? []).map((value) =>
    value.slice(1, -1).replace(/^\.?\//, '')
  )
);
const missing = [...assetUrls].filter((url) => !fs.existsSync(path.join(dist, url)));
if (missing.length) {
  console.warn(
    `\nWarning: ${missing.length} asset file(s) the bundle requests are missing from dist/.\n` +
      'They will 404 on the website and inside the APK. Run the export again from a machine\n' +
      'with node_modules installed (the bundler copies these files into dist/assets/):'
  );
  for (const url of missing.slice(0, 10)) console.warn(`  - ${url}`);
} else {
  console.log(`assets: all ${assetUrls.size} referenced asset files are present in the export.`);
}
