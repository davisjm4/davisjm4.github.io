# Test results: teacher-controlled mastery requirements

Everything below was run in the cloud workspace with Node 22, a JDK 17 or newer, and `LC_ALL=C.UTF-8`, against the working tree of branch `claude/teacher-mastery-requirements` (the mastery-engine branch plus the new files, nothing else changed). No test needs a production secret or a real student record: all students are synthetic and all content comes from the committed curriculum graph.

## Summary

| Check | Result |
| --- | --- |
| Requirement logic tests | 128 of 128 pass (6 files) |
| Whole pathway test directory (the CI glob `cs-games/pathway/tests/*.test.mjs`) | 274 of 274 pass: the 146 that existed plus the 128 new ones |
| Negative controls | 38 of 38 deliberate breakages are caught by the tests |
| Browser tests (Playwright, Chromium) | 39 of 39 checks pass |
| Existing suites | Pass: Java Games chain (`npm test`, exit 0, 18 suites report "checks passed"), Workplace Readiness online and profile suites, CSP exam-readiness model and integration suites |
| Curriculum graph regeneration | Byte-identical (290 nodes, 453 question families) |
| Evidence-gap registry | Current (128 entries) |
| Screenshots | 12 at 2x, in the package `screenshots/` folder (see `SCREENSHOTS.md`) |

## The new logic tests

| File | Tests | What it covers |
| --- | --- | --- |
| `requirements-settings.test.mjs` | 23 | Percent entry (`95`, `95%`, `92.5`; `0.90` and `0.95` refused; every percentage from 1.00 to 100.00 converts exactly), whole-number entry (`30.5`, `-3`, `1e2`, blank, `0`, absurd values refused), validation per field, the both-numbers rule, warnings that do not block, live explanations (the exact sentences the teacher asked for, checked against an independent integer calculation for every count up to 250), counting rules in plain sentences, presets and their labels |
| `requirements-levels.test.mjs` | 19 | Nothing configured by default; class defaults stored as one policy; area and skill overrides and their precedence, one setting at a time; derived copies; the form's view of values and sources; no leakage between areas or skills; reset to inherited (whole level or one setting); turning class defaults off; older-editor policies; different classes with different thresholds; id parsing that never throws |
| `requirements-operations.test.mjs` | 20 | Apply to class, areas, skills; bulk edits keeping or replacing overrides and reporting what they kept; clearing skill overrides in areas; copying area settings and its refusals; reset; rejected edits change nothing; both-numbers rule at every level; never mutating input; idempotence; order-independence; no hidden second copy and drift repair; retiring settings for areas or skills no longer in the plan; no permanent policy for untouched skills |
| `requirements-limits.test.mjs` | 17 | Impossible difficulty requirements blocked (also through areas and the class); a missing Advanced mode; too many kinds of questions as draft-only; variety that cannot be verified is a warning; pool smaller than the minimum (draft-only when expandable, blocked when fixed); estimate versus verified; essential topics with no questions; no room for a mistake; the system never lowers or "fixes" a requirement; content and graph untouched; the code does not reach into generators, labs, the Worker or authentication; review readiness and plain headings for every finding |
| `requirements-versioning.test.mjs` | 24 | Drafts activate nothing; warning drafts save, blocked ones do not; change summaries (new, changed, removed) in plain words; explicit publish and `effectiveFrom` stamping; published versions never edited; edits before the next publish stay in one draft version; full history kept; retired markers; turning requirements off; repeated edits create no version; pending versions; checkpoint references always resolve and point at the most specific level; a pathway written before this feature is untouched; existing validation, diff and student contract still pass; existing completion logic accepts the policies; published snapshots, schedule and sessions untouched; memory and service adapters |
| `requirements-engine.test.mjs` | 25 | The saved requirement is the one the engine measures; boundaries at several settings (exact count meets it, one fewer does not); incorrect first attempts stay in the denominator; answering more than the minimum; minimum correct in addition to accuracy; skipped, revealed and hinted answers by the teacher's rule; accuracy never rounded up (94.9% does not meet 95%); Mixed Practice counted once per skill alongside focused practice; the same practice meeting one class's requirement and not another's; a skill override changes only that skill; changing a requirement keeps earlier evidence and results; restoring to inherited; the preview equals the engine for every preset; the student view contract (no identifiers, labels cover every status, reads naturally above the minimum); practice milestone only, no score or award; no way to create an award; malformed saved data never crashes progress |

Run them with:

```sh
node --test cs-games/pathway/tests/requirements-*.test.mjs
```

### Coverage of the topics the specification lists

| Topic | Where it is tested |
| --- | --- |
| Defaults, area overrides, skill overrides, resolution | `requirements-levels` (precedence, layered example, derived copies) |
| Reset to inherited | `requirements-levels`, `requirements-operations` |
| Bulk editing | `requirements-operations` |
| Presets | `requirements-settings` |
| Percent conversion | `requirements-settings` (all 9,901 percentages from 1.00 to 100.00 in steps of 0.01) |
| Correct counts | `requirements-settings`, `requirements-engine` (boundaries) |
| Recovery | `requirements-engine` (a wrong first answer stays; more answers continue the same attempt) |
| Invalid input | `requirements-settings`, `requirements-operations` |
| Impossible requirements | `requirements-limits` |
| Drafts, versioning, history | `requirements-versioning` |
| Checkpoint references | `requirements-versioning`, `requirements-operations` |
| Mixed Practice compatibility | `requirements-engine` |
| Different classes, different thresholds | `requirements-levels`, `requirements-engine` |

## Negative controls

`scripts/negative-controls.sh` (in the package) copies the tree, breaks one rule at a time, and expects the requirement tests to fail. All 38 were caught, after the baseline passed 128 of 128. A control whose target text is missing reports an error instead of a silent pass.

The rules covered include: `0.90` accepted as a percentage; accuracy above 100%; a fractional question count; class defaults without both numbers; a teacher explanation that rounds instead of using the engine arithmetic; a preset label that ignores the count; precedence reversed; a skill's own setting labeled as the class default; checkpoints that ignore area policies; inherited values not carried down; a published version edited in place; an older-editor skill that cannot be restored; bulk edits that overwrite overrides silently; publishing stamping policies that are not requirements; an impossible difficulty saved; an estimate presented as verified; a fixed too-small pool offered as a draft; too many kinds of questions published; a draft-only requirement or an unacknowledged warning published; an impossible configuration saved; a teacher's numbers labeled calibrated; a requirement taking effect before publish; a node id in the student view; a met requirement not called a practice milestone; meeting a requirement showing a 4; a preview sample below the engine's threshold; any policy with a matching id counting as a requirement; invalid input not rejected; an area or skill outside the class accepted; older-editor policies ignored or overridden; derived values never re-derived; repeated edits creating versions; the adapter allowing a published version to change; no 100% warning; settings for areas no longer in the plan kept; incomplete requirements assessed as complete.

Three controls did not bite on the first try (accuracy above 100%, repeated edits creating versions, settings for removed areas kept), which showed three gaps in the tests; tests were added for the over-100% message, for repeated edits after publishing creating no version, and for retiring settings for areas or skills removed from the plan. Two tautological assertions (`|| true`, a length compared with itself) were found in review and replaced with real ones.

## Browser tests

`cs-games/teacher/requirements/requirements-browser-tests.cjs` drives the demo page in headless Chromium and writes the screenshots. 39 of 39 checks pass:

- **Flows:** the page loads with four named tabs; nothing is set at first and Save is disabled with no red errors; typing 50 and 95 gives the exact sentences and selects Quick recognition; presets fill editable numbers and editing one turns the label to Custom; `0.90` and `30.5` are refused with Save disabled; the Advanced section and the both-requirements-must-be-met note; the student preview matches the engine (27 of 30 met at 90%, 26 not); saving class defaults reports how many skills changed; learning areas select, copy, and restore with confirmation (Cancel changes nothing); individual skills search, select, override only the accuracy and show each source; restoring asks first; selecting many skills and applying one setting; an impossible requirement is refused and nothing is saved; an expandable shortfall is saved as a draft and cannot be published; fixing it makes it publishable; publishing creates a version the page shows; the review table and differences carry no identifiers; no identifier, JSON, `undefined` or `NaN` appears in any tab; two classes keep different thresholds; the tool stores nothing and talks to no other server.
- **Keyboard and assistive technology:** arrow, Home and End keys move between tabs and only the selected tab is in the tab order; a keyboard-only flow (choose a preset, edit, save, select an area); every control has an accessible name, no positive `tabindex`, and a visible focus ring; status and alert live regions.
- **Layout:** no sideways scroll on every tab at 1280×800, 1366×768 (Chromebook), 820×1180, 390×844 and 320×640; buttons, tabs, fields and rows at least 44 px at every size; the review table stacks into labeled rows on a phone.
- **Contrast:** at least 4.5:1 (3:1 for large text) on every tab in the dark and light themes.
- **Hygiene:** no script error, console error or failed request during the whole run.

Run: `REQ_BROWSER_DIR=/tmp/req-browser node cs-games/teacher/requirements/requirements-browser-tests.cjs` (Playwright and Chromium required). It writes `results.json` and the screenshots to that folder.

### Defects the browser run found, all fixed

The first full run failed for real reasons that logic tests could not see:

- keyboard focus was lost after the page redrew (it now returns to the control the person was on);
- a skill with its own accuracy was labeled "Area setting" instead of "Set for this skill";
- headings were unreadable in the light theme (contrast fixed);
- disclosure summaries were 24 px high (now at least 44 px, with visible markers);
- the learning-area filter and the search box overlapped each other;
- the filter's accessible name picked up the text of its options (the label is now a real label);
- on a phone, two of the four tabs were off-screen (the tabs now form a 2×2 grid at 640 px and below).

The last change before the final full run (scrolling an error message into view when a save is refused) is included in every number above.

## Existing suites

| Suite | Result |
| --- | --- |
| Java Games chain (`cd java-games && LC_ALL=C.UTF-8 npm test`) | exit 0; 18 suites report "checks passed" (log in `evidence/test-logs-final/java-games-npm-test.log`) |
| `node cs-games/teacher/wpr-online-tests.mjs` | 0 failures |
| `node cs-games/teacher/wpr-profile-tests.mjs` | 0 failures |
| `node csp-games/exam-readiness/tests/model.test.mjs` | pass |
| `node csp-games/exam-readiness/tests/integration.test.mjs` | pass |
| `node cs-games/pathway/build-graph.mjs` then `git diff --exit-code` on the graph | no diff |
| `node cs-games/pathway/tests/build-gap-registry.mjs --check` | current, 128 entries |

Running the Java chain rewrites three tracked report files (`array-lab/reports/smoke-results.json`, `math-lab/expansion/tests/results/test-report.json`, `search-sort-lab/tests/results/generator-table.json`). Those changes were discarded and are not part of the branch.

## Not tested, by design

- There is no real class, real student, production Worker or database in any test, so there is no production behavior to test: nothing here changes any of them.
- The service adapter is tested against a recorded stand-in for `request` (same calls, same order, same tokens), not against the live shared service.
- Pool-size checks are tested with supplied sizes, because the repository records none.
- A real student's answers reaching the engine from the practice pages are not exercised; the engine suites from the previous package cover event normalization, and this package's tests feed the engine the same normalized events.

## Limitations, stated rather than hidden

- Skips and reveals are not sent by the practice pages yet, so the rule for them only applies to records that carry those flags (the engine says so in every evaluation).
- Question variety can be verified for 54 of the 123 Advanced CS skills only, difficulty levels are recorded for 65 of them, and the other courses record neither; those cases give warnings, not limits.
- The student preview simulates question count, accuracy, minimum correct and skipped-question handling only.
- The three presets are starting points taken from the teacher's stated preferences. They are not calibrated against any student data.
