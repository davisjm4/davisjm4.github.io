# Math Lab Expansion — Math Methods, Random Ranges, Limits & Round-off

Two new practice modes for the existing Math Lab (`/java-games/math-lab/`):

| Mode id | Title | Reasoning families |
|---|---|---|
| `math-methods` | Math Methods & Random Ranges | 12 |
| `numeric-limits` | Numeric Limits, Overflow & Round-off | 14 |

Each mode has Beginner, Intermediate and Advanced difficulty and generates
challenges procedurally without a fixed bank. The existing five modes and Mixed
Practice are unchanged, and Mixed Practice still draws only from them.

Built against repository commit `c77569e`; the patch was re-verified to apply cleanly, with all tests passing, on the newer `16b628c` (latest at packaging).
Nothing was pushed or published.

## Package contents

```
repo/java-games/math-lab/expansion/      NEW — drop-in folder
  rng.js              seeded mulberry32 RNG
  java-numeric.js     Java numeric semantics (int32, long, double, casts, Math.*, Double.toString)
  java-program.js     AST, Java renderer, type checker, interpreter, misconception flags
  random-range.js     exact derivation of Math.random() output sets/intervals
  gen-helpers.js      shared builders, misconception catalogue (107 entries)
  families-methods.js Mode 1 families
  families-limits.js  Mode 2 families
  generator.js        public API: generateChallenge, createExpansionDeck, validate
  tests/              expansion-tests.mjs, ui-tests.mjs, java-sources.mjs, JavaOracle.java, results/
repo/java-games/math-lab/app.js          MODIFIED (scoped)
repo/java-games/math-lab/game.css        MODIFIED (4 rules)
repo/java-games/math-lab/index.html      MODIFIED (cache-bust versions, meta description)
repo/java-games/math-lab/tests.mjs       MODIFIED (adds 3 lines of VM context; no assertion changed)
math-lab-expansion.patch                  the same 4-file change as a git patch
INTEGRATION_GUIDE.md, DEVELOPMENT_REPORT.md
screenshots/                              real Chromium renders (1366px and 360px)
```

`engine.js` is **not modified**. The expansion has its own evaluator, so the
existing arithmetic evaluator is untouched (it still rejects `Math.random()`,
and the existing test asserting that still passes).

## Running the tests (from `java-games/`)

```
npm install                                         # linkedom, already a devDependency
node math-lab/expansion/tests/expansion-tests.mjs   # 6,000 challenges + real Java (≈3–4 min)
SKIP_JAVA=1 node math-lab/expansion/tests/expansion-tests.mjs   # no JDK needed
node math-lab/expansion/tests/ui-tests.mjs          # app.js in a simulated DOM
node math-lab/tests.mjs                             # existing Math Lab regression suite
npm test                                            # whole repository
```

The Java run needs JDK 17+ (`java` with the in-process compiler). It was
verified with OpenJDK 21.0.10. `PER_CELL=n` changes the sample size per
mode×difficulty (default 1000). Results are written to
`tests/results/test-report.json`.

## Generator API (DOM-free; for Teacher Tools)

```js
import { generateChallenge, createExpansionDeck, FAMILIES, EXPANSION_MODES } from "./expansion/generator.js";
generateChallenge({ mode: "numeric-limits", difficulty: "advanced", seed: 42 });
generateChallenge({ family: "mm.random-choose", difficulty: "beginner", seed: 7 });   // pin a family
const deck = createExpansionDeck({ seed: 1 }); deck.next("math-methods", "intermediate");
```

The same arguments always return an identical, JSON-serialisable challenge.
See INTEGRATION_GUIDE.md for the object contract.
