# Curriculum and future CTE pathway integration

## CSG-CUR-01 — Course registration

**Approved architecture direction · current four-course registry, repeatable extension contract proposed. Roles:** curriculum authors, teachers, learners. Register courses by immutable IDs. A course carries a display name, summary, accessibility label, accent and icon, stable route, standards registry and version, areas, skills, validated activity destinations, and teacher/profile/report capabilities. Use the same navigation, Map/List, search, profiles, assignments, restrictions, progress, mastery, reporting, accessibility and privacy contracts. Feature availability is declared per evidence capability. Missing support is visible as practice-only or teacher-reviewable. Each new pathway can carry its own scope and standards without forking platform behavior.

**States/data:** draft, validated, available, practice-only and retired. Stable metadata and public links survive rename. No public registry contains real class data. **Dependencies:** CSG-PRD-02, CSG-NAV-01, CSG-TDL-01–04, CSG-SEC-01. **Accessibility:** labels, purpose, icon/text pairing and alternative inputs. **Acceptance:** add a synthetic fifth pathway to fixtures and prove it appears through guest and enrolled course navigation, filters, search, reporting, class planning and assignment target selection using shared components.

## CSG-CUR-02 — Skill and activity evidence contract

**Approved · implemented for mapped coverage. Roles:** curriculum authors, contributors, teachers. Canonical hierarchy is Course → Area → Skill → Reasoning Families, with activities bound by validated mode/family selectors. Each skill records stable ID, title, objectives, standards references, aliases, prerequisite suggestions, progression role, supported evidence band and activity links. Record licensed sources and distinguish adopted standards from local objectives. An activity records stable ID, canonical and legacy routes, supported modes, timing/submit behavior, actual assessed mode and family, guest/class eligibility, restriction compatibility, session reporting and print support. State which outcomes can be tracked, assigned, credited or evaluated. Avoid unsupported mastery tiers and preserve the known AP CSP Build 6 limits.

**States/data:** unscored, tracked at activity or skill, formative, teacher-reviewable, approved official evidence, disabled and retired. Use [the existing graph builder](../cs-games/pathway/build-graph.mjs) and [evidence attribution rules](../cs-games/pathway/README.md). Preserve historical node descriptors and immutable snapshots. Scope all enrolled records. **Dependencies:** CSG-MAS-01/02, CSG-SES-02, CSG-NAV-02. **Accessibility:** game keyboard/touch equivalent, feedback, reduced motion and print as applicable. **Acceptance:** seeded exercises prove correct grading, stable IDs, mode/family attribution, no false credit for unsupported, assisted or otherwise ineligible cases, and correct role-specific launch/return behavior.

## Repeatable registration checklist

1. Choose an immutable course ID, public and legacy routes, canonical title, owner, brand accent, icon and audience.
2. Specify a standards source/version and map objectives. Provide local objectives where formal alignment is unavailable. Verify curriculum permissions and asset attribution.
3. Register areas and skills with stable IDs, aliases, and supported activity/mode links. Do not hardcode a four-course switch.
4. Provide an evidence capability matrix for guest and class. Validate generator answer keys, reasoning-family quality, first-attempt and retry behavior, mixed-mode attribution, unscored controls, and absent-coverage messaging.
5. Prove learner and teacher lifecycle: guest history, enroll/restore, skill launch and return, pacing, publish, assignments/restrictions, official assessment, reports and export.
6. Verify access, retention, responsive, screen-reader, keyboard and touch requirements. Record the course-specific verification scope and gaps. Add the capability to existing test registries and the tracker through approved release workflow.
7. Preserve old routes/data, prepare backward-compatible rollout, and archive superseded claims as history after approval.

Additional CTE fields and courses are **future**. The template reserves extension points; it does not certify a pathway or grant new release authority.
