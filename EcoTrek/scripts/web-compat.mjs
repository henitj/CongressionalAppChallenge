/*
 * Web compatibility pass for the Expo web export.
 *
 * Metro emits JavaScript for a modern browser. The Android build, however,
 * runs the very same export inside an Android System WebView, and a WebView is
 * only as new as the last update the device installed: a stock Android 8 phone
 * ships WebView 60, a never-updated Android 12 phone ships WebView 93. On those
 * engines the app can fail to start and leaves a white page behind.
 *
 * This module does three things to `dist/`, and postexport-web.mjs runs it
 * after every export:
 *
 *   1. transpiles the app bundle down to ES2017-era syntax (Babel, targeting
 *      Chrome 60) and re-minifies it (terser), under a fresh content hash;
 *   2. copies scripts/web-polyfills.js in as a separate ES5 prelude that fills
 *      the runtime gaps Babel cannot transpile (Array.prototype.at,
 *      Object.hasOwn, crypto.randomUUID, ResizeObserver, ...);
 *   3. injects a self-contained ES5 splash + watchdog into index.html, so a
 *      bundle that ever fails to boot shows a branded explanation with a
 *      "Try again" button instead of an empty white screen.
 *
 * It also writes the repository-root app page (the site's front door) from the
 * finished export index.html, so the website and the APK can never drift.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

/** Android System WebView 60 == Chrome 60: the floor we build against. */
export const COMPAT_TARGETS = { chrome: '60' };

const SPLASH_ID = 'ecotrek-splash';
const BOOTSTRAP_MARKER = 'ecotrek-bootstrap';

const SPLASH_STYLE = `<style id="${BOOTSTRAP_MARKER}-style">
  /* Shown until React paints, and if it never does. Inline on purpose: it must
     work even when every external request fails. */
  #${SPLASH_ID} {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 24px;
    color: #103024;
    background: linear-gradient(160deg, #eaf7e6 0%, #fbfaf5 55%, #dfefe0 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    text-align: center;
    transition: opacity .32s ease;
  }
  #${SPLASH_ID}.ecotrek-splash-hidden { opacity: 0; pointer-events: none; }
  #${SPLASH_ID} svg { width: 74px; height: 74px; }
  #${SPLASH_ID} strong { font-size: 27px; font-weight: 700; letter-spacing: -.03em; }
  #${SPLASH_ID} small { max-width: 330px; color: #52655b; font-size: 13px; line-height: 1.55; }
  #${SPLASH_ID} .ecotrek-spinner {
    width: 22px; height: 22px; margin-top: 4px;
    border: 3px solid rgba(23, 104, 72, .22);
    border-top-color: #176848;
    border-radius: 50%;
    animation: ecotrek-spin .9s linear infinite;
  }
  #${SPLASH_ID} button {
    min-height: 46px; padding: 0 22px; margin-top: 6px;
    border: 0; border-radius: 12px;
    color: #fff; background: #0d4832;
    font: inherit; font-weight: 700; cursor: pointer;
  }
  #${SPLASH_ID} button[hidden] { display: none; }
  @keyframes ecotrek-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    #${SPLASH_ID} .ecotrek-spinner { animation-duration: 2.4s; }
  }
</style>`;

const SPLASH_MARKUP = `<div id="${SPLASH_ID}" role="status" aria-live="polite">
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="30" fill="#dff7d7"></circle>
    <path d="M32 12l11 17h-7l8 12H20l8-12h-7z" fill="#176848"></path>
    <rect x="29.5" y="40" width="5" height="12" rx="2.5" fill="#0d4832"></rect>
  </svg>
  <strong>EcoTrek</strong>
  <small id="${SPLASH_ID}-note">Getting your forest ready…</small>
  <span class="ecotrek-spinner" aria-hidden="true"></span>
  <button type="button" id="${SPLASH_ID}-retry" hidden>Try again</button>
</div>`;

const BOOTSTRAP_SCRIPT = `<script id="${BOOTSTRAP_MARKER}">
/* EcoTrek boot watchdog — ES5, no dependencies.
   Records startup failures, hides the splash once React paints, and after a
   grace period replaces the splash with something a person can act on. */
(function () {
  var splash = document.getElementById('${SPLASH_ID}');
  if (!splash) return;
  var note = document.getElementById('${SPLASH_ID}-note');
  var retry = document.getElementById('${SPLASH_ID}-retry');
  var spinner = splash.querySelector('.ecotrek-spinner');
  var problems = [];
  var hidden = false;

  function record(message) {
    if (!message) return;
    for (var i = 0; i < problems.length; i += 1) {
      if (problems[i] === message) return;
    }
    problems.push(message);
  }

  window.addEventListener('error', function (event) {
    var target = event && event.target;
    if (target && target.tagName === 'SCRIPT') {
      record('The app bundle could not be loaded (' + (target.getAttribute('src') || '') + ').');
    } else if (event && event.message) {
      record(event.message);
    }
  }, true);

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason;
    record('Unhandled error: ' + ((reason && (reason.message || reason)) || 'unknown'));
  });

  function rootHasContent() {
    var root = document.getElementById('root');
    return !!(root && root.childElementCount > 0);
  }

  function hide(immediately) {
    if (hidden) return;
    hidden = true;
    splash.className = 'ecotrek-splash-hidden';
    window.setTimeout(function () {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, immediately ? 0 : 360);
  }

  function giveUp(detail) {
    if (hidden) return;
    if (spinner) spinner.style.display = 'none';
    var lines = [];
    if (!window.Promise || !window.Map || !window.Symbol) {
      lines.push('This phone\\u2019s web viewer is too old to run EcoTrek. Update "Android System WebView" (or Chrome) in your app store, then try again.');
    } else {
      lines.push(detail || 'EcoTrek could not finish starting.');
      lines.push('Close the app completely and open it again. If it keeps happening, update your web viewer and tell us at ecotrek.support@gmail.com.');
    }
    if (problems.length) lines.push('Details: ' + problems.slice(0, 2).join(' '));
    if (note) note.textContent = lines.join(' ');
    if (retry) retry.hidden = false;
  }

  if (retry) {
    retry.onclick = function () {
      retry.hidden = true;
      if (spinner) spinner.style.display = '';
      if (note) note.textContent = 'Trying again\\u2026';
      hidden = false;
      window.location.reload();
    };
  }

  var started = Date.now();
  var interval = window.setInterval(function () {
    if (hidden) {
      window.clearInterval(interval);
      return;
    }
    if (rootHasContent()) {
      window.clearInterval(interval);
      hide(false);
      return;
    }
    var elapsed = Date.now() - started;
    if (elapsed > 4000 && note && !problems.length) {
      note.textContent = 'Still starting. Slow devices and first launches can take a few seconds.';
    }
    if (elapsed > 15000) {
      window.clearInterval(interval);
      giveUp(problems.length ? null : 'EcoTrek did not finish starting.');
    }
  }, 200);
})();
</script>`;

/*
 * Android visitors to the public app pages get moved to the install guide:
 * they came for an app, and a browser tab is not the same thing. It runs in
 * <head>, before the first paint, and it steps aside for
 *   - the APK itself (virtual origin), where there is nothing to install;
 *   - "?web=1" and the cookie it sets, i.e. "I want the browser version";
 *   - an installed PWA (display-mode: standalone), which would otherwise be
 *     sent to the install page on every single launch.
 */
const APP_REDIRECT_SCRIPT = `<script id="ecotrek-redirect">
(function () {
  if (location.hostname === 'appassets.ecotrek.app') return;
  if (location.protocol === 'file:') return;
  var roots = ['/', '/index.html', '/app', '/app/'];
  if (roots.indexOf(location.pathname) === -1) return;

  if (/(?:^\\?|&)web=1(?:&|$)/.test(location.search)) {
    try {
      document.cookie = 'ecotrek_web=1; path=/; max-age=31536000; SameSite=Lax';
    } catch (error) {
      /* cookies blocked: the query string still works for this visit */
    }
    if (window.history && history.replaceState) history.replaceState(null, '', location.pathname);
    return;
  }
  if (/(?:^|;\\s*)ecotrek_web=1/.test(document.cookie)) return;
  try {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;
  } catch (error) {
    /* no matchMedia: fall through and offer the install page */
  }
  if (/Android/i.test(navigator.userAgent)) location.replace('/install/android.html');
})();
</script>`;

/*
 * The site bar: a slim strip at the bottom of the public app pages with the
 * three things the app itself cannot show — the Android install guide, the
 * iPhone/iPad guide and the AI-key walkthrough — plus a dismiss button.
 *
 * It is a *bar*, not a floating pill, on purpose. The app owns the whole
 * viewport, and anything floating over it covers a tab, a button or (on the
 * sign-in screen) a line of text. This reserves its own height instead: the
 * app is laid out above it, so nothing overlaps anything.
 *
 * It is switched off inside the Android APK, where the app is served from the
 * virtual origin https://appassets.ecotrek.app.
 */
const LAUNCHER_STYLE = `<style id="ecotrek-launcher-style">
  html.ecotrek-launcher-open { padding-bottom: calc(50px + env(safe-area-inset-bottom, 0px)); box-sizing: border-box; }
  html.ecotrek-launcher-open body { box-sizing: border-box; }
  #ecotrek-launcher {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2147483000;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 50px;
    padding: 6px 10px calc(6px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid rgba(16, 35, 25, .12);
    background: rgba(255, 253, 248, .97);
    box-shadow: 0 -6px 18px rgba(13, 72, 50, .08);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-sizing: border-box;
  }
  #ecotrek-launcher[hidden] { display: none; }
  #ecotrek-launcher .ecotrek-launcher-label {
    flex: none;
    color: #52655b;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  #ecotrek-launcher .ecotrek-launcher-links {
    display: flex;
    flex: 1 1 auto;
    gap: 6px;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }
  #ecotrek-launcher .ecotrek-launcher-links::-webkit-scrollbar { display: none; }
  #ecotrek-launcher a {
    flex: none;
    padding: 7px 12px;
    border-radius: 999px;
    color: #0d4832;
    background: rgba(23, 104, 72, .08);
    font-size: 13px;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
  }
  #ecotrek-launcher a:hover { background: rgba(23, 104, 72, .15); }
  #ecotrek-launcher a:focus-visible,
  #ecotrek-launcher-close:focus-visible { outline: 3px solid rgba(13, 72, 50, .55); outline-offset: 2px; }
  #ecotrek-launcher-close {
    flex: none;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 50%;
    color: #52655b;
    background: rgba(16, 35, 25, .06);
    font: inherit;
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
  }
  #ecotrek-launcher-close:hover { background: rgba(16, 35, 25, .12); }
  @media (max-width: 560px) {
    #ecotrek-launcher { gap: 8px; padding-left: 8px; }
    #ecotrek-launcher .ecotrek-launcher-label { display: none; }
    #ecotrek-launcher a { padding: 7px 10px; font-size: 12.5px; }
  }
</style>`;

const LAUNCHER_MARKUP = `<div id="ecotrek-launcher" hidden>
  <span class="ecotrek-launcher-label">EcoTrek</span>
  <div class="ecotrek-launcher-links">
    <a href="/install/android.html">Android app</a>
    <a href="/install/ios.html">iPhone &amp; iPad</a>
    <a href="/api-key.html">AI key</a>
  </div>
  <button type="button" id="ecotrek-launcher-close" aria-label="Hide this bar" title="Hide this bar">&#215;</button>
</div>
<script id="ecotrek-launcher-script">
(function () {
  // Inside the Android build the page is served from the app's own virtual
  // origin; there is nothing to install and nothing to explain.
  if (location.hostname === 'appassets.ecotrek.app') return;
  if (location.protocol === 'file:') return;

  var bar = document.getElementById('ecotrek-launcher');
  if (!bar) return;
  var storageKey = 'ecotrek.launcher.dismissed';
  try {
    if (window.localStorage && localStorage.getItem(storageKey) === '1') return;
  } catch (error) {
    /* private mode: show it anyway */
  }

  // Reserving the space is what keeps the bar off the app's own controls: the
  // app is laid out above it instead of underneath it.
  document.documentElement.className += ' ecotrek-launcher-open';
  bar.hidden = false;

  var close = document.getElementById('ecotrek-launcher-close');
  if (close) {
    close.onclick = function () {
      bar.hidden = true;
      document.documentElement.className = document.documentElement.className.replace(/\s*ecotrek-launcher-open/, '');
      try {
        localStorage.setItem(storageKey, '1');
      } catch (error) {
        /* ignore */
      }
    };
  }
})();
</script>`;

function hash(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 32);
}

async function readOrNull(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }
}

/** Load Babel/terser lazily so the rest of the build works without them. */
async function loadTooling() {
  const [{ transformSync }, presetEnv, terser] = await Promise.all([
    import('@babel/core'),
    import('@babel/preset-env'),
    import('terser'),
  ]);
  return { transformSync, presetEnv: presetEnv.default ?? presetEnv, terser };
}

/** The splash + watchdog markup, shared by every generated page. */
export function bootstrapMarkup() {
  return `${SPLASH_STYLE}\n${LAUNCHER_STYLE}\n${SPLASH_MARKUP}\n${LAUNCHER_MARKUP}\n${BOOTSTRAP_SCRIPT}`;
}

/**
 * Transpile and re-minify every web bundle in the export.
 * Returns the list of files that were written.
 */
export async function transpileBundles(distDirectory, { targets = COMPAT_TARGETS, dryRun = false } = {}) {
  const webDirectory = path.join(distDirectory, '_expo', 'static', 'js', 'web');
  let entries;
  try {
    entries = await fs.readdir(webDirectory);
  } catch {
    return { written: [], skipped: 'no web bundle directory' };
  }

  const bundles = entries.filter((name) => name.endsWith('.js') && !name.startsWith('ecotrek-polyfills'));
  if (!bundles.length) return { written: [], skipped: 'no web bundle' };

  const { transformSync, presetEnv, terser } = await loadTooling();
  const written = [];

  for (const name of bundles) {
    const source = await fs.readFile(path.join(webDirectory, name), 'utf8');
    const transformed = transformSync(source, {
      babelrc: false,
      configFile: false,
      compact: true,
      comments: false,
      sourceType: 'script',
      // Deliberately minimal options: `bugfixes`, `loose` and friends were
      // removed in Babel 8, and none of them matter for a target this old.
      presets: [[presetEnv, { targets, modules: false }]],
    });
    if (!transformed || typeof transformed.code !== 'string') {
      throw new Error(`Babel returned no code for ${name}`);
    }
    const minified = await terser.minify(transformed.code, {
      ecma: 2015,
      compress: true,
      mangle: true,
      format: { comments: false },
    });
    if (minified.error) throw minified.error;
    if (typeof minified.code !== 'string' || !minified.code.length) {
      throw new Error(`terser returned no code for ${name}`);
    }

    const outputName = `index-${hash(minified.code)}.js`;
    if (!dryRun) await fs.writeFile(path.join(webDirectory, outputName), minified.code);
    if (outputName !== name && !dryRun) await fs.rm(path.join(webDirectory, name), { force: true });
    written.push({
      originalName: name,
      name: outputName,
      bytesBefore: Buffer.byteLength(source),
      bytesAfter: Buffer.byteLength(minified.code),
    });
  }

  return { written };
}

/** Copy the ES5 polyfill prelude into the export under a content hash. */
export async function writePolyfills(distDirectory, { dryRun = false } = {}) {
  const webDirectory = path.join(distDirectory, '_expo', 'static', 'js', 'web');
  const source = await fs.readFile(path.join(scriptDirectory, 'web-polyfills.js'), 'utf8');
  const name = `ecotrek-polyfills-${hash(source)}.js`;
  if (!dryRun) {
    await fs.mkdir(webDirectory, { recursive: true });
    await fs.writeFile(path.join(webDirectory, name), source);
    for (const existing of await fs.readdir(webDirectory)) {
      if (existing.startsWith('ecotrek-polyfills-') && existing !== name) {
        await fs.rm(path.join(webDirectory, existing), { force: true });
      }
    }
  }
  return { name, bytes: Buffer.byteLength(source) };
}

/**
 * Rewrite index.html: swap in the compat bundle + polyfills and inject the
 * splash/watchdog. Idempotent — re-running an export replaces what it finds.
 */
export async function patchIndexHtml(distDirectory, { bundleName, polyfillsName, dryRun = false } = {}) {
  const htmlPath = path.join(distDirectory, 'index.html');
  let html = await fs.readFile(htmlPath, 'utf8');

  html = html.replace(/^\s*<script[^>]*id="ecotrek-bootstrap"[\s\S]*?<\/script>\n?/m, '');
  html = html.replace(/^\s*<script[^>]*id="ecotrek-launcher-script"[\s\S]*?<\/script>\n?/m, '');
  html = html.replace(/^\s*<script[^>]*id="ecotrek-redirect"[\s\S]*?<\/script>\n?/m, '');
  html = html.replace(/^\s*<style id="ecotrek-(bootstrap|launcher)-style"[\s\S]*?<\/style>\n?/gm, '');
  html = html.replace(/^\s*<div id="ecotrek-splash"[\s\S]*?\n<\/div>\n?/m, '');
  html = html.replace(/^\s*<div id="ecotrek-launcher"[\s\S]*?\n<\/div>\n?<script id="ecotrek-launcher-script"[\s\S]*?<\/script>\n?/m, '');

  // Any previous bundle tag is replaced, whatever it is called.
  // Every previous bundle/polyfill tag goes, not just the first one: re-running
  // the export must never leave two copies of the app on the page (they would
  // both execute). The current pair is injected where the first one stood.
  const tagSource = '<script src="[^"]*_expo\\/static\\/js\\/web\\/[^"]+\\.js" defer><\\/script>\\n?';
  const firstTag = html.search(new RegExp(tagSource));
  if (firstTag === -1) {
    throw new Error('index.html has no web bundle script tag to replace');
  }
  const tags = [
    `<script src="/_expo/static/js/web/${polyfillsName}" defer></script>`,
    `<script src="/_expo/static/js/web/${bundleName}" defer></script>`,
    '',
  ].join('\n');
  html = html.slice(0, firstTag) + tags + html.slice(firstTag).replace(new RegExp(tagSource, 'g'), '');

  html = html.replace('</head>', `${SPLASH_STYLE}\n${LAUNCHER_STYLE}\n${APP_REDIRECT_SCRIPT}\n</head>`);
  html = html.replace('<body>', `<body>\n    ${SPLASH_MARKUP}\n    ${LAUNCHER_MARKUP}`);
  html = html.replace('</body>', `${BOOTSTRAP_SCRIPT}\n</body>`);

  if (!dryRun) await fs.writeFile(htmlPath, html);
  return html;
}

/**
 * Write the repository-root page: the same app, addressed from `/` instead of
 * `/app/`, so the website *is* the app. Asset URLs are re-pointed at the
 * export directory (which stays the single source of truth) and the site's
 * launcher links are added for the pages the app does not contain.
 */
/*
 * Tags that only make sense on the public site: an iPhone Home Screen
 * installation should get the app icon and open without Safari's chrome, and
 * the manifest lets Android/desktop browsers offer the same thing. The manifest
 * asks for "?web=1" so an installed copy never gets sent to the install guide.
 */
const SITE_HEAD_TAGS = `<meta name="theme-color" content="#102319">
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="apple-touch-icon" href="/EcoTrek/assets/icon.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="EcoTrek">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">`;

export function toRootAppPage(exportHtml) {
  return exportHtml
    .replace('</head>', `  ${SITE_HEAD_TAGS}\n  </head>`)
    .replace(/(["'(])\/_expo\//g, '$1/app/_expo/')
    .replace(/(["'(])\/favicon\.ico/g, '$1/app/favicon.ico')
    .replace(/(["'(])\/metadata\.json/g, '$1/app/metadata.json')
    .replace(
      /<title>([^<]*)<\/title>/,
      '<title>$1</title>\n    <!-- ecotrek-app-host: written by EcoTrek/scripts/postexport-web.mjs — edit the script, not this file -->'
    );
}

/** Write dist/index.html's application to the repository root, if asked. */
export async function writeRootAppPage(distDirectory, { destination, dryRun = false } = {}) {
  if (!destination) return { written: false };
  const html = await fs.readFile(path.join(distDirectory, 'index.html'), 'utf8');
  const page = toRootAppPage(html);
  if (!dryRun) await fs.writeFile(destination, page);
  return { written: true, destination, bytes: Buffer.byteLength(page) };
}

export async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export { readOrNull };
