# Build 4 — implementation and verification

Date: November 10, 2026 (America/Los_Angeles)
Audit baseline: `61928578e0cdba68888add20fdf434aa53caf849` — latest main when this work started.
Status: implementation completed in development; production backend/profile connection pending; graphical map deferred.

## Infrastructure audit

| Existing component | Finding and reuse |
| --- | --- |
| `csp-games/exam-readiness/curriculum.js` | Canonical CSP skill IDs, objective descriptions and CED references reused; no replacement standards registry |
| `csp-games/exam-readiness/mapping.js`, `bridge.js`, `storage.js` | Existing question-specific resolver/local evidence and deduplication retained; no conversion of page visits to mastery |
| `cs-games/catalog.js`, Teacher Tools integration inventory | Existing activity routes and reviewed mode metadata reused; source-family registries used directly for Loop, Array and Math |
| `wpr-games/workplace-readiness/content/skills.json` | All 22 skill groups and assessable concept IDs reused |
| WPR online reporting | Frozen assignments, anonymous receipts, class totals and teacher ownership remain in the existing service/database |
| Advanced CS | 16 Java labs audited through catalog/inventory and direct core engine registries. Generated template has skill-level nodes; supplementary CSP links remain in the original catalog |
| Robotics | Parts catalog categories and three activity metadata sources reused. Course Architect evidence remains teacher-assessed; interactive scored adapters are not invented |
| Shared progress | Java/CSP local session stores and CSP readiness evidence already exist. WPR reports are anonymous aggregates, not an individual persistent mastery database |
| Teacher Tools | Existing tool page links to `/cs-games/teacher/pacing/`. Quiz generation and reporting modules are retained |
| Authentication | Existing Google Identity Services signature/audience/issuer/expiry/allowlist verifier reused |
| Student profiles | No completed persistent pseudonymous profile/enrollment service present in baseline main. A prior requested build is not evidence of deployed infrastructure |
| Cloudflare/D1 deployment | Example config still has placeholders; `productionApi` and `googleClientId` are empty. Repository explicitly documents no active production deployment. Worker service and SQLite development adapter are available and extended |

## Delivered architecture

- Versioned graph `2026.11.10.1`: 4 courses, 69 areas, 280 skill nodes, 296 source family bindings.
- Stable IDs: course slug → `area:<course>:<source>` → `node:<course>:<source>:<skill>` → `family:<node>:<source-family>`. Custom areas/nodes use UUIDs. Checkpoints are namespaced to a stable class pathway ID and node. Renaming or rescheduling does not change an ID.
- Class plan: independent UUID/class reference, graph version, date-only school calendar, custom schedule, ordered node IDs, required/optional checkpoints, versioned mastery policy references, target exam and derived sessions.
- Published revision snapshot: immutable parent/revision lineage, pinned curriculum descriptors, checkpoint revision stamps, prior definitions and reviewable differences.
- Separate policy definitions and immutable learning evidence input; provisional defaults have no arbitrary question or accuracy thresholds.
- Shared-service head resolution, student status history and safe-boundary/offline reconciliation foundations.
- Student/map contract supplies ordered areas/nodes, directed prerequisite edges, dated checkpoints, practice recommendations, sessions and policy versions; the accessible student preview consumes it directly.

## Acceptance evidence

All automated fixtures use synthetic teachers and students. The HTTP integration exercises the actual Worker router, existing auth hook, real SQLite-backed D1 adapter, schema and publication trigger; it does not substitute an in-memory fake pathway repository.

| Requirement | Verification |
| --- | --- |
| Different calendars/classes, independent class edits | Core schedule tests plus isolated class/teacher HTTP integration |
| Move checkpoint and revise student deadline | Two independently authenticated synthetic student reads see revision 2 and November 12 target; original award stays complete |
| Reorder areas/nodes | Sequence projection tested; prerequisite ordering and cycles tested; area controls browser-reviewed |
| Review/testing reservation | Protected dates have no allocations; review IDs appear only after introduction; quiz/final windows retain minutes and are preserved under bulk review edits |
| Final exam/time pressure | Changing exam end changes capacity; deficits retain requirements and show alternatives; class meeting exports checked |
| Preserve mastery/evidence on publish | Evidence input remains byte-for-byte unchanged across four published revisions |
| Remove nodes / revise policies | Removed checkpoint no longer determines completion; original attempts/awards unchanged; old policy definitions immutable |
| Draft isolation / concurrent teacher edits | Students see prior head until publication; stale draft version and preview token return 409 |
| Rollback | Revision 1 staged, then published as revision 4; original configuration restored without rewriting evidence |
| Active question/examination | Client test defers adoption while active and notifies at release; actual practice/exam call-site integration awaits profile build |
| Older cache / offline evidence | Independent cache sessions reconcile safely; stable event IDs deduplicate queue and require exact acknowledgment; disconnected queue remains intact |
| Mixed/focused practice | Actual skill metadata routes to same node, with first-attempt accuracy/coverage; untrusted/page-visit records cannot award completion |
| Completion vs 0–4 | Revised numeric target can be Behind while a node's earned completion stays complete |
| Export fidelity | CSV fields and ICS event count/date set match actual scheduled class meetings; exclusive ICS end semantics round-trip |
| Existing platform | Existing CSP readiness tests (3,309 bridge assertions and 411 model assertions), WPR online tests, catalog and unified navigation tests pass |
| Browser | Synthetic A-day class meeting count, protected mixed-practice range, preview gate, local revision, student published preview and independent copy verified in Chrome |

Automated pathway suite: **19 tests passed**, including one multi-step HTTP integration scenario. Existing WPR online suite: **4 tests passed**. Existing readiness integration/model and catalog/navigation regressions passed. CI workflow is included at `.github/workflows/class-pathway-check.yml`.

## Deliberate boundaries

1. No graphical map in this assignment. The contract is ready for pan/zoom, landscape, branches and accessible-list rendering from one published source.
2. No production cloud synchronization claim: real Worker/D1/OAuth configuration, profile enrollment and verified individual evidence adapters are missing dependencies. Student endpoints fail closed without adapters.
3. All time estimates and default mastery policies are provisional. This implementation does not certify a professionally calibrated mastery threshold or a complete official standards alignment for local Advanced CS/Robotics objectives.
4. ICS support is all-day, nonrecurring school dates. Timed/recurring entries fail explicitly and require expansion/manual CSV classification.
5. Existing all-game local session data is not promoted to trusted cloud mastery. Focused/Mixed metadata interface is implemented and tested, but every generator has not been newly instrumented in this foundation build.
6. Polling/focus/online propagation and an idempotent outbox are reusable modules. The later profile/student-shell integration must call them and bind safe examination boundaries. Full first-visit offline app availability is not claimed.
7. Browser review used a desktop viewport. Responsive layouts and keyboard labels are implemented; a real Chromebook/touch-device audit is still needed before claiming device-wide verification.
8. Sharing is independent JSON/template copying with new class IDs. There is no new public template-sharing directory or cross-teacher permissions system.
