# Development, validation, and ownership

## CSG-DEV-01 — Change protocol

**Approved drafting boundary and shared-component rule · other operating details proposed. Roles:** product owner, maintainers and AI contributors. Start with [the index](README.md), current task scope, applicable IDs, latest source, release SHA and tracker state. Identify the normal entry points, data owners, and prior compatibility. Read applicable canonical domains and existing runbooks. Verify the existing behavior before assuming a missing feature. Preserve shared contracts and use existing patterns. Apply CSG-DEV-03 to every new activity or CTE pathway.

1. Describe the changed behavior, requirement IDs, evidence and affected users. If conflict exists, identify both sources and the owning domain. Record a proposed decision with default and impact. Ask the product owner to resolve material policy conflicts before altering them.
2. Tie implementation to approved scope, dependencies, and measurable acceptance. Document migration, rollback and compatibility for saved routes, student records, evidence families, published revisions and report formats.
3. Validate from normal entry points with the narrowest applicable unit, integration and browser suites. Include original regression coverage and a test for a meaningful new failure mode where appropriate.
4. Record the SHA, environment, synthetic data scope, commands, results, remaining limitations and authority for release. Any deviation from a shared standard requires an exception ID, the affected requirements, owner approval, a testable fallback and a review date. Distinguish source presence, test pass, merge and deployment.
5. Update approved requirement or exception records with provenance. Keep old IDs, historic links and sources.

**States/data:** proposal, approved, implemented, verified, released, superseded. Metadata belongs in Git or tracker and excludes private learner data. **Dependencies:** CSG-PRD-02, CSG-TRK-01. **Accessibility/security:** review affected roles and capabilities; use synthetic users for authenticated testing. **Acceptance:** a reviewer can trace each changed user behavior to approval, requirement and evidence; conflicted or unsupported behavior is explicitly labeled.

## CSG-DEV-02 — Publish an approved specification baseline

**Approved process · pending explicit approval. Roles:** product owner and maintainers. The product owner reviews this draft and records accepted scope and the disposition of open items. Use a documentation-only pull request for the approved version, rebase against current main as needed, and verify path/anchor integrity and a docs-only diff. After explicit merge authorization, merge and tag the initial version (recommended `cs-games-spec-v1.0.0`). Record the baseline in [the index](README.md) and Release History. Link approved IDs in the tracker only as authorized. Maintain a version note and decision history for later changes. Proposed versioning: increment major for a breaking policy or architecture change, minor for an additive approved requirement, and patch for clarification or source corrections.

**Legacy policy:** retain historical reports as dated evidence and add pointers in the canonical index or legacy documents when approved. Operational runbooks remain technical references. If an older product directive conflicts, preserve history, identify the superseding decision ID, and direct readers to the canonical requirement. Keep `AGENTS.md` and `CLAUDE.md` as routing guidance. **Data/security:** no production writes, secrets or roster information in docs. **Dependencies:** CSG-TRK-01 and explicit approval. **Accessibility:** readable headings, link labels, accessible tables and text alternatives. **Acceptance:** a clean checkout resolves both root guidance files, every canonical ID and the approved version; no source-code or deployment changes enter the documentation release.

## CSG-DEV-03 — Shared-component release gate

**Approved · required for future releases (CSG-DEC-13). Roles:** contributors, reviewers, product owner. Every new CS Games activity or CTE pathway must use the shared navigation, mastery, reporting and My Session components wherever supported. Register course-specific content and evidence through shared contracts. A capability that is genuinely unavailable is declared and explained in the shared UI. A parallel implementation of a shared interface requires an explicit, documented product-owner exception before release.

| Gate item | Required review evidence |
| --- | --- |
| Navigation | Shared header or role shell, role-aware Map/List/search and return where applicable, plus legacy/direct entry coverage. |
| Mastery and evidence | Shared evidence eligibility and result labels, with practice-only or teacher-reviewable states where applicable. Test guest and class attribution independently. |
| Reports and My Session | Shared entry, denominators, scope, print/export and applicable reset/persistence behavior. Preserve printable guest reporting. |
| Accessibility and compatibility | Check the supported keyboard, touch, responsive and screen-reader paths. Record the tested role, activity or pathway, commit and environment. |
| Exception | Record the exception ID, approved owner and scope, affected requirements, rationale, compatible and accessible fallback, tests, and review or retirement date in the decision log. |

**States/data:** pending, passed, blocked, or approved exception with verified fallback. Record the result in release evidence before release. No credentials or learner records belong in that evidence. **Dependencies:** CSG-PRD-02, CSG-UX-01/03, CSG-CUR-01/02. **Acceptance:** CSG-AT-14 exercises a registered new activity and pathway, verifies reuse, and blocks release when a duplicate lacks an approved exception.

## Existing verification entry points

| Surface | Existing verification entry |
| --- | --- |
| Navigation and catalogs | `node cs-games/navigation-tests.mjs`; see [.github workflow definitions](../.github/workflows/) for canonical test commands. |
| Curriculum and evidence | `node --test cs-games/pathway/tests/*.test.mjs`; verify generated coverage is current using the pathway and guest READMEs. |
| Profiles and diagnostics | `node --test cs-games/teacher/cs-games-backend-tests.mjs cs-games/teacher/wpr-profile-tests.mjs cs-games/teacher/wpr-online-tests.mjs`; run matching Chromium suites with the documented dependencies. |
| Full-role browser workflow | [Audit branch handoff](https://github.com/davisjm4/davisjm4.github.io/blob/audit/full-role-ux-environment/_audit/cs-games/CLAUDE_GEMINI_HANDOFF.md). Node 24+, local isolated launcher and Chromium. Existing tests use disposable data. |
| Documentation-only | Validate local links, unique requirement IDs, decision provenance, acceptance coverage, Markdown rendering, git diff and branch targets. Application tests are run when behavior changes or directly relevant evidence needs reproduction. |

A test pass in headless Chromium covers that environment. Record physical Chromebook, phone touch, screen-reader, alternate browser, live signed-in, and Canvas import results separately. Keep current course and legacy session links as regression cases.
