# Release and deployment checklist

This is a checklist, not evidence that an item has been completed. Recheck the actual build and deployment before describing it as released.

## Website deployment

- [ ] Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run verify` from `EcoTrek/`.
- [ ] Run `node --test tests/*.test.mjs` from the repository root.
- [ ] Run `npm run export:web` from `EcoTrek/`; confirm the root `index.html` and `/app/` static tree come from the same export.
- [ ] Run the browser suite against the generated site and inspect a small phone, a standard phone, and a desktop/tablet viewport.
- [ ] Deploy to a preview URL. Confirm `/` opens the app directly on desktop and mobile, `/app/` is the same app, and `/privacy` loads the privacy policy.
- [ ] Confirm no platform chooser, install pages, API landing page, or user-facing chatbot is in the launch flow. `/download` should return the APK file directly only when that artifact is current and intended for distribution.

## Privacy and provider checks

- [ ] Review and publish the privacy policy at `/privacy` before collecting real user data.
- [ ] Confirm no secrets are in `EXPO_PUBLIC_*` variables or the web bundle.
- [ ] Confirm that background location is not requested in the website or WebView app; test foreground permission denial and recovery.
- [ ] From intended launch regions, test OpenStreetMap/Overpass trail search, map tiles, Wikimedia Commons photos, and weather services. Public providers can have coverage gaps, rate limits, outages, and their own retention practices.
- [ ] Check that a failed live trail search remains retryable and does not substitute Austin or another city.
- [ ] If an optional EcoTrek API is enabled, review its CORS, secrets, authentication, database access, logs, retention, and rate limits. Do not claim account-backed cloud sync for the local-profile app without implementing and testing a supported sign-in flow.
- [ ] Leave optional server-side trail-intelligence disabled unless the configured model provider, cost controls, input fields, and retention policy have been reviewed. It is not a chat feature.

## Android sideload package

- [ ] Rebuild with `APKTOOL=/path/to/apktool.jar android-shell/build.sh` after the web export is final. A previous APK is not automatically updated when source changes.
- [ ] Verify `downloads/ecotrek.apk` with `android-shell/tools/validate_apk.py`; compare its size, SHA-256, version, and signing certificate with the generated release metadata.
- [ ] Install over the previous signed build on a physical Android device. Check location permission and retry, route tracking, photo picker, map fallback, tree progress, text sizing, and Back navigation.
- [ ] Ensure the APK contains the same current web bundle as the root site; successful assembly/signature checks do not prove device behavior.
- [ ] Clearly distinguish a sideload APK from a Google Play release. Sideload warnings are expected for a privately signed artifact.

## Optional app-store release

- [ ] Confirm the publisher account, public developer name, support contact, and app ownership.
- [ ] Prepare current screenshots, feature graphic, short/full descriptions, and accessibility review.
- [ ] Complete Play Console privacy/data-safety, content-rating, target-audience, and app-access forms from the actual submitted build and current policy guidance.
- [ ] Build the native EAS application separately; the repository WebView APK is not a Play Store build.
- [ ] Test the production candidate on physical hardware, distribute to internal testers first, and record the demo from the tested build.
- [ ] Verify the official Congressional App Challenge deadline for the relevant district; it is separate from the Play Store schedule.

## Current product boundaries

- The repository root launches the web app directly; there are no Apple/Android/API landing pages in the app launch flow.
- The current app uses local guest profiles by default and has no Google sign-in or user-facing Grok/AI chatbot.
- Trail discovery is global OpenStreetMap/Overpass lookup, with the bundled Austin catalogue limited to the Austin area. International coverage depends on mapped data and provider availability.
- Trail photos are sourced from Wikimedia Commons when available; local illustrations remain as fallback.
- Trail sharing uses the system share sheet and focuses on the selected trail.
- Tree growth is a local virtual-tree mechanic. First-use onboarding previews growth through the oldest sage stage; illustration-image counts are not shown.
- Weather, route, map, trail and photo data can be stale or incomplete. Check official local sources before going outdoors.

Last reviewed: **17 October 2026**.
