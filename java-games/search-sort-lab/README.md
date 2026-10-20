# Search & Sort Lab

Procedurally generated Java practice for **binary search, selection sort, insertion sort, merge sort, algorithm identification, and efficiency comparison**. Six modes × Beginner / Intermediate / Advanced. No fixed question bank, no accounts, no server.

Status: built and tested by Claude; **not deployed**. See `INTEGRATION_GUIDE.md` and `DEVELOPMENT_REPORT.md`.

## Run locally
```
npm install          # only needed for the UI test (linkedom)
npm run serve        # then open http://localhost:8080/
```
Open `index.html` through a web server (ES modules do not load from `file://`). URL options: `?mode=merge&difficulty=advanced&seed=42`.
Outside the repository the page uses an in-memory stand-in for the shared session tracker (`engine/session-fallback.js`); inside the repository it uses `../session.js`.

## Tests
`npm test` runs, in order: simulators (`algorithms.test.mjs`), 18,000 generated challenges verified by an independent module (`generator.test.mjs`), variety analysis (`quality.test.mjs`), real-JVM checks (`jvm.test.mjs`, needs `java` 11+), and the simulated-DOM UI test (`ui.test.mjs`). `PER_CELL=200` shrinks the sample. Output of the last full run is in `tests/results/`.

## Layout
```
index.html  styles.css  app.js          interface (no question logic)
engine/
  algorithms.js     deterministic simulators + documented Java conventions
  generator.js      generate(), nextChallenge(), history, exportQuestion(), assess()
  modes/*.js        55 challenge families (binary, selection, insertion, merge, name, compare)
  distractors.js    misconception-based choice builder
  difficulty.js     difficulty rules/metadata validation
  validation.js     independent answer re-derivation (does not import algorithms.js)
  code.js           every Java snippet shown to students
  rng.js arrays.js kit.js session-fallback.js
tests/              suites + results/
```

## How a challenge is made
`generate(mode, difficulty, seed)` picks a weighted family, builds an array/target, simulates the algorithm, derives the answer and each distractor from a simulated wrong procedure, records difficulty metadata (steps, comparisons, passes, shifts, calls, reasoning type), and rejects it if the metadata does not fit the difficulty. Same seed → identical challenge. `nextChallenge()` adds bounded in-memory repeat avoidance (300 exact keys, recent families and reasoning structures); nothing is stored.

## Conventions (also shown to students)
- **Binary search:** `mid = (low + high) / 2`; `==` checked first; returns the first match its midpoints reach (not necessarily first/last duplicate). Counts: one pass per midpoint looked at.
- **Selection sort:** one swap per pass even if `minIndex == i`; strict `<` (earlier index wins ties); comparisons always n(n−1)/2.
- **Insertion sort:** shift while `a[j] > key` (strict, stable); a shift is one write `a[j+1] = a[j]`; comparisons counted only while `j >= 0`.
- **Merge sort:** `mid = (lo + hi) / 2` (left half larger for odd sizes); base case `lo >= hi`; ties go left (`<=`); one comparison per `a[i] <= a[j]` in the first merge loop; leftovers copied uncounted.

## Scoring
One submitted answer = one scored attempt. A wrong answer is revealed immediately (tracker: incorrect + revealed, same as ArrayList Lab). Skip closes the challenge unscored. Viewing the trace afterwards is not scored.

## Limitations
- Rendering, real touch input, and screen readers were **not** tested (no browser in the build environment); the UI test is a simulated DOM.
- Multiple choice only; no drag-and-drop.
- Beginner modes have few distinct reasoning structures by design (see report); numbers and arrays vary, structure repeats more.
- Canvas/QTI export is not implemented; `exportQuestion()` supplies the data.
