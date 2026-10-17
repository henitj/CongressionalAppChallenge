# Personal data and weekly streaks

## Where data is kept

EcoTrek saves personal profile fields (name, age, height, weight, step length,
weight history and avatar), walking/biking logs, points, badges, streaks,
freezes, challenges and cleanups in AsyncStorage under `@ecotrek/<user-id>/`.
On web this is browser-local storage. Units, appearance and text size are
device preferences. Signing out preserves these records; clearing app/browser
storage or uninstalling can remove them.

The current app uses a local guest profile and does not initiate Google OAuth. Older stored profiles may contain legacy Google provider fields, but they are not a supported sign-in or cross-device backup flow. **There is no Google Drive backup.**

The optional EcoTrek API is separate from local storage. It can serve the public approved-trail catalogue, while protected data routes require a verified Google token that the current guest flow does not provide. Do not describe guest profiles as syncing to a cloud account. Weekly streaks remain local; local point history is merged, not replaced by a remote response. Activity, point, weight and cleanup histories no longer silently drop the oldest records at their former count limits.

Guest upgrades copy all user-scoped keys and merge existing logs by ID. Existing
profile choices win, missing profile fields are filled, and the source remains
untouched. Writes are serialized per key so an older save cannot finish after
and overwrite a newer one. Storage-capacity failures are logged; local storage
is not an unlimited or encrypted backup service.

## Streak rules

- A valid completed walk or ride marks its local Monday–Sunday week active.
- An unfinished current week does not break last week's streak.
- Four consecutive **active** weeks earn one freeze and a 90-point bonus.
  A frozen week maintains a streak but does not count toward earning a freeze.
- At most four unused freezes can be stored. Milestones have stable week IDs,
  so they cannot be paid twice, including across restarts or after a broken run.
- A freeze repairs **last week only**, if missed and preceded by an active or
  frozen week. It cannot be spent on an active/already-frozen week or before
  any streak exists. The UI disables the action when there is no eligible week.
- Frozen weeks count in the displayed streak. Activity IDs prevent duplicate
  recording; daily records use actual calendar dates for recaps.
- The date is refreshed while the app is open and on foregrounding.

## Verification

`npm run verify` runs strict TypeScript checks, pure logic tests and React
render/behavior tests. `progress.render.test.tsx` covers ISO year boundaries,
missed weeks, freeze earning/caps/reuse, restoration, concurrent badge claims,
account isolation, guest merging and serialized saves.
