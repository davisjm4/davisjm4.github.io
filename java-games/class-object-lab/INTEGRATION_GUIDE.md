# Integration guide — Class & Object Lab compositional generator

For whoever integrates and publishes this package (ChatGPT Work). Nothing has been committed, pushed or published. The patch is based on upstream commit **`4a3ba6c`** ("Use configured step for Range Explorer keyboard control", 2026-10-21). Work began on `26817fd`. Before packaging, upstream had moved on; most importantly, commit `b7dd874` ("Standardize CS Games practice sessions") had changed `class-ui.js`, `session.js`, Class Builder's `src/session.js` and the `npm test` chain. The work was rebased onto `4a3ba6c` and those changes were merged, not overwritten:

- `class-ui.js` uses `../session.js?v=per-mode-daily-v1`.
- `tracker.begin` receives `(…, mode, modeTitle)` for conventional modes and for Class Builder (`class-builder-rearrange`).
- The statistics line uses `roundSummary("class-object-lab", $("mode").value)` and stays visible, and updates, in Class Builder.
- The A–D letter badges are removed, matching the other labs.

Class Builder's daily-session code is untouched. If upstream has moved again, `git apply --check` will report any conflict.

## 1. Scope

Only `java-games/class-object-lab/` and one line group in `java-games/package.json` change. Nothing is modified in `session.js`, `summary.js`, Teacher Tools, the catalog, `cs-games/`, or `class-builder-rearrange/`.

### Replace (modified files)

| File | Change |
|---|---|
| `java-games/class-object-lab/class-engine.js` | Now a backward-compatible facade over `compose/`. All 8 original exports are kept; new: `generateChallenge`, `createPracticeSession`, `difficulties`, `DEFAULT_DIFFICULTY`, `MODE_IDS` |
| `java-games/class-object-lab/class-ui.js` | Difficulty selector; pre-formatted code; context note; misconception feedback; trace; object diagram; Review tag; `tracker.annotate` with difficulty/family/reasoning. The Class Builder loader and session adapter are unchanged in behaviour |
| `java-games/class-object-lab/class.css` | Additive rules appended at the end (no existing rule removed) |
| `java-games/class-object-lab/index.html` | Cache tokens only: `class.css?v=class-object-compose-v1`, `class-ui.js?v=class-object-compose-v1` |
| `java-games/class-object-lab/class-object-tests.mjs` | One line: imports `./class-engine-legacy.js` instead of `./class-engine.js`. Every assertion is unchanged; it keeps testing the original 52 templates, which it was written for |
| `java-games/package.json` | Adds scripts `test:class-object-compose`, `test:class-object-jvm`, `test:class-object-browser`. The existing `test` chain is unchanged |

### Add (new files)

- `java-games/class-object-lab/class-engine-legacy.js` — the original engine, verbatim apart from its first comment line.
- `java-games/class-object-lab/compose/` — 13 modules plus `families/` (5 files). **Runtime code: required.**
- `java-games/class-object-lab/tests/` — `compose.test.mjs`, `jvm.test.mjs`, `jvm-oracle.mjs`, `class-object-browser.py`, `legacy-baseline.mjs`, `gen-samples.mjs`, `gen-docs.mjs`. Development only.
- `java-games/class-object-lab/test-results/` — JSON results and three screenshots. Optional to publish.
- `java-games/class-object-lab/*.md` — README, GENERATOR_SCHEMA, REASONING_DIVERSITY_REPORT, JAVA_VERIFICATION_REPORT, TEST_RESULTS, GENERATED_SAMPLES, INTEGRATION_GUIDE.

### Leave unchanged

`class-engine-rebuilt.js` was already a byte-identical, unreferenced copy of the original engine. It is deliberately untouched, and nothing imports it. `java-format.js` and everything under `class-builder-rearrange/` are unchanged.

## 2. Apply

Choose one option.

**A. Patch (recommended).** From the repository root:

```bash
git apply --check class-object-compositional-generator.patch
git apply class-object-compositional-generator.patch
```

The patch covers all source, tests, documentation and JSON results. The three PNG screenshots are not in the patch; copy them from the ZIP's `repo/` tree if you want them.

**B. Copy.** Copy `repo/java-games/class-object-lab/` and `repo/java-games/package.json` from the ZIP over the repository. The ZIP contains the complete updated directory, including the unchanged Class Builder files.

## 3. Runtime files

Required in production:

- `index.html`, `class-ui.js`, `class-engine.js`, `class.css`, `java-format.js`
- `compose/*.js` and `compose/families/*.js`
- `class-builder-rearrange/**` (unchanged)
- the shared `../session.js`, `../summary.js` and site stylesheet (unchanged)

`class-engine-legacy.js` is needed only by the original test. `tests/`, `test-results/` and the Markdown files are not loaded by the page.

## 4. Cache versioning

`index.html` → `class-ui.js?v=class-object-compose-v1` → `class-engine.js?v=class-object-compose-v1`.

The modules under `compose/` are imported without query strings. When you edit any `compose/` file later, bump **both** tokens: the one in `index.html` and the one in `class-ui.js`'s import of `class-engine.js`. Also expect browsers to fetch `compose/` modules fresh only after their HTTP cache expires. If you need immediate updates of `compose/` alone, add `?v=` to the imports inside `class-engine.js` and `compose/engine.js`.

## 5. Verify before publishing

From `java-games/`:

```bash
npm test                                  # repository chain (22 commands); run with LANG=C.UTF-8 —
                                          # array-lab/advanced-tests.mjs fails under a non-UTF-8 locale
                                          # because its JVM prints "↔" (environment, not code)
npm run test:class-object-compose         # ~70–90 s, quick profile of the new suite
npm run test:class-object-jvm             # needs javac/java; skips cleanly otherwise
npm run test:class-object-browser         # needs Python Playwright + Chromium
node ../cs-games/catalog-tests.mjs
```

Some existing suites rewrite their own result files (`math-lab/expansion/tests/results/test-report.json`, `search-sort-lab/tests/results/generator-table.json`). Discard those changes unless you mean to commit them.

## 6. Deployment smoke checks (live site)

1. Open `/java-games/class-object-lab/`. A challenge appears, the Difficulty selector shows Beginner/Intermediate/Advanced, and the console has no errors.
2. Choose *Object references and aliases* → *Advanced*. The header shows "Object references and aliases · Advanced". Submit a wrong choice: the choices lock, "About your choice", the trace and the "Final object state" diagram appear.
3. Click *Next Challenge* without answering. The Session Summary shows one skip.
4. Choose *Class Builder — Rearrange*. The Difficulty selector disappears, Class Builder loads with its own level buttons, and switching back restores the selector.
5. Reload. The chosen difficulty is remembered. Open `?mode=aliases&difficulty=Beginner` to confirm the URL parameters.
6. Narrow the window to about 360 px. There is no horizontal page scroll (code blocks scroll inside themselves).
7. Open the Session Summary. Earlier Class & Object Lab records are still present, under the same 13 topic names.

## 7. Compatibility notes

- **Stored progress.** Topics are still the 13 mode ids (`structure` … `reverse`), so existing records keep their meaning. Class Builder still records under `class-builder-rearrange/<difficulty>`, through the unchanged adapter.
- **`generateClassObject(mode, r, difficulty = "Beginner")`.** The third parameter is new. Callers that pass only `(mode, r)` get Beginner challenges with the new shape, which still includes `code`, `prompt`, `choices`, `answer`, `correctAnswer`, `explanation`, `topic`, `topicTitle`, `variant` and `signature`. The challenge no longer carries the old pre-submission `objects`/`arrows` card data, because that could reveal state before submission. The new UI draws the diagram after submission from `diagram`.
- **`challengeFamilies[mode]`.** Now reports the number of semantic families per mode (1–5) instead of the template count (4).
- **Signatures.** `question.signature` is now deterministic (the exact signature) instead of carrying a random suffix. Any code that relied on signatures always being unique should use `id`.
- **Teacher Tools.** Not modified. `generateChallenge({mode, difficulty, seed})` touches no session storage, so a future adapter can call it directly.

## 8. Assumptions not verifiable from here

- The live site serves `.js` with a JavaScript MIME type, as GitHub Pages does; ES module imports require it.
- Browsers other than Chromium were not tested: no Safari, Firefox, physical Chromebook or screen reader.
- The repository may have moved on since 2026-10-21. If `git apply --check` fails on a file, compare it with the copy in the ZIP's `repo/` tree and merge by hand. The changes in section 1 are small and self-contained.
