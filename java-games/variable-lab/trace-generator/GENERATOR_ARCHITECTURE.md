# GENERATOR_ARCHITECTURE

A compositional, seeded generator for **Trace the Variable** (Variable Lab). It builds Java programs the way a math-problem generator builds expressions: from typed building blocks and rules, not from a bank of finished snippets. There is no question bank anywhere in the package.

Everything lives in `src/` (11 small ES modules, no dependencies, no DOM, no Node-only APIs — enforced by `tests/static-audit.mjs`).

## One representation, many views

The single internal representation is a typed Java AST (`src/model.js`):

- Expressions: `lit`, `var`, `bin` (with operator and an optional explicit-parentheses flag), `not`. Every node carries its static Java type (`int`, `double`, `boolean`, `char`, `String`).
- Statements: `decl`, `assign`, `compound` (`+= -= *= /= %=`), `incdec` (`++ --`), `print`.

Every other artifact is **derived from this model**, never produced separately:

| Output | Derived by |
|---|---|
| Java source (one statement per line) | `renderStmt` / `renderExpr` — parentheses are emitted from precedence and associativity rules, plus any explicit-parentheses flags, so the printed text always re-parses to the same tree |
| Execution result, intermediate states | `execute()` in `src/interp.js` |
| Difficulty metrics, dependency slice | `analyze()` in `src/analysis.js` |
| Distractors | the same interpreter run under alternative (wrong) reasoning models, `src/distractors.js` |
| Line-by-line explanation, state table | recorded interpreter events, `src/explain.js` |
| Exact / semantic signatures | `src/history.js` |
| Java for JVM verification | `renderStmt` again, in `jvm/verify.mjs` |

There is no `eval()`, no `new Function`, no parsing of Java text, and no regular expression that decides program behaviour. (Regular expressions appear only in tests and for formatting checks.)

## Pipeline (what happens in one `generateTraceChallenge` call)

The call runs up to 120 *attempts*. Attempt *k* uses `Rng(mixSeed(seed, k+1))`, so the result is a pure function of `(options, seed, history)`.

1. **Choose difficulty and reasoning objectives** (`chooseObjective`). Type and format are drawn from weights (type: int .42, double .14, boolean .12, char .08, String .24; format: output .40, final .33, checkpoint .27) unless forced. Core reasoning families are chosen from the type's pool — 1 (Beginner), 1–2 (Intermediate), 2–3 (Advanced) — each weighted by `1 / (1 + 0.7·count)` where `count` is how often that family appeared in the recent history, so practice balances itself.
2. **Create valid declarations** (`planVars`, `addDeclarations`). Variable counts follow the difficulty (Advanced numeric: 2–3 plus helper variables a family may need, e.g. an `int` for `MIXED_NUMERIC`). Names are drawn from themed pools (letters, game, shop, sports, money…). Literals are type-appropriate; Advanced declarations may be initialised from earlier variables.
3. **Generate type-compatible statements** (`addChangeStatements`, `charChainPlan`, `src/builders.js`). Each objective family has a builder that composes expression trees from reusable pieces: leaves (variable or literal), operator chains parsed by precedence (`parseChain`), grouped sub-expressions, divisor/modulus rules, compound-assignment shapes, copy chains, concatenation chains.
4. **Establish dependencies.** Builders prefer the most recently changed variables as operands and spread left-hand sides across variables, so later statements depend on earlier ones. Hard rules (below) reject candidates whose updates do not matter.
5. **Select the target** (`buildCandidate`): a `println` expression (*output*), a variable at the end (*final*), or a variable immediately after a chosen line (*checkpoint*). Targets are tried in order and the first that passes validation wins.
6. **Simulate execution** (`execute` with `trace: true`). The interpreter implements Java semantics for the supported subset: 32-bit `int` arithmetic with overflow detection, truncating division, sign-of-dividend remainder, double arithmetic, numeric promotion, left-to-right `+` with `String` concatenation, `char` values, short-circuit `&&`/`||`, and printed formatting (`7.0`, `true`, characters).
7. **Produce the correct answer** from the execution (printed line, final value, or value after the checkpoint line).
8. **Generate misconception distractors** (`generateDistractors`) by running alternative reasoning models over the program. See `DISTRACTOR_MODELS.md`.
9. **Validate difficulty and answer quality** (`analyze` + `validateDifficulty`). See `DIFFICULTY_RULES.md`.
10. **Reject excessive repetition** (`RecentHistory.judge`). See "Repetition control".

If an attempt fails any step it is discarded; if all attempts pass validation but are rejected for repetition, the least-repetitive valid challenge is returned with `repetition.relaxed = true` (never a weaker-difficulty one). If nothing valid exists after 120 attempts it throws, rather than returning something unvalidated. In the 20,000-challenge test it never threw.

### Candidate rules applied while building (statement level)

A statement is kept only if the *whole prefix program* still executes, and:

- it **visibly changes** the variable it writes (no `a = a`-style no-ops, no copy between equal values);
- no **dead store**: a value that has never been read may not be overwritten (declarations are exempt, since their initial value is often legitimately overwritten);
- no **trivial self-operation** (`a - a`, `a / a`, `a % a`, `a && a`, `a && !a`, `a == a`, …);
- it is not a **textual duplicate** of the previous statement;
- no division or remainder by zero, no `int` overflow, `int` magnitudes ≤ 100 / 500 / 2000 (Beginner / Intermediate / Advanced), `double` values must be *tidy* (at most three decimal digits and a clean shortest representation, so Java and JavaScript print identically and students never see `0.30000000000000004`), `String` values ≤ 22 characters;
- the code passes an **independent static checker** (`typeCheck`: definite assignment, assignment compatibility, no redeclaration, no `String ==`, no `double %`);
- for `INTEGER_DIVISION` and `OPERATOR_PRECEDENCE` objectives, the effect must be *observable* in that statement (a remainder is actually discarded; left-to-right evaluation would actually give a different value).

A trailing literal reassignment (which would wipe out all earlier state) is dropped before the target is chosen.

## The interpreter doubles as the misconception engine

`execute(program, opts)` takes optional *reasoning-model* flags: `precedence: 'ltr'`, `intDiv: 'exact' | 'round'`, `alias: true` (linked copies), `stale: {stmt, name}` (read a variable's previous value), `plusMode: 'concatAll' | 'numbersFirst'`, `skip: Set` (ignore an update). Combined with small program transformations (`*` read as `+`, `/` ↔ `%`, `x += e` read as `x = e`, …) this is how every wrong answer is produced. Because the same engine computes right and wrong answers, a distractor cannot be inconsistent with the program.

## Dependency analysis

`sliceFor` performs a backward slice from the assessed result (print expression, final variable, or variable at the checkpoint): a statement is *relevant* if it defines a variable that is still needed; its used variables then become needed. Reaching-definition edges between relevant statements give `dependencyEdges` and `dependencyDepth` (statements on the longest def-use chain). Irrelevant assignments never count toward difficulty, and the test suite checks the slice dynamically: skipping every statement outside the slice leaves the answer unchanged.

Two kinds of non-slice statement are tracked separately rather than hidden:

- **Trap statements**: statements that deliberately do *not* feed the answer but exist to test a named misconception — the source reassignment after a copy (`COPY_INDEPENDENCE`) and a `println` that must not be mistaken for a store (`PRINT_VS_STORED`). They are counted in `trapStatements`, capped at 2, never counted as relevant changes.
- **Overwritten initial values**: a declaration whose value is overwritten before use (reported in `overwrittenInitializers`, not counted as irrelevant).

## Repetition control (`src/history.js`)

Three fingerprints per challenge, all hashes (64-bit FNV-style, 16 hex characters):

- **Exact**: the normalised displayed code, the target, and the expected answer. Rejected if present in the last 200 entries.
- **Semantic**: relevant-slice statements with variables renamed by first appearance (`v0`, `v1`…), literals reduced to their type, full expression-tree shapes (operators, explicit parentheses, leaf kinds), data-dependency edges, the target kind, the reasoning families and the difficulty. Rejected if seen within the last 8 / 25 / 60 challenges (Beginner / Intermediate / Advanced).
- **Pattern**: a coarser key (families + per-statement kind/operator skeleton + target format). No more than 5 / 3 occurrences in the last 40 entries (Intermediate / Advanced; Beginner is not capped because its grammar is tiny).

`RecentHistory` stores at most 256 entries of `[exact, semantic, pattern, familyCodes]` — no code, names, answers, timestamps, or student identifiers. It serialises to a few KB of JSON and offers optional `save(storage)` / `load(storage)` adapters for anything with `getItem` / `setItem` (e.g. `localStorage`); failures (private mode, blocked storage) are swallowed and an empty history is used.

**Honest limit.** No finite grammar can guarantee completely new reasoning structures forever. Program and value variation is effectively unlimited (exact repeats did not occur in any 2,000-question Advanced session even with the history control disabled), and the history control keeps reasoning structures from recurring inside its windows; measured results are in `REASONING_DIVERSITY_REPORT.md`. Repetition is never resolved by lowering difficulty.

## Determinism

All randomness goes through `Rng` (mulberry32 seeded by `mixSeed`). Same `seed`, same options and same history ⇒ byte-identical challenge (checked on every 97th challenge of the bulk test and in unit tests). If `seed` is omitted, `Math.random` supplies one — the only use of it in `src/`.

## Performance

About 2 ms per challenge on one core (20,000 challenges including all checks: ≈ 45 s; JVM stage excluded).

## Known limitations of this design

- `char` has no arithmetic in scope, so `char` state is built from copy chains. Advanced `char` programs get a one-statement allowance (up to 9) and Beginner/Intermediate `char` programs may declare up to 2/3 variables. Because `char` has few genuine misconception models, a question whose answer is a single `char` may have 3 choices instead of 4 (see `DIFFICULTY_RULES.md`, `DISTRACTOR_MODELS.md`).
- Doubles are restricted to tidy values; no `float`, `long`, `short`, `byte`, casts, `Math`, or string methods.
- The Variable Lab source could not be inspected; see `WORK_INTEGRATION_GUIDE.md` for the assumptions made.
