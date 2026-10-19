# Generator schema

All generator code is DOM-free and runs in the browser and in Node (`tests/load.js`). Modules attach to `globalThis.StringLab`.

| File | Role |
|---|---|
| `js/rng.js` | `Rng(seed)` — mulberry32 seeded from a number or string (xmur3); `int`, `pick`, `shuffle`, `weighted`, `fork(label)` |
| `js/words.js` | Authored data: ~540 words (authored + regular word forms + real compounds), compounds, labels, separators, names, variable-name pools |
| `js/java-ast.js` | AST constructors, **renderer** (AST → Java text, correct precedence and parentheses), static typing |
| `js/evaluator.js` | **Java String semantic evaluator** + misconception flags |
| `js/difficulty.js` | Metrics (`analyze`) and classifier (`classify`) |
| `js/distractors.js` | Distractor construction (`variantCandidates`, `nearCandidates`, `finalize`) |
| `js/gen-helpers.js` | Shared builders (`numQuestion`, `exprQuestion`, key/letter finders) and the family registry |
| `js/families-*.js` | 36 reasoning families (see REASONING_FAMILIES.md) |
| `js/generator.js` | `generateChallenge`, `createSession`, assembly and validation |
| `js/feedback.js` | Rules, misconception text, trace and index-map builders |
| `js/session.js` | Session adapter (events and summary) |
| `js/ui.js` | Rendering and interaction (only file that touches the DOM) |

## Public API

```js
const G = StringLab.Generator;

// Pure and deterministic: the same input always returns an identical challenge object.
G.generateChallenge({ seed: 12345, mode: 'trace', difficulty: 'advanced' /*, family: 'trace.alias' */ });

// Endless practice with anti-repetition memory. mode may also be 'mixed'.
const s = G.createSession({ seed: 42, mode: 'mixed', difficulty: 'intermediate' });
s.next(); s.setMode('index'); s.setDifficulty('advanced');

G.MODES      // [{id:'predict'|'index'|'expr'|'trace', label, short}]
G.SKILLS     // the 7 bounded skill categories
G.families() // registry; G.familiesFor(mode, difficulty); G.familyById(id)
```

## Challenge object

```jsonc
{
  "id": "trace.alias:advanced:12345",       // family:difficulty:seed
  "seed": 12345, "mode": "trace", "difficulty": "advanced",
  "family": "trace.alias", "familyLabel": "Two variables, one String",
  "skill": "String Immutability",           // one of G.SKILLS
  "rule": "alias",                          // key into Feedback.RULES
  "code": ["String left = \"kitchen\";", "..."],   // exactly what the student sees (Mode C contains ???)
  "prompt": "What is printed when this code runs?",  // `backticks` mark inline code
  "goal": null,                              // Mode C goal sentence
  "choices": [{ "id":"a", "text":"kitchen9/kitchenly", "kind":"output|code", "misc":null|"aliasFollows", "correct":true, "result":"…" }],
  "correctIndex": 0, "answer": "kitchen9/kitchenly",
  "metrics": { "ops":5, "concepts":["Concatenation","Immutability","Length"], "depends":true, "steps":9, "twists":0, "...": "..." },
  "signature": { "shape": "…", "exact": "…" },   // variable names normalised away
  "traceStmts": [ /* AST used for the trace */ ],
  "probes": [{ "label":"program", "code":["…"], "expect":"kitchen9/kitchenly", "kind":"correct|distractor" }],
  "meta": { "resultType": "String" },
  "attempts": 1
}
```

`probes` are complete Java programs with their expected stdout. They are what the independent parser (`tests/mini-java.js`) and the real JVM (`tests/jvm/run-jvm.js`) execute: Mode A/D = the shown program; Mode C = one program per answer choice with that expression substituted; Mode B = the `indexOf`/`substring` programs that prove the numeric answer.

## Program AST

Expressions: `{k:'str'|'int'|'chr', v}`, `{k:'var', name}`, `{k:'call', target, method, args}` with methods `length`, `charAt`, `substring(1–2 args)`, `indexOf(String|char)`, `{k:'bin', op:'+'|'-'|'*', l, r}`. Statements: `decl(type,name,expr,tag)`, `assign`, `exprStmt` (discarded call), `print`. Tags: `result` (variable a Mode C question asks about) and `immut` (an intentionally "dead" statement that teaches immutability).

The renderer adds parentheses exactly where the AST requires them (`"Result: " + (2 + 3)` vs `"Result: " + 2 + 3`). Tests re-parse the rendered text with an independent parser and require the same AST.

## Evaluator semantics

* Zero-based `charAt`; `substring(b)` and `substring(b, e)` with `0 ≤ b ≤ e ≤ length`, exclusive `e`; `indexOf` first occurrence or `-1`, case-sensitive; `length()`.
* `+` is left-associative; `*` binds tighter; String + anything is concatenation (`char`/`int` converted to text); `int + int` adds. `char` arithmetic is rejected.
* Variable types are strict (`String ← String`, `int ← int`, `char ← char`); undefined/duplicate/uninitialised variables, bad overloads and out-of-range indexes throw `JavaError` — the generator treats any error as "reject this draft".
* Strings are immutable; `String b = a;` shares the value. A discarded call does nothing.
* `evaluate(stmts, {flags, events})`. `events:true` records every call/concatenation/addition per statement (used by feedback and by the twist metric). `flags` re-run the same program under a misconception (`E.MISCONCEPTIONS`): `oneBased`, `inclusiveEnd`, `startEarly`, `startLate`, `mutates`, `aliasFollows`, `sumNumbers`, `allConcat`, `lastOccurrence`, `oneBasedFind`, `notFoundZero`, `lengthLastIdx`, `lengthPlus`. Flags never change correct evaluation.

## Family draft contract

```js
H.register({ id, label, mode, levels:[…], skill, rule, weight, build(rng, level) -> draft | null })
```

Output draft (Modes A, D): `{ type:'output', stmts, extra:[{text,misc}] }`.
Custom draft (Modes B, C): `{ type:'custom', kind, stmts /*shown*/, analysis /*program measured for difficulty*/, prompt, goal, answer, choiceKind, candidates:[{text,misc}], probes:[{text,stmts,expect,kind}], twists, meta }`, normally built with `H.numQuestion` or `H.exprQuestion`.

## Assembly and validation (`generator.js`)

For every draft: evaluate with real semantics (reject on any exception) → measure metrics and classify (reject if ≠ requested difficulty) → reject any untagged statement whose removal does not change the result or break the program (no dead code) → gather distractors (misconception re-runs + family extras + generic near-misses as last resort) → `finalize` (unique texts, never the correct text, realistic misconceptions preferred, seeded shuffle) → reject if no distractor is a realistic misconception → re-evaluate every probe. Rejected drafts are rebuilt from a fresh deterministic sub-stream (`rng.fork('try'+n)`, up to 120 attempts); a typical challenge needs 1–3.

## Session generator

`createSession` keeps history. For each `next()`: choose the mode (mixed: never the previous mode), exclude the last min(3, pool−1) families used in that mode/difficulty, weight remaining families, derive a challenge seed from the session RNG, generate, then reject (up to 30 tries) if the exact signature was already seen or the *shape* signature (variable names removed, strings abstracted) occurred in the last min(4, pool−1) challenges. Changing `text` to `word` therefore never counts as a new challenge.

## Determinism

`generateChallenge` depends only on `(seed, mode, difficulty, family)`; no `Date`, `Math.random` or global state is used. `createSession` is deterministic for a given session seed and sequence of settings changes. The UI picks a random session seed (or uses `?seed=`).
