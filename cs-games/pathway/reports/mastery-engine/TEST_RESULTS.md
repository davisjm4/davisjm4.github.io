# Test results: mastery challenge engine

Everything below was run in the cloud workspace with Node 22, a JDK 17 or newer, and `LC_ALL=C.UTF-8`, against the engine branch before the commits were made (the working tree differed from the Phase 2 final only by the new files and one added README row). No test uses a secret, a network call or a real student record: events come from a seeded generator (`synthetic.mjs`) or from the real lab engines driven offline.

## Summary

| Check | Result |
| --- | --- |
| Mastery engine tests | 83 of 83 pass (5 files) |
| Whole pathway test directory (the CI glob `cs-games/pathway/tests/*.test.mjs`) | 146 of 146 pass: the 63 that existed plus the 83 new ones |
| Negative controls | 27 of 27 deliberate breakages are caught by the tests |
| Existing suites | Pass: Java Games chain (`npm test`, exit 0), Workplace Readiness online and profile suites, CSP exam-readiness model and integration suites |
| Curriculum graph regeneration | Byte-identical (290 nodes, 453 question families, version `2026.11.10.1`) |
| Evidence-gap registry | Current (128 entries) |
| Demonstration | Synthetic students A to F all behave as intended |

## The new tests

| File | Tests | What it covers |
| --- | --- | --- |
| `mastery-engine-arithmetic.test.mjs` | 13 | Exact basis-point arithmetic (50 at 95% needs 48, 30 at 90% needs 27, 20 at 90% needs 18; every total up to 250 checked against an independent search), truncated percentage display, recovery numbers and their edge cases, mistakes allowed, percent entry without float noise; and the policy layer: validation that reports instead of throwing, a policy being a superset of the stored pathway policy (so `validatePathway` and the pathway diff accept it), a stable digest, no policy attached to anything by default, and the purity scan (no clock, randomness, network, storage or environment access in the engine source) |
| `mastery-engine-evidence.test.mjs` | 17 | Event normalization and attribution: first attempt only, duplicates, replays and retries, orphan retries, skipped, revealed and assisted answers (never correct credit, kept in the denominator by default, exclusion capped), the assessed mode versus the word "mixed", focused and Mixed feeding one count, forged node ids, malformed metadata, future timestamps, trust that only the integrator's resolver can set, stored rows and outbox events, profile and class scope, no leakage between students |
| `mastery-engine-evaluation.test.mjs` | 20 | Requirement checking: the minimum and exact accuracy boundaries at 90% and 95%, recovery and its accuracy-only caveat, edge cases, separate reporting of each unmet requirement, essential subskills (nearly perfect is enough, ambiguity fails), family diversity and its verifiability, impossible requirements and tiny pools, difficulty levels, minimum correct as an additional requirement, qualification freezing, provisional policies never qualifying, agreement with `evaluateNode` on plain accuracy policies, and no standards score from a challenge |
| `mastery-engine-attempts.test.mjs` | 22 | Lifecycle and what builds on it: open states derived from evidence, determinism, immutable histories, restart (fresh window, idempotent, stale-guarded, history kept, late events, a server clock behind the browser clock), policy change (supersede, explicit carry-over, completed attempt kept, `effectiveFrom`), the published-version digest guard, staleness, awards (refused without a trusted boundary; accepted only with verified events plus a covering boundary, in a shape `evaluateNode` recognizes; not exported to the browser entry point), area completion (required nodes only, never complete without approved requirements), different classes with different thresholds, published pathway snapshots left untouched, and calm output for empty or malformed input |
| `mastery-engine-demo.test.mjs` | 11 | The six synthetic students A to F and their determinism, Mixed Practice finishing all seven Math Lab skills with each draw credited once and only to its own node, and real events from the real session tracker and profile client (a wrong answer then a right one counts once as incorrect, a doubled submit counts once, skips and reveals emit nothing so the limitation is reported, and engine attribution matches the Worker for every lab and mode) |

Run them with:

```sh
node --test cs-games/pathway/tests/mastery-engine-*.test.mjs
```

## Negative controls

`scripts/negative-controls.sh` (in the package) copies the tree, breaks one engine rule at a time, and expects the tests to fail. All 27 were caught, after the baseline passed 83 of 83. Three controls did not bite on the first try because the tests were too weak; those tests were strengthened (a value that distinguishes rounding from truncation, the real floating-point trap, and a clock-skew restart), and the log in `evidence/negative-controls.txt` is from the final run.

The rules covered: exact minimum-correct arithmetic; truncated display; recovery edge cases; one credit per question; retries never add credit; skipped, revealed and assisted answers; client trust claims; the word "mixed"; client node ids; student and class scope; restart idempotence and staleness; immutable history and published policy versions; claimed-event ledgers; award boundaries and the server-only export; no standards score from a completed challenge; lower-bound recovery; unbound family names; ambiguous subskill evidence; unverifiable family requirements; optional skills; and area completion without approved requirements.

## Existing suites

| Suite | Result |
| --- | --- |
| Java Games chain (`cd java-games && LC_ALL=C.UTF-8 npm test`) | exit 0, 18 suites reported "checks passed" (the log is in `evidence/java-games-npm-test.log`; it includes the Math Lab, Array Lab, Boolean, Recursion and ArrayList suites that feed the evidence this engine reads) |
| `node cs-games/teacher/wpr-online-tests.mjs` | 0 failures |
| `node cs-games/teacher/wpr-profile-tests.mjs` | 0 failures |
| `node csp-games/exam-readiness/tests/model.test.mjs` | pass (pathway model, storage and curriculum: 402 assertions, 411 cumulative) |
| `node csp-games/exam-readiness/tests/integration.test.mjs` | pass (3306 assertions; explicit skill event interface deduplication) |
| `node cs-games/pathway/build-graph.mjs` then `git diff --exit-code` on the graph | no diff |
| `node cs-games/pathway/tests/build-gap-registry.mjs --check` | current, 128 entries |

Running the Java chain rewrites three tracked report files (`array-lab/reports/smoke-results.json`, `math-lab/expansion/tests/results/test-report.json`, `search-sort-lab/tests/results/generator-table.json`). Those changes were discarded and are not part of the branch.

## Edge cases exercised

At the boundary: exactly the minimum and one under it; accuracy exactly at the threshold (27 of 30, 48 of 50) and one correct answer short (26 of 30, 47 of 50); a 100% target after a miss; nothing answered; perfect accuracy; tiny minimums; a minimum-correct requirement that must hold alongside the percentage; every total up to 250 checked against an independent search.

Evidence: the same question reported twice (same event id, new event id, focused then Mixed); wrong then right (one incorrect first try); a retry with no original; events with a future timestamp; events from another student or class; client-forged node ids and trust fields; "mixed" as the assessed mode; malformed or incomplete metadata; the stored row shape and the outbox shape.

Lifecycle: restart twice with one request id; restart with a stale attempt id; restart with nothing answered or after the requirements were met; late events after a restart; a server clock behind the browser clock; a policy edited in place; a policy replaced mid-attempt with and without carry-over; a completed attempt under an old version; `effectiveFrom` deciding when the new window opens.

Areas: optional skills; a required skill with no approved requirement; stale or superseded earned requirements flagged for review without being removed; qualified versus verified.

## Limitations, stated rather than hidden

Skips and reveals are not sent by the practice pages, so the denominator rule for them applies only to records that carry the flags; every evaluation says so (`SKIPS_NOT_RECORDED`). Subskills are inferred from the family, mode and topic a lab reports. Family diversity can be verified for 54 of 290 skills (all Advanced CS), and Variable Lab reports one family per skill. The graph does not record which difficulty levels each skill offers, so availability is treated as unknown. Timestamps come from browser clocks, so the engine uses the order of events within a student's stream and a server-supplied `now`, never its own clock. The attempt, restart and award records are not persisted anywhere yet (no migration was added), so nothing here changes what a student's profile stores today.

## Not tested, by design

The award function is tested only for what it refuses and for the shape of what it returns; there is no trusted evidence source yet, so there is nothing real to certify. No Worker route, D1 table or browser page was changed, so there is no production behavior to test.
