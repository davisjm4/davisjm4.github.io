# My Session and reporting

## CSG-SES-01 — One daily report entry

**Approved direction · fragmented implementation. Roles:** guests, enrolled students, teachers receiving reports. Use **My Session → Today** as the shared daily entry. Show date, scope, first-attempt correct and attempted counts, accuracy, activity/mode breakdowns, and active time where supported. Exclude away/idle time per the existing tracker semantics. Preserve optional guest name entry, print/PDF, and a usable teacher hand-in. Carry forward useful copy/export from lab reports. Explicitly label any new export format as proposed until approved (CSG-OPEN-09). Keep Reset secondary, confirm scope and avoid clearing pathway history.

**States/data:** empty, active, day rollover, practice-only, print preview, exported, reset confirmation and unavailable storage. Preserve daily keys, timezone behavior and existing denominators during migration. Optional print identity stays local and outside sync and backup. Prefer transient fields for the new UI, with migration of legacy stored identity subject to approval. **Dependencies:** CSG-UX-01/03, CSG-SEC-02, CSG-MAS-01. **Accessibility:** keyboard-accessible print/export, printable contrast and clear accessible table headers. **Acceptance:** an account-free guest can complete one activity, produce a named print/PDF report, and verify identity is absent from network and backup. Day rollover and reset affect only the intended daily scope.

## CSG-SES-02 — Explicit report scopes

**Approved · current reports exist, shared presentation planned. Roles:** all. My Session links to **Independent History** and **Class Progress** with clear scope and persistence. Independent practice survives supported browser reload and backup. Class evidence is synced and identity-scoped. Official teacher-reviewed scores appear in skill and class reports under explicit labels. A printed student report is a practice artifact. Preserve aggregate report suppression, instructional context, and classroom export access.

**States/data:** local-only, queued, synced, teacher-reviewed, insufficient evidence, class aggregate, suppressed. Show unavailable or untracked values explicitly. Preserve legacy URLs to Java and AP CSP session summaries, Workplace Performance, RACECES and Robotics inline/end-of-race results as adapters or redirects with matching scope. **Dependencies:** CSG-SEC-01/02, CSG-MAS-01/02. **Acceptance:** one scored answer appears once in applicable daily and long-term views; guest and enrolled records remain separate in the same browser; printed and synced reports have correct denominator and scope.

## Migration

Inventory the 55 initial routes and relevant post-practice states. Prioritize String Lab and Search & Sort Lab, where identical labels reach different scopes. Duplicate CSP links point at the same report. Workplace Performance also owns diagnostics/readiness. Robotics inline results describe a single activity. Preserve unique breakdowns before retiring old controls and cover reload, modal/inline retirement, first-attempt counts, privacy and print in the same migration package. [Audit evidence](evidence-and-roadmap.md)
