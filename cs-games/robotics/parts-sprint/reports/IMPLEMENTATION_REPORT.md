# Build 1 — VEX Parts Sprint and Robotics pathway

Date: October 28, 2026
Implementation commit: 11c2b87b598dbbb002e681fd0bacaa779bb93f24
Baseline: d2069f3833ce36956920296aef57da099221e1f5 (completed Package F report state).

## Published result

- Robotics pathway: https://davisjm4.github.io/cs-games/robotics/
- Game: https://davisjm4.github.io/cs-games/robotics/parts-sprint/
- Repository directory: cs-games/robotics/parts-sprint/

The new original robot race supports component recognition and precise technical vocabulary. It includes Learn (four names), Sprint (typed answer), Find (four images), and Mixed format practice. Beginner, Intermediate, Advanced and Mixed-level selections use actual catalog difficulty. Timed races support 60/90 seconds; untimed practice is available. Learn uses untimed reference practice.

## Content and instructional boundaries

The released catalog contains 56 component types and 56 unmodified official VEX assets, producing 168 component/format instances. Eight categories cover structure, fasteners, spacing/support, motion, transmission, wheels, tools and electronics. A component/format instance is not a distinct photograph or reasoning family. Answer shuffling does not increase the reported inventory.

Each record includes a technical name, aliases, category, level, image path, visual description, function, required identifying context, original article and asset URLs, original source alt text, attribution, verification note and SHA-256. See CONTENT_CATALOG_AUDIT.md and evidence/image-provenance-manifest.json for every record.

Material references are supplied where needed for structural components. Tool-tip markings and shaft cross-section context distinguish types that a scale-free photograph cannot establish alone. Screw/wheel/spacer type questions do not ask students to infer an unobservable size. The excluded labeled bearing-rivet diagram disclosed the answer; the release contains 56 rather than the 57 draft types. A labeled wrench diagram was replaced by an unlabeled official photograph. A repeated T15 image in the source T8 row and inconsistent small-wheel diameter labels were avoided.

Aliases normalize case, Unicode and spacing, then match whole accepted answers. They do not use substring or fuzzy acceptance. A near-spelling hint can help without marking the response correct. Generic “shaft”, “spacer”, “gear” and “shaft collar” are rejected when they fail to distinguish the keyed component. All 219 unique normalized aliases were checked against every other component.

## Generator and variety

The seeded generator reuses catalog identities across the three valid recognition formats. It balances recent categories and Mixed formats, protects an exact-instance cooldown of min(50, eligible instances minus one), and applies a component cooldown of min(12, eligible components minus one). The component restriction can relax in constrained pools, with an explanatory notice; the exact restriction remains protected. Small pools explicitly explain unavoidable repetition. No persistent global uniqueness across independent students/exports is promised.

The 15,000-instance run used seed 731 + i*7919; the 128-cell category/level/format matrix used 9533 + i*7919 and up to 70 draws per cell. Tests verify deterministic output, one keyed choice among four unique options, actual level, exact-repeat protection, alias correctness, feedback consistency, all image hashes and reachability of all 168 instances. There were 114 bounded component-cooldown relaxations and zero exact cooldown violations. Four empty filter cells return specific unavailability messages instead of substituting another level. See the machine-readable matrix for those exact selections.

## Accuracy-first race behavior

An independent first correct answer earns 1 progress; a streak of at least three adds 0.1. A corrected or assisted identification earns 0.4. The finish target is 10. Wrong first responses remain wrong in first-try accuracy after correction. Reference help removes first-try credit for that item. Terminal repeated submissions cannot score twice. Deadline checks occur before scoring as well as on clock ticks.

Personal bests require a completed or expired race with at least five independent attempts. Ranking compares accuracy, first-correct count, longest streak and average independent first-response time, in that order. Bests are scoped to mode, level, category and clock. The original SVG track has no invented live opponent or multiplayer claim.

## Session integration

session.js adapts the unchanged shared java-games/session.js tracker to the isolated roboticsGames.session.v1 key. Additional Robotics history and bests are separate. Actual format/level and category metrics are retained even in Mixed practice. Local-day reset clears the current daily session/history while retaining personal bests until a confirmed reset. Existing Java and CSP storage keys are untouched. Blocked storage falls back to in-memory practice with a visible warning. There are no accounts, identities or backend services.

The session summary is an in-game section, not a new cross-course dashboard. Tests cover retry/help/terminal scoring, deadline expiry, best ranking, day rollover, reset cancellation/confirmation, blocked storage and course-key isolation.

## Implementation files

New game files: index.html, app.js, engine.js, session.js, style.css and catalog.js in cs-games/robotics/parts-sprint/. New source assets: assets/ (56 images), assets/manifest.json and assets/ATTRIBUTION.md. New tests: tests/engine-tests.mjs and tests/browser-tests.cjs. Committed data: reports/test-results/generator-validation.json and filter-matrix.json. New pathway entry: cs-games/robotics/index.html. CI: .github/workflows/robotics-check.yml.

Shared changes are limited to a Robotics catalog entry, Robotics course metadata/summary destination in course-page.js, a fourth peer hub card, a two-column desktop hub grid and the corresponding catalog/navigation test contracts. Existing route, breadcrumb and shared-renderer conventions remain in use. No existing student generator, scoring system, WPR/RACECES gameplay or Teacher Tools exporter was changed. Package F's 46-source Teacher Tools registry was included in the live smoke check and no Robotics QTI adapter was added.

The implementation commit changed 76 files (4,062 insertions/13 deletions), including the 56 image assets. This later report commit adds evidence and corrects the attribution prose to accurately describe Find-mode provenance; it does not change production logic.

## Validation results and reproduction

| Check | Result |
|---|---|
| Focused engine/session suite | 229,558 checks; 15,000 instances; 56 types; all 168 instances reached |
| Filter matrix | 128 cells; 124 supported; 4 explicitly unavailable |
| Invalid/ambiguous automated findings | 0 in tested structural/key contracts; not educator certification |
| Exact cooldown violations | 0 |
| Full local CSP suite | Passed; recovered CI log also included |
| Full local Advanced Java suite | Exit 0 observed; full local stdout unavailable after interruption |
| Shared Java/CSP daily sessions | Passed in implementation session; Robotics CI includes shared Java session run |
| Navigation/catalog | Passed; 32 CSP, 24 Advanced and 1 Robotics catalog entries |
| Browser mode/level cases | 16 passed in local and live runs |
| Images | All 56 loaded in browser checks |
| Responsive checks | 320, 390, 768, 1024, 1366 CSS-pixel widths; no observed new overflow |
| Input/motion | Keyboard, typed aliases/Enter, emulated touch, minimum 44x44 answer controls and reduced motion passed |
| Existing pathways/tools | CSP, Advanced, WPR, RACECES selector and Teacher Tools smoke checks passed |

Reproduction commands from the implementation session:

~~~sh
ROBOTICS_EVIDENCE=/tmp/robotics-validation node cs-games/robotics/parts-sprint/tests/engine-tests.mjs
node java-games/session-tests.mjs
node cs-games/catalog-tests.mjs
node cs-games/navigation-tests.mjs
npm test --prefix csp-games
npm test --prefix java-games
node cs-games/robotics/parts-sprint/tests/browser-tests.cjs
~~~

Browser tests require their Playwright/Chromium dependency and follow the configuration in the committed test file. Local dependency setup was not committed as a new production dependency. The recovered CI logs are actual GitHub job logs, not reconstructed summaries.

## Deployment verification

The code commit was published through the repository's GitHub Pages workflow. Pages run 40701155405 completed successfully. Robotics run 40701157986, navigation run 40701157952 and copyright/full-CSP run 40701157959 were observed green. This does not claim that every independently triggered workflow was inspected.

Live tests covered all modes/levels, wrong-to-correct behavior, aliases, reference assistance, finish/replay/bests, timed expiry, local-date rollover, reset, storage isolation, images, responsive widths, navigation and existing tools. No page errors or failed requests were observed in those runs. Eight published asset checks matched the implementation checkout: hub HTML, course-page.js, catalog.js, Robotics pathway HTML, game HTML, engine.js, session.js and the wrench image. The original digest receipt is unavailable; no digest values are invented here.

## Tracker reconciliation

The master tracker was updated only after implementation and live checks. G-120 was appended to Master Inventory row 58 (A:L), release details to Release History row 23 (A:G), and follow-up I-007 to Issues & Risks row 7 (A:G). New rows copied existing formatting/validation conventions. All 26 written cell values were read back and matched. Historical Master Inventory IDs and existing release/risk rows were checked for preservation. Native spreadsheet visual fit was not certified. These are recorded results from the implementation session; this evidence package does not claim a new tracker reread at packaging time.

## Rights and limits

Official VEX educational-use conditions require attribution and prohibit monetary gain without permission. Images remain VEX-owned; this is not a Creative Commons or unrestricted commercial grant. Every question credits VEX; single-image questions link the original article; the manifest records all image options' sources. Images are served locally without VEX scripts or analytics. No Nitro Type assets or branding were used.

Physical Chromebook/touch hardware, native screen-reader use, independent educator/hardware identification review, Firefox/Safari and learning outcomes remain unverified. Do not interpret emulated touch/viewport tests as hardware certification.

## Handoff interruption and remaining gap

The workspace became unavailable while finalizing this handoff. Screenshots had been captured and reviewed but could not be recovered; they are not included. Original per-case browser JSON, full local Java stdout and the original published-asset digest file are also unavailable. The attached live-observation JSON is explicitly a summary of recorded observations. Exact committed generator/filter data and actual remote CI logs were recovered. All source tests remain in the implementation commit for reproduction.

The published code and tracker work are complete. The missing original screenshot/local evidence attachments remain a disclosed deliverable gap. No unrelated games, Teacher Tools/QTI integrations, accounts, backend or navigation redesign are included.
