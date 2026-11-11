# Teacher Tools UX and visual redesign: implementation report

Branch: `claude/teacher-tools-ux-redesign` (not merged, not deployed). Frontend only.

## What changed

**Teacher Tools** (`/cs-games/teacher/`) is now three views over the existing functionality, selected by a section bar and
hash route (`#classes`, `#practice`, `#pathways`; the old `#wpr-online`, `#wpr-teacher-profiles` and `#quiz-settings` links still land
in the right place):

- **My Classes** – class cards with course name and publication status; an overview built from real data only (course, active/archived,
  published / unpublished-changes chip, last-published date, real student counts); student profiles with enrollment link, issue
  profile ID, roster (profile IDs stay visible), progress, reset/revoke/delete and CSV exports; archive/delete under "Manage this class";
  "Add class".
- **Practice & Assessments** – the online diagnostic/practice builder, published assignments (class report, copy student link, delete) and
  the Canvas QTI quiz builder, all with their original controls; the seed is under "Advanced options".
- **Learning Pathways** – plain task tiles that deep-link into the editor stages and a list of classes with status.

**Pathway editor** (`/cs-games/teacher/pacing/`) is four stages: Class & Calendar, Learning Goals, Pacing Guide, Review & Publish.

- Calendar: weekday checkboxes; schedule types Every school day / A/B block / Selected weekdays / Custom rotation; A-day/B-day
  anchor ("this date is a B day") that is validated against closures and converted to the existing `rotationOffset`; Advanced settings keep
  time zone, raw offset and pacing tolerance; import and individual dates are collapsed; a searchable skill picker replaces raw node-ID entry
  (the stored value is still the node id).
- Status: draft saved / draft not saved / unpublished changes / published / publication error are separate chips and a publish tracker;
  failed publications appear in the stage and status area and change nothing.
- Exports, JSON restore, revision history/rollback, copy-from-shared, policy and add-node tools are under "More tools" or collapsed sections;
  nothing was removed.
- Class IDs, node IDs and pathway IDs are not shown in normal views. A collapsed "Troubleshooting details" section holds them.

Shared theme: new `teacher-ui.css` uses the CS Games variables from `cs-games/styles.css` (dark theme, accent, focus ring). New pure helper
`ui-model.mjs` maps the friendly controls to the unchanged calendar/pathway contract.

## What was not touched

Cloudflare Worker, D1 and migrations, Google token verification, ownership/authorization, student profile generation/recovery, scoring,
progress sync, mastery evidence, and published pathway data structures. No framework added. No new browser storage; the unsaved-draft
snapshot is in memory.

## Verification

| Check | Result |
| --- | --- |
| `cs-games/teacher/ui-model-tests.mjs` (new, 16 unit tests) | pass |
| `cs-games/teacher/teacher-ui-browser-tests.mjs` (new, 8 rendered-page tests: views, deep links, no raw IDs, 390/768/1280 overflow and touch size, axe WCAG A/AA incl. contrast on both pages and every stage, keyboard/focus, weekday/A-B/anchor round trips, skill picker, draft/unpublished/published/error states, publish and rollback, secondary tools present) | pass |
| `cs-games/pathway/tests/core.test.mjs`, `service.test.mjs` (19) | pass |
| `wpr-online-tests`, `wpr-profile-tests`, `cs-games-backend-tests`, `qti`, `adapters`, `workplace-adapter`, `quiz-distribution`, `package-b-tests`, `package-f-tests` | pass |
| `wpr-online-browser-tests.mjs` (3) and `package-f-browser-tests.cjs` | pass |
| `cs-games/catalog-tests.mjs`, `cs-games/navigation-tests.mjs` | pass |
| `pathway/build-graph.mjs` leaves `curriculum-graph.json` unchanged | pass |

**Known failure that exists on unmodified `main`:** `package-b-browser-tests.cjs` asserts `options.length === 10` and fails identically on `main`. I
did not change that assertion.

**Edits to existing tests** were limited to navigation and label changes required by the new structure (open a view before using its controls,
expand the collapsed Advanced options to reach the seed field, new button labels): `wpr-online-browser-tests.mjs`, `package-b-browser-tests.cjs`,
`package-f-browser-tests.cjs`.

**Not run:** Google Sign-In itself (the local service uses the development token path, as the existing tests do), real production data, and
a real phone or screen-reader pass. Contrast and structure were checked with axe-core; a manual screen-reader review is still recommended.

A fix found by the new tests: scrollable tables in the pathway editor were not keyboard reachable (axe `scrollable-region-focusable`); they now
have `tabindex=0`, a region role and a label.

## Screenshots

`reports/ux-redesign/before` and `after`: same six views at 390/768/1280 from real pages (see its README).

## Remaining backend-related work (not done here)

1. Include `publishedRevision`, `lastPublishedAt` and `hasUnpublishedDraft` in the pathway list response. Today the hub makes one extra
   request per class to read status.
2. A Worker session exchange for the sign-in problem (see the auth report).
3. Fix the stale `options.length === 10` assertion in `package-b-browser-tests.cjs`.
4. Optionally show student names or display labels only if a privacy-approved design is agreed; the redesign keeps pseudonymous IDs.
