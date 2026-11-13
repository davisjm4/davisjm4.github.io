# Navigation and information architecture

## CSG-NAV-01 — Course selection and role navigation

**Approved direction · partial. Roles:** guest, enrolled, teacher. Separate course selection from the full map. Choosing a course opens its map directly. Keep Browse activities as a distinct path for known labs, teachers, and direct assignments. Use consistent, role-aware global navigation. The proposed menu names and placement are Courses, My Session, Join a Class or My Class, and Teacher Tools (CSG-OPEN-01). The course switcher shows current scope. Opening a public course while signed in must make independent practice explicit and preserve class attribution boundaries.

**States/data:** no course, selected course, switching, guest/class scope, unavailable course, legacy route. Stable course IDs drive the switcher and course cards. Preserve legacy routes and browser Back. **Dependencies:** CSG-CUR-01, CSG-SEC-01. **Accessibility:** labeled landmarks, current-page state, keyboard course switcher and visible focus. **Acceptance:** a first-time student selects any registered course and reaches its map without a second chooser. Existing Canvas, assignment, game, and report URLs still resolve. The global header works with a keyboard at phone width.

## CSG-NAV-02 — Shared Map, List, and concept search

**Approved direction · Map/List implemented, concept search planned. Roles:** guest, enrolled. Map and List represent the same course, area, selected skill, and availability. Provide concept search across skill labels, approved synonyms, language symbols and relevant concepts, with clear course scope. Results name the skill, area, course and matched concept, with Show on Map/List and Practice where supported. Rank exact concept matches ahead of area or lab matches. Reveal relevant locked destinations with the reason if that disclosure is appropriate to the class. Use the same launch-eligibility contract from either view.

**States/data:** empty, query, results, no match, unavailable, restored selection. Index stable node IDs and authored aliases. Normalize case, spacing and method punctuation without conflating different language terms. Keep search context on return. **Dependencies:** CSG-CUR-02, CSG-TDL-04. **Accessibility:** named search, result count announcement, grouped results, keyboard reach and focus restoration. **Acceptance:** modulus/remainder, indexOf/find index, substring, nested loops, parameters, conditional statements, and binary representation resolve to appropriate skills. A focused link claims only a supported filter. No matching family or mode falls back to an honestly labeled broader activity.

## CSG-NAV-03 — Contextual return and compatibility

**Approved · partial. Roles:** learners. A mapped practice launch shows **Back to Course Map** and restores the source role, course, area, skill, Map/List state and applicable assignment context. Use one visible return action. Direct practice links use a safe course fallback. Breadcrumbs expose Home → Course → Activity, or the relevant teacher class hierarchy. **States/data:** map launch, deep link, stale target, changed restriction, restored position. Validate same-origin route parameters and never put credentials in return URLs. **Dependencies:** CSG-STU-03, CSG-SEC-01, CSG-TDL-04. **Acceptance:** guest and class practice return to the originating skill after an answer. Archived, unauthorized or stale context falls back to an accessible route with an explanation. Back/Forward and refresh preserve the normal history contract.

## Sitemap

Logical destinations are the target. Exact new paths and redirects are proposed under CSG-OPEN-01. Existing paths are compatibility entry points.

| Destination | Current entry or grouping | Target hierarchy |
| --- | --- | --- |
| Home and Courses | `/cs-games/`; independent chooser at `/cs-games/student/guest/` | Home → Courses → Course Map or Browse Activities |
| Course hubs | `/cs-games/csp/`, `/cs-games/advanced/`, `/cs-games/robotics/`; Workplace setup at `/wpr-games/workplace-readiness/` | Shared course shell → Map/List/Search; Browse Activities; course-scoped My Session |
| Skill and practice | Guest or class map → area → skill → historical lab route | Course Map → Area → Skill → Focused Practice → Back to Course Map |
| Joined student | `/cs-games/student/` combines join, restore and progress | Join/Restore → My Class → Today's Classwork, Your Catch-Up Work, Class Progress, Profile |
| Daily and long-term results | AP CSP/Java report routes, Workplace Performance, robotics inline and guest local history | My Session → Today and Independent History; My Class → Class Progress |
| Teacher | `/cs-games/teacher/` plus requirements and pacing routes | Teacher Tools → Classes → Class → Progress, Assignments, Plan, Manage |
| Teacher details | Roster → report; practice tab → builder and reports | Progress → roster/matrix → student and skill → evidence, review and export. Assignments → focus or diagnostics → status/report |
| Planning | `/cs-games/teacher/requirements/` and `/cs-games/teacher/pacing/` | Class → Plan → Pathway, Practice Requirements, Pacing → Preview and Publish |
| Shared tools | `/wpr-games/raceces/` linked from Home and Workplace | Shared RACECES access with a Workplace shortcut. Proposed placement under CSG-OPEN-02. |

**Preserve:** Map/List, scoped browse/search, direct activities, saved report links, anonymous diagnostics and Canvas links. **Proposed consolidation:** remove duplicate entry controls after replacements work. Keep compact area jumping until search and grouped List provide equivalent reach.
