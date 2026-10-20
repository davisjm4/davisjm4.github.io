# Math Lab

Public route: `/java-games/math-lab/`.

One expression, four choices, one scored submission, a concise explanation,
and Next Challenge. Mixed Practice is the default. The existing Java Games
session tracker records the actual mode, first submission, skips, and answer
reveals after wrong submissions; no accounts, storage schema changes, or
server-side evaluation are introduced.

## Question pool

31 template slots across five modes:

- Modulus (7): larger/smaller dividend, exact divisibility, nonzero remainder,
  negative dividend, negative divisor, both negative.
- Integer and Double Division (5): int destination, int division widened to
  double, double on the right, double on the left, both operands double.
- Casting (6): cast after int division, cast before division, denominator
  cast, positive/negative double-to-int cast, int cast of a floating quotient.
- Mixed Expressions (8): addition/division, grouped numerator, subtraction
  with remainder, remainder then multiplication, integer division then
  multiplication, multiplication then remainder, grouped addition with
  multiplication/subtraction, floating division before subtraction.
- Reverse Challenges (5): decimal quotient, whole quotient widened to
  double, choose a remainder expression, cast a quotient, expression order.

These are template slots, not a claim of 31 unrelated mathematical concepts.
Mode bags rotate all five categories; template bags rotate operand/control
structures. Before/after-division cast questions have at least two intervening
rounds, even in Casting mode. Recent exact questions are avoided. Four
options are shuffled; numerical equivalents are removed, including `3` and
`3.0`. Reverse questions execute all four expressions and require exactly one
matching result. The supplied specification's reverse example had two valid
expressions; this implementation rejects that ambiguity.

## Numeric semantics

`engine.js` is a recursive-descent evaluator for numeric literals, unary signs,
parentheses, `(int)`/`(double)` casts, and `+ - * / %`. It models the operands'
types and Java precedence/left associativity, rather than using the destination
variable to choose arithmetic. No dynamic code evaluation is used by students.

Ordinary questions use small finite values and nonzero divisors. Double
division uses powers-of-two denominators, so results have exact short binary
representations and unambiguous decimal displays. Direct cast literals use one
decimal place. Int division truncates toward zero; a nonzero int remainder has
the dividend's sign. Double values retain `.0` where appropriate. Overflow,
nonfinite values, and exception questions are outside this introductory pool.

Distractors represent integer/decimal division confusion, rounding, wrong cast
placement, quotient/remainder confusion, discarded signs, and incorrect
grouping or precedence. Nonintegral keys have another nonintegral choice to
avoid a "pick the only decimal" shortcut.

## Verification

Run `npm test` in `java-games`, or `npm run test:math` for this game's suite.
Node and Java 17+ with the source-file compiler module are required for the
development checks. `JAVA` can select another Java launcher, and
`CSP_DOM_LIBRARY` can point to an externally installed `linkedom` dependency.
Neither is required to play the published game.

The seeded Math Lab suite checks 100 items per template (3,100 total), every
displayed answer, formatting, negative remainder/casts, precedence, and all
answer locations. It independently compiles and runs 4,600 Java expressions
and declarations, including every reverse option, and compares the Java
result's type and exact text. The 40-submission UI test exercises correct and
incorrect choices in every mode, lockout, duplicate clicks, skips, mode
changes, back/forward restoration, persistence, and preserved legacy results.
Mixed Practice and cast spacing are checked over 150-round sequences.

## Java numeric reasoning expansion

The game also offers **Math Methods & Random Ranges** and **Numeric Limits,
Overflow & Round-off**, each at Beginner, Intermediate, and Advanced levels.
These modes use the DOM-free modules in `expansion/`: a seeded generator,
Java numeric interpreter, Math.random range analyzer, 26 weighted reasoning
families, misconception-tagged choices, and a bounded recent-question deck.
`generateChallenge({ mode, difficulty, seed })` is the reusable Teacher Tools
entry point; `createExpansionDeck()` supplies continuous play without a
question-bank limit. The original expression engine and five modes remain
unchanged, and Mixed Practice continues to use only the original modes.

Run the expansion checks with `npm run test:math-expansion`. They sample 1,000
seeds per mode and difficulty, validate deterministic keys and distractors,
and independently compile/run generated examples against the installed Java
runtime. The UI test uses the shared session tracker in a simulated DOM.

The shared engine, existing games, session tracker, summary, and styles are
unchanged. Registration adds Math Lab metadata to the home-page catalog only.
The home-page script version and its card-count assertion are updated.

Responsive CSS keeps the code and choices within narrow screens, with 48px
minimum answer targets, wrapping text, and native keyboard-operable buttons.
Actual device/touch checks and student completion time require separate
verification; source/DOM tests alone do not establish those results.
