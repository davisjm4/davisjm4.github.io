# UX, components, and accessibility

## CSG-UX-01 — Shared interaction language

**Approved direction · partial. Roles:** all. Keep the established dark theme and recognizable course identity. One shared owner for headers, course cards, breadcrumbs, Map/List and search controls, skill panels, progress and mastery badges, session entry, alerts, forms, and teacher dashboard patterns. Extend the shared component or document an approved exception with scope, rationale, accessible fallback and retirement criteria.

**States/data:** default, hover, focus, selected/current, disabled with reason, loading, empty, success, error and retry as applicable. Use explicit text for status, never color alone. Use a labeled primary action per task, secondary navigation for alternatives, and place destructive actions in Manage or an overflow menu with confirmation. Keep inline errors at the relevant field, a summary for long forms, and a clear completion message by the triggering control. Retain valid form input on recoverable errors and label save states accurately. Never claim a save until the stated destination acknowledges it. Protect duplicate submissions and use scoped status messages without IDs or credentials.

**Proposed visual baseline, CSG-OPEN-03:** existing system font stack, 16px body default, 1.5 line height, a consistent 4/8px spacing scale, semantic tokens for surface, text, muted, accent, focus, success, warning and danger, and course accents paired with text/icons. Tune against current shared CSS before fixing token values. **Dependencies:** CSG-NAV, CSG-SEC. **Acceptance:** the same task has the same label, state and focus behavior across course and role surfaces. Review one empty, loaded, error and success state at narrow and wide sizes.

## CSG-UX-02 — Responsive hierarchy

**Approved direction · target layouts proposed for review. Roles:** all. Lead each screen with its purpose and next meaningful action. Reflow based on available space. Maintain equivalent task completion at each width.

| Surface | Desktop / 1366 | Chromebook / 1024 and tablet / 768 | Phone / 390 |
| --- | --- | --- | --- |
| Courses and maps | Compact global nav, course name and search, map/list, detail alongside where useful | Keep toolbar and selection visible; use one pane when detail crowds map | Header and one role-aware nav control; map or list first; dismissible skill sheet or full-screen detail |
| Class dashboard | Class switcher, Active Restrictions first, scoped sections and skill matrix with adjacent detail | Keep restrictions and filters first; responsive grid or list with skill selector | Restricted profiles and release controls first; one-skill list, row menu and detail sheet/page |
| Practice | Map return, prompt, controls and verdict within task region | Keep source material reachable; isolate scroll for wide traces | Show verdict near Check and keep Next reachable; collapse trace or advanced controls after use |
| My Session | Date/scope, key results and print/export, then breakdown | Wrap actions and keep scope persistent | Stack totals, activity sections and export; keep print action clear and reachable |
| Forms | Persistent class/skill context and visible draft state | Split by task and collapse optional fields | Single column, logical reading order, no sticky control obscuring inputs |

**Data/security:** state survives reflow. Responsive variants use the same permissions and records. **Dependencies:** CSG-UX-01, CSG-NAV-03, CSG-UX-03. **Acceptance:** at 390, 768, 1024 and 1366px the primary task is visible ahead of auxiliary controls. The document reflows at 320 CSS px. Any necessary two-dimensional scroll stays within its labeled component and has a usable alternative.

## CSG-UX-03 — Accessibility and feedback

**Proposed verification baseline · partial support. Roles:** all. Target WCAG 2.2 AA. Provide native semantics where practical, text equivalents, sufficient contrast, ordered keyboard navigation, visible unobscured focus, accessible dialog dismissal and focus return, reduced motion, and non-drag alternatives. Use 44×44 CSS px as a preferred principal touch target. Follow WCAG target-size requirements for other controls. Keep focus visible on map movement and updates, and avoid duplicate focus stops. Tables have named headers and clear row/column context. A matrix provides a list alternative. Short feedback such as Correct or Not quite appears at the answer action before a trace or long explanation, with an announcement and clear next action.

**States/data:** keyboard, touch, zoom/reflow, screen reader, reduced motion, validation errors and feedback. Respect user preferences without storing sensitive telemetry. **Dependencies:** shared practice shell and CSG-UX-02. **Acceptance:** keyboard-only and touch complete the same role tasks, focus stays in view when the route/panel changes, 200% text remains usable, 320px reflow works, and correct/incorrect verdicts are visible and announced immediately after submission. Test a screen reader, physical touch and Chromebook before claiming those environments. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
