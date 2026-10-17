# EcoTrek 1.3.0 validation

> Historical 1.3.0 record only. The current source removes the user-facing assistant, Grok/Puter sign-in, and chatbot UI described below. Do not use this document as the current feature list or as proof that the present APK has been rebuilt.

Updated **14 October 2026**. This describes the checked-in web export and direct-download WebView APK, not a Play Store/native-EAS release.

## What changed

- Start uses the two approved AI-generated transparent hiker/cyclist cutouts. The large illustration above the pickers is removed. Selection is explicit visually and through `aria-checked`.
- A broadleaf tree icon replaces the triangular silhouette. Home, Start and More have a contrasting green active pill, sized to fit small screens and large text.
- One branching, textured oak grows continuously through six stages; every care unit, including the last, changes its geometry. Water/light/nutrient effects and ambient motion respect reduced-motion settings. Preview/replay does not spend gems. Care and new-seed actions share a serialized queue; existing care costs/reward rates are unchanged. Partial/interrupted saves are normalized.
- Tracking reserves about two-thirds of its main content area for the map, with a horizontal split on desktop/short landscape screens. Stats scroll separately; pause and stop remain reachable.
- Website/WebView maps use bundled Leaflet 1.9.4 and OpenStreetMap tiles without a browser key. Route/current/accuracy/start markers, follow, drag, zoom and recenter are implemented. Tile failure switches to a clearly labelled route-only view with retry; GPS recording is independent of tile availability. Attribution and ordinary browser caching are preserved; there is no prefetch/bulk tile download.
- Puter.js is pinned to 2.6.4, bundled on the same origin, and transpiled to the same Chrome 60 floor as the app. It loads lazily on Assistant. The default Grok alias is `x-ai/grok-4.7`; an optional paid xAI-key preset is separate from Groq.
- Connect opens Puter authentication synchronously from the user gesture, then sends a test chat request. Connected/Grok source labels require a successful model response. SDK, auth and chat waits are bounded; blocked/cancelled popups, quota, timeout and network failures are surfaced. Local trail answers are never presented as Grok responses.
- The Android shell supports a user-gesture-only child auth WebView so `window.opener`/`postMessage` can return the Puter result. Java reference and shipped smali are both updated. The child has no app JavaScript bridge or asset interceptor, disallows file/content access and mixed content, and is destroyed on dismissal.

## Automated checks completed

| Check | Result |
| --- | --- |
| `cd EcoTrek && npm run verify` | Strict TypeScript/no-unused checks, **110 logic tests + 145 render/flow tests (10 Jest suites)** passed. |
| `cd EcoTrek && npm run test:web` | **12 Chromium browser tests** passed against the exported app served by `serve-site.mjs`. |
| `node --test tests/*.test.mjs` | **2 site tests** passed: deep links/local assets/SDK and APK download bytes/headers/release facts. |
| `python -m unittest discover -s android-shell/tests -p 'test_*.py'` | **4 tests** passed: signer regressions and Java/smali popup security/transport contracts. |
| Web export | App/vendor SDK compiled; all 11 referenced app asset URLs present; vendor notices bundled. |
| Signed APK | Smali/resources assembled. Independent v1/v2/v3 signature, content-digest, certificate-agreement, web-asset and 4-byte-alignment checks passed. |

Browser coverage includes:

- Correct selected cutouts, active Home/Start/More and Walk/Bike switching.
- Care/charging, visible first **and final** care growth, stage advancement, reload persistence, free preview, and archiving a grown tree to start again.
- Tracking at **320×568, 390×844, 568×320 and 1280×800** with pause/resume, reachable stop and map sizing.
- Tile failure/retry and a **mocked** successful tile response.
- The **actual bundled** Puter SDK loading under root and `/app/` entry paths, including the older-WebView `crypto.randomUUID` polyfill.
- The actual SDK attempting its Puter auth child window with an opener, and correctly reporting cancellation. The remote auth page was deliberately blocked; this is **not** a completed sign-in.
- Controlled SDK success, quota error, single-tap retry and correct AI/on-device source labels. Chat responses in this test are **mocked**.
- Dark mode/large text. Separate visual inspection confirmed the approved art fits, tree/forest completion, readable compact-landscape stats, and no page errors on the reviewed screens.

At 390×844, the tracking map measures **366×504 at (12,56)**, about 64% of the area below the header (about two-thirds after layout gaps). In 568×320 landscape it is **357×252**, about two-thirds of content width after gaps.

Tests can use `ECOTREK_BASE_URL` for a different preview and `ECOTREK_CHROMIUM_PATH` for an installed Chromium executable. Otherwise run `npx playwright install chromium`. Export and sync to `app/` before browser tests; the Android build script does both by default. Test fixtures never ship as application data.

## Release artifact

| | Value |
| --- | --- |
| File | `downloads/ecotrek.apk` |
| Version | **1.3.0 / code 5** |
| Size | **2,793,736 bytes** |
| SHA-256 | `d56443ae307aa7efceea471a8eff4f3dd5108212d633f7f1cc04b5962463fe24` |
| Certificate SHA-256 | `74005b52c140cd4b45a1adb0e95ce31ea30e82b4e6db20197dc0c889901726d3` (unchanged) |
| Android | minSdk 24; targetSdk 34; v1 + v2 + v3 signatures |

`downloads/ecotrek-apk.json`, checksum file, `site-config.js` and install-page fallback facts match this artifact. All exported files, including the selected PNGs and pinned SDK/notices, were compared byte-for-byte with the APK assets.

## Still requires a real device / authenticated network

The sandbox cannot reach Puter's auth/chat service or OpenStreetMap tiles, and no Android hardware/emulator or Puter account was used. **Do not describe mocks, catalogue support, SDK readiness or signature verification as a successful live Grok/GPS test.**

- [ ] On the deployed HTTPS website, connect a real Puter account and verify a test reply plus a custom question/follow-up. Check account credits/limits, cancellation, blocked popup, timeout and retry.
- [ ] Install this APK as an update over the previous signed build; confirm local progress survives. Complete Puter sign-in inside its actual child WebView and verify a real chat reply, dismiss/back and app resume. Native assembly/source-contract checks do not prove Android runtime behavior.
- [ ] With real OSM access, check tiles, location marker/accuracy, route line, zoom, drag/follow/recenter and rotation. Separately disable network and revoke location; errors should remain distinct and no distance should be invented.
- [ ] Record/save an outdoor walk on Android and Safari with location enabled. Keep the WebView/web app foregrounded; background GPS is not guaranteed by this package.
- [ ] Check care/forest persistence after force-close on the target phone, reduced motion, device text sizes and low-end WebView performance.

Larger deployments must review OSM tile-service usage terms and choose an appropriate tile provider. Separate native Android/EAS maps still require a restricted Google Maps Android key; that is not a requirement for this website or WebView APK.
