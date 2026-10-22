# Class & Object Lab — compositional object-state generator

Class & Object Lab teaches Java object-oriented reasoning: objects versus classes, defaults, constructors, encapsulation, setters, `this`, independent objects, references and aliases, reference equality, parameter passing, static state, `toString()`, and reverse reasoning. It also contains the separate **Class Builder — Rearrange** activity.

This version replaces the original 52 fixed templates (4 per mode, with no difficulty levels) with a **compositional generator**. It builds small Java programs from semantic components, simulates them with a Java object-state model, and derives the answer, the misconception-based distractors and the explanation from the same simulation. The browser does no runtime AI, no Java compilation, no server calls and no account handling.

## What students see

- The same 13 practice modes, Mixed Practice, and Class Builder — Rearrange.
- A new **Difficulty** selector (Beginner, Intermediate, Advanced) for the 13 conventional modes. It is remembered in `localStorage` (`classObjectLab.difficulty`), can be set with `?difficulty=Advanced`, and is hidden while Class Builder is open (Class Builder keeps its own levels).
- Readable, pre-formatted Java, with a context note saying where the statements run.
- After the single scored submission:
  - the correct answer
  - an **About your choice** note for a wrong answer, naming the specific misconception
  - a short explanation
  - a step-by-step trace computed from the simulation
  - a diagram of the final object state (object ids, fields, which variables refer to each object, static fields), with a text alternative
- A **Review** tag when a session has used every distinct configuration in that mode and difficulty and is reusing one with new details.

Scoring is unchanged: one scored attempt per challenge, then reveal, skip and Session Summary through the shared `session.js` (the upstream daily, per-mode session: each record carries its mode, and the statistics line shows the selected mode's figures, or the whole game's for Mixed Practice). Topics remain the 13 mode ids, so existing students' records keep their meaning. Difficulty, family and reasoning signature are recorded with `tracker.annotate`.

## Architecture (`compose/`)

| File | Role |
|---|---|
| `ir.js` | JSON-safe IR for a validated Java subset (classes, fields, constructors, methods, statements, expressions) |
| `emit.js` | Java emitter: student display, and the complete `Main.java` harness used only in development |
| `sim.js` | Deterministic interpreter: heap identities, statics, scopes and shadowing, pass-by-value, constructor order, overloads, `this(...)`, `toString`, NPE; plus single-rule misconception flags |
| `components.js` | Cosmetic domains and semantic parts (constructor kinds `K`, method kinds `M`, fields `F`) |
| `planner.js` | Composes valid reference/object operation sequences |
| `families/*.js` | 29 semantic families across the 13 modes; they compose programs and queries, never complete programs |
| `misconceptions.js` | 76 documented misconceptions with student-facing explanations |
| `engine.js` | Realisation (simulate → answer → distractors → relevance → gate → render), `generateChallenge`, `createPracticeSession` |
| `difficulty.js` | Measured complexity and tier gates |
| `signature.js` | Deterministic exact, program, graph, operation and reasoning signatures |
| `explain.js` | Trace steps and object diagram from the simulation |
| `validate.js` | Structural invariants (no duplicate declarations, known types) |
| `kit.js`, `rng.js` | Program transformations used as misconception models; seeded RNG |

`class-engine.js` is now a backward-compatible facade. It keeps every original export (`modeNames`, `seededRandom`, `shuffle`, `challengeFamilies`, `classObjectGame`, `generateClassObject`, `createClassObjectGenerator`, `assessClassObject`) and adds `generateChallenge`, `createPracticeSession`, `difficulties` and `MODE_IDS`. The original engine is preserved in `class-engine-legacy.js`, unchanged apart from a header comment. `class-engine-rebuilt.js` was already a byte-identical, unreferenced copy of the original; it is left untouched.

Full details: [GENERATOR_SCHEMA.md](GENERATOR_SCHEMA.md).

```js
import { generateChallenge, createPracticeSession } from "./class-engine.js";
generateChallenge({ mode: "aliases", difficulty: "Advanced", seed: 12345 });
const s = createPracticeSession({ seed: 12345, mode: "mixed", difficulty: "Intermediate" });
s.next();
```

## Results in brief

The full results are in the reports below. In summary:

- More than 20 distinct reasoning configurations were observed in every one of the 39 mode/difficulty combinations, in 1,000 seeded challenges per combination. The smallest is 29.
- No reasoning repeat occurs in any 14- or 20-question session, and no exact repeat in 500-question sessions.
- 8,580 challenges (10,797 programs) were compiled and run on a real JVM with no disagreement with the simulator.

| Report | Contents |
|---|---|
| [REASONING_DIVERSITY_REPORT.md](REASONING_DIVERSITY_REPORT.md) | Before/after measurements for all 39 combinations |
| [JAVA_VERIFICATION_REPORT.md](JAVA_VERIFICATION_REPORT.md) | JVM harness, counts, corrections, unsupported features |
| [TEST_RESULTS.md](TEST_RESULTS.md) | Every suite, including the repository's `npm test` |
| [GENERATED_SAMPLES.md](GENERATED_SAMPLES.md) | 195 review samples (5 per combination) |

## Tests (run from `java-games/`)

| Command | What it does | Time |
|---|---|---|
| `npm run test:class-object` | Original test (unchanged assertions) against the preserved legacy engine | ~1 s |
| `npm run test:class-object-compose` | Quick profile: generator (120 per combination), 14/20/50-question sessions, semantics with counterfactual JVM check, compatibility, Class Builder | ~70–90 s |
| `node class-object-lab/tests/compose.test.mjs --part generator --per 1000 [--modes …] --out class-object-lab/test-results/compose-results.json` | Full generator profile (also `--part sessions`, `semantics`, `compat`); split across modes to keep each run short | several minutes per part |
| `npm run test:class-object-jvm` | JVM oracle, 30 per combination (needs `javac`/`java`; skips cleanly without them) | ~2 min |
| `node class-object-lab/tests/jvm.test.mjs --per 220 --modes <mode> --out class-object-lab/test-results/jvm-results.json` | Full JVM verification, merged per mode | ~30–150 s per mode |
| `npm run test:class-object-browser` | Headless Chromium via Python Playwright: 3 viewports, all 39 combinations | ~3 min |
| `node class-object-lab/tests/legacy-baseline.mjs` | Baseline audit of the original engine | ~1 s |
| `node class-object-lab/tests/gen-samples.mjs class-object-lab/GENERATED_SAMPLES.md` | Regenerate the review samples | ~2 s |
| `node class-object-lab/tests/gen-docs.mjs` | Regenerate the three report files from `test-results/*.json` | <1 s |

The JDK used was OpenJDK 21.0.12.1, invoked with `javac --release 17`. Any JDK 17 or later works.

## Known limitations

- **Small Beginner pools.** The smallest pools are Beginner getters (29), `this` (50), parameters (51) and toString (51). A long Beginner session reaches review mode after roughly 40–100 questions; it says so with the **Review** tag and never silently switches mode or difficulty.
- **Supported Java subset only.** No inheritance, interfaces, `equals` overrides, arrays, collections or loops (see JAVA_VERIFICATION_REPORT.md).
- **Difficulty is a model.** The tiers come from measured program complexity, not from student performance data.
- **Testing gaps.** Testing used Chromium only. There has been no educator review; the sample review was done by Claude.
- **Rare slow generations.** A rare Advanced challenge needs many generation attempts; the worst case observed was 144 attempts, about 0.5 s on a desktop. Typical generation takes 1–3 ms (equality Advanced about 20 ms).
