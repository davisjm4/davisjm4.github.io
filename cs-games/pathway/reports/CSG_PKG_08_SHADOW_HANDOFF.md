# Independent mastery evaluator — shadow rollout handoff

Status: **research / draft PR only**. This branch imports Claude's CSG-PKG-08 evaluator and compatibility tests. The proposed history migration is **not enabled or deployed**.

## Current server behavior

The existing `view.proficiency` result remains unchanged and authoritative. The new opt-in evaluation runs only for enrolled Advanced CS and AP CSP pathway requests when the environment variable `CSG_PROFICIENCY_SHADOW` is the string `1`. By default the variable is absent and no independent evaluation is performed.

When opt-in is enabled, the server computes a separate comparison and logs *aggregate counts only*: course ID, node count, count of differing skill levels, count of legacy levels lower, and count of legacy levels higher. It does not send an additional response field, change student/teacher scores, modify requirements, write D1 rows, or touch historical progress. No learner ID, class ID, individual skill ID, assessment record or event payload is included in the shadow log. Shadow exceptions are isolated from the student response.

This is **observation only**, not a replacement for the existing proficiency evaluator.

## Required validation before merge

1. Run `node --test cs-games/pathway/tests/independent-outcomes.test.mjs cs-games/pathway/tests/shadow-proficiency.test.mjs cs-games/pathway/tests/proficiency.test.mjs` and the complete pathway/backend/browser suites on the PR head.
2. Verify the existing response payload is identical, including cache keys and mastery status, with shadow flag off versus on.
3. Enable the flag in a development environment with synthetic, consented or appropriately privacy-reviewed evidence; confirm counts and logging do not contain identifiers or events.
4. Analyze whether observed differences arise from class-policy coupling rather than unrelated rubric changes. Preserve teacher assessments and prior earned progression.
5. Test course evidence semantics for CSP, Workplace Readiness and Robotics before expanding beyond Advanced CS / CSP.
6. Review performance and errors. Do not enable broad production shadow telemetry until its impact and privacy have been assessed.
7. Keep the migration **unapplied** until a separately approved append-only history implementation with real D1 tests exists.

## Remaining releases

PR #49 is the separate Workplace Readiness content/evidence-integrity effort. Do not activate WPR automatic mastery until its independently scored reasoning-family capacity meets its unchanged thresholds.

The student and teacher UI cutover, new cache contracts, history persistence/backfill, and course-level advancement behavior remain future changes. The project does not need additional Fable usage.
