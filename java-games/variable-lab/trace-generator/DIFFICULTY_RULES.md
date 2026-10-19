# DIFFICULTY_RULES

Difficulty is **enforced after generation**, on the complete program, from measured properties — not merely labelled. A candidate that fails is discarded and regenerated. The rules live in `RULES` and `validateDifficulty` (`src/analysis.js`); `tests/bulk.test.mjs` recomputes them from scratch for every generated challenge.

## Definitions

- **Relevant statement**: a statement in the backward dependency slice of the assessed result (see `GENERATOR_ARCHITECTURE.md`). Statements outside the slice never count toward difficulty.
- **Relevant change** (a "meaningful state change after initialization"): a relevant `assign`, `compound` or `incdec` statement. Relevant declarations are not changes. Every relevant change must visibly change its variable (checked).
- **Dependency edge**: a reaching-definition link from a statement that defines a variable to a relevant statement that reads it (including a compound/increment statement reading its own variable, and the `println` that reads the answer).
- **Dependency depth**: the number of statements on the longest def-use chain feeding the answer.
- **Reasoning families** (17, detected from the program model and its execution, not from the generator's intent): `ASSIGN_COPY`, `COPY_INDEPENDENCE`, `SEQUENTIAL_UPDATE`, `REASSIGN_OVERWRITE`, `OPERATOR_PRECEDENCE`, `PARENTHESES`, `INTEGER_DIVISION`, `REMAINDER`, `COMPOUND_ASSIGNMENT`, `INCREMENT_DECREMENT`, `MIXED_NUMERIC`, `DOUBLE_ARITHMETIC`, `BOOLEAN_NEGATION`, `BOOLEAN_COMBINATION`, `STRING_CONCAT`, `STRING_NUMBER_CONCAT`, `PRINT_VS_STORED`. Detection details that matter:
  - `OPERATOR_PRECEDENCE` counts only when it is *observable*: evaluating the same program strictly left to right gives a different result somewhere in the slice.
  - `INTEGER_DIVISION` counts only when a non-zero remainder is actually discarded in the slice.
  - `COPY_INDEPENDENCE`: a copy `x = y`, then `y` is redefined, then `x` is read afterwards.
  - `PARENTHESES`: parentheses that change grouping (a lower-precedence child under a higher-precedence parent).
- **Core families**: the families present minus the two baseline tracing skills `SEQUENTIAL_UPDATE` and `REASSIGN_OVERWRITE`. "Interacting reasoning concepts" means core families.
- **Trap statement** / **overwritten initializer**: see `GENERATOR_ARCHITECTURE.md`. Traps are capped at 2 for every difficulty and never counted as relevant changes; overwritten initial values are not counted as irrelevant.

## Rules

| Rule | Beginner | Intermediate | Advanced |
|---|---|---|---|
| Executable statements (all lines, including declarations and `println`) | 2–4 | 4–7 | **5–8** (advanced `char`: 5–9) |
| Declared variables | 1 (`char`: 1–2) | 1–2 (`char`: 1–3) | 2–4 |
| Relevant state changes | 1–2 | 2–4 | **≥ 3** (max 6) |
| Core reasoning families in the answer's slice | 0–1 | 1–3 | **≥ 2** (max 5) |
| Dependency depth | ≥ 2 | ≥ 3 | **≥ 4** |
| Dependency edges | ≥ 1 | ≥ 2 | ≥ 3 |
| Variables in the answer's slice | ≥ 1 | ≥ 1 | **≥ 2** |
| Irrelevant statements before the answer | 0 (`char`: ≤ 1) | ≤ 1 | ≤ 1 |
| Trap statements | ≤ 2 | ≤ 2 | ≤ 2 |

Interpretation:

- **Beginner**: one variable, one or two meaningful changes, straightforward expressions, one primary concept (at most one core family). Short snippets. Operator chains are limited to three operands. (`char` copying needs a second variable, and a lone reassignment makes the initial value irrelevant, hence the small `char` allowances.)
- **Intermediate**: one or two variables, two to four changes, at least one intermediate concept (compound assignment, increment, integer division, remainder, precedence, parentheses, copying, mixed numerics, Boolean logic, String + number concatenation…), and a dependency chain of at least three statements, so some change depends on an earlier value.
- **Advanced**: at least three relevant changes, at least two interacting core concepts, a dependency chain of at least four statements with at least three dependency edges, an answer that depends on at least two variables, and five to eight statements. Advanced `char` programs have no arithmetic, so they build state through copy chains and may use one extra statement.

## What Advanced can never be

Both of the specification's counter-examples are rejected by `validateDifficulty` (unit tests *trivial programs can never qualify as Advanced*):

```java
int value = 9;
System.out.println(value + 2);          // 0 relevant changes, depth 2, 1 variable
```

```java
int value = 2;
value = value + 4 * 4;                  // 1 relevant change, 1 core family, 1 variable
System.out.println(value);
```

The second one is accepted at Beginner (it is a good single-concept precedence check). Complexity padded with unrelated assignments is rejected too: only relevant changes are counted (unit test *irrelevant assignments do not count toward difficulty*). All 20,000 bulk-test challenges and all 2,000 consecutive Advanced questions satisfied the Advanced rules (minimum relevant changes observed: 3; minimum dependency depth: 4).

## Other quality rules applied to every difficulty

- Values stay manageable (ints ≤ 100 / 500 / 2000 in absolute value, Strings ≤ 22 characters, doubles with at most three decimal digits).
- Negative *literals* are generated only at Advanced (about half of Advanced programs may use them), so Java's truncating division and sign-of-dividend remainder are exercised where students are ready for them. Negative *results* can still arise naturally from subtraction at any level.
- No dead stores, no trivial self-operations, no no-op statements (see `GENERATOR_ARCHITECTURE.md`).
- Boolean answers always use two choices; `char` answers use 3 or 4 choices; everything else uses 4.

## Changing a rule

Edit `RULES` in `src/analysis.js` (and the `base` / `maxChanges` arithmetic in `src/generator.js` if you change statement counts). `npm test` re-validates 20,000 challenges against the rules and fails loudly if a generator change makes any of them unreachable.
