# Integration handoff for ChatGPT Work: AP CSP proficiency audit A

Branch `claude/csp-proficiency-expansion-a` on `main` `440a7ef` (PR #26). Not pushed, merged or deployed. Read [`CSP_PROFICIENCY_AUDIT_A.md`](CSP_PROFICIENCY_AUDIT_A.md) first.

## What this changes

No new proficiency level. It keeps three kinds of question out of Level 3 evidence and fixes one recommendation.

| File | Change |
| --- | --- |
| `csp-games/proficiency-metadata.js` (new) | Two pure helpers, no imports: `booleanMakeEvidence` (tag a make-it-TRUE question as Level 3 evidence only when both inputs matter and at most 25% of pairs open the gate) and `architectComponent` (label counter increments and direct procedure calls so they are practice, not Level 3) |
| `csp-games/app.js` | Boolean Gatekeeper uses `booleanMakeEvidence` instead of the inline test |
| `csp-games/architect-ui.js` | Architect reports `architectComponent(q)` as the component |
| `csp-games/boolean-gatekeeper/index.html`, `csp-games/algorithm-architect/index.html` | Cache token `?v=proficiency-v3` on the two scripts that changed (the shared `app.js` stays on `v2` for the other pages) |
| `cs-games/pathway/proficiency/coverage-phase2.mjs` | Procedures Level 3 needs 2 models (there are only 2 composition models); Iteration's recommended mode is now Iteration |
| `cs-games/pathway/reports/proficiency-skill-matrix.csv` | One cell regenerated (Iteration Level 3 practice mode); every Supported/Unavailable column is unchanged |
| `csp-games/ui-tests.mjs`, `session-ui-tests.mjs`, `architect-redesign-tests.mjs` | Inject the new helper into their VM contexts (see below) |
| `cs-games/pathway/tests/csp-proficiency-a.test.mjs`, `csp-proficiency-a-browser.mjs` (new) | 22 unit checks and a 26-check real-Chromium attribution test |
| `cs-games/pathway/audit/csp-proficiency-a/` (new) | Scripts that reproduce every number in the audit |

The evaluator, the 0–4 meanings, skill ids, published teacher policies, official awards and the Session Summary are untouched. No new persistence was added.

## Read this before merging

1. **The three test harnesses must change with the game scripts.** They strip every `import` from `app.js` or `architect-ui.js` and run the result in a VM that only has the names the test injects. Adding an import without adding the name makes them fail with `ReferenceError`. I made exactly that mistake first and the regression run caught it; the fix is already in the branch.
2. **Likely merge conflict with the Independent Learner package.** That package also adds a name to the VM context in `csp-games/session-ui-tests.mjs` (`recordGuestAttempt`, next to `recordGameAttempt`). This branch adds `booleanMakeEvidence` on the adjacent line of the same object. Keep both names.
3. **Earlier records keep their meaning.** A learner who already has Level 3 from a counter increment or a dense Boolean question keeps it. New questions are tagged by the new rule. The density of an old question cannot be recomputed.
4. **Level 3 now takes longer in some skills** (median questions, all correct): Boolean 30 to 48, Selection 9 to 15, Procedures 6 to 18; the others are about unchanged. See the audit for the table.

## Verified

Fresh-clone results are in `CSP_PROFICIENCY_A_RESULTS.md`. Summary: 22 unit checks and 26 browser checks pass; the whole pathway suite passes; every CSP suite touching these games passes once the harnesses are updated; the enrolled-student proficiency browser suite passes.

## Needs an educator decision

The 0.25 density limit and the Boolean effort it causes; whether counter increments and direct calls should count toward Level 2 instead of being practice only; two-model Level 3 for Procedures; the straight-line Sequence update items. Listed with reasons in section 8 of the audit.

## Not done

Level 2, Level 3 or Level 4 expansion beyond what is supported (see section 7 of the audit for the content each needs), and a generator change to raise the share of sparse both-inputs Boolean questions.
