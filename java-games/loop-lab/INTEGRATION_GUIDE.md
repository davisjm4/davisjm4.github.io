# Integration Guide (for ChatGPT Work)

The contents of this ZIP's `loop-lab/` folder are a drop-in replacement for `java-games/loop-lab/`. These files were built against the repository as of commit `16b628c` ("Increase reference practice variety and normalize repeat metrics"), the last commit touching `java-games/loop-lab/`.

## 1. Files

**Replaced** (same paths as today):

| File | Change |
|---|---|
| `index.html` | Cache-bust version `loop-redesign-v1` → `loop-expansion-v2`. |
| `loop-engine.js` | Rewritten. Keeps the exports `familyNames`, `challengeFamilies`, `generateLoop`, `assessLoop`; adds `generateChallenge`, `createLoopSession`, `MODES`, `DIFFICULTIES`, `distractorFor`, `MISCONCEPTIONS`, `validateChallenge`. |
| `loop-ui.js` | Same layout, IDs (`mode`, `new`, `stage`, `choices`, `check`, `next`, `feedback`, `stats`) and session calls. Adds a Difficulty select, grouped mode menu, misconception note, trace table, and `role="radio"`/`aria-checked` choices with arrow-key navigation. A test-only hook is exposed only when the URL has `?test=1`. |
| `loop.css` | Original rules unchanged; additions appended at the end. |
| `loop-redesign-tests.mjs` | Updated version of the original test (see section 4). |

**New:**

```
engine/          rng.js, java-model.js, questions.js, fam-util.js, variety.js,
                 families-original.js, families-algorithms.js, families-executions.js
tests/           engine.test.mjs, diversity.test.mjs, jvm.test.mjs, jvm-harness.mjs,
                 browser.test.mjs, run-all.mjs, legacy-fixtures.json
tools/           gen-reports.mjs, make-fixtures.mjs, show.mjs, quick-stats.mjs
reports/         *.json produced by the last test run (inputs to the generated reports)
legacy/          loop-engine.original.js, loop-redesign-tests.original.mjs (reference copies; optional)
package.json     loop-lab test scripts (no runtime dependencies)
README.md  INTEGRATION_GUIDE.md  DEVELOPMENT_REPORT.md  TEST_RESULTS.md  DIVERSITY_REPORT.md
```

The page needs only `index.html`, `loop-ui.js`, `loop-engine.js`, `loop.css` and `engine/`. Everything else is development material. It is safe to publish, but you may omit `tests/`, `tools/`, `reports/` and `legacy/` from the published site.

## 2. Steps

1. Replace `java-games/loop-lab/` with this package's `loop-lab/` folder. Keep the existing `../session.js` and `../style.css`; they are imported unchanged.
2. From `java-games/`, run `node loop-lab/loop-redesign-tests.mjs`. The existing `npm test` script in `java-games/package.json` already calls this file, so no edit is needed.
3. From `java-games/loop-lab/`, run `node tests/run-all.mjs --quick`. Then run the full suites (`node tests/run-all.mjs`, or `--suite 0` through `--suite 4` one at a time). JVM: set `JAVA_HOME` to a JDK 17+. Browser: `npm install puppeteer-core`, then set `CHROME_PATH` and `JAVA_GAMES_DIR=..` (the browser test also copies `../../csp-games/style.css` when present).
4. Open `/java-games/loop-lab/` locally. Check that the mode menu shows Mixed + 8 original + 2 new modes and that Difficulty changes the challenges.
5. Commit and publish.

## 3. Compatibility notes

- **Session Summary:** uses the shared `javaGames.session.v1` tracker (`begin` → `annotate` with mode, difficulty, skill, family, and seed → `submit` once → `reveal` if wrong → `skip` when leaving an unanswered challenge). Game id `loop-lab`. Topic ids keep the original format `mode.variant` (for example `iterations.inc-exclusive`). For the new modes the format is `mode.family` (for example `algorithms.digit-extraction`, `executions.nested-dependent`). The topic count is bounded (95 total); mode and difficulty are also stored in each record's details. Existing stored records for old topic ids remain valid.
- **Cache-busting:** every internal import carries `?v=loop-expansion-v2`. When editing any engine file later, bump this string everywhere at once (`index.html`, `loop-ui.js`, `loop-engine.js`, `engine/*.js`). Mixed versions would load two copies of a module.
- **Node version:** `loop-redesign-tests.mjs` uses JSON import attributes (`with { type: "json" }`), so it needs Node 20.10+ (or 18.20+).
- **Not touched:** the hub's separate Loop Lab in `java-games/engine.js` (Structure / Execution / Nested) and its tests (`loop-quality-tests.mjs`, `loop-jvm-tests.mjs`, `ui-tests.mjs`), Boolean & Conditional Lab, Recursion, String, Search & Sort, Array, Math, Class & Object Labs, Teacher Tools, Teacher Reporting.
- **Existing JVM test path:** the repo's `loop-jvm-tests.mjs` hardcodes `/usr/lib/jvm/java-17-openjdk-amd64/bin/java`. The new `tests/jvm.test.mjs` instead uses `JAVA_HOME`, then Java 17, 21, or `/usr/bin/java`.

## 4. The original test file

The original `loop-redesign-tests.mjs` cannot pass against generated questions, for two reasons:

1. It asserts that 1,200 mixed draws cover every variant name. There are now 95 variants, and two modes share the variant name `compound-and`.
2. It pins 25 literal answers from the static bank.

The updated file keeps every other assertion. It draws 6,000 instead of 1,200 and counts `family/variant` pairs. It replaces the pinned table with 75 seeded regression fixtures (`tests/legacy-fixtures.json`), so the legacy variants at fixed seeds must keep producing the same answers. After an intended generator change, regenerate the fixtures with `node tools/make-fixtures.mjs`. The untouched original is in `legacy/` for comparison.
