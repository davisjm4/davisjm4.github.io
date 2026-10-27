# Package B — Teacher Tools & QTI Reliability Repairs

DevCat Studios — CS Games · October 26, 2026 (Pacific)

Teacher Tools: https://davisjm4.github.io/cs-games/teacher/
Repository: https://github.com/davisjm4/davisjm4.github.io
Implementation commit: `3b011968651164083b0d8fa3f682c05507080f95`
Verified source tree: `9398fad2f140959d856b2e282631301921308143`

## Outcome and verification boundary

Implemented R-01 through R-04 and the related R-09 eligibility messages. Existing exports now preserve Search & Sort question context, resolve difficulty consistently, include explicit item points and percentage response weights, and link explanations to general feedback. Invalid or incomplete assessments cannot be downloaded. All ten sources and 136 registered export variants remain available.

The focused regression suite passes across 289 supported source/mode/level cells, 544 form-selection cells, 484 source-filter checks, and 112 Search & Sort family/level cells. Forty-five generated QTI packages pass independent ZIP, XML, content, answer, scoring, and feedback validation. Browser verification exercises the actual form, preview, regeneration, eligibility messages, and downloads. The live browser suite also passed all 26 generation cases, five unsupported-selection blocks, regeneration, and three downloads. All nine runtime files match the tested source byte for byte. Final deployment results are recorded in `deployment-verification.json` and the published browser evidence.

**Canvas import remains unverified.** No approved nonproduction Canvas course was available or identified, and no Canvas course was accessed or modified. Static response-processing evaluation and successful GitHub Pages operation do not establish actual Canvas import, quiz-engine conversion, district-specific scoring, or feedback visibility after submission.

## Audit and repository inspection

Read the original `CS_WPR_Comprehensive_Audit.zip`, including its Executive Audit Report, Detailed Technical & Instructional Audit, CS/WPR Audit Workbook, Teacher Tools catalog and sampling evidence, difficulty mismatches, missing-context examples, QTI validation results, and reproduction scripts. The separately attached `CSP_Implementation_Reports.zip` contains earlier activity implementation reports; it is not the comprehensive audit.

Audit baseline: `a1490cbc312807fe7e40638b18027411b86fbca3`. The latest upstream checkout before implementation was clean at `6a944c9e4ace1470e3930f8117941f5eaaa9a3e0`. Package A commit `ae4c9264e9ff124bbf788d53717da4e49acab0ec` is an ancestor. Teacher Tools had no changes between the audit baseline and that checkout; the four defects remained reproducible. Upstream was fetched again before publication, with no intervening changes.

Actual source directory: `cs-games/teacher/`. Registry and generator bridges are in `adapters.js`; the form is in `teacher.js`; QTI and ZIP generation are in `qti.js`. WPR and RACECES have separate teacher-only adapters. Existing source engine interfaces were inspected and retained.

## Root causes and repairs

| Finding | Root cause | Repair |
| --- | --- | --- |
| R-01: missing context | Search & Sort's export interface supplies arrays and counting rules, while the adapter retained only stem, code, choices, and explanation. The game also displays descriptions, labels, array markers, and split trees. | Compare the exported stem/code/rule/arrays with the source challenge. Preserve rules, descriptions, code labels, arrays, indices, markers, notes, and split-tree rows as escaped, readable text. Include context in uniqueness signatures. Reject inconsistent/missing source export fields and unknown visual types. |
| R-02: wrong level | Form values use title case, but Variable, Loop, and Search & Sort advertise lowercase IDs. Case-sensitive exact and nearest-level comparisons treated all lowercase levels as missing and chose the first level. | One teacher-only resolver compares canonical lowercase IDs, then supplies each generator's expected spelling. Validate the actual returned difficulty. Retain documented nearest-level selection with a visible notice. |
| R-03: scoring metadata | Items lacked `points_possible`, and each declared the quiz total as its SCORE maximum while assigning a raw per-item point value. | Use Canvas's exported-item convention: item `points_possible=P`, SCORE range 0–100, correct weight 100, each incorrect weight 0, default 0. Record the assessment total as the sum of item points. No point multiplication in response weights. |
| R-04: feedback | Explanations existed in `itemfeedback` but had no response-processing reference. The previous generic identifier was not Canvas's conventional general feedback ID. | Emit `general_fb` with an unconditional, continuing `displayfeedback` condition before scoring. Correct, incorrect, and omitted responses reference the same intended explanation once. |
| R-09: eligibility/errors | Form selections could request empty WPR filter combinations. Generic bounded retry failures did not identify the unavailable selection; partial results could remain downloadable. | Consult existing WPR eligible-unit and RACECES model metadata, explain unavailable source/mode/level/filter selections, suggest alternatives, retain bounded retries, and return no downloadable partial assessment. |

The generation/distribution logic now has a teacher-only, DOM-independent entry point used by both the form and regression tests. This extraction makes form-to-item behavior testable while preserving existing source-first distribution, deterministic seeds, and duplicate checks. No source generator definitions were changed.

## Before and after: exact audit examples

| Seed and selection | Before | After | Preserved key |
| --- | --- | --- | --- |
| 78237 · Search & Sort / Compare / Beginner | Asked which search works for “this array” without providing an array. | Includes `values: [3, 19, 25, 40, 42, 26, 48]` and indices. | Linear search only |
| 78508 · Compare / Intermediate | Asked the comparison count for finding 89; supplied a method without its input array or counting rule. | Includes all 12 values `[6, 7, 19, 23, 28, 32, 36, 69, 71, 85, 93, 95]`, indices, method, and the rule to count each equality comparison. | 12 |
| 78779 · Compare / Advanced | Referred to three starting orders without including the actual arrays. | Includes sorted, reverse, and shuffled arrays, plus the assignment counted as a shift. | Sorted order |
| 731 · Loop / Advanced / three questions | Live audit generated three Beginner items. | Form and actual item labels remain Advanced; no Beginner substitution. | Source answers unchanged |

The original audit samples and 34 difficulty mismatch pairs are included under `audit-before/`. Reproduced repaired context is in `audit-context-after.json`.

## Question context and answer preservation

The adapter uses the existing Search & Sort `exportQuestion` result and source visual fields. It never exports solution traces, reveal steps, or answer-only metadata as question context. Java remains escaped inside `<pre><code>`; other context uses escaped paragraphs and line breaks. Preview and QTI use the same renderer.

Tests compare normalized stems, source code, choices, keyed indices, explanations, arrays, and counting rules against the original generator output. Every reachable Search & Sort family/level combination was forced and checked for preservation of its displayed context. Mutation tests remove arrays, rules, source code, or normalized required context and confirm rejection. The final export gate also checks IDs, question count, positive finite points, four distinct answers, valid keys, explanations, and XML control characters.

These checks establish the repaired conversion contracts and seeded coverage, not independent educator certification of every possible generated prompt or distractor.

## Difficulty test matrix

| Selection | Coverage | Result |
| --- | --- | --- |
| Beginner, Intermediate, Advanced | Every registered variant through the same builder used by the form | Actual item difficulty matches exact supported level. |
| Variable Trace | One mode × four form selections | All exact levels preserved; Mixed samples supported levels. |
| Loop Lab | Ten modes × four form selections | All exact levels preserved, including audit seed 731. |
| Search & Sort | Six modes × four form selections | All exact levels preserved with full question context. |
| Mixed difficulty | Every variant and a 50-question, ten-source assessment | Supported levels selected deterministically; native Mixed retained for Math. |
| Limited-level String families | All registered export-level contracts | Nearest supported level selected with an explicit notice in settings, generation status, and preview. |
| Math native level | 31 variants | Native Mixed clearly disclosed for specific-level requests. No artificial difficulty labels. |
| Invalid difficulty ID | Resolver regression | Rejected with supported alternatives. |

Full requested and actual levels, fallback notices, and deterministic seeds are in `difficulty-matrix.json` and `adapter-matrix.json`. The suite covers all 34 audit mismatch pairs within the full form matrix.

## Per-source regression results

Each supported mode/level cell received 20 deterministic direct adapter attempts. Rejected candidates were not exported; bounded generation filled every supported form-selection test. Raw candidate rejections reflect existing four-choice/validation constraints and are not failures of a supported cell.

| Source | Variants | Supported level cells | Accepted / 20-per-cell attempts | Rejected candidates |
| --- | ---: | ---: | ---: | ---: |
| Workplace Readiness | 4 | 12 | 240 / 240 | 0 |
| RACECES | 3 | 9 | 180 / 180 | 0 |
| Boolean & Conditional | 5 | 15 | 300 / 300 | 0 |
| Variable Trace | 1 | 3 | 47 / 60 | 13 |
| Math | 31 | 31 | 620 / 620 | 0 |
| String | 58 | 117 | 2,279 / 2,340 | 61 |
| Loop | 10 | 30 | 600 / 600 | 0 |
| Array | 12 | 36 | 720 / 720 | 0 |
| Recursion | 6 | 18 | 360 / 360 | 0 |
| Search & Sort | 6 | 18 | 360 / 360 | 0 |
| **Total** | **136** | **289** | **5,706 / 5,780** | **74** |

All 23 RACECES topic filters × three modes × three levels generated correctly. All 22 WPR skills × four modes × three levels were checked against their eligibility contract, and all 13 career settings were checked. Existing WPR adapter tests additionally validated 5,174 accepted candidates against the source graders, including exactly one correct displayed answer, authored/composed content, determinism, and unique 10/20/50-item assessments.

## Known unsupported combinations

These five WPR combinations have zero native eligible units and now produce explicit messages rather than repeated failed generation or substitute questions:

| Skill | Mode | Level |
| --- | --- | --- |
| Job-specific tools and technologies | Put the Steps in Order | Beginner |
| Mathematics | Best Next Step | Beginner |
| Mathematics | Put the Steps in Order | Intermediate |
| Professionalism | Put the Steps in Order | Beginner |
| Reading and writing | Put the Steps in Order | Intermediate |

An unavailable filtered selection blocks generation even when a short quiz would otherwise skip that selected mode. Mixed checks every advertised level for each selected mode; if a filter makes one unavailable, the message identifies that level. Teachers can choose another mode or level or clear the filters. No new content was added to fill these gaps.

Other existing boundaries remain: Math has no difficulty interface; String families export only their declared eligible levels; unregistered game modes and sources remain unregistered. Ordering adaptations remain single-answer multiple choice rather than construction tasks.

## QTI scoring and feedback validation

The exporter remains QTI 1.2 with the existing stored-ZIP implementation. The manifest references `assessment.xml`. Every item explicitly declares its Canvas question type and points.

| Points per item | Representative single-source package | 50-item mixed package | Correct / incorrect response weight |
| ---: | ---: | ---: | --- |
| 1 | 3 points total | 50 points total | 100 / 0 |
| 3 | 9 points total | 150 points total | 100 / 0 |
| 5 | 15 points total | 250 points total | 100 / 0 |

Forty-five generated packages contain 529 item instances in total: per-source 1/3/5-point examples, three 50-item mixed assessments, and all-variant packages split at 50 items. These are test package instances, not a claim of 529 unique reasoning families.

The independent validator opens ZIPs, checks CRC and manifest targets, parses XML with an XML parser, checks item IDs and keyed choices, compares content/explanations with expected source data, and executes response conditions for every choice plus an omitted response. It checks item points, quiz totals, percentage weights, absence of double scaling, valid feedback references, and exactly the intended general explanation for each outcome. Results are in `qti-validation.json`. Actual browser downloads are validated separately.

Primary implementation references:

- Instructure's QTI importer, pinned at `12c738572c93eb889408a91aca7a76de7c885a5d`: https://github.com/instructure/qti/tree/12c738572c93eb889408a91aca7a76de7c885a5d . Inspected item metadata/points, choice interaction scoring, general-feedback handling, and Canvas-exported QTI fixtures.
- QTI 1.2 XML binding: https://www.imsglobal.org/question/qtiv1p2/imsqti_asi_bindv1p2.html .
- QTI 1.2 outcome processing: https://www.imsglobal.org/question/qtiv1p2/imsqti_asi_outv1p2.html .

No district Canvas import was performed. Actual Classic/New Quizzes point conversion, feedback rendering, HTML sanitization, release timing, and settings that control student visibility remain unverified. Do not infer Canvas certification from ZIP/XML validity or the static evaluator.

## Files modified

Production files, all under `cs-games/teacher/`:

- `adapters.js`: preserve actual levels, Search & Sort context, source code requirements, and notices.
- `difficulty.js`: shared case-insensitive level resolution.
- `search-context.js`: source-to-export context checks and accessible text conversion.
- `assessment-builder.js`: shared bounded generation, eligibility preflight, complete-assessment enforcement.
- `qti.js`: export validation, item metadata, percentage scoring, feedback references.
- `raceces-adapter.js` and `workplace-adapter.js`: teacher-only eligibility queries against existing catalogs.
- `teacher.js`: use shared generation, present notices/errors, guard downloads, retain accurate point display.
- `index.html`: necessary eligibility text and module cache version. Its navigation header is unchanged.

Tests and automation: `package-b-tests.mjs`, `package-b-browser-tests.cjs`, `test-runtime.mjs`, `validate-qti-packages.py`; relevant scoring assertions in `adapters-tests.mjs`, `qti-tests.mjs`, `workplace-adapter-tests.mjs`; `.github/workflows/teacher-tools-check.yml`. Existing Package A workflow is unchanged.

The repository stores this report and `PACKAGE_B_VALIDATION_EVIDENCE.zip` under `cs-games/reports/package-b/`. Extract that archive for the JSON matrices, logs, 45 generated QTI packages, and three live downloads described here. Test-created changes to unrelated historical result files were restored before committing.

## Commands and outcomes

Run from repository root unless stated otherwise. Full logs are in `test-results/`.

| Command | Outcome |
| --- | --- |
| `PACKAGE_B_EVIDENCE_DIR=cs-games/reports/package-b node cs-games/teacher/package-b-tests.mjs` | Pass: source, difficulty, filter, mutation, determinism, mixed, and package matrices above. |
| `python3 cs-games/teacher/validate-qti-packages.py cs-games/reports/package-b/qti` | Pass: 45 generated packages. |
| `node cs-games/teacher/package-b-browser-tests.cjs` with Chromium/output environment variables | Pass: 26 actual form-generation cases, five blocked filters, nearest-level notice, regeneration, three downloads, no page/request errors. |
| Same browser command with `PACKAGE_B_BASE_URL=https://davisjm4.github.io` | Pass: all 26 generation cases, five blocked filters, regeneration, and three downloaded ZIPs. All live ZIPs pass the independent validator. |
| `node cs-games/teacher/qti-tests.mjs` | Pass: formatting, escaping, QTI and ZIP checks. |
| `node cs-games/teacher/adapters-tests.mjs` | Pass: 852 accepted samples, all 136 variants, 24-item mixed and 50-item distinct assessments. |
| `node cs-games/teacher/workplace-adapter-tests.mjs` | Pass: all 66 skill/level selections, source graders, filters, uniqueness and QTI. |
| `node cs-games/teacher/quiz-distribution-tests.mjs` | Pass: balanced deterministic 3/6/10/20/50-item distribution. |
| `node cs-games/navigation-tests.mjs` and `node cs-games/catalog-tests.mjs` | Pass: Package A pathways, routes, returns, searches, filters, and catalog counts. |
| `npm test` in `csp-games` | Pass: full existing CSP regression command. |
| `npm run test:unit` and `npm run test:compose` in Workplace Readiness | Pass: 129 unit and 102 compose tests, zero failed/skipped. |
| Same unit/compose commands in RACECES | Pass, including 23 topics and mathematics records. |
| `node java-games/loop-lab/loop-redesign-tests.mjs` | Pass: 30,440 checks. |
| `node java-games/boolean-conditional-lab/boolean-tests.mjs` | Pass: 25,925 compatibility checks. |
| `node java-games/recursion-lab/recursion-tests.mjs` | Pass: 18,000 challenges and 94,463 checks. |
| `node java-games/string-lab/tests/generator.test.cjs` | Pass, including representative JVM checks. |
| `npm run test:search-sort-lab --prefix java-games` | Algorithms, 18,000 generator challenges, quality analysis, and JVM checks pass; existing UI return-label assertion fails identically on untouched upstream. |
| `npm test` in `java-games` | Stops at an existing Debugger navigation-label assertion, after earlier session/math/array suites pass. Reproduced on untouched upstream. Not a full green Java suite. |
| `node cs-games/teacher/raceces-adapter-tests.mjs` | Existing stale 15-topic assertion fails against the current 23-topic catalog, identically on untouched upstream. Left unchanged under Package C deferral; new tests validate all 23 topics. |
| `git diff --check` | Pass. |

GitHub Actions passed Teacher Tools reliability, Unified Navigation verification, Array Lab Verification, and Pages build/deployment on implementation commit `3b011968651164083b0d8fa3f682c05507080f95`. The nine runtime files returned HTTP 200 and exactly match the tested checkout. The published browser suite reported zero page errors and zero failed requests. Its three unchanged downloaded archives and validation sidecars are in `published-qti/`; `live-qti-validation.json` verifies ZIP integrity, item counts, content, keys, points, and explanations against the actual displayed previews. Canvas course import was not performed.

## Outstanding issues and scope confirmation

1. A separately authorized Canvas sandbox import is still required to establish actual Canvas point/feedback fidelity.
2. Existing stale RACECES, Debugger navigation, and Search & Sort navigation test assertions remain documented, with untouched-upstream reproduction logs. No source or test-contract repairs were made for these unrelated failures.
3. The deferred Loop misconception explanation, tracker reconciliation, comprehensive device/accessibility work, and additional integrations remain outside this change.

Package A navigation, course catalogs, all student game URLs, generators, families, layouts, scoring, summaries, daily behavior, storage, WPR/RACECES practice applications, and existing Canvas links were preserved. No student game directory was modified. No Google Sheets or tracker write was made. Packages C–F remain untouched. No accounts, backend, dashboard, games, modes, families, or source integrations were added.
