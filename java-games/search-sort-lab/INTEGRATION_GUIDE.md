# Integration Guide (for ChatGPT Work)

Nothing here has been applied to the production repository. Items marked **VERIFY** were inferred from a read-only clone of `davisjm4/davisjm4.github.io` taken during development and must be re-checked against the current main branch.

## 1. Files and placement
Copy the folder contents to `java-games/search-sort-lab/`: `index.html`, `styles.css`, `app.js`, `engine/` (all), and optionally `tests/`, `README.md`, `package.json` (do not overwrite `java-games/package.json`; see §4). `node_modules/` is not part of the package.

## 2. Dependencies
- Runtime: none. Native ES modules (uses top-level `await`; modern browsers/Chromebooks).
- Shared assets, loaded if present (**VERIFY** paths and `?v=` tokens): `../style.css?v=java-quality-v3`, `../session.js?v=per-mode-daily-v1`. If `../session.js` fails to load, the page silently uses `engine/session-fallback.js` (nothing persisted, not visible in the shared Session Summary). In production confirm the shared tracker actually loads.
- Tests only: `linkedom` (already a devDependency of `java-games`), `java` for `jvm.test.mjs`.

## 3. Existing code that must change (small, additive)
1. `cs-games/catalog.js`: add an entry like the existing ArrayList Lab one:
   `{id:"search-sort-lab",title:"Search & Sort Lab",course:"advanced",source:"java",url:"../../java-games/search-sort-lab/",description:"…",skill:"Searching and sorting algorithms",topics:["2.x Binary Search","Selection Sort","Insertion Sort","Merge Sort","Algorithm Analysis"]}`. **VERIFY** the catalog schema, the topic labels used for AP CSA unit numbering, and `cs-games/catalog-tests.mjs` expectations (it may count games).
2. `java-games/app.js` (hub): ArrayList Lab imports its engine and registers a game object (`arrayListGame`). **VERIFY** what shape the hub/Session Summary expects. Search & Sort Lab does not export such an object; if the hub needs one, add a thin wrapper around `engine/generator.js`. The game works without hub registration if only the catalog links to it.
3. `java-games/package.json`: append `&& node search-sort-lab/tests/algorithms.test.mjs && node search-sort-lab/tests/generator.test.mjs && node search-sort-lab/tests/quality.test.mjs && node search-sort-lab/tests/jvm.test.mjs && node search-sort-lab/tests/ui.test.mjs` to `test` if desired. Test paths use `import.meta.url`, so they work from any folder. `ui.test.mjs` imports `app.js`, which tries `../session.js` first; run in the repo it will import the real tracker, which touches `localStorage` — **VERIFY** it runs headless there, or leave that suite out of the aggregate.
4. Docs: add a short entry to `java-games/README.md` / `CURRICULUM_COVERAGE.md` (searching/sorting objectives).
No existing game is modified.

## 4. Session Summary
Each challenge calls `tracker.begin(game, title, topic=mode)`, then `annotate(instance, {difficulty, skill, family, seed})`, `submit`, and `reveal` on a wrong answer, `skip` when abandoned. The shared summary therefore shows one topic per mode. Difficulty and skill breakdowns appear only in this page's own Session Summary panel (in-memory; lost on reload). **VERIFY** the shared summary tolerates the extra `details` fields (the shared `annotate` exists in the cloned `session.js`).

## 5. Navigation
Header link: `https://davisjm4.github.io/cs-games/advanced/` (absolute). The "Session Summary" header link is added by the shared `addSessionNavigation("../")`.

## 6. Launch/test locally
See README. `npm test` (about 15 s).

## 7. Teacher Tools (future, not implemented)
`import { generate, exportQuestion } from "./engine/generator.js"`; `exportQuestion(generate(mode, difficulty, seed))` returns stem, counting rule, code, arrays, four choices with the correct one flagged, explanation, and `regenerate:{mode,difficulty,seed,family}`. The engine has no DOM or browser dependency and runs in Node.

## 8. Known gaps to check before publishing
- Visual check on desktop, Chromebook, and phone widths; screen-reader pass; contrast check of the role colors.
- Confirm `<dialog>` restart confirm works on the school Chromebooks' browser.
- Decide whether Skip should remain (it is unscored, like ArrayList Lab).
