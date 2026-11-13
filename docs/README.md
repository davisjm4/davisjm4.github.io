# CS Games product specification

**Version 1.0 · Approved November 13, 2026**

Owner and approval authority: **Josiah Davisson, DevCat Studios**. Application evidence baseline: repository `main` at `aca36a50455c13c8fd3da2de6e54607c8f10f625`. The product owner approved [the review commit](https://github.com/davisjm4/davisjm4.github.io/commit/0696117e100b2be537e6ccdf228d97d20bedc346) and resolved CSG-OPEN-13 in CSG-DEC-14. The immutable baseline is [cs-games-spec-v1.0](https://github.com/davisjm4/davisjm4.github.io/tree/cs-games-spec-v1.0/docs). Product approval and permission to build, migrate, or deploy are separate decisions.

## Read by task

| Domain | Canonical document | Requirement IDs |
| --- | --- | --- |
| Vision, role boundaries, and source architecture | [Product and architecture](product-and-architecture.md) | CSG-PRD |
| Route ownership, sitemap, search, and legacy links | [Navigation and information architecture](navigation.md) | CSG-NAV |
| Layout, tokens, shared controls, and accessibility | [UX and interaction standards](ux-standards.md) | CSG-UX |
| Guest and enrolled workflows | [Student experience](student-experience.md) | CSG-STU |
| Class instruction, planning, reports, and administration | [Teacher experience](teacher-experience.md) | CSG-TCH |
| Assignments, switching, restrictions, and release | [Teacher-directed learning](teacher-directed-learning.md) | CSG-TDL |
| First attempts, formative levels, official results, and policy versions | [Mastery and evidence](mastery-and-evidence.md) | CSG-MAS |
| Daily practice, printable reports, and history | [Session reporting](session-reporting.md) | CSG-SES |
| Identity, isolation, and retention | [Privacy and security](privacy-and-security.md) | CSG-SEC |
| Curriculum registration and additional CTE pathways | [Curriculum and pathway integration](curriculum-and-expansion.md) | CSG-CUR |
| Decision provenance and review queue | [Decision log](decisions.md) | CSG-DEC, CSG-OPEN |
| Audits, defect reconciliation, and implementation sequence | [Evidence and roadmap](evidence-and-roadmap.md) | CSG-PKG |
| Master Tracker proposal | [Tracker integration](tracker-integration.md) | CSG-TRK |
| Verification and release gates | [Acceptance scenarios](acceptance-tests.md) and [Development](development.md) | CSG-AT, CSG-DEV |

## Start the review

Read [the decision log](decisions.md) for approved product decisions and the evaluator migration policy, [the assignment contract](teacher-directed-learning.md) for the controlling addendum, and [the roadmap](evidence-and-roadmap.md) for migration sequence. Then review the domain documents and [acceptance scenarios](acceptance-tests.md) together.

## Authority and states

1. The product owner's explicit decision governs product intent. The teacher-directed learning addendum controls priority and overlap. CSG-DEC-09 through CSG-DEC-13 record the Version 1.0 review decisions.
2. The tagged specification governs product behavior. Domain requirements own their subject, with cross-links for shared rules. Teacher-directed learning owns assignment semantics. Mastery and evidence owns scoring. Privacy and security owns trust boundaries.
3. The checked-out code and deployed version establish current behavior. Technical runbooks govern compatible operations. A discrepancy is a recorded defect, a rollout gap, or an open decision. Track it with the affected ID and evidence.
4. The Master Tracker indexes work, releases and verification. Audits and historical reports are evidence. Neither independently grants design approval or release authority.

| State | Meaning |
| --- | --- |
| Implemented | Observed in the cited source or tested at the baseline. Verification scope is recorded separately. |
| Approved | Explicit owner direction. Delivery may be planned, partial or implemented. |
| Proposed | Recommended design or contract detail requiring review before implementation. |
| Known defect | Observed divergence or usability problem. A finding may have a proposed remediation. |
| Future | Candidate scope outside the baseline. |

Each requirement has an immutable ID, design state, delivery state, roles, behavior and UI states, persistence and security boundaries, dependencies, and observable acceptance. The domain headings or named anchors are the permanent links. Never recycle retired IDs. Cross-cutting accessibility and security checks apply to every requirement that exposes UI or data. Use [Development](development.md) for approval, versioning, and change control.
