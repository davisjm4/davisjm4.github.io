# CSG-PKG-02 · Student navigation

Status: in development. Branch: `codex/csg-pkg-02-student-navigation`, based on the CSG-PKG-01 release `4221c67a31f719b4ec50a340c333899197dc18b8`. Requirements: CSG-NAV-01/02/03, CSG-STU-01/03, CSG-UX-01/02/03. Acceptance: CSG-AT-01/02/03/08.

## Prior release

[CSG-PKG-01 PR #31](https://github.com/davisjm4/davisjm4.github.io/pull/31) passed 20 GitHub Actions checks, 383 local Node tests, ten local Chromium workflows and 39 requirements-editor checks. [Pages deployment](https://github.com/davisjm4/davisjm4.github.io/actions/runs/43527610115) succeeded for the merge commit. Production Chromium smoke confirmed Variable Lab's adjacent verdict, String Lab's report counts, guest map return and the updated teacher entry assets. Teacher writes used the isolated synthetic service. Physical devices and a native screen reader remain unverified.

## In this branch

- The homepage, guest map and enrolled page share a role-aware header. The Courses link opens a separate chooser. A selected course uses a compact switcher, and the phone header opens and closes by keyboard. My Session links to the existing independent practice section during this stage. The guest map precedes secondary recommendations and reporting.
- The four course cards open the associated guest maps and retain distinct activity catalog links.
- The existing map and list component provides concept search for either layout and role. The search uses authored aliases and curriculum labels, ranks exact concept matches first and gives each result a skill, area, course and matched term.
- The shared map provides the primary recommendation for new independent learners. A learner with a saved position can still resume it. The classic pathway retains its recommendation and alternatives.
- Search and the selected skill survive a Map/List switch and a practice return in the same tab. The query stays in tab-local storage scoped by course and learner role.
- `node --test cs-games/student/map/search.test.mjs` verifies the specified concepts, punctuation, role-independent course scope and no-match behavior. Local Chromium verified all four homepage course entries, keyboard menu and skill selection, Map/List continuity, practice return, course switching and the no-match state. The tested widths were 320, 390, 768, 1024 and 1366 CSS px. Synthetic enrollment verified the My Class label, focused modulus practice, one synced first attempt, and return to the searched skill. Guest attribution, targeted clarity regression and catalog route tests also passed. Axe reported zero violations in the header and search scope under WCAG 2 and 2.1 A/AA rules.

## Resume here

All seven approved concept examples passed in both Map and List, including an isolated skill with no linked activity. Verify physical Chromebook, touch and native screen-reader parity before retiring the area jump. The remaining resume card preserves return to the saved position. Draft PR #32 holds this implementation. Complete the remaining acceptance checks, mark it ready, merge after checks pass, verify production, and continue to CSG-PKG-03.
