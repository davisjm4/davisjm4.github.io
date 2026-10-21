# Integration guide — compositional generator (for ChatGPT Work)

**Scope:** `wpr-games/raceces/` only. Nothing outside that directory was changed. Do not touch `/wpr-games/workplace-readiness/`, Java Games, CS Games, Teacher Tools, shared navigation or shared scoring.

**Baseline:** built and tested against `davisjm4.github.io` commit `021975f` ("Refresh cache keys for workplace generator assets"). If `wpr-games/raceces/` has changed since that commit, apply the patch rather than copying the directory, and resolve any conflicts by hand.

## Option A (recommended when raceces is unchanged since 021975f): copy the directory

Replace `wpr-games/raceces/` with `raceces/` from this ZIP. The ZIP's `raceces/` directory is a complete, tested copy (authored content untouched, plus everything below).

## Option B: apply the patch and add the new files

1. From the repository root, run `git apply --check integration/raceces-compositional.patch`, then `git apply integration/raceces-compositional.patch`. This modifies the 8 files listed below.
2. Copy every path listed under "Files to add" from `raceces/` in this ZIP into `wpr-games/raceces/`.

## Files to add

| Path (under `wpr-games/raceces/`) | Purpose |
|---|---|
| `content/compositional/*.json` (15 files) | Scenario kits, one per existing topic id |
| `js/compose/grammar.js`, `phrases.js`, `check.js`, `structures-design.js`, `structures-process.js`, `structures-observation.js`, `compose.js` | Generator modules |
| `js/data/compose-bundle.js` | **Built** bundle. Regenerate it with `npm run build`; never hand-edit |
| `tools/build-compose.js`, `validate-compose.js`, `diversity-audit.js`, `gen-compose-docs.js`, `gen-samples.js`, `sample-compose.js` | Build, validation, audit, docs and samples |
| `tests/compose/run-compose.js`, `tests/browser/compose-run.js`, `tests/fixtures/legacy-output-hash.txt` | Tests |
| `GENERATOR_SCHEMA.md`, `DIVERSITY_REPORT.md`, `COMPOSE_TEST_RESULTS.md`, `INTEGRATION_GUIDE_COMPOSITIONAL.md`, `samples/` | Documentation |

## Files modified (8 files, about 170 lines added; all backward compatible)

| File | Change | Effect on existing behavior |
|---|---|---|
| `js/engine/generator.js` | Optional third constructor argument `{ compose }`. Hybrid catalogue (authored models plus generated configurations); `build()` routes `g:` ids to `Compose.buildResponse`; a declared dependency fixes the pair order; in compositional mode only, the same structure is never shown twice in a row and none of the last 3 configurations repeats; a configuration that fails to build is quarantined; adds `makeIndex` export | **None without `{compose}`**: output is byte-identical (SHA-256 test over 6,390 challenges) |
| `js/engine/missing.js` | Uses the `crossExp` and `nonAnswer` distractors when the response provides them; length-balanced choice for 5-candidate pools | Authored pools and outputs unchanged |
| `js/engine/rearrange.js` | `analyze(order, info, dependency)` enforces a declared order dependency; a dependent response has `solution.alternate = null` | Independent pairs still accept either order |
| `js/engine/feedback.js` | Messages for `crossExp`, `nonAnswer` and the `dependency` rearrange issue; the correct-order note for dependent responses | Additive |
| `js/engine/validator.js` | Handles `alternate: null`, and checks that a dependency is enforced | Additive |
| `js/ui/app.js` | Constructs the generator with `{ compose: R.COMPOSE_LIBRARY }`; honest wording ("authored writing models and N generated writing problems", "distinct writing problems") | Topic selector, links, levels, Session Summary and reset unchanged |
| `index.html` | Loads `compose-bundle.js` and the 7 `js/compose/*.js` modules **before** `generator.js`; cache keys bumped to `?v=20261101a` | See load order below |
| `package.json` | Build, validate and test scripts include the new tools and suites | Dev only |

### Required script order in `index.html`

`rng.js`, `structure.js`, `content-bundle.js`, `model.js`, `feedback.js`, `identify.js`, `rearrange.js`, `missing.js`, then **`compose-bundle.js`, `grammar.js`, `phrases.js`, `check.js`, `structures-design.js`, `structures-process.js`, `structures-observation.js`, `compose.js`**, then `generator.js`, `validator.js`, `session.js` and the UI scripts. If `compose-bundle.js` fails to load, `app.js` passes `null` and the game falls back to the authored-only generator, with no error shown.

## APIs preserved

- `Generator.build(index, spec)`, `Generator.grade(ch, answer)`, `new Generator(bundle, seed)`, `gen.next({mode, level, subject, topics})`, `gen.availability(selection)`, `gen.setSelection()`, `gen.restore(history, seenModels)`, `gen.getSeenModels()`, `HISTORY_MAX = 120`.
- Challenge objects keep every existing field. Generated challenges add `generated: true`, `structure`, `kitId`, `surface`, and `dependency` where one exists.
- `Session.record()` and the storage keys are unchanged (`raceces-writing-games:v1:session`, `…:v2:settings`). Session history stores configuration ids, so a session saved before the upgrade restores normally.

## Compatibility

- **Topic selection:** generated kits use the existing 15 topic ids and subjects. Selecting a topic or subject restricts generated content in exactly the same way as authored content; nothing is ever substituted from another topic. The topic checkboxes now show the real counts (for example `B:27 / I:29 / A:45`).
- **Shared links:** `?subject=…&topics=…&level=…#/mode` work unchanged and carry only settings.
- **Modes:** Identify, Rearrange, Missing and Mixed Practice all run on generated content through the same UI and graders.
- **Session Summary:** unchanged. Generated challenges record mode, level, role, correctness, time and error category exactly as authored ones do.

## Build and test commands (run in `wpr-games/raceces/`)

```
npm run build          # content-bundle.js + compose-bundle.js
npm run validate       # authored content + compositional kits
npm run test:unit      # original suites (89,032 checks)
npm run test:compose   # compositional suite (~145,000 checks, about 25 s)
npm run test:browser   # original browser suite, then tests/browser/compose-run.js (needs Playwright Chromium)
npm run audit:diversity
node tools/gen-compose-docs.js && node tools/gen-samples.js
```

`npm run test:browser` chains the original and compositional browser suites with `&&`. The title and local-storage expectations in the original suite were updated to match the current page title and `raceces-writing-games:v2:settings` key. The Mixed Practice distribution expectation remains unchanged. See `COMPOSE_TEST_RESULTS.md` for the browser-runtime limitation in the independent integration run.

## Cache versioning

Bump `?v=` on every changed script after any later edit. If a browser loads a cached old `generator.js` together with the new `compose.js` (or the reverse), the game still runs but may fall back to authored-only content until the cache refreshes.

## Post-integration checklist

1. Open `/wpr-games/raceces/`. The status line should say "90 authored writing models and 1361 generated writing problems".
2. Pick one topic and one difficulty and answer 20 challenges. The pool note should say "New writing problem" every time.
3. `#/rearrange` on Advanced for any topic: a causal-chain problem rejects the swapped pair order with "builds on" feedback.
4. Copy the activity link, then open it in a private window: the same subject, topics and level should be applied.
5. Session Summary reflects the attempts; Reset clears them.
