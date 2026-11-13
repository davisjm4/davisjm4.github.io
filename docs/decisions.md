# Product decision log

Owner: Josiah Davisson. This register records product approval separately from the draft's merge and any subsequent implementation authorization.

| Decision ID | State and source | Decision and affected requirements |
| --- | --- | --- |
| CSG-DEC-01 | Approved · October 26 project discussion, Package A | Keep a central course-first hub, stable legacy URLs, dark navigation, session reports and shared RACECES access. Historical restrictions on that package were scope-specific. Robotics later joined the current registry. CSG-PRD-01, CSG-NAV-01/03. |
| CSG-DEC-02 | Approved · November 5 diagnostics and November 11 product discussions | Practice and mastery companion to classroom systems. Preserve targeted diagnostics, follow-up and aggregate privacy. Canvas remains a supported export route. CSG-PRD-01, CSG-TCH-05, CSG-SEC-02. |
| CSG-DEC-03 | Approved · November 10/12 pathway and proficiency decisions | Course → Area → Skill → Reasoning Families. Immutable published revisions, Level 3 sufficient, Level 4 optional, evidence quality independent of difficulty label, teacher-verified alternatives. CSG-MAS-01/02/03, CSG-CUR-02. |
| CSG-DEC-04 | Approved · November 12 Build 5 direction and current brief | Open independent exploration, guest/local isolation and evidence-backed levels. Familiarity cannot award proficiency. CSG-STU-01, CSG-SEC-02. |
| CSG-DEC-05 | Approved direction · November 13 specification brief §3 | Course selection before map, Map/List, concept search, one recommendation, consistent return, My Session with named print and official mastery above provisional evidence. CSG-NAV-01/02/03, CSG-STU-03, CSG-SES-01. |
| CSG-DEC-06 | Approved · November 13 brief §5 and addendum §§1–6 | Teacher-directed learning defaults to advisory. **Class-wide first** regardless of time. **Both destinations available** in either order. Keep independent position and each assignment state. Restrictions coexist, affect unrelated launches, and default to manual release. Teacher sees and releases restricted profiles in the dashboard. Assigned evidence uses the ordinary evaluator, and official evidence is retained. CSG-TDL-01–04, CSG-STU-04, CSG-TCH-02/05, CSG-MAS-04, CSG-SEC-03. |
| CSG-DEC-07 | Superseded · initial §5 recommendation | Preferred individual focus is superseded by the explicit addendum on class-first display. Earlier activation time also carries no priority. |
| CSG-DEC-08 | Approved · November 13 publication boundary | Documentation draft only. Merge, baseline version and tracker connections require explicit approval. Prior release authorization recorded in the tracker does not approve this draft. CSG-DEV-01/02. |
| CSG-DEC-09 | Approved · Version 1.0 review, decisions 1 and 6 | Course formative proficiency, class practice target progress and official teacher-reviewed mastery are independent results. Publishing a target can change target status only for the same evidence and rubric. Preserve evidence, historical policy context and teacher-verified scores. CSG-MAS-02/03, CSG-STU-03, CSG-TCH-02/04. |
| CSG-DEC-10 | Approved · Version 1.0 review, decision 2 | Enforce restrictions across authenticated class entry points and launches. Public guest access stays available independently. Guest attempts cannot authorize class access, complete class work or silently become class evidence. Clearly explain stale and unknown permission. CSG-TDL-04, CSG-SEC-02/03, CSG-NAV-02/03, CSG-STU-04. |
| CSG-DEC-11 | Approved · Version 1.0 review, decision 3 | Keep RACECES as a shared tool with a prominent Workplace Readiness entry and its legacy URL. Remove the standalone homepage section as part of the navigation redesign. CSG-NAV-01/03. |
| CSG-DEC-12 | Approved · Version 1.0 review, decision 4 | Adopt compatible defaults for links, area jump parity, assignment completion and recipients, manual release, offline permission, compact comparison, explicit drafts and guest print. See the dispositions below for product defaults and delivery details. |
| CSG-DEC-13 | Approved · Version 1.0 review, decision 5 | Every new activity or CTE pathway must pass the shared-component release gate. Parallel navigation, mastery, reporting or session interfaces require an approved exception. CSG-PRD-02, CSG-UX-01, CSG-CUR-01/02, CSG-DEV-03. |

## Disposition of draft questions

The IDs below preserve links from draft 0.1. The approved defaults govern product behavior. The proposed mechanisms and future scope listed here carry no implementation or release authorization.

| ID | Disposition and approved product default | Implementation detail or deferred scope |
| --- | --- | --- |
| CSG-OPEN-01 | Resolved by CSG-DEC-12. Preserve legacy URLs, use the logical header destinations, and retain area jump until search and grouped List achieve parity. | Final paths, aliases and compact header layout follow compatibility and accessibility tests. |
| CSG-OPEN-02 | Resolved by CSG-DEC-11. RACECES remains shared and prominent within Workplace Readiness. The standalone homepage section is retired in the redesign. | Exact shared entry and responsive layout. |
| CSG-OPEN-03 | Defaults adopted under CSG-DEC-12. Start with existing dark styles, keep course identity, and target WCAG 2.2 AA. | Validate proposed token values and pane layout at required widths. |
| CSG-OPEN-04 | Resolved by CSG-DEC-12. Mapped task evidence completes work where supported, with teacher confirmation as fallback. Completion stays separate from scoring. | Define eligible tasks and same-target matching explicitly. One attempt keeps one evidence identity. |
| CSG-OPEN-05 | Defaults adopted under CSG-DEC-12. Whole-class membership is dynamic, selected groups are snapshotted, and selected-group work appears with catch-up by default. Release can affect one student without changing other grants. | Proposed teacher order then start time, grant-scoped exemptions, and a new target version with visible applicability and retained history for substantive edits. |
| CSG-OPEN-06 | Resolved by CSG-DEC-10/12. Apply the class boundary, preserve guest isolation, defer launches under stale or unknown class permission, and retain in-progress input. | Cache lifetime, verification protocol, queued replay validation and supported checkpoints. |
| CSG-OPEN-07 | Defaults adopted under CSG-DEC-12. Use a compact area comparison, a narrow-screen list and meaningful evidence volume, date and revision context. Preserve existing exports. | Validate numerical cutoffs and prototype added per-skill export fields. |
| CSG-OPEN-08 | Core policy resolved by CSG-DEC-09. Course formative, class target and official results are independent. Retain existing tier rules. | Cross-tier substitution is outside this baseline. CSG-OPEN-13 covers a possible legacy cutover discrepancy. |
| CSG-OPEN-09 | Defaults adopted under CSG-DEC-12. Preserve optional guest name, print/PDF and useful existing copy/export. | Prefer transient print-name entry. Assess legacy values and downstream needs before deleting stored data or replacing formats. |
| CSG-OPEN-10 | Use the existing class lifecycle and limited visibility by default under CSG-DEC-12. Reasons remain optional. | Additional retention or broader export is outside this baseline and requires separate approval if proposed. |
| CSG-OPEN-11 | Resolved by CSG-DEC-12. Explicit Save Draft, then Preview and Publish. | Autosave is deferred. It would need concurrency and recovery checks. |
| CSG-OPEN-12 | Compatible slices under CSG-DEC-12. Fix independently verified feedback/reporting defects first where authorized. Gate teacher direction on the approved class access, target and completion contracts. | Package dates and deployment order are delivery planning. See [roadmap](evidence-and-roadmap.md). |

## Conditional owner decision before migration

| ID | Trigger and decision | Recommended default |
| --- | --- | --- |
| CSG-OPEN-13 | If replay shows that the independent course rubric yields a lower result or different progression than a previously displayed coupled result, approve what students and teachers see at cutover and whether prior progression carries forward. | Keep the historical result with its original policy label and preserve previously earned progression. Show the current course result with its rubric and transition context. Keep evidence and official scores intact. Confirm against the actual replay before release. |

No unresolved choice blocks approval of the Version 1.0 product behavior. CSG-OPEN-13 gates only an affected migration. Capture unavailable provenance as a gap. Audit recommendations and historical approvals apply only within their documented scope.
