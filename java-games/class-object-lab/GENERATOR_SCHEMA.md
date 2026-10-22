# Generator schema

The compositional generator lives in `compose/`. One JSON-safe intermediate representation (IR) is the single source of truth for three things: the Java the student sees (`emit.js`), the simulated execution (`sim.js`), and the development-time JVM harness (`emit.js` → `tests/jvm-oracle.mjs`).

## 1. Program

```js
{ classes: [ClassDef], helpers: [MethodDef /* static methods of Main */], main: [Stmt] }
```

The student sees the classes, then the helpers (as `static …` methods), then the `main` statements. A context note under the code says the statements run in order inside `main`, and that the helpers belong to the same class as `main`.

### Class definitions (`ir.js`)

```js
ClassDef  = { n, fields: [Field], ctors: [Ctor], methods: [MethodDef] }
Field     = { t, n, st /* static */, acc /* "private" | "public" | "" */, init: Expr | null }
Ctor      = { params: [{t, n}], body: [Stmt], acc, chain: { args: [Expr] } | null }   // chain = this(...)
MethodDef = { n, ret, params: [{t, n}], body: [Stmt], st, acc, meta }                  // meta.computesFrom: accessor's source field
```

Types are `int`, `double`, `boolean`, `char`, `String`, or a declared class name.

### Expressions

| `k` | Java | Notes |
|---|---|---|
| `lit` | `5`, `2.5`, `true`, `"text"`, `'c'`, `null` | `t` gives the literal type |
| `name` | `x` | resolved like Java: local or parameter, then field of `this`, then static field of the class |
| `this` | `this` | |
| `fld` | `o.f` | |
| `sfld` | `C.f` | |
| `new` | `new C(args)` | overloads chosen by arity, then type |
| `call` | `o.m(args)` / `m(args)` | an unqualified call inside a class means `this`/static; in main it calls a helper |
| `scall` | `C.m(args)` | |
| `bin` | `+ - * / % < <= > >= == != && \|\|` | int arithmetic wraps at 32 bits; `/` truncates; `+` with a String concatenates |
| `un` | `!e`, `-e` | |
| `tern` | `c ? a : b` | |
| `math` | `Math.min/max/abs` | |

### Statements

`decl` (`T x = e;`, or `T x;` with no initializer), `asg` (`=`, `+=`, `-=`, `*=` to a name, field or static field), `inc` (`++`/`--`), `ex` (expression statement: call or `new`), `if` (with optional `else`), `ret`, `print` (`System.out.println`).

## 2. Object state (`sim.js`)

- **Heap:** `id → { cls, f: {field: value} }`. Ids are assigned in creation order and never reused, so object identity is stable.
- **Values:** `{k:"i"}` int, `"d"` double, `"b"` boolean, `"s"` String, `"c"` char, `"r", id` reference, `"n"` null.
- **Statics:** `statics[class][field]`, one shared value per class.
- **Frames:** a stack of block scopes (`Map`), plus `self` (the receiver id, or none), `cls` (the class context), `kind` (`main`, `method`, `static`, `ctor`, `helper`), and parameter-to-caller bindings (used only by misconception models).
- **Snapshots:** after every main statement the simulator records the variables, every object's fields and the statics (`trace.stmtStates`), plus an initial snapshot. Explanations and diagrams are derived from these.

### Method-call semantics

- Arguments are evaluated left to right and copied into parameters. **Java is pass-by-value for every argument; for objects the value is a reference.** Reassigning a parameter never changes the caller's variable.
- A call through `null` throws `NullPointerException`.
- `new C(args)` allocates an object with typed defaults (`0`, `0.0`, `false`, `'\u0000'`, `null`) and resolves a constructor. If that constructor starts with `this(...)`, the chained constructor runs first and then the rest of the body. Otherwise the field initializers run in declaration order, then the body.
- A `toString()` override is called when an object is printed or concatenated. Without an override the result is `ClassName@<hash>`, which is never presented as a predictable value.
- `==` on references compares identity; on primitives it compares values.

### Bounds

At most 4,000 interpreter steps per run (generated programs use under 3,000; the gate rejects anything above). Generation retries are deterministic and capped at 400 attempts. Sessions keep a bounded history of 600 reasoning keys.

## 3. Composition

- **Components** (`components.js`): 14 cosmetic domains (Counter, Player, Account, Plant, Robot, Battery, Tank, Ticket, Lamp, Timer, Car, Book, Student, Garden) supply names only. Semantic parts are independent: field parts, constructor parts `K` (param, `this.f = f`, shadowing bug, computed, conditional, ternary, two-field and swapped order, overloads, `this(...)` chains, counting constructors), and method parts `M` (getters, computed and boolean accessors, setters with replacement, guard, guard-else, clamp, set-if-higher and counted variants, compound mutators, `return this`, `self()`, `copy()`, `copyFrom`/`copyTo`/`giveTo`/`larger`, static members, `toString` variants).
- **Reference planner** (`planner.js`): composes bounded operation sequences — declare new, alias, null, unassigned; reassign to new, alias, null or a returned reference; mutate; temporaries; `copy()`; `self()`; helper `same()`/`make()`; transfers. A planning model of variable → object prevents invalid code, such as using an unassigned or null reference.
- **Families** (`families/*.js`, 29 in total): each composes components into a program plus a query for one mode. Families never contain a complete program. Every program is assembled from random component choices, then simulated.

| Mode | Families |
|---|---|
| structure | `count` (objects created / still referenced), `refersto` |
| defaults | `fields`, `local` (definite assignment) |
| constructors | `trace` |
| getters | `computed`, `access` (which statement compiles), `localcopy` |
| setters | `sequence` |
| this | `shadow`, `receiver`, `returnthis` |
| independent | `trace`, `compare` |
| aliases | `trace`, `samecount` |
| equality | `which` (which comparison is true/false), `print` |
| parameters | `helpers` (12 helper kinds: mutate, reassign, both orders, conditional, primitive, primitive return, return parameter, return new, swap, transfer, set-then-reassign) |
| static | `counter`, `context`, `twoclasses` |
| tostring | `print`, `default` |
| reverse | `value`, `reference`, `construct`, `sequence`, `static` |

### Semantic constraints

- `validate.js` rejects duplicate classes, fields, methods, constructors, parameters or locals, and unknown types, before simulation.
- The simulator must finish without an internal error. An exception is allowed only where the family asks about one.
- **Relevance:** every non-declaration main statement must change the answer or at least one chosen distractor's model. Irrelevant padding is rejected.
- Selection questions must have exactly one qualifying candidate, and every candidate fragment must also pass the validator.

## 4. Query kinds and answer derivation (`engine.js`)

| Kind | Answer | Distractors |
|---|---|---|
| `output` | exact printed lines from `simulate()` (or the exception) | the same program under each misconception flag, alternative programs (misreadings), and family-computed texts |
| `count` | created / reachable / same-as / null count from the simulation | the flag runs plus counting models (variables counted as objects, alias creates, temporaries ignored, created vs reachable, null is an object, …) |
| `value` | a family measure applied to the simulation (for example, which object `x` refers to) | the flag runs plus models |
| `compare` | candidate comparisons evaluated by appending hidden prints; the key has the wanted truth value | false (or true) candidates that flip under a named misconception |
| `select` | each fragment is appended (plus hidden `pre` statements and a check) and executed; deliberate compile errors are labelled; exactly one fragment qualifies | the remaining fragments, each tagged with the misconception that makes it attractive |

There are 76 documented misconceptions in `misconceptions.js` (including compile-error reasons), each with a student-facing explanation. A distractor is accepted only if it differs from the answer, is distinct from the other choices, and carries a documented misconception. Distinct misconceptions are preferred, and a length-balancing step prevents the key from standing out by length. If three such distractors cannot be found, the challenge is rejected and regenerated; there is never a placeholder or a ±1 filler.

Misconception flags are single-rule changes to the interpreter: `aliasCopies`, `reassignMutates`, `nullPropagates`, `equalArgsAlias`, `identityAsContent`, `valuesAsIdentity`, `instanceAsStatic`, `staticAsInstance`, `paramDeepCopy`, `paramByRef`, `primByRef`, `returnCopies`, `returnThisCopies`, `forgetCtor`, `ctorOnce`, `initializerAfterCtor`, `skipChain`, `chainAfterBody`, `shadowAssignsField`, `thisMeansParam`, `thisIsArgument`, `defaultsNull`, `boolDefaultTrue`, `stringDefaultEmpty`, `doubleDefaultInt`, `ignoreGuards`, `compoundAsReplace`, `setAdds`, `ignoreClamp`, `onlyLastUpdate`, `accessorStores`, `toStringAtCreation`, `nullPrintThrows`, `nullCallPrintsNull`. Program-level misreadings live in `kit.js` (dropped update, wrong receiver, swapped order, boundary flip) and in the families (argument order, ignored computation, local copy linked, variable name printed, concatenation grouping, raw fields).

## 5. Difficulty (`difficulty.js`)

`metricsOf` measures the executed program:

- objects created, reference variables (including reference parameters), field and static writes, calls, decisions taken, main statements, classes, helpers
- a feature set: alias, multi-alias, reassign-after-alias, null, static, multi-static-or-class, shadowing, ctor-chain, overload, returns-reference, returns-this, conditional, several-decisions, multi-field, several-helpers, exception, several-receivers, three-objects, several-outputs, param-mutation, param-reassign

These combine into a weighted score.

| Tier | Gate (a challenge is rejected and regenerated if it fails) |
|---|---|
| Beginner | ≤ 2 objects, ≤ 6 statements, ≤ 2 decisions, 1 class, ≤ 1 helper, ≤ 1 heavy feature, score ≤ 34 |
| Intermediate | ≤ 4 objects, ≤ 9 statements, score 14–52 |
| Advanced | score ≥ 24 and ≥ 2 features (bounded at 12 statements, 6 objects, 40 calls) |

Selection questions have their own bounds, because their difficulty is in evaluating each candidate; their score adds 2 for each candidate traced. Families also scale their composition by level (number of objects, references and calls; which components are allowed). The mean complexity per cell is listed in REASONING_DIVERSITY_REPORT.md.

## 6. Signatures (`signature.js`)

All signatures are deterministic (FNV-1a based, 64 bits as hex), with no random suffix.

| Signature | Contents |
|---|---|
| `exact` | rendered code + prompt + the *set* of choices |
| `program` | canonical IR: identifiers renamed by first occurrence (`C1`, `F1`, `M1`, `H1`, `V1`), literal values replaced by their type |
| `graph` | final variable → canonical object map, plus counts of objects created and still reachable |
| `ops` | sequence of main operation kinds |
| `framework` | family id |
| `reasoning` | mode + difficulty + canonical program + branch outcomes + exception + equal-constructor-argument pattern + canonical query and key; for object-creation counts, an order-independent multiset of operations |

`tests/compose.test.mjs` checks that renaming every identifier leaves `program` and `reasoning` unchanged, and that each counterfactual change (alias vs new, mutation vs reassignment, instance vs static, field vs local, accepted vs rejected input) changes the reasoning signature and the answer.

## 7. Challenge object

`generateChallenge({ mode, difficulty, seed })` returns:

```
id, game ("class-object-lab"), gameId, title, mode, difficulty, topic (= mode), topicTitle, concept,
family (= variant), code (pre-formatted Java), preformatted: true, context, prompt, choices[4],
answer (= correctAnswer), explanation, focus, summary, steps [{code, effect}], diagram {objects,
statics, nulls, prims, text}, why {choice → {misconception, label, why}}, misconceptions[], metrics,
signatures {exact, program, graph, ops, framework, reasoning}, signature (= exact),
structuralSignature, reasoningSignature, program (IR), query, verify, seed, attempts, review (sessions only)
```

`steps`, `diagram`, `why` and `explanation` are shown only after the scored submission. Generating a challenge never touches session storage, so a future Teacher Tools adapter can call `generateChallenge` directly.
