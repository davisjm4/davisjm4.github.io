# DISTRACTOR_MODELS

Every incorrect choice is produced by **executing the same program under an alternative, incorrect reasoning model** (`src/distractors.js`). There is no `answer ± 1` fallback and no random nearby value. If a program cannot yield enough distinct misconception-based wrong answers, the whole program is rejected and regenerated.

A model is either a flag on the interpreter (`src/interp.js`) or a small, general transformation of the program model applied to the statements in the assessed result's dependency slice. The result is read back in exactly the same way as the correct answer (printed line, final value, or value at the checkpoint line).

## The models

| ID | Misconception | How it is produced | Applies when the slice contains |
|---|---|---|---|
| `OPERATOR_PRECEDENCE_IGNORED` | Evaluates arithmetic strictly left to right | interpreter flag `precedence: 'ltr'`: each unparenthesised `+ - * / %` chain is flattened in printed order and folded left to right (explicit parentheses are still honoured) | an unparenthesised chain mixing precedence levels |
| `MULT_AS_ADD` | Treats `*` (and `*=`) as `+` | transformation of the statement's operators | `*` |
| `OLD_VALUE_IGNORED` | `x = x op e` ⇒ `x = e` (forgets the old value) | replaces the assignment by its right operand | self-referential assignment |
| `COMPOUND_AS_ASSIGN` | `x op= e` read as `x = e` | `compound` → `assign` | any compound assignment |
| `COMPOUND_REVERSED` | `x -= e` read as `x = e - x` (likewise `/=`, `%=`) | operand swap | `-=`, `/=`, `%=` |
| `COMPOUND_PARTIAL_RHS` | `x *= a + b` read as `(x * a) + b` | applies the compound operator to the first operand of the right side only | compound assignment with an arithmetic right side |
| `ASSIGN_AS_ADD` | `x = e` read as `x += e` ("assignment adds") | `assign` → `compound '+'` (int, double, String) | plain reassignment not using its own variable |
| `INT_DIV_EXACT` | `7 / 2` is `3.5` | interpreter flag `intDiv: 'exact'` (int/int nodes only) | integer division |
| `INT_DIV_ROUNDED` | `7 / 2` rounds to `4` | interpreter flag `intDiv: 'round'` | integer division |
| `DIV_MOD_CONFUSION` | `/` and `%` swapped | operator swap on `int` nodes, `/=` ↔ `%=` | `int` `/` or `%` |
| `LINKED_COPY` | After `b = a`, `b` follows later changes to `a` | interpreter flag `alias: true`: `b = a` makes both names share one storage box; later writes through either name change both | a plain variable copy |
| `ASSIGN_DIRECTION_REVERSED` | `a = b` copies `a` into `b` | `x = y` ⇒ `y = x` | a plain variable copy |
| `PRINT_STORES_VALUE` | `println(a + 3)` also stores `a + 3` into `a` | the non-final `println` becomes an assignment to its first variable | the `PRINT_VS_STORED` family (final-value questions) |
| `CONCAT_NUMBERS_AS_TEXT` | `a + b + "!"` joins the digits (`"34!"`) | interpreter flag `plusMode: 'concatAll'` | `+` chains containing a String and numbers |
| `CONCAT_NUMBERS_ADDED_FIRST` | `"x" + a + b` adds the numbers first (`"x7"`) | interpreter flag `plusMode: 'numbersFirst'` | same |
| `CONCAT_ORDER_REVERSED` | operands of String `+` swapped | transformation | String concatenation |
| `BOOLEAN_NEGATION_IGNORED` | `!` ignored | removes `!` nodes | `!` |
| `AND_OR_CONFUSION` | `&&` ↔ `\|\|` | operator swap | `&&` or `\|\|` |
| `RELATIONAL_BOUNDARY` | `>` read as `>=`, `<` as `<=` and back | operator replacement | `< > <= >=` |
| `DOUBLE_FORMAT_DROPPED` | a whole-number `double` prints without `.0` | formatting model | double answer with an integral value |
| `CHAR_AS_NUMBER` | a `char` answer is its numeric code | formatting model | `char` answer |
| `IGNORE_UPDATE` | skips one update statement | interpreter `skip` set (one variant per relevant update) | any relevant update |
| `STALE_VALUE` | reads a variable's *previous* value in one statement | interpreter `stale` flag (one variant per variable read after ≥ 2 values) | a variable read after being updated |

All numeric models are run with relaxed bounds and rounding (three decimals) so that fractional or large "wrong" values can still be displayed; a model that errors (division by zero, overflow) simply yields no candidate.

### The specified precedence requirement

For

```java
int value = 2;
value = value + 4 * 4;
System.out.println(value);
```

the correct answer is `18` and the generator derives, with no special-casing of this program:

- `24` — `OPERATOR_PRECEDENCE_IGNORED`: `(2 + 4) * 4`;
- `16` — `OLD_VALUE_IGNORED`: ignores the original value;
- `10` — `MULT_AS_ADD`: adds both fours without multiplying.

This is asserted in `tests/unit.test.mjs` (*precedence distractors 24, 16 and 10 are GENERATED…*) together with equivalent wrong answers for other expressions (`5 * 3 + 2 * 4` ⇒ `68`; `20 - 6 / 2` ⇒ `7`). `examples/EXAMPLES.md` shows the same output.

## Selection and validation

For a challenge the generator collects all candidates, drops any whose text equals the correct answer, is longer than 24 characters, or contains `NaN`/`Infinity`, and chooses distractors by weighted random draw without replacement:

- weight 1.5 for specific misconceptions, 0.8 for the generic `IGNORE_UPDATE` / `STALE_VALUE`;
- ×2.5 when the misconception's family is among the program's reasoning families (so a program with integer division prefers integer-division mistakes);
- first pass takes at most one distractor per misconception ID, a second pass allows two if needed;
- all option texts must be distinct.

Requirements enforced per challenge (and re-checked for every one of the 20,000 bulk-test challenges):

1. Options are distinct and none equals the correct answer.
2. Every distractor carries `misconceptionId`, a short `label` and an `explanation`.
3. Every distractor is *reproducible*: re-running the named model over the program gives exactly that text.
4. Not every distractor can be `answer ± 1` (never a source of distractors; coincidences are allowed).
5. Option positions are shuffled with the challenge's seeded generator.
6. **Boolean results use a two-choice interaction** (one distractor), as long as at least one valid misconception exists.
7. A `char` answer has few genuine models (ignore/stale update, linked copy, wrong copy direction, character code), so it may be offered with 3 choices instead of 4. All other answer types require 4.
8. Weak questions (fewer distractors than required) are rejected and regenerated.

## Feedback wording

Each `explanation` describes what reasoning *would lead to* that answer and quotes the first line where it diverges from the correct execution, for example: *"Working strictly left to right and ignoring operator precedence gives this answer (at line 2, `value = value + 4 * 4;`, value would be 24 instead of 18). Java evaluates *, / and % before + and -."* The text does not claim to know what the student was thinking. The divergence line and values come from comparing the wrong run's states with the correct run's states, not from a template.

## Honest limits

- The models are plausibility-based and drawn from common introductory Java errors; they have not been calibrated against student response data. They are meant to be refined with real classroom data (the `misconceptionId` of each selected wrong answer is available to Work for that purpose).
- Rarely, two models give the same wrong text; the first one chosen is credited. The explanation then describes one legitimate route to the answer, not the only one.
- `INT_DIV_ROUNDED` uses round-half-up (`Math.round`).
