# EcoTrek 1.4.0 validation

> Historical 1.4.0 record. The optional Assistant mentioned in that release was removed from the current source; this is not the present feature list or proof of a current APK rebuild.

Release date: **14 October 2026** (America/Chicago).
Android shell: **1.4.0 / versionCode 6**. Expo app configuration: 1.4.0 / Android code 6.

## What changed

- **Home:** explicit Home title plus the existing dark-green active tab; one main Start action, a quieter Explore action, compact conditions, a weekly summary and a tree row. The competing action wall and empty last-walk card are gone. Weather warnings remain visible. History, impact, goals, streak and other features remain reachable.
- **Trails:** a clearly-labelled offline Austin collection appears immediately, even before GPS. A validated, persistent catalogue restores previously discovered trails; without a real location fix it is labelled saved and distances are hidden. Austin's bundled rows and matching saved rows do not wait for background enrichment. Browser GPS can continue for 30 seconds after the initial four-second wait and updates the screen automatically. Stale coordinate responses cannot overwrite newer results. Overpass has one 12-second total monotonic-clock budget; geocoding and optional backend work run concurrently. Genuine cold discovery elsewhere still requires location and network coverage.
- **Trail details:** length, estimated time, climb, two-line summary, personal stars and Start appear first. Safety notes, full notes/amenities and photos are explicit disclosures. No automatic AI overview, AI spinner or trail AI floating button remains. The optional Assistant is still reachable from More; its truthful connection behavior is unchanged.
- **Ratings:** visible Rate trail links and five-star radio controls, editable and clearable. Writes are serialized, failures are shown rather than falsely reported saved, and the sheet does not automatically disappear on failure. Ratings are scoped to the local profile. Legacy device-wide ratings are claimed once by the current profile; account upgrades merge them non-destructively. Your highest rated sorts personal ratings, not unverified catalogue/community scores.
- **Tree:** ten original AI-painted botanical stage/season PNG assets replace the procedural adult oak. PNGs have transparent backgrounds and a common root baseline. Approved hiker/biker files are unchanged and also provide instant labelled trail illustrations.
- **Gems:** symmetric, centered emerald geometry with subtle facets. The lower tip is centered at x=12, not the old off-center tip.

## Real growth, not tap-to-age

A qualifying week needs a saved valid walk or ride of at least **0.1 mile and 60 seconds**, plus all three care actions. Water, sunlight and soil each cost **one gem**, once per local ISO/Monday week. Either care or the outing may happen first. A one-mile hike earns enough gems for the three weekly actions under the current reward rules.

| Stage | Minimum actual calendar age | Minimum qualifying weeks |
| --- | --- | ---: |
| Acorn | Planting day | 0 |
| Seedling | 14 local-calendar days | 2 |
| Sapling | 56 local-calendar days | 8 |
| Young | 6 calendar months | 26 |
| Full-grown | 12 calendar months **and** at least 365 local-calendar days | 52 |
| Old | 15 calendar months | 65 |
| Sage | 18 calendar months | 78 |

Both gates must be met; neither extra gems nor multiple activities in one week can buy age. Missed weeks pause earned-week accumulation, not established growth. Tree credit has a permanent compact weekly ledger independent of the one-year raw activity log. No independent pruning of its care/outdoor ledgers occurs.

Calendar anniversaries clamp shorter months and handle leap years. State normalization deduplicates valid in-range weeks. All tree mutations share one queue; storage failures retain prior state and return a care gem if its tree write fails. Initial planting date is saved immediately. This is an on-device calendar mechanic, **not server-grade clock/storage anti-cheat**.

Legacy instant-growth data had no planting date: gems and forest counters are preserved, along with the first previously paid care cycle, but no fabricated year-old birthday is granted. The new real-time calendar begins at migration. The explanation is in How your tree grows.

## Seasons and rewards

- Scenery follows the local calendar and hemisphere, not a live-weather claim. Without location it defaults to the northern hemisphere.
- Only full-grown/old/sage trees shed autumn leaves and switch to bare winter branches. Younger stages retain leaves while experiencing the seasonal background.
- Winter includes snow atmosphere for every age. Motion respects reduced-motion preferences, app background state and screen focus.
- A full-grown tree can collect **one golden apple per completed outdoor-care week**. Duplicate harvests are blocked; apples are cosmetic keepsakes and do not inflate the gem balance.
- Replanting is optional and only available at Sage. Confirmation archives that tree, keeps apples and begins a genuinely new planting date and weekly ledger.
- Life-stage illustrations are clearly labelled previews; no automatic time-lapse or age-changing control is shipped.
- These are virtual trees; EcoTrek does not plant real trees.

## Verification

- Strict TypeScript: `tsc --noEmit --noUnusedLocals --noUnusedParameters`.
- **124/124** plain logic tests.
- **174/174** Jest/render/provider tests across 12 suites, including calendar gates, real activity credit, rapid spending/harvest/replant, storage failure/refund, rating edits and profile isolation, cached catalogues and stale responses.
- **19/19** Playwright browser tests against the exported website. Includes cold offline trail browsing, visible persistent rating controls, delayed GPS without another retry, actual calendar birthday maturity, mature-only autumn shedding, young winter foliage/snow, free previews, sage/apple persistence, Home identity, preserved Start art and tracking map layout, small/desktop/landscape layouts, tile fallback/recovery, and truthful SDK connection behavior.
- Manual browser capture of 11 Home/trails/details/ratings/tree/season/dark-large-text states at 390×844 and 320×568: no page exceptions or horizontal overflow. Artwork inspection is implementation review, **not user approval**.
- **2/2** repository site-route/asset tests.
- **4/4** Python Android source/signing contract tests; APK v1/v2/v3 content signatures, shared certificate, referenced assets and alignment checks pass.
- All **34 files** in `app/` byte-match the APK's `assets/` payload. The website's app entry and APK therefore use the same export.

Browser network is blocked/mocked in these tests. The official locally bundled Puter SDK's popup destination/opener/cancellation is exercised; successful chat responses are simulated, not a real authenticated Grok call. **Physical Android runtime/GPS, live map tiles, live OSM results and authenticated Puter/Grok calls remain unverified here.**

## Artifact

- `downloads/ecotrek.apk`
- 4,329,400 bytes
- SHA-256: `0333df2460c8b2454544cfadd51eea5dd9370bf9346e4c7208de0fbc4708909a`
- Signing certificate SHA-256: `74005b52c140cd4b45a1adb0e95ce31ea30e82b4e6db20197dc0c889901726d3` (unchanged)
- minSdk 24 / targetSdk 34; schemes v1 + v2 + v3
- Exported app bundle: `index-3e4aa688ece0e354fe041a8b9dddee68.js`

Generated QA screenshots/logs and the verified apktool helper remain in the ignored workspace cache, not in Git. No runtime dependency was added for the artwork processing. The existing official SDK and keyless map architecture are retained.
