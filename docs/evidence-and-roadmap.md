# Evidence, defects, and implementation roadmap

## Sources and evidence quality

- **Work independent product design audit**, November 13, 2026. Production guest journeys and 55-route initial summary scan, synthetic four-class workflows, 30 issues, 99 screenshots, and desktop/phone wireframes. Reviewed report, issue register, wireframes and representative screenshots. [Audit bundle](https://chatgpt.com/library?file_id=libfile_fa29756deea08191b41199c46a79022a&account_id=personal)
- **Claude full-role UX audit**, November 13, 2026. Local Chromium, synthetic teacher, enrolled and independent flows. Reviewed its report, proposed sitemap, issue register and screenshot descriptions. The standalone referenced screenshots were not available from the report or exact-name lookup. [Full-role audit](https://chatgpt.com/library?file_id=libfile_df40ec6c3c6c8191adccabae89017e0e&account_id=personal)
- **Claude earlier local audit**, November 12–13. Read its revised report, scope limits and findings. It lacked authenticated verification. Its retracted guest-backup claim stays closed, and teacher access findings are superseded by full-role observations. Local-only catalog-first and CSP attribution claims need current production reproduction. [Earlier audit](https://chatgpt.com/library?file_id=libfile_16f9e47ec9e88191bdda8d18b14fbdf1&account_id=personal)
- **Repository baseline** [aca36a5](https://github.com/davisjm4/davisjm4.github.io/commit/aca36a50455c13c8fd3da2de6e54607c8f10f625), shared navigation tests, pathway and guest READMEs, service and profile runbooks, formative evaluator, and [isolated audit handoff](https://github.com/davisjm4/davisjm4.github.io/tree/audit/full-role-ux-environment). Historical CSP implementation reports confirm per-activity provenance and limitations from an earlier snapshot. Current behavior requires source and deployment checks at the change SHA.
- **Product discussions and Master Tracker**. Prior explicit approvals corroborate LMS boundary, Package A, proficiency and Build 5. The current request controls new decisions. Tracker review sampled live tab headers and historical rows. See [decision provenance](decisions.md) and [tracker proposal](tracker-integration.md).

## Reconciliation

| Evidence and disposition | IDs and next verification |
| --- | --- |
| Both full-role audits observed that the teacher roster is account/event oriented and the individual report is difficult to reach. Claude additionally observed raw slugs, a long assessment form, off-screen confirmation, and class CSV omissions. These are defects or limitations in the sampled UI. | Work T01–T04/T08; Claude T1–T5/T8–T15 → CSG-TCH-01/02/03/05. Recheck CSV contract and explicit reporting scope before changing it. |
| Both saw weak hierarchy among official result, formative level and class target. Claude saw a formative level change when publishing. Source corroborates policy input to tier thresholds. | Work S02; Claude E1–E5/T7 → CSG-MAS-02/03, CSG-OPEN-08. Preserve current computation pending decision. |
| Both saw duplicate recommendations and late map placement. Work observed matching suggestions in one state. Claude earlier observed disagreement between contexts. | Work G01/G02/G03/G08; Claude I1–I5, CSG-18 → CSG-NAV-01/02/03. Verify each recommendation scope; keep one meaningful action. |
| Work reproduced the Variable Lab verdict below the trace across four widths; earlier Claude reproduced the phone issue. | Work P01; Claude CSG-16 → CSG-UX-03. Fix independently after approval. |
| Work observed Java, AP CSP Binary Builder, and Robotics credit after guest return, and disclosed WPR concept-level gap. Earlier Claude saw CSP Vocabulary Fill-in Lab and catalog-first attribution concerns. Different CSP activities are involved. | Work G04; Claude CSG-08/17 → CSG-CUR-02 and CSG-STU-01. Reproduce on current deployment before declaring missing credit a regression. Preserve existing honest coverage labels. |
| Both confirmed String Lab duplicate scopes and printable course reporting. Work also observed Search & Sort Lab; Claude reported undefined modal rows. | Work P03/P04/P05/P07; Claude S1–S4 → CSG-SES-01/02. Preserve named guest print and existing useful export. |
| Work and Claude favored simpler shared navigation. They differed on RACECES's primary home and removing the area jump. | Work G02/P06; Claude D2 and proposal 13 → CSG-OPEN-01/02. Keep current accessible routes while reviewing. |
| Synthetic Work verified diagnostics and pacing beyond Claude's reported sample. Both used emulated Chromium widths. Claude's headless focus scroll finding needs headed confirmation. | Work T06/T07; Claude K1/K2 → CSG-TCH-04/05 and CSG-UX-03. Physical devices, screen readers and alternate browsers remain separate validation. |
| Teacher-directed focus is a new owner-approved requirement. Neither the existing online diagnostic workflow nor published pathway targets implement this contract. | CSG-DEC-06 → CSG-TDL-01–04. Finalize open design decisions and prove real overlap cases before release. |

## Proposed packages and migration

Package IDs below are new specification planning IDs. Existing tracker identifiers and historical Package A–F labels retain their meanings.

| Package | Scope and dependencies | Release gate and fallback |
| --- | --- | --- |
| CSG-PKG-01 · Targeted clarity | Adjacent verdict, inline confirmation, save-state wording, supported return routes, accurate tracking labels. Depends on baseline reproduction. | Run narrow/wide keyboard and practice parity. Revert presentation changes independently if needed. |
| CSG-PKG-02 · Student shell | Course-first map, global nav, Map/List, search, role and return context. Depends on CSG-OPEN-01/03. | Seven concept searches, course/canvas link smoke, role-state persistence. Keep old routes and activity catalog entry until parity. |
| CSG-PKG-03 · My Session | Shared daily entry and scope, print/export and migration of lab breakdowns. Depends on CSG-OPEN-09. | Before removing controls, verify legacy links, old stored data, print, copy, reset, count and privacy parity. Maintain compatibility reader. |
| CSG-PKG-04 · Class progress | Active class context, same-skill comparison, evidence pane, assessment and reporting. Depends on CSG-OPEN-07/08. | Class-level intervention and extension using synthetic rosters, plus assessment, export and authorization. Keep original reports reachable while migrating. |
| CSG-PKG-05 · Class planning | Plan and assignment navigation, preview, versioning, diagnostic and pacing clarity. Depends on CSG-OPEN-11 and class shell. | Publish, conflict, rollback as new revision, and class-linked vs anonymous diagnostic checks. No forced draft conversion. |
| CSG-PKG-06 · Teacher-directed learning | Versioned focus, scoped permissions, scheduled/advisory, explicit restrictions, student resume and audit trail. Depends on CSG-PKG-02/04/05 and CSG-OPEN-04/05/06/10. | Additive schema and isolated rollout, pass CSG-AT-TDL-01–08. Stage advisory first if appropriate. Keep approved restrictions effective until release; recovery must preserve access to assigned work and history. |
| CSG-PKG-07 · CTE extension | Shared registration and synthetic fifth-pathway test. Depends on core interfaces and evidence contracts. | End-to-end course capability test. Register real courses after content, licensing, accessibility and role review. |

Implementation remains approval-gated. Sequence compatible slices, keep evidence and official scores immutable, and publish UI and Worker versions in a compatible order. If a release cannot roll back safely after new writes, ship a compatible corrective version and preserve records.
