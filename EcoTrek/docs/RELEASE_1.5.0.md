# EcoTrek 1.5.0 validation

> Historical validation of the 1.5.0 artifact. The current source has since changed the onboarding, trail, sharing, and assistant behavior; regenerate the APK before treating it as the current release. Historical notes below apply to the artifact at the time of that build.

Release date: **15 October 2026** (America/Chicago). Android shell **1.5.0 / versionCode 7**.

## Realistic, gradual tree growth

- **100 separately rendered growth images** of one deterministic apple tree replace the
  previous handful of painted stages. Every image adds actual geometry: stem thickness,
  side shoots, primary/secondary/twig branches, curved serrated leaves with midribs and
  veins, swelling flower buds, five-petal pink-white blossoms, green fruitlets and
  ripening fruit. Images are ray-traced (Mitsuba 3.7.1 scalar CPU path tracer, seed
  57124) from author-created geometry, so growth is continuous rather than a few swapped
  silhouettes. No AI-generated or photographed trees are used for the atlas.
- **Seventeen named milestones** describe those changes: New seedling → First shoot →
  First leaves → Little sapling → Branching sapling → Forked sapling → Young tree →
  Leafy young tree → First buds → First flower → Growing in bloom → First fruitlets →
  Expanding canopy → Young bearing tree → Full-grown tree → Established tree → Sage tree.
- **40 adult seasonal images** (autumn and leafless winter) for images 80–99. Young trees
  keep their leaves while the seasonal background changes; snow scenery applies to all
  ages. Autumn shedding and bare branches remain full-grown–only.
- Images 1–79 are nursery close-ups so early leaves and buds stay legible; the app sizes
  them smoothly by image index. They are not scaled copies of an adult tree.
- The growth sheet lets anyone slide through all 100 images and jump between milestones.
  It is clearly labelled as an illustration and never changes real progress.
- `tools/tree-art/pack_atlas.py` verifies 100 unique images, strictly gradual height and
  trunk growth, no repeated art, buds before blossoms, and leafless adult winter frames.
  Raw renderer output and the Blender/Mitsuba dependency are artwork-only; no Python runs
  in the app or APK.

## Weekly care now gates the pace

Water, sunlight and soil each remain available once per week for 1 gem, and a saved valid
walk/ride (≥0.1 mile, ≥60 s) provides the weekly outdoor boost. Incomplete care **slows
future growth instead of shrinking the tree**:

| Care done | Pace with an outing | Pace without |
| --- | --- | --- |
| all three | 100% | 75% |
| two | 60% | 45% |
| one | 25% | 19% |
| none | 5% | 4% |

- Growth is additive and weighted: every elapsed week contributes its recorded pace, so a
  slow week simply earns less and is never erased by Monday's reset.
- **Partial care is now stored per week** (`careHistory`), which fixes the previous
  behaviour where unmade care vanished at rollover. Extra taps still cannot buy more care.
- Maturity still requires **both a full calendar year and 52 full-speed-equivalent growth
  weeks**; Sage requires 18 calendar months and 78 growth weeks. With incomplete care the
  tree genuinely takes longer, because the calendar birthday alone never matures it.
- Upgrading from the previous schema keeps the real planting date, every full-care week,
  a week's partial care, gems, grove count and golden apples. Only the oldest instant-growth
  format (which never stored a date) starts a fresh real-time calendar.
- The Tree screen shows a live pace line: "Growing more slowly … still needs sunlight",
  its pace percentage and how to restore full flourishing.

## Verification

- Strict TypeScript (`--noUnusedLocals --noUnusedParameters`); **128/128** logic tests and
  **195/195** Jest tests (12 suites). New coverage: the four care levels × outing multiplier,
  partial care surviving Monday, all 100 visual values reachable one step at a time with no
  adult jump, birthday gating, legacy/v2 migration, sagelessness without care, and
  non-regressing images.
- **20/20** Playwright browser tests against the exported build, including the care-pace
  percentages, the 100-image preview slider/buttons, mature-only autumn shedding, young
  winter foliage with snow, sage/apple persistence, cold offline Trails and ratings.
- Atlass integrity verified by `pack_atlas.py`; `app/` (164 files) byte-matches the APK payload.
- Browser captures at 390×844 and 320×568 show no page errors and no horizontal overflow.
- **Known limitation:** previews at 100 images cost ~6 MB of app assets; like all long text,
  the growth explanation is plain prose rather than a tutorial.

## Artifact

- `downloads/ecotrek.apk` — 8,766,759 bytes
- SHA-256 `17bc50b301ea212ed54cac7237f09b56303de0320d8a0d7c05e0c0b3ac2ee89b`
- Signing certificate SHA-256 unchanged (`74005b52…726d3`), v1+v2+v3, minSdk 24, targetSdk 34
- Web bundle `index-78bc93ff23eb679a6f61807b315f1ebb.js`

Physical-device GPS, live map tiles, live OpenStreetMap results and authenticated
Puter/Grok calls remain unverified in this environment.
