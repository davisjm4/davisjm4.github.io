# Procedural expansion: handoff for ChatGPT Work

Base: `origin/main` `50af5b2` (PR #65). Branch `claude/wpr-procedural-expansion`. Not pushed (no GitHub credentials in the session); delivered as patch, bundle and ZIP. Content only: no navigation, mastery, backend, profile or authentication file was edited, and PR #49 and PR #64 were not touched. This branch does not include the earlier server-issued question bank (PR #49 stack); the two are independent.

## What changed
- 15 new composed kits in `content/compose/kits/*-x1|x2|x3.json` (one primary objective each, about 9 decisions per kit: 4 to 5 issues, 3 flawed-line defects, 1 ordering task). They feed Mixed practice and the per-area activities through the existing hybrid selector. Nothing in `js/` changed.
- `big-picture-thinking.json`: option wording of `big-closing-impacts` repaired (long-answer cue).
- `js/data/compose-bundle.js` regenerated with `npm run build` (generated; if it conflicts, re-run the build, do not hand-merge).
- Tools: `tools/content-coverage-matrix.js [--check]`, `tools/content-quality-audit.js`, `tools/content-samples.js`.
- Tests: `tests/content-expansion.test.js` (7 tests).
- Reports in `reports/`: coverage matrix (CSV/JSON, before and after), gap priorities, quality audit, samples, audit JSON.

## Integration notes for the area activities
- Each area's objectives are tagged on kits: kits list their concepts, so a kit tagged `[A, B]` supplies decisions to both. Mixed-by-area selection should filter by `skill` or by concept as the existing selector does; the new kits need no special case.
- Kits carry difficulty through `onlyLevels` and defect levels, not through a cap on mastery.
- Settings: several new kits are restricted to realistic contexts, so a filtered setting can have fewer kits.
- Formats per kit: decision, next step, order, find-the-problem.

## Validation (from `wpr-games/workplace-readiness`)
- `npm run build` then `node --test tests/compose-engine.test.js tests/compose-numeric-oracle.test.js tests/compose-bulk.test.js tests/compose-diversity.test.js tests/core.test.js tests/validator.test.js tests/generator.test.js tests/grader.test.js tests/app-logic.test.js tests/audit.test.js tests/content-expansion.test.js`: 238 tests, all pass.
- `node tools/compose-sweep.js --seeds=2`: 3,933 units, 195,284 renders, 0 errors.
- `node tools/content-quality-audit.js --n=3000`: 66 kits, 0 flagged.
- `node tools/content-coverage-matrix.js --check`: current.
- Chromium: `tests/browser/app.test.js` and `compose.test.js` give 7 failures of 36 on unmodified `main` as well (stale after PR #65); not caused by this change. The new kits were not exercised in a browser.

## Not done / risks
- 32 objectives still have under 4 primary decisions (`CONTENT_GAP_PRIORITIES.md`). Safety-sensitive objectives were deliberately left for reviewed authoring.
- No educator review; keyed answers are single-reader judgements. Do not enable automatic mastery from this content alone.
- Possible duplication with the PR #49 server-issued bank (for example wrong-recipient email) when both are integrated.
- Possible independent-issue ordering and context-realism problems in existing kits (unmeasured).
