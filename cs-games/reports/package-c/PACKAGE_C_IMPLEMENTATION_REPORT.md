# Package C — Narrow Maintenance

Date: October 27, 2026 (America/Los_Angeles)

Baseline: `66fd689ef2d75372223ceaa22842980dcde0cf36`. This implements the user's narrowly approved Package C: Loop Lab misconception feedback, RACECES stale test contracts, and Debugger/Search & Sort navigation test assertions. The original comprehensive audit findings R-11 and the RACECES portion of R-10 were consulted. The separate API Project Builder and CSP clock items from R-10 remain deferred.

## Reproduced failures and repairs

### Loop Lab

Deterministic seed 518, mode `while`, difficulty `beginner`, family `zero-while`, produced:

```java
int n = 93;
while (n < 0) {
    n--;
}
```

The question asks for the final value of `n`: the correct answer is `93`. Selecting the incorrect answer `0` produced the misconception note “This ignores the if condition, as if the statement ran on every iteration.” There is no if statement in this program.

Root cause: the `zero-while` family explicitly assigned `ignore-condition` to the `0` distractor. `buildChallenge` looked up the shared if-specific explanation for that tag. Other families use the same tag for actual if conditions, so changing its global text would have damaged legitimate feedback.

Repair: the `0` distractor now has the dedicated `zero-while-boundary` tag and this note: “The while condition is checked before the body. It is false on the first check, so the body runs zero times and the variable keeps its initial value. Zero is the boundary, not the final value.” Existing `ignore-condition` feedback remains intact for real if statements. The correct answer, distractor values, code, trace, grading, automatic reveal/lock and scoring were not changed.

The Loop page and module imports use a new cache version so browsers receive both the new tag and its note. Because unchanged family helpers still import the old module URL, `loop-engine.js` recognizes `GenReject` from both module instances; this preserves the existing retry-on-rejected-candidate behavior instead of treating ordinary generation rejections as fatal.

### RACECES test contracts

`node cs-games/teacher/raceces-adapter-tests.mjs` initially stopped at `23 !== 15`: the test expected the original 15-topic catalog despite the current 23 topics. The repaired test compares all 23 independently listed IDs with the adapter catalog and the canonical source metadata, checks uniqueness and verifies the eight Mathematics IDs and their subject.

After correcting the topic assertion, the same test reached a second stale assertion: it expected `SCORE` to be set to 2 points directly. Package B changed the supported QTI scoring convention to a 0–100 response weight plus per-item `points_possible` metadata. The test now verifies each item's two-point metadata, score range and default, 100 for its own correct choice, 0 for all three incorrect choices, and the assessment point total. QTI production code was not changed. Existing XML, ZIP, grading, uniqueness and mixed-source checks remain.

The eight Mathematics topics are `math-algebraic-expressions`, `math-coordinate-transformations`, `math-equations-inequalities`, `math-functions`, `math-geometry`, `math-measurement`, `math-statistics-probability`, and `math-triangles-polygons`. Deterministic checks exercised every topic across all three modes and three difficulty levels, including topic/subject filtering, independent grading and reproducibility: 72 combinations.

### Java navigation test assertions

Debugger's test matched the former label `Advanced CS`; the actual Package A breadcrumb is labeled `Advanced Computer Science`.

Search & Sort assumed the first header anchor pointed to Advanced Computer Science. The first anchor correctly points to `/cs-games/`; the next points to `/cs-games/advanced/`. The test now locates links by resolved destination, not position.

Both tests check the hub and pathway destinations, current label and current-page breadcrumb using a common test helper. Each includes a negative control that changes the pathway destination and proves the assertion fails. Existing production HTML, navigation links, ordering and styling were not edited.

## Files changed

- `java-games/loop-lab/engine/families-original.js` and `engine/questions.js`: assign and explain the specific zero-while misconception.
- `java-games/loop-lab/index.html`, `loop-ui.js`, and `loop-engine.js`: cache versioning and compatibility for both existing/new module instances.
- `java-games/loop-lab/tests/package-c-feedback.test.mjs`: deterministic feedback, correct/incorrect answer, actual-if control and Java compiler/JVM tests.
- `cs-games/teacher/raceces-adapter-tests.mjs`: 23-topic and Mathematics coverage; Package B-consistent scoring assertions.
- `java-games/debugger-lab/debugger-redesign-tests.mjs`, `java-games/search-sort-lab/tests/ui.test.mjs`, and `java-games/package-c-navigation-test-helper.mjs`: destination-based breadcrumb assertions with negative controls.
- `.github/workflows/trace-repair-check.yml`: run the focused Loop feedback regression.
- `cs-games/reports/package-c/`: this report, evidence and a standalone browser verification fixture. The fixture uses the published interface and engine with deterministic seed 518 and an in-memory test session; it is not a student game mode.

## Validation

- Loop targeted test: exact seed 518, 200 zero-while challenges across Beginner/Intermediate, 86 initial values, 60 other while challenges, actual-if control; six Java compiler checks and JVM outputs matched.
- 300 pre/post seeded zero-while challenges had identical code, prompts, correct answers, choices, metadata and traces; only the affected misconception tag/note changes.
- Existing Loop redesign: 30,440 checks, 75 legacy fixtures and 95 structural variants passed.
- Existing Loop engine: 493,138 checks across 14,400 challenges; 2,088 answers matched independent closed-form oracles.
- Existing Loop JVM: 18,942 checks, 1,860 instrumented and displayed-code runs, and 120 terminating buggy examples passed with Java 17.
- RACECES adapter test: 9,000 candidates, 8,995 accepted, five validly rejected, zero answer failures; all 72 Mathematics mode/level/topic combinations, catalog, filters, grading, QTI and ZIP checks passed.
- RACECES unit and compose suites passed, including the production-asset failure guard.
- Debugger redesign test passed including 168 Java compiler snippets and 30 runtime/exception executions. Search & Sort UI passed 198 checks including navigation negative control.
- Shared navigation/catalog, QTI formatting, Teacher Tools adapters, Java session, Variable Lab feedback/DOM and 105-scenario validation passed. The Variable Lab scenario suite covered 3,000 generated challenges and 212 Java compiler examples.
- The broad Java `npm test` completed successfully, including Debugger, Loop Lab, Variable Lab, ArrayList Lab, String Lab and Search & Sort. Search & Sort's quality suite reported 15 existing low-diversity flags as informational warnings; its tests passed.
- Final GitHub checks, publication, browser checks and commit IDs are recorded in the verification addendum after completion.

Raw command output, original failures and machine-readable evidence are provided in the accompanying evidence bundle.

## Scope and limits

Package A's navigation and Package B's Teacher Tools/QTI implementation were preserved. Both Variable Lab repairs, all other activities and the master tracker were unchanged. Test-generated changes to historical results were discarded after validation. Desktop and phone-width browser results are recorded separately; emulated viewport testing does not substitute for physical device testing.
