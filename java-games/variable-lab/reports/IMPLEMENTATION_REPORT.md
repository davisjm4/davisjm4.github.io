# Java Variable Lab — instructional feedback repair

> The name-acceptance policy in this historical report is superseded by [Scenario-Aware Declaration Validation](SCENARIO_VALIDATION_REPORT.md). Other feedback improvements remain in place.

Date: October 26, 2026 (America/Los_Angeles)
Baseline: `bcea7de679b51f700e352200c211b5a1682c7fb6` (latest main inspected before edits; includes Package A and Package B).
Published game: https://davisjm4.github.io/java-games/variable-lab/
Implementation commit: `7f8fa4a8ab026334e668a4178ceead87a84576d3`. Published and directly verified in Chrome on October 26, 2026. GitHub Pages deployment run `40450027319` succeeded; navigation, Teacher Tools reliability, and Trace Repair Verification workflows all succeeded.

## Root cause and implementation review

`java-games/app.js` called `J.hint(q, wrong)` after every incorrect non-Trace submission. `engine.js` selected one of three fixed game-level hints, without seeing the response, selected node, assembled fields, or earlier attempt. Both Identification and Assemble therefore received the same advice. Assemble assessment compared all four fields against `q.answer`, so it neither diagnosed Java semantics nor recognized valid alternative names.

Reviewed the current generators, nested selection tree, tap/keyboard/Expand Selection handlers, assessment, retry/reveal paths, session tracker and existing quality/DOM/compiler tests. Existing metadata provides node IDs, exact source spans, parent relationships, target IDs, scenario, expected literal, and the explicit introductory type convention. There was no response-aware misconception metadata for these two modes. Trace has its own misconception/trace system and is unchanged. Difficulty levels belong only to Trace; Identification and Assemble do not have difficulty-dependent generators. No levels were added.

Original expectations were checked against `java-games/README.md`, `QUALITY_AUDIT.md`, `quality-tests.mjs`, the current source, and the teacher's detailed repair requirements. The attached CSP report archive contains CSP reports rather than original Variable Lab requirements. Original screenshot image bytes were not attached to this task; the exact code and responses transcribed in the teacher's request are the regression fixtures.

## Files changed

- `java-games/variable-lab/feedback.js`: bounded response diagnosis supporting the existing engine hooks.
- `java-games/engine.js`: pass response/history through the existing hint hook; route only Variable Lab Identification/Assemble explanations and Assemble validation to diagnosis.
- `java-games/app.js`: retain the previous incorrect response per challenge; supply it to hints, successful explanations, and reveal. Reset it on a new challenge.
- `java-games/variable-lab/index.html`: cache version for the repaired app and a small feedback readability rule, scoped to Variable Lab.
- `java-games/quality-tests.mjs`: revise the Variable Lab name assertion to accept valid alternate identifiers when the prompt requires no exact name.
- `java-games/variable-lab/feedback-tests.mjs` and `feedback-ui-tests.mjs`: focused semantic, instructional, compiler, and DOM integration tests.
- `.github/workflows/trace-repair-check.yml`: add the two focused feedback regression commands to the existing Java verification job.
- `java-games/variable-lab/reports/*`: report, exact fixtures, reproducible browser verification page, and machine-readable evidence.

## Classroom examples: before and after

Before, both examples received: “Not quite. Hint 1: Separate the data type, variable name, assignment operator, and value.”

### Identification

Source: `int eggsNeeded = 3;` followed by `boolean ovenPreheated = false;`. Target: assignment operator for `ovenPreheated`. Selected: `false`.

After (first hint):

> You selected “false”. That is a Boolean literal. The question asks for an assignment operator. This is a value of type boolean, not an operator or a variable name. Look for the symbol that assigns an initial value to the requested variable.

Second hint adds the operator's location between name and value and distinguishes assignment from equality comparison. The full worked answer and correct highlight remain under Show Answer or independent success. Selecting `boolean`, the name, the other statement's `=`, or the expanded declaration produces a diagnosis of that actual selection.

### Assemble

Student statement: `char seeds-planted == 45.0;`. The regression scenario asks for a count of 45 seeds.

After (first hint), the feedback quotes that entire student statement and lists three issues:

1. `==` compares values; a declaration needs an assignment operator between name and initial value.
2. `seeds-planted` is not one valid identifier; the hyphen is read as subtraction.
3. `char` and the double decimal literal `45.0` are incompatible for direct initialization. `char` stores one UTF-16 character; a narrowing numeric conversion needs an explicit cast and can lose information.

There is no extra false claim that the numeric magnitude 45 differs from 45.0. A corrected operator is acknowledged on retry while the remaining issues stay visible. Show Answer displays `int seedsPlanted = 45;` with the declaration/initialization and compatibility rules, contrasting the earlier response.

## Diagnosis and progressive behavior

Identification classifies the actual selected node/span, including primitive types versus the String reference type, identifiers, assignment operators, integer/decimal/Boolean/character/String literals, complete initialized declarations, bare declarations, and assignment statements. It differentiates selecting the right kind in the wrong statement from selecting the wrong kind. Expanded selections are classified as statements/spans rather than as the token from which expansion began. All 12 supported Identification variants, including stored values and conversions answered from buttons, have response-specific feedback. Unsupported operator categories were not added to the generator.

Assemble uses one diagnosis result for both assessment and feedback. Operator and identifier errors precede value syntax and type/value compatibility, followed by scenario requirements. One compatibility issue describes a relationship rather than incorrectly blaming both fields separately. A field that already satisfies its requirement is not independently labelled wrong. Valid alternative names are accepted because the prompt never specifies an exact identifier. Java-legal widening remains distinct from this activity's explicit “most appropriate type” convention. The literal must also represent the scenario's actual value; legal syntax alone does not suffice.

The first hint diagnoses the current response without showing the complete target answer. The second supplies a more specific locating rule (Identification) or explicit operator guidance (Assemble). Later hints focus on the remaining extent/location or numbered issues. Retry comparison acknowledges resolved diagnosis categories. Show Answer and success explain the actual accepted declaration or requested component, and reference the last incorrect answer. No automatic reveal was added.

## Java semantics and validation

The implementation never evaluates raw student text. It recognizes the generated literal subset and applies Java assignment conversions: identity, primitive widening, and representable constant-int narrowing to byte/short/char. It separates Boolean literals from quoted words, char from String, single versus double quotes, int/long/float/double literal typing, range errors, malformed literals, and keywords versus variable names. It does not claim that char is limited to letters or that numeric assignments need identical types.

Oracle Java Language Specification references: [assignment contexts, §5.2](https://docs.oracle.com/javase/specs/jls/se25/html/jls-5.html#jls-5.2), [lexical structure and literals, Chapter 3](https://docs.oracle.com/javase/specs/jls/se25/html/jls-3.html). An independent Java 17 compiler oracle verified 44 focused declarations, including the whole malformed classroom statement. Existing quality tests additionally compiled 1,330 snippets and checked 60 reassignment/cast results against JVM execution, including negative truncation toward zero.

## Automated coverage and regression results

- 63,250 focused assertions passed: 900 Identification challenges (12 variants × 3 supplied difficulty options × 25) and 300 Assemble challenges. The difficulty options confirm existing behavior is preserved; they do not create levels in these modes.
- Token/category/source consistency, wrong-statement selections, expansion spans, progressive hints, no worked-answer leakage before reveal, and Show Answer reasoning are covered.
- Assemble tests cover one through four simultaneous diagnoses, reserved/invalid identifiers, all existing operators, syntax, compatibility, scenario mismatch, alternate names, widening, constant narrowing, numeric typing, char/String syntax, corrected retries, and reveal.
- 45 exact-classroom DOM integration checks passed for clicks, keyboard, expansion, retries, alternate names, reveal, Next Challenge, first-try/retry/submission/reveal counts, and completion locks.
- Existing engine suite: 8,400 seeded challenges passed.
- Existing shared DOM suite: 4,917 checks passed across the original four games, plus Session Summary and data isolation checks.
- Daily-boundary, migration, and per-mode session tests passed.
- Existing Variable Lab quality checks passed: 1,000 Assemble samples retain exactly 20% per type, 21 families, existing repeat avoidance, and 1,800 Identification samples across 12 variants.
- Unchanged Trace adapter tests passed (70 challenges); Trace unit tests passed (35); catalog/navigation checks passed.
- Full `npm test` was attempted. It passed the preceding Math and Array suites, then stopped at `debugger-lab/debugger-redesign-tests.mjs:81`: an unrelated test expects the retired text “Advanced CS” but the preserved Package A breadcrumb says “Advanced Computer Science.” The same failure was reproduced in an isolated checkout of baseline `bcea7de`. No navigation or Debugger changes were made.
- Remaining downstream suites were run independently so the earlier Debugger failure could not hide their results. Robot, Loop, Class/Object, class-builder sessions, Method/Constructor, Boolean/Range Explorer UI and quality gates, Recursion (including JVM), ArrayList, and String passed. Teacher Tools QTI passed all six formatting/integrity checks and 852 adapter samples across 136 combinations.
- Two additional unrelated baseline failures were confirmed: RACECES adapter test expects 15 authored topics while the source has 23; Search/Sort UI expects the old “Advanced CS” navigation text. Both reproduce on untouched baseline. Search/Sort algorithms, generation, quality and JVM suites passed before that UI assertion. These three baseline issues were documented without changing their implementations or tests.
- CI now also runs both focused feedback test files as a normal part of Trace Repair Verification, using Java 17.

Reproduce focused tests from `java-games/`:

```sh
VARIABLE_FEEDBACK_EVIDENCE=/tmp/variable-feedback node variable-lab/feedback-tests.mjs
node variable-lab/feedback-ui-tests.mjs
node quality-tests.mjs
node session-tests.mjs
node tests.mjs
node ui-tests.mjs
node variable-lab/trace-tests.mjs
node variable-lab/trace-generator/tests/unit.test.mjs
```

## Browser and mobile verification

The standalone `reports/classroom-browser.html` verification page runs the current app and engine with the exact classroom fixtures. Its iframe can render either fixture or the ordinary published mode at 1100 or 390 CSS pixels. It does not add a mode, alter generation, or expose a fixture override in the student game. Both exact classroom examples were reproduced after publication at 1100 and 390 CSS pixels, with actual iframe client widths checked from rendered DOM. Identification correctly diagnosed false as a Boolean literal, progressed its second hint, classified an expanded declaration, and revealed the operator with no independent credit. Assemble showed three issues for the exact malformed declaration, acknowledged the corrected operator, accepted int plantCount = 45; after retry, and explained its reveal with no independent credit.

The ordinary published generators were also exercised: Identification distinguished a selected character literal from the requested assignment statement; phone-width Assemble diagnosed int download speed != "62.5"; and accepted the corrected double downloadSpeed = 62.5; with retry credit. The direct published game loaded with Mixed Practice selected, and Session Summary opened with the expected per-mode totals. Dark styling, code taps, field selectors, feedback wrapping and vertical phone scrolling worked. Existing navigation remained intact. This verifies narrow layout and interaction in desktop Chrome, not a physical phone touch device.

Representative screenshots in the delivered evidence bundle show the exact Identification and Assemble desktop feedback and readable Identification feedback at phone width. Machine-readable evidence includes feedback-results.json, browser-verification.json and the saved published Assemble DOM. The verification fixture uses the real session tracker with memory-only storage; ordinary published-mode checks use the normal session behavior. The cloud browser could not access the local preview server, so pre-publication interaction was checked through DOM integration tests.

## Scope and limitations

No generation families, scenarios, distributions, retry policy, scoring rules, session schema, storage keys, daily behavior, accounts, navigation, tracker, Trace logic, other games, CSP, WPR/RACECES, Teacher Tools, or QTI implementation were changed. Package A and Package B are preserved. The shared app/engine hooks fall back to the original behavior for all unrelated modes/games.

This is a bounded validator for the activity's existing literal/choice bank, not a general Java compiler. Arbitrary expressions, Unicode escape preprocessing, hex/octal/binary literals, text blocks, declarations with modifiers, and full Java parsing are outside its input surface. The bank contains no such choices. Java conversion primitives beyond the bank were tested defensively without expanding the bank. Valid alternative identifiers may be less descriptive than the intended scenario name; acceptance follows the actual prompt rather than a hidden exact-name requirement. Physical Chromebook/phone hardware was not available; browser checks use desktop and narrow CSS viewports.
