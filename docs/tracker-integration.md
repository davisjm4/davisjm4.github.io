# Master Project Tracker integration proposal

[Live Master Project Tracker](https://docs.google.com/spreadsheets/d/16Zr5Nn2ubN2ecBvOZUbeDpOnxqGHvDUty08QqqMPtnA/edit). Read-only review, November 13, 2026. Headers and sample rows were inspected. No spreadsheet updates are authorized by this draft.

| Existing tab | Observed fields and use | Proposed integration after approval |
| --- | --- | --- |
| Master Inventory | ID, Area, Component / Workstream, Type, Status, Priority, revision/history, owner, evidence and verification date. Existing G-IDs are stable. | Preserve rows and IDs. Add reference links through the new requirements tab. Populate existing notes only with approved, scoped updates. |
| Priority Backlog | Rank, workstream, deliverable, status, assignee, acceptance, dependencies and milestone. | Add approved implementation packages as new rows when scheduled, using CSG-PKG IDs and links. Keep historical priorities and packages intact. |
| Release History | Date, component, event, commit/version, outcome, verification and reference. | Append a specification baseline event after merge, then one entry per implementation release with commit and environment evidence. |
| Issues & Risks | I-IDs, component, severity, status, next action and evidence. | Link existing issues to spec requirements or append new issues after dedupe and current reproduction. Keep past status and evidence. |
| How to Update | Source hierarchy, status vocabulary, cadence and historical deployment authorization. | Add the approved baseline URL and explicit review/approval distinction. Retain prior project history. |

## CSG-TRK-01 — Stable links and separate states

**Proposed · pending baseline approval. Roles:** product owner, contributors, reviewers. Add a **Product Requirements** tab keyed by immutable CSG requirement ID and a **UX Decisions** tab keyed by decision ID. Cross-reference historical inventory IDs where grounded. The backlog links to package IDs and acceptance scenario IDs. Copy only short descriptions and stable URLs. Canonical policy stays in Git.

| Tab | Proposed columns |
| --- | --- |
| Product Requirements | Requirement ID, domain, short title, design state, implementation state, verification state, acceptance IDs, related inventory/issue IDs, package IDs, owner, canonical pinned URL, updated date |
| UX Decisions | Decision ID, approved/proposed/superseded, date, owner, concise decision, dependencies, linked requirement IDs, canonical pinned URL |
| Priority Backlog additions | Package ID, requirement IDs, acceptance IDs, design approval, delivery stage, verification environment/evidence, release link |
| Release History additions | Baseline/version or commit, affected IDs, released status, verification scope, compatibility caveats, evidence link |

Example rows for review: CSG-TDL-02 is **Approved / Planned / Not run** and links to CSG-AT-TDL-01–03. CSG-MAS-03 is **Approved / Partial / Baseline coupling observed**. Link planned separation to CSG-DEC-09, CSG-PKG-08 and CSG-AT-05/11–13. G-005 remains an existing game inventory ID with its existing classroom-review history. I-007 through I-009 remain Robotics risks, not redesign decisions.

**Data and security:** no student identifiers, raw reports or credential material in tracker cells. Use scoped read-before-write with verified tab IDs and headers. Approval, implementation and verification states stay independent. **Dependencies:** CSG-DEV-02 and explicit tracker-update approval. **Accessibility:** labeled columns, clear status text and readable links. **Acceptance:** compare row counts/IDs and historical fields before and after; verify new links resolve to approved anchors; a planned requirement cannot appear implemented from a design decision alone.
