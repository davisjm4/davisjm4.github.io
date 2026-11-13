# CSG-PKG-02 · Student navigation

Status: in development. Branch: `codex/csg-pkg-02-student-navigation`, based on the CSG-PKG-01 release `4221c67a31f719b4ec50a340c333899197dc18b8`. Requirements: CSG-NAV-01/02/03, CSG-STU-01/03, CSG-UX-01/02/03. Acceptance: CSG-AT-01/02/03/08.

## Prior release

[CSG-PKG-01 PR #31](https://github.com/davisjm4/davisjm4.github.io/pull/31) passed 20 GitHub Actions checks, 383 local Node tests, ten local Chromium workflows and 39 requirements-editor checks. [Pages deployment](https://github.com/davisjm4/davisjm4.github.io/actions/runs/43527610115) succeeded for the merge commit. Production Chromium smoke confirmed Variable Lab's adjacent verdict, String Lab's report counts, guest map return and the updated teacher entry assets. Teacher writes used the isolated synthetic service. Physical devices and a native screen reader remain unverified.

## In this branch

- The four course cards open the associated guest maps and retain distinct activity catalog links.
- The existing map and list component provides concept search for either layout and role. The search uses authored aliases and curriculum labels, ranks exact concept matches first and gives each result a skill, area, course and matched term.
- Search and the selected skill survive a Map/List switch. Practice results use the contextual return link introduced in CSG-PKG-01.
- `node --test cs-games/student/map/search.test.mjs` verifies the specified concepts, punctuation, role-independent course scope and no-match behavior. Local Chromium at 390 CSS px verified the homepage course entry, `indexOf()` search, skill selection and Map/List continuity.

## Resume here

Complete the shared role-aware navigation and course chooser hierarchy. Preserve the Workplace Readiness RACECES entry and legacy `#shared-tools` link when adjusting the homepage. Preserve search state through practice return, including explicit search-result launches, and test keyboard focus, no match, unavailable activities, enrolled evidence and course switching. Update catalog navigation tests for the new map-first cards and verify the legacy paths directly. Run full viewport and accessibility parity before retiring the area jump or redundant suggestions. Then open the release PR and continue to CSG-PKG-03 after production verification.
