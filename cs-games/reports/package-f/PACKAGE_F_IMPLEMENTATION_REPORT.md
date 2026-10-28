# Package F — Teacher Tools & QTI integration expansion

Implementation date: October 28, 2026 (UTC). Project: DevCat Studios — CS Games & Workplace Readiness.

## Executive result

Teacher Tools is published at **https://davisjm4.github.io/cs-games/teacher/**; source directory **`cs-games/teacher/`**. It now offers **46 sources and 333 source/mode export variants**, up from the verified current baseline of **10 and 136**. This adds **36 sources and 197 variants**, including additional modes in three existing sources (Boolean, Variable and Math).

The complete inventory contains **54 activities**: A19 directly eligible, B3 adapter-eligible, C24 limited exports and D8 practice-only/deferred. Of these, 36 are new integrations, three existing integrations expanded, seven existing integrations retained, and eight deferred. Shared CSP/Advanced catalog entries are counted once by URL; WPR, RACECES, Readiness and distinct embedded Java tools are included. The embedded Response Explorer and Project Builder share Documentation Lab's published page and are selected inside it; no fabricated deep link is promised.

**Implementation commit:** `a1fcb916b7dfd7a006271eb6dacc789eca31f1f1` (parent `7f44b0daf4214cdb287790ce303c646007ae228c`). Initial source tree `cf4db451a3773cb8655e1d516b622de9130f0e05`. Provenance-metadata follow-up commit: `270abc1ac2c27d9b4d9821dffef38eb48cb2dccb`; final source tree `fc921d4356df6de76ce125709bcb0ae926f63679`. Deployment evidence is recorded in `evidence/release-receipt.json`. The subsequent report/evidence commit is recorded in the repository's history. Publication is verified by live runtime tests, not inferred from a push.

**Canvas sandbox import: Not Verified.** No approved nonproduction Canvas environment was available. No Canvas course was accessed or modified and no assessment was released to students. Actual Canvas-imported points, quiz totals, code rendering, feedback presentation and availability timing remain unverified. Offline QTI validity does not establish those behaviors.

## Baseline inspection and prior packages

The latest upstream was fetched before editing and again before publication. An isolated worktree on the latest Package C report commit preserved concurrent work; upstream remained at the recorded parent until the guarded fast-forward publication. No force-push was used.

Reviewed inputs included the October 26 Executive Audit Report, Detailed Technical & Instructional Audit, CS/WPR Audit Workbook, QTI validation evidence, difficulty mismatch evidence, Search & Sort missing-context examples and source/variant inventory. These established R-01 through R-04 and the historical 10/136 baseline. Current code was inspected rather than treating those historical defects as still unfixed.

Read the repository's Package B and Package C implementation reports. Package B repairs were already present: `search-context.js` preserves arrays/counting rules/code and rejects missing context; case-insensitive `difficulty.js` resolves actual generator levels; item point metadata, item SCORE maximum, correct/incorrect response values and quiz total agree; response processing links explanatory feedback. These repairs were retained. Package C's Loop while-zero feedback and corrected test contracts were preserved. No completed D+E report was located in repository or saved-report discovery; this is an access/discovery statement, not a claim that no such work exists elsewhere. Existing tracker text was freshly read and preserved.

The original 136 variants span 289 supported mode/level cells. **867 baseline records** (three deterministic seeds per cell: 731, 1901, 9533) compare byte-for-byte on question text, context, code, choices, key, explanation, points and actual difficulty. Existing source tests and Package B's exact Search & Sort and difficulty regression patterns pass. No redundant reliability rewrite was needed.

## Eligibility audit and decisions

`PRIORITIZED_CANDIDATES.md` records the candidate list, complexity, instructional value and validation gates prepared before production edits. Priority went to Java object/collection/debugging questions, CSP program analysis and finite scenario catalogs; specialized formats were enabled only after context and grading checks. All clearly eligible standalone contracts found in the existing architecture were integrated. Interaction-dependent portions remain excluded rather than being mislabeled as full game support.

Category A means the native question/answer contract normalizes directly. B requires context/source-region transformation. C provides only named valid portions of a broader activity. D lacks a validated standalone assessment contract without substantial design work. “Full” covers the native scored question contract, not every exploratory panel or support setting. The coverage workbook distinguishes practice modes from exported variants, and lists each variant and actual level support separately.

## Implementation and reuse

`assessment-item.js` provides teacher-only normalization: native 2–4 answer choices, exactly one source-graded response, deterministic answer shuffling, immutable instructional snapshots, source/topic/family metadata and stable content signatures. It never adds dummy distractors to a native binary decision. Existing four-choice adapters remain four-choice. No new QTI response type was added.

`csp-adapters.js` reuses the finite concept/scenario catalogs plus Create Task, Response Builder, Test Case Builder, Algorithm Architect, Code Concepts and Trivial/Nontrivial source logic. `core-csp-adapters.js` adapts existing numeric, list, search, run-count, data, scheduling and selected one-field practice contracts. Its numeric distractors do not replace or reduce the original source generators. Multi-part Computing Impact exports explicitly name one claim/evidence/reasoning decision and grade that decision with the other source fields fixed; they do not pretend to assess the entire constructed response.

`java-expansion-adapters.js` calls existing Java generators and assessors. Full code and source assumptions are kept. Class/Object solution diagrams are not copied into stems. Single-source-region answers use actual code positions and content rather than opaque semantic IDs; Method/Constructor offsets exclude the file-label comment. Multi-select, multiple valid construction answers, hierarchy wiring and other unrepresented contracts are excluded.

`response-explorer-adapter.js` reuses the same authored catalog, expansion logic and six local provider fixtures as the practice tool. It exports complete JSON, the application goal, related responses where needed and existing feedback. No provider API is called, and no API key is required. Find Data and single-selection Understand Structure support their actual three levels; all 78 eligible canonical questions were checked.

`assessment-builder.js` retains bounded retries (140 draws), no partial exports and signature deduplication. New items prefer a three-recent-family cooldown for the first 100 attempts before a bounded fallback allows a different exact item from the same family. This allows finite small pools to remain usable without infinite loops. Family repetition can therefore occur in constrained pools; persistent cross-export history is not maintained, and separate exports may overlap. Exact duplicate signatures in a single generated assessment are rejected.

### Context and preview fidelity

The same `formatQuestionHtml` renderer feeds preview and QTI. Required stem/context/code snapshots are validated at generation and export; a changed or missing snapshot is rejected. Arrays, list indices, parameters, surrounding Java declarations, tables, diagram descriptions and JSON inputs are represented as readable text with preformatted code. No media resource is required by the new items, so there are no unresolved external image references.

Before/after examples:

* Search & Sort's historical “this array” prompt already had the Package B repair. The exported item still includes the actual array and applicable counting rules; the known failure family is covered by Package B tests and a live Search & Sort download.
* Class & Object previously had no Teacher Tools source. It now includes the complete source code, preconditions, native choices, keyed answer and explanation, without the post-answer heap diagram.
* A robot prediction originally depends on a visible board. The adapter supplies dimensions, row/column convention, start/facing, all wall coordinates, goal, movement and sensor rules plus full code. The source interpreter and JVM checks agree.
* Digital Divide's evidence question includes the original fictional table caption, all headers and every data value. Internet Layers diagrams use the source's diagram description. The complete evidence remains present in the exported HTML, not just preview.
* API Response Explorer includes the entire local JSON fixture; students can resolve the offered JSON paths without opening the game or contacting the API.

### Difficulty and eligibility

Only actual levels are advertised. New unlevelled sources display Native Mixed; no inferred Beginner/Intermediate/Advanced label is manufactured. Create Task supports Beginner only and rejects unsupported explicit requests. Response Explorer supports Beginner/Intermediate/Advanced with exact matching. Class/Object, Debugger and the new Boolean/Math modes use their native three-level generators. Variable identification remains native Mixed while the prior Trace mode retains all three levels.

The interface hides/disables unsupported levels and resets an unavailable selection to Mixed. In mixed-source assessments, an unlevelled item remains explicitly Mixed and a notice explains the source limitation. Existing nearest-level fallback for sources such as limited String families remains explicit and tested; it is not silent Beginner substitution. Source/mode names and the interface's limitations disclosure explain partial coverage. WPR's five known zero-content skill/mode/level combinations remain blocked with a specific alternative-selection message. Small pools can fail a large requested count: the error reports how many could be generated and provides no partial export.

## QTI scoring, keys and feedback

The existing QTI 1.2 architecture is preserved. Item metadata declares its own `points_possible`; each item's SCORE uses a 0–100 response-weight scale (100 correct, 0 incorrect), kept separate from its point value, and assessment total equals the sum. The effective score is response weight / 100 × item points. No quiz-total value is applied to each item and no second scaling layer is introduced. Mixed sources use the same convention.

For each integration with new coverage, representative packages were created at **1, 3 and 5 points**. Six-item packages total **6, 18 and 30 points** respectively. Four additional mixed packages contain 50 items at five points (250 total). Across **121 packages**, the independent Python validator checks ZIP CRC, XML parsing, manifest references, unique resource/item IDs, every answer encoding, all correct/incorrect score paths, total points, feedback references and question/choice/explanation content. Explanatory feedback is connected by response-processing references and unrelated feedback is not introduced.

Source ID/game/topic/mode/difficulty/family are explicitly included as QTI item provenance fields and retained in the ZIP metadata sidecar. Canvas may discard custom provenance fields on import; their retention inside Canvas is unverified.

HTML and XML escaping remain separate: Java `<`, `>`, `&&`, `||`, generic angle brackets, quotes and text content are HTML-escaped inside the question HTML, then serialized into XML mattext. Decoding the XML and rendering its HTML yields the original Java text; the apparent two-layer entity representation in raw XML is intentional. Regressions cover multiline/nested code, quoted strings, blank lines, arrays, ArrayLists, empty strings and literal escape sequences. New two/three-choice MC uses the established single-answer scoring machinery, not a new response type.

The live browser's nine downloaded ZIPs were parsed independently and compared against the actual preview HTML, choices, correct index, points and explanation captured at download. This verifies the delivered browser package rather than only calling exporter functions in isolation.

## Validation results

The expansion suite accepted **39,365 seeded questions** across 39 sources with new coverage (36 new sources plus three expanded existing sources), targeting at least 1,000 per source. **43,846 total item validations** include exhaustive eligible catalogs and Create Task cases. All **251 new supported mode/level cells** generated three-item assessments. With the original 289 cells, supported coverage is 540 cells. Counts are not interchangeable with the 333 source/mode variants.

Every accepted new item has a valid snapshot, unique visible choices, matching correct index/answer, exactly one source-graded response, source/topic metadata and feedback. Deterministic regeneration compares complete normalized items. Wrong-choice rejection is checked by the native grader. Independent oracles rederive bit capacity/wrap, list transformations, binary-search inspection counts, run counts, algorithm work comparisons and scheduling minima. Finite pools are exhausted, while procedural samples and existing source-level tests cover their reasoning families. Samples are evidence, not a proof of all possible generated values or an external instructional certification.

Actual Java 17 validation (not a JavaScript approximation):

| Source | JVM result |
| --- | --- |
| Class & Object | 195 questions; 248 programs compiled/executed, 40 intended compile errors, 195 rederived answers, 585 distractors and 143 state dumps; zero failures |
| ArrayList | 53 templates × 3 challenges; 272 checks, 226 compiled, 203 executed, 46 invalid alternatives rejected |
| Method & Constructor | 412 checks; 192 compiled, 220 invalid alternatives rejected, 53 executions |
| Documentation | 348 compilation units agreed with javac/java |
| Inheritance | 849 units agreed with javac/java |
| Robot Algorithms | 153 programs matched interpreter and JVM |
| New Boolean modes | 480 challenges, 598 programs, 18,034 executions and 616 independent truth-table rows; zero failures |

The full Java regression additionally compiled/executed 7,312 Java-oracle programs, including expected compile-error cases. Both full CSP and Java npm test commands exited zero. Student generator files were not modified; generated historical test result files were restored before commit.

### Commands and outcomes

All commands below passed. Complete stdout logs are in `evidence/logs/` within the downloadable archive. Java test commands ran with the Java 17 compiler (`java com.sun.tools.javac.Main` exposed as a local javac wrapper where no launcher was installed).

```bash
PACKAGE_F_EVIDENCE_DIR=cs-games/reports/package-f/evidence node cs-games/teacher/package-f-tests.mjs
python3 cs-games/teacher/validate-qti-packages.py cs-games/reports/package-f/evidence/qti
PACKAGE_B_EVIDENCE_DIR=/tmp/package-b node cs-games/teacher/package-b-tests.mjs
node cs-games/teacher/qti-tests.mjs
node cs-games/teacher/adapters-tests.mjs
node cs-games/teacher/quiz-distribution-tests.mjs
node cs-games/teacher/workplace-adapter-tests.mjs
node cs-games/teacher/raceces-adapter-tests.mjs
(cd csp-games && npm test)
(cd java-games && npm test)
node java-games/class-object-lab/tests/jvm.test.mjs --per 5 --out /tmp/class-jvm.json
ARRAYLIST_JVM_PER_TEMPLATE=3 node tests/arraylist-lab-jvm.test.js
MCL_JVM_PER_MODE=20 node tests/method-constructor-lab-jvm.test.js
node java-games/documentation-lab/tests/doclab-jvm-tests.mjs
node java-games/inheritance-polymorphism-lab/tests/iplab-jvm-tests.mjs
ROBOT_JVM_PER_MODE=15 node tests/robot-algorithms-jvm.test.js
node java-games/boolean-conditional-lab/tests/java-verify.mjs 40 evaluate,identify,truthTable,switchIf,coverage
CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node cs-games/teacher/package-f-browser-tests.cjs
PACKAGE_F_BASE_URL=https://davisjm4.github.io CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node cs-games/teacher/package-f-browser-tests.cjs
python3 cs-games/teacher/validate-qti-packages.py /path/to/live-downloads
```

The browser suite passed **68 generation cases locally and 68 live**, including all 46 sources, audited difficulty selections, nearest-level notices, disabled unsupported levels, five blocked filter combinations, a 50-item mixed quiz, regeneration and nine actual downloads. It observed zero page errors or failed requests, and a local-storage sentinel was preserved. Focused navigation/catalog regressions passed. Teacher Tools CI now runs the Package F suite and independent QTI checks and watches CSP source changes as well.

## Deployment verification

Source publication used a guarded fast-forward from the freshly fetched upstream parent. GitHub Pages run **40640449366** completed successfully. Teacher Tools reliability run **40640449993** and unified-navigation run **40640450008** completed successfully. Live Teacher Tools loaded 46 sources, executed complete generator/preview/export checks, and produced packages matching preview and the tested scoring rules. The final provenance follow-up also passed Pages run **40641413016**, Teacher Tools CI **40641413438** and navigation CI **40641413441**. Its 68 live browser cases and nine downloads passed the stricter provenance validator, and five fetched runtime files matched the tested checkout by SHA-256. No confirmed assessment-correctness regression remained at publication.

## Master tracker reconciliation

After publication and live verification, appended verified Package F information to **40 existing Notes cells** in `Master Inventory`: the 36 new integrations, three expanded existing sources and Teacher Tools summary G-102. Each records supported modes, difficulty, format, validation, live URL, implementation commit and Canvas limitations. This narrowly updates integration coverage; it does not claim a broader Package D+E reconciliation or mark unrelated classroom/device work complete.

Fresh before/after cell reads verified the exact appended text, every existing note prefix, IDs, status/history columns and formatting. All other A1:L57 cells remained unchanged. No rows were inserted, reordered or deleted; other tabs were not written. `evidence/tracker-reconciliation.json` records affected IDs/cells and appended evidence without republishing the rest of the private tracker. Existing fixed note-column dimensions were preserved; native visual fit was not verified, and long notes may require opening the cell to read them.

## Limits and deferred work

Canvas-specific import and feedback presentation remain Not Verified. These are offline-validated QTI packages for the existing intended Canvas workflow, not a claim of end-to-end Canvas certification. JSON import attributes require a modern browser; the published Chromium runtime was tested. Full mobile/device/accessibility certification was outside Package F. Textual tables and diagram descriptions preserve information but do not replicate interactive game layouts.

Finite catalogs can be exhausted by count/mode constraints and source-family cooldown may relax after bounded attempts. There is no guarantee of non-overlap across independently generated assessments. New adapters preserve native family variety; they do not add student question families. The four eligible Inheritance item IDs intentionally provide narrow Abstract Class coverage. API Project Builder, construction/multi-answer portions and the eight D activities are deferred because a trustworthy standalone contract would require additional interaction/scoring design, not merely an adapter checkbox. See the complete activity restrictions below.

Package A navigation, Package B repairs and completed Package C changes remain intact. No student-facing source file, generator, score, session/daily reset/storage, existing URL, WPR/RACECES practice app, course catalog or Canvas assignment link was changed. No backend, account, login, new game or unrelated refactor was added. Tracker changes are the Package F integration notes explicitly authorized here. No broader Package C–E maintenance, reconciliation or device certification was performed.

## Files and evidence

Production and validation files modified/added:

- `cs-games/teacher/adapters-tests.mjs`
- `cs-games/teacher/adapters.js`
- `cs-games/teacher/assessment-builder.js`
- `cs-games/teacher/assessment-item.js`
- `cs-games/teacher/core-csp-adapters.js`
- `cs-games/teacher/csp-adapters.js`
- `cs-games/teacher/difficulty.js`
- `cs-games/teacher/index.html`
- `cs-games/teacher/integration-inventory.mjs`
- `cs-games/teacher/java-expansion-adapters.js`
- `cs-games/teacher/package-b-tests.mjs`
- `cs-games/teacher/package-f-browser-tests.cjs`
- `cs-games/teacher/package-f-tests.mjs`
- `cs-games/teacher/qti-tests.mjs`
- `cs-games/teacher/qti.js`
- `cs-games/teacher/response-explorer-adapter.js`
- `cs-games/teacher/teacher.js`
- `cs-games/teacher/validate-qti-packages.py`
- `.github/workflows/teacher-tools-check.yml`
- `cs-games/reports/package-f/` (candidate decisions, matrices, implementation report and evidence)

The evidence bundle contains this detailed report; the two-page executive PDF; the four-tab XLSX workbook (Summary, Activities, all 333 Variants, Validation); CSV/JSON coverage; machine-readable source, cell, finite and QTI results; the seeded baseline comparison script and hashes; JVM/regression logs; 121 generated QTI ZIPs; nine live downloaded ZIPs with preview expectations; and live preview screenshots. SHA-256 hashes accompany the bundle. Repository report/evidence publication follows source release so the report can cite the verified implementation commit.

## Per-source new-coverage results

| Source | Accepted | Families seen | Mode/level cells | Rejected draws |
| --- | --- | --- | --- | --- |
| boolean | 1000 | 59 | 15 | 0 |
| variable | 1000 | 12 | 12 | 0 |
| math | 1000 | 26 | 6 | 0 |
| analog-digital-lab | 1000 | 60 | 12 | 0 |
| lossless-lossy-lab | 1000 | 60 | 4 | 0 |
| roundoff-overflow-lab | 1000 | 60 | 3 | 0 |
| ai-ethics-lab | 1000 | 100 | 5 | 0 |
| digital-divide-lab | 1000 | 80 | 5 | 0 |
| internet-layers-lab | 1000 | 80 | 5 | 0 |
| tcp-udp-lab | 1000 | 60 | 5 | 0 |
| copyright-creative-commons-lab | 1000 | 60 | 6 | 0 |
| vocabulary-fill-in-lab | 1000 | 149 | 16 | 0 |
| create-task-lab | 1000 | 131 | 2 | 0 |
| response-builder | 1000 | 32 | 5 | 0 |
| test-case-builder | 1000 | 36 | 5 | 0 |
| algorithm-architect | 1000 | 97 | 9 | 33 |
| code-concepts | 1000 | 35 | 5 | 62 |
| trivial-nontrivial | 1000 | 80 | 4 | 0 |
| class-object | 1365 | 28 | 39 | 0 |
| arraylist | 1000 | 52 | 5 | 25 |
| linkedlist | 1000 | 12 | 2 | 0 |
| method-constructor | 1000 | 68 | 8 | 0 |
| debugger | 1000 | 28 | 15 | 0 |
| documentation | 1000 | 16 | 3 | 0 |
| inheritance | 1000 | 1 | 1 | 0 |
| robot-algorithms | 1000 | 19 | 4 | 0 |
| boolean-gatekeeper | 1000 | 1 | 1 | 0 |
| binary-builder | 1000 | 3 | 3 | 0 |
| list-lab | 1000 | 1 | 1 | 0 |
| binary-search-hunt | 1000 | 1 | 1 | 0 |
| algorithm-race | 1000 | 3 | 3 | 0 |
| compression-challenge | 1000 | 2 | 2 | 0 |
| data-detective | 1000 | 1 | 1 | 0 |
| mixed-ap-practice | 1000 | 14 | 5 | 87 |
| simulation-lab | 1000 | 3 | 3 | 0 |
| computing-impact-lab | 1000 | 21 | 21 | 0 |
| cybersecurity-defender | 1000 | 4 | 1 | 500 |
| parallel-processing-race | 1000 | 2 | 2 | 0 |
| response-explorer | 1000 | 32 | 6 | 0 |

Rejected draws include ineligible multi-response formats and failed choice validation; they were never exported. Accepted counts do not imply every raw source draw is eligible. Finite exhaustive coverage:

| Source | Eligible instances | Families | Coverage |
| --- | --- | --- | --- |
| analog-digital-lab | 720 | 60 | exhaustive |
| lossless-lossy-lab | 360 | 60 | exhaustive |
| roundoff-overflow-lab | 360 | 60 | exhaustive |
| ai-ethics-lab | 500 | 100 | exhaustive |
| digital-divide-lab | 400 | 80 | exhaustive |
| internet-layers-lab | 400 | 80 | exhaustive |
| tcp-udp-lab | 360 | 60 | exhaustive |
| copyright-creative-commons-lab | 60 | 60 | exhaustive |
| vocabulary-fill-in-lab | 600 | 150 | exhaustive |
| response-explorer | 78 | 32 | exhaustive |
| documentation | 57 | — | exhaustive eligible item IDs |
| inheritance | 4 | — | exhaustive eligible item IDs |

Create Task additionally exhausted 582 family/variant/control cases.

## Complete activity coverage matrix

The XLSX and JSON carry all required fields, including source directory, objectives, practice modes, context and architecture; the following readable matrix gives status and restrictions for every activity. “MC” is single-answer multiple choice, using 2–4 native choices. Every exported row has Canvas import **Not Verified**.

| Activity / published URL | Pathway | Category | Integration | Export | Variants before → after | Difficulty | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [Copyright & Creative Commons Lab](https://davisjm4.github.io/csp-games/copyright-creative-commons-lab/) | AP CSP | A | New | Full | 0 → 6 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [Digital Divide Scenario Lab](https://davisjm4.github.io/csp-games/digital-divide-lab/) | AP CSP | A | New | Full | 0 → 5 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [AI Ethics Scenario Lab](https://davisjm4.github.io/csp-games/ai-ethics-lab/) | AP CSP | A | New | Full | 0 → 5 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [TCP vs. UDP Decision Lab](https://davisjm4.github.io/csp-games/tcp-udp-lab/) | AP CSP | A | New | Full | 0 → 5 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [Internet Layers & Protocol Roles Lab](https://davisjm4.github.io/csp-games/internet-layers-lab/) | AP CSP | A | New | Full | 0 → 5 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [AP CSP Vocabulary Fill-in Lab](https://davisjm4.github.io/csp-games/vocabulary-fill-in-lab/) | AP CSP | A | New | Full | 0 → 16 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [Roundoff vs. Overflow Lab](https://davisjm4.github.io/csp-games/roundoff-overflow-lab/) | AP CSP | A | New | Full | 0 → 3 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [Lossless vs. Lossy Compression Lab](https://davisjm4.github.io/csp-games/lossless-lossy-lab/) | AP CSP | A | New | Full | 0 → 4 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [Analog vs. Digital Lab](https://davisjm4.github.io/csp-games/analog-digital-lab/) | AP CSP | A | New | Full | 0 → 12 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [ASCII Binary Name Builder](https://davisjm4.github.io/csp-games/ascii-binary-builder/) | AP CSP | D | Deferred / practice-only | None | 0 → 0 | Native practice settings only | Building a character or message through live bit manipulation is the practice objective; converting it would require a separate question design. |
| [Algorithm Dance Lab](https://davisjm4.github.io/csp-games/algorithm-dance-lab/) | AP CSP | D | Deferred / practice-only | None | 0 → 0 | Native practice settings only | Open-ended choreography, musical timing and live responses require execution and continuous feedback; no standalone scored question contract. |
| [RGB Color Code Builder](https://davisjm4.github.io/csp-games/rgb-color-builder/) | AP CSP | D | Deferred / practice-only | None | 0 → 0 | Native practice settings only | Continuous color matching and tolerance-based manipulation are not represented by the existing single-choice contract. |
| [Create Performance Task Lab](https://davisjm4.github.io/csp-games/create-task-lab/) | AP CSP | B | New | Full | 0 → 2 | Beginner | No additional interaction limitation; live Canvas import not verified. |
| [Algorithm Architect](https://davisjm4.github.io/csp-games/algorithm-architect/) | AP CSP | C | New | Partial | 0 → 9 | Native Mixed | Existing missing-component question only; free construction remains practice. |
| [Algorithm Race](https://davisjm4.github.io/csp-games/algorithm-race/) | AP CSP | A | New | Full | 0 → 3 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [Binary Builder](https://davisjm4.github.io/csp-games/binary-builder/) | AP CSP | C | New | Partial | 0 → 3 | Native Mixed | Capacity, explicit wrap result and pixel bit-count only; direct bit construction remains interactive. |
| [Binary Search Hunt](https://davisjm4.github.io/csp-games/binary-search-hunt/) | AP CSP | C | New | Partial | 0 → 1 | Native Mixed | Midpoint-inspection count only; click-by-click interval search remains practice. |
| [Boolean Gatekeeper](https://davisjm4.github.io/csp-games/boolean-gatekeeper/) | AP CSP | C | New | Partial | 0 → 1 | Native Mixed | Evaluate only; making a satisfying assignment and exploratory truth/range tools remain interactive. |
| [Code Concepts](https://davisjm4.github.io/csp-games/code-concepts/) | AP CSP | C | New | Partial | 0 → 5 | Native Mixed | Single-region identification and counts; multi-region selection is excluded. |
| [Compression Challenge](https://davisjm4.github.io/csp-games/compression-challenge/) | AP CSP | C | New | Partial | 0 → 2 | Native Mixed | Run counting in text/row-major grids; encoding and optimization controls remain practice. |
| [Computing Impact Lab](https://davisjm4.github.io/csp-games/computing-impact-lab/) | AP CSP | C | New | Partial | 0 → 21 | Native Mixed | One explicitly named claim, evidence or reasoning step per item; not the complete three-step response or personal policy reflection. |
| [Cybersecurity Defender](https://davisjm4.github.io/csp-games/cybersecurity-defender/) | AP CSP | C | New | Partial | 0 → 1 | Native Mixed | Exactly one phishing-warning field. No safe/multiple-warning messages or password construction. |
| [Data Detective](https://davisjm4.github.io/csp-games/data-detective/) | AP CSP | C | New | Partial | 0 → 1 | Native Mixed | Standalone dataset-filter counts; sorting, charts and data-cleaning interactions are not exported. |
| [List Lab](https://davisjm4.github.io/csp-games/list-lab/) | AP CSP | C | New | Partial | 0 → 1 | Native Mixed | Final list after the native operations; interactive manipulation itself is not exported. |
| [Mixed AP Exam Practice](https://davisjm4.github.io/csp-games/mixed-ap-practice/) | AP CSP | A | New | Full | 0 → 5 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [Network Breaker](https://davisjm4.github.io/csp-games/network-breaker/) | AP CSP | D | Deferred / practice-only | None | 0 → 0 | Native practice settings only | Constructing a minimal cut requires interactive selection and may have several valid cuts; no validated standalone response-choice set. |
| [Packet Router](https://davisjm4.github.io/csp-games/packet-router/) | AP CSP | D | Deferred / practice-only | None | 0 → 0 | Native practice settings only | Constructing and repairing a route has multiple valid paths and live graph feedback; no validated single-choice adaptation. |
| [Parallel Processing Race](https://davisjm4.github.io/csp-games/parallel-processing-race/) | AP CSP | C | New | Partial | 0 → 2 | Native Mixed | Minimum finishing time under the native queue/dependency model; scheduling construction is not exported. |
| [Response Builder](https://davisjm4.github.io/csp-games/response-builder/) | AP CSP | A | New | Full | 0 → 5 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [Simulation Lab](https://davisjm4.github.io/csp-games/simulation-lab/) | AP CSP | C | New | Partial | 0 → 3 | Native Mixed | Randomness, reference prediction and comparison questions; trial controls and multi-part limitations tasks remain practice. |
| [Test Case Builder](https://davisjm4.github.io/csp-games/test-case-builder/) | AP CSP | A | New | Full | 0 → 5 | Native Mixed | No additional interaction limitation; live Canvas import not verified. |
| [Trivial or Non-Trivial?](https://davisjm4.github.io/csp-games/trivial-nontrivial/) | AP CSP | C | New | Partial | 0 → 4 | Native Mixed | Program A meaningfulness classification; Program B comparisons and paired outcomes are not exported. |
| [Array Lab](https://davisjm4.github.io/java-games/array-lab/) | Advanced CS | B | Existing | Full | 12 → 12 | Beginner, Intermediate, Advanced | No additional interaction limitation; live Canvas import not verified. |
| [Search & Sort Lab](https://davisjm4.github.io/java-games/search-sort-lab/) | Advanced CS | B | Existing | Full | 6 → 6 | beginner, intermediate, advanced | No additional interaction limitation; live Canvas import not verified. |
| [ArrayList Lab](https://davisjm4.github.io/java-games/arraylist-lab/) | Advanced CS | C | New | Partial | 0 → 5 | Native Mixed | Choice, single-cell and insertion-gap decisions; select-every-removed-element tasks excluded. |
| [LinkedList Lab](https://davisjm4.github.io/java-games/linkedlist-lab/) | Advanced CS | C | New | Partial | 0 → 2 | Native Mixed | Traversal and Java collection decisions; reference wiring and pointer mutation excluded. |
| [Boolean & Conditional Lab](https://davisjm4.github.io/java-games/boolean-conditional-lab/) | Advanced CS | C | Existing + expanded | Partial | 5 → 10 | Beginner, Intermediate, Advanced | All ten scored modes; exploratory range tools remain unscored practice. |
| [Class & Object Lab](https://davisjm4.github.io/java-games/class-object-lab/) | Advanced CS | A | New | Full | 0 → 13 | Beginner, Intermediate, Advanced | No additional interaction limitation; live Canvas import not verified. |
| [Debugger Lab](https://davisjm4.github.io/java-games/debugger-lab/) | Advanced CS | A | New | Full | 0 → 5 | beginner, intermediate, advanced | No additional interaction limitation; live Canvas import not verified. |
| [Inheritance & Polymorphism Lab](https://davisjm4.github.io/java-games/inheritance-polymorphism-lab/) | Advanced CS | C | New | Partial | 0 → 1 | Native Mixed | Native single-choice Abstract Class questions only. Hierarchies, multi-selection, tracing tuples, headers and repairs remain practice. |
| [Documentation Lab](https://davisjm4.github.io/java-games/documentation-lab/) | Advanced CS | C | New | Partial | 0 → 3 | Native Mixed | Choice, comment-line and documentation-line interpretation. Editor, Javadoc builder, classification and call construction excluded. |
| [Loop Lab](https://davisjm4.github.io/java-games/loop-lab/) | Advanced CS | A | Existing | Full | 10 → 10 | beginner, intermediate, advanced | No additional interaction limitation; live Canvas import not verified. |
| [Math Lab](https://davisjm4.github.io/java-games/math-lab/) | Advanced CS | A | Existing + expanded | Full | 31 → 33 | Native Mixed, beginner, intermediate, advanced | No additional interaction limitation; live Canvas import not verified. |
| [Method & Constructor Lab](https://davisjm4.github.io/java-games/method-constructor-lab/) | Advanced CS | C | New | Partial | 0 → 8 | Native Mixed | Native choice and single-span identification; argument rearrangement excluded. |
| [Recursion Lab](https://davisjm4.github.io/java-games/recursion-lab/) | Advanced CS | A | Existing | Full | 6 → 6 | Beginner, Intermediate, Advanced | No additional interaction limitation; live Canvas import not verified. |
| [String Lab](https://davisjm4.github.io/java-games/string-lab/) | Advanced CS | A | Existing | Full | 58 → 58 | Beginner, Intermediate, Advanced | No additional interaction limitation; live Canvas import not verified. |
| [Robot Algorithms](https://davisjm4.github.io/java-games/robot-algorithms/) | Advanced CS | C | New | Partial | 0 → 4 | Native Mixed | Prediction, loops, conditionals and methods with complete grid/sensor context. Route construction and repair tasks excluded. |
| [Variable Lab](https://davisjm4.github.io/java-games/variable-lab/) | Advanced CS | C | Existing + expanded | Partial | 1 → 13 | beginner, intermediate, advanced, Native Mixed | Trace plus all 12 identification variants; declaration assembly remains practice. |
| [CSP Exam Readiness Pathway](https://davisjm4.github.io/csp-games/exam-readiness/) | AP CSP | D | Deferred / practice-only | None | 0 → 0 | Native practice settings only | Practice-evidence pathway and tracker, not an assessment question generator. |
| [Workplace Readiness](https://davisjm4.github.io/wpr-games/workplace-readiness/) | WPR | C | Existing | Partial | 4 → 4 | Beginner, Intermediate, Advanced | All four existing modes; five native zero-content skill/mode/level selections remain blocked. Ordering is sequence recognition. |
| [RACECES Writing & Mathematics](https://davisjm4.github.io/wpr-games/raceces/) | RACECES | C | Existing | Partial | 3 → 3 | Beginner, Intermediate, Advanced | Existing three modes across Writing and Mathematics; ordering is sequence recognition, not writing construction. |
| [Class Builder — Rearrange](https://davisjm4.github.io/java-games/class-object-lab/class-builder-rearrange/) | Advanced CS | D | Deferred / practice-only | None | 0 → 0 | Native practice settings only | Learners construct class structure with code blocks; multiple valid arrangements require a separate validated response contract. |
| [API Response Explorer](https://davisjm4.github.io/java-games/documentation-lab/) | Advanced CS | C | New | Partial | 0 → 2 | beginner, intermediate, advanced | Find Data and single-selection Understand Structure across native levels. Slot/classification/multiple-needs tasks excluded. |
| [API Project Builder](https://davisjm4.github.io/java-games/documentation-lab/) | Advanced CS | D | Deferred / practice-only | None | 0 → 0 | Native practice settings only | Multi-request planning, runtime parameters, dependencies and endpoint selection require a staged structured response; a single-choice key would assess a narrower newly designed task. |
