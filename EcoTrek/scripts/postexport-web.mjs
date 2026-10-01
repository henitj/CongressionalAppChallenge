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
 *
 * Run automatically by `npm run export:web`.
 */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const indexPath = path.join(dist, 'index.html');

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
