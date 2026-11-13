# Product vision and architecture

## CSG-PRD-01 — Product boundary

**Approved · implemented in part. Roles:** independent learners, enrolled students, teachers, curriculum contributors. CS Games is DevCat Studios' practice, diagnostics and mastery companion for classroom and independent use. Support short concept practice before or after a lesson, meaningful feedback, targeted follow-up, and teacher-reviewed demonstrations. School systems retain course administration and grades of record. Canvas QTI export and shareable links support that boundary. Grade passback, SSO integrations beyond current teacher authentication, and commercial tiers are future decisions.

**States and data.** Guest, class-backed, and teacher surfaces use the same curriculum vocabulary with separate storage and authority. AP CSP, Advanced CS, Robotics 1, and Workplace Readiness are current courses. RACECES is a shared writing/math tool. **Dependencies:** CSG-NAV-01, CSG-SEC-01, CSG-CUR-01. **Acceptance:** from the hub, each course and RACECES remains reachable, guest practice runs without accounts, and class actions require authorized scope. Use WCAG and privacy requirements in every flow.

## Baseline implementation map

| Layer | Implemented ownership and references |
| --- | --- |
| Public delivery | Static GitHub Pages. [Catalog](../cs-games/catalog.js), [course rendering](../cs-games/course-page.js), [shared breadcrumbs](../cs-games/navigation.css). Activities remain in their historical directories. |
| Student | [Class dashboard](../cs-games/student/dashboard.mjs), [guest adapter](../cs-games/student/guest/README.md), [shared map](../cs-games/student/map/), [practice links](../cs-games/student/practice-links.mjs). Guests and enrolled students share the map with role-specific inputs. |
| Teacher | [Teacher Tools](../cs-games/teacher/), [profile management](../cs-games/teacher/wpr-profiles.mjs), [requirements](../cs-games/teacher/requirements/), [pacing](../cs-games/teacher/pacing/), [online assignments](../cs-games/teacher/wpr-online.mjs), [QTI](../cs-games/teacher/qti.js). Current reporting opens individual profiles. |
| Curriculum | [Graph and pathway model](../cs-games/pathway/README.md), [evidence coverage](../cs-games/pathway/evidence-gap-registry.json). Courses → areas → skills → mapped practice and reasoning families. |
| Assessment | [Mastery engine](../cs-games/pathway/mastery/), [formative evaluator](../cs-games/pathway/proficiency/), [requirements](../cs-games/pathway/requirements/). The three have distinct responsibilities. |
| Persistence | [Worker and D1](../wpr-games/workplace-readiness/service/README.md), [profiles](../wpr-games/workplace-readiness/service/PROFILES.md). Browser practice is local or queued for scoped sync. Server owns teacher actions, published revisions, and official evidence. |
| Release and test | [Deployment runbook](../wpr-games/workplace-readiness/service/DEPLOYMENT.md), [.github workflows](../.github/workflows/). The full-role harness is maintained on [its dedicated branch](https://github.com/davisjm4/davisjm4.github.io/tree/audit/full-role-ux-environment). |

## CSG-PRD-02 — Reuse shared contracts

**Approved direction · partially implemented. Roles:** contributors and all users. Route changes should extend the existing catalog, shared map, sessions and Worker contracts. Different activity mechanics may have distinct controls, while shared patterns use one owner. Preserve additive changes to course IDs, node IDs, family IDs, evidence, report meaning and public routes. **States:** supported, practice-only, retired with compatibility, or newly registered. **Persistence/security:** reuse existing version and role boundaries. **Dependencies:** CSG-CUR-01, CSG-UX-01, CSG-DEV-01. **Acceptance:** a new activity can be registered, launched from every eligible entry, returned from, and verified against applicable evidence and session paths without a second role shell.
