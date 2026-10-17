# EcoTrek 1.6.0

**Release candidate prepared:** 17 October 2026

**Android version code:** 8
**iOS build number:** 3

## Product changes

- The repository root and Vercel route now enter the EcoTrek app directly. The former Android/iOS/API/assistant landing pages and user-facing Grok chat flow are removed; optional bounded trail enrichment remains server-side.
- Trail discovery uses the visitor’s coordinates for worldwide OpenStreetMap/Overpass lookup. The bundled Austin catalogue is limited to the Austin area; a failed or denied lookup does not silently substitute Austin, leaves saved trails available, and can be retried.
- Trail detail and sharing focus on the selected trail, with browsable photo groups and concise route details.
- Tree onboarding introduces real-time growth through the oldest sage stage, then continues into the weekly-care experience. Illustration counts are not shown; free stage previews do not alter real tree progress.
- Updates tighten input sizing and onboarding/navigation transitions, reduce visual clutter, and keep tracking controls usable at compact and landscape layouts.

## Verification completed

- `EcoTrek/npm run verify`: TypeScript/no-unused checks, **126/126** logic tests, and **11 Jest suites / 187 tests** passed.
- `EcoTrek/npm run export:web`: completed; root `index.html` and `/app/` were synchronized from the same export. The build reported all 151 referenced asset files present.
- Root `node --test tests/*.test.mjs`: **2/2** website and direct-download tests passed.
- `EcoTrek/server/npm run pentest`: **51 passed, 0 failed**, including public trail-intel rate limiting.
- Android-shell Python tests: **4/4** passed. APK rebuild completed; signature verification passed for APK v1/v2/v3, all 151 referenced web assets were found, and alignment/resource checks passed.
- `android-shell/tools/validate_apk.py downloads/ecotrek.apk`: all checks passed.
- `git diff --check`: passed.

## Android artifact

The rebuilt direct-download artifact is `downloads/ecotrek.apk` (8,608,698 bytes, SHA-256 `091bf0de26c4f99793fe6f8500911354f1f342d6f1904aec71133f5bdef8ebc1`). Its generated metadata and checksum are `downloads/ecotrek-apk.json` and `downloads/ecotrek.apk.sha256`; installation is not a substitute for the device testing below.

## Not verified in this environment

A Playwright browser smoke test was attempted, but the browser process could not start because this environment lacks the system library `libnspr4.so`; the full browser suite has **not** run. Thus the authored cross-viewport, international OSM, provider-failure/retry, and interaction tests have not been executed here, and no browser screenshots were inspected. Physical Android/iOS behavior, production Vercel routing, live third-party provider availability/coverage, and production backend/database configuration were also not tested. Before public distribution, run the browser suite in an environment with Playwright’s supported browser dependencies, inspect phone/tablet/desktop layouts, deploy a Vercel preview, and exercise GPS, photos, maps, weather, sharing, onboarding, and text scaling on real devices in intended launch regions.
