# Independent proficiency integration checkpoint (CSG-PKG-08)

**Status: draft / opt-in shadow only. Not an evaluator cutover.**

This branch imports the independent evaluation API from the Claude handoff and adds a guarded read-only shadow comparison inside the class pathway Worker. The active client response and existing historical and official scores remain unchanged.

## Three separate outcomes

- **Course proficiency:** eligible evidence measured against the course rubric, without class practice policy overrides.
- **Class practice target:** teacher-controlled completion policy, evaluated by the existing mastery progress service.
- **Official assessment:** teacher-reviewed score and original evidence, passed through unchanged.

A tougher class practice requirement must not lower an earned course proficiency level, and an easier requirement must not inflate it.

## Current implementation

- Pure comparison, independent evaluator, and append-only history helpers: cs-games/pathway/proficiency/independent.mjs
- Shadow comparison: service/pathways.mjs runs only when the Worker environment explicitly sets PROFICIENCY_SHADOW=1 and the learner has a supported Advanced CS or AP CSP profile.
- The shadow logs only course ID and aggregate counts. It must never log profile IDs, raw evidence, credentials, question text, or teacher assessment data.
- Proposed migration 0009_formative_level_history.proposed.sql is **not** in the Worker migrations directory and has not been applied anywhere.
- Synthetic tests cover independent thresholds, official score isolation, historical carry-forward, and the proposed SQLite migration.

No changes to My Session, maps, class target assessment, student grades, curriculum nodes, D1, or progress caching. This branch does not complete the historical replay gate.

## Gates before evaluator cutover

1. Import and run the complete upstream 16-test historical compatibility suite from the Claude ZIP against the current branch; resolve any drift.
2. Exercise Advanced CS, AP CSP, Robotics, and Workplace Readiness evidence, and do not infer cross-course equivalence.
3. On a copy of production records, replay legacy and independent results side by side. Explain discrepancies and preserve the policy context of earlier results.
4. Validate teacher assessment data, historical progression, class-target restart, offline replay, exports, and student/teacher views.
5. Decide the independent source of area readiness and supplemental-skill counting. They still depend on some class participation information in the existing evaluator.
6. Only after a separately reviewed migration and provenance decision: append newly recorded history, add versioned response fields, and validate rollback.
7. Switch student and teacher views only behind a new feature flag after full D1, browser, history and accessibility tests.

**Do not** reconstruct earned historical levels without trustworthy records, apply the proposed migration to production, alter teacher scores, or replace the active view.proficiency on this branch.

## Workplace Readiness dependency

PR #49 remains separate with security hardening preserved. Its 30 automatic mastery candidates remain disabled because the audited question diversity does not support the unchanged mastery requirements. Independent proficiency is not a workaround for those gates.

Source: Claude delivery claude-pkg08-package.zip, originally tested at commit e28a53c2be82b4f5ab1afa134d7e3ec3bf65bc7b. This branch uses no external Fable service.
