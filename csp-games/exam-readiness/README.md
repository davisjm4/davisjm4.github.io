# AP CSP Exam Readiness Pathway — G-118

Local-only skill evidence and deterministic recommendations for the existing CS Games ecosystem. This is not an AP score predictor, official College Board mastery classification, secure assessment or replacement for the Create performance task.

## A. Audit and B. Curriculum

See [reports/COMPATIBILITY.md](reports/COMPATIBILITY.md) for every published CSP game, learning objectives, tracking capabilities and gaps; [reports/SKILL_MAP.md](reports/SKILL_MAP.md) for 58 canonical skills across all five Big Ideas and 19 reused Create preparation skills. There are 31 audited game routes. No planned copyright expansion is assumed published. Vocabulary supports introductory gaps without claiming authentic project performance. Security is officially Big Idea 5 and additionally appears as a network application; ASCII, hex/RGB, AI and some modern protocols are supporting contexts. College Board CED, current exam guidance and Create handouts were reviewed October 25, 2026. Source links are in curriculum.js and the student page.

Create practice addresses purpose, function, input/output, lists and complexity, procedure definition/call, effective parameters, sequencing/selection/iteration in the selected procedure, PPR evidence and program explanation. Full program code, individual video and individual PPR remain official submissions. The PPR contains selected procedure/call and list storage/use segments, without comments or course content; games cannot certify student authorship or independent written-response performance.

## C. Architecture and privacy

- `curriculum.js`: version 1 Big Idea → Topic → Skill → Games map, limits, evidence support and CED anchors. Create view reuses IDs rather than duplicating evidence.
- `games.js`: actual published routes and objectives. All launch links use verified main pages; no unsupported mode/topic/skill query parameters.
- `mapping.js`: reviewed first-submission mapping; one skill per question. Ambiguous topic buckets are estimates or excluded. Vocabulary mappings are estimates. Dance stage checks and Response Builder's mixed abstraction pool do not assert isolated skill evidence.
- `session.js`: two small hooks initialize legacy aggregate evidence and capture the first accepted submission before existing daily counters change. Existing session schema, scoring, active time and reset behavior remain intact.
- `bridge.js`: automatic adapter plus optional explicit `recordSkillEvidence`. Shared record/session IDs deduplicate automatic and explicit reports. No answers, custom ASCII text, names or periods are copied.
- `storage.js`: `cspGames.pathway.v1`, schemaVersion 1 and curriculumVersion 1. Data contains only initialized flag and anonymous evidence records. Each record has ID, skill/game ID, ISO timestamp, session ID, attempts, firstTryCorrect count, direct/estimated quality and controlled context. Normal direct records have exactly one attempt. Legacy topic aggregates retain counts and are never expanded into invented question-level records.
- `model.js`: recomputed skill totals, first-try accuracy, recent direct accuracy, dates, session count, level, due date and next activity. Stored raw evidence remains the source of truth.
- `app.js`: responsive dashboard, collapsed Big Ideas/skills, Create view, filters, recent evidence, native controls/dialogs, accessible text and meters, import/export/reset.

Initial installation can ingest the current daily topic totals once as estimated aggregates, dated at the session's last recorded activity. Prior days already erased by daily reset cannot be recovered. A pathway reset records initialized=true so daily totals are not silently re-imported. Daily and manual **session** resets never touch pathway storage. Pathway reset never touches daily scores or other game stores. Existing active-time code remains unchanged and pathway browsing does not start the practice-time timer.

Every write reads current storage first, preventing sequential stale-tab overwrites. This is synchronous localStorage, not transactional multi-user storage; simultaneous writes in independent browser processes are not a distributed consistency guarantee. Storage failures produce a visible warning and an exportable temporary in-memory history. Corrupt/unsupported data is preserved rather than overwritten; explicit confirmed reset enables a fresh store. A tested v0→v1 migration converts first-try Booleans to counts without deleting the old key. Future schema/curriculum versions require an explicit migration and must never reinterpret unknown skill IDs.

The pathway has no accounts, backend, identifying input fields, analytics, external AI calls or progress transmission. Runtime assets are local ES modules and CSS; no new framework. Ordinary static page requests reach GitHub Pages. Data belongs to this browser origin and any exported file; it never automatically syncs across devices. Existing Session Summary may independently contain user-entered optional identity; the pathway does not access or export those fields.

## D. Mastery and review rules

Rules are exported from model.js as RULES and explained in the interface:

1. **Not Yet Demonstrated**: fewer than 5 questions. Insufficient evidence does not prove inability.
2. **Developing**: at least 5 questions without the requirements below. Estimated evidence alone is capped here. The UI separately marks insufficient direct evidence, which is different from low measured accuracy.
3. **Proficient**: at least 20 direct questions, ≥80% direct overall and last-20 direct accuracy, ≥2 sessions on ≥2 UTC dates, ≥2 recorded contexts.
4. **Strong**: at least 40 direct questions, ≥90% direct overall and last-20 direct accuracy, ≥3 sessions on ≥3 UTC dates, ≥5 direct questions on each of 3 dates, ≥2 contexts.

Contexts are game/topic/mode/family combinations; they provide a bounded variety check, not proof of complete curricular coverage. A single answer, repeated same-day resets or vocabulary recognition alone cannot reach high levels. Coverage, aggregate practice accuracy and mastery remain separate measures. Reviews are due 1/3/7/14 days after last practice for Levels 1/2/3/4. These configurable instructional intervals are not claimed optimal for every learner. Time marks review due and never lowers a level. Portable practice dates use UTC; existing daily sessions keep browser-local dates.

## E. Recommendations

Order: insufficient evidence → recent direct accuracy below 80% → due review → inconsistent recent-session accuracy (≥25 percentage-point spread across last 3 sessions) → oldest practice. Empty history interleaves Big Ideas. Explanations show actual counts, accuracy or absence of evidence. Recognition-only skills with ≥5 estimated questions move to review/maintenance rather than permanently blocking more actionable practice. All games stay open. Additional independent work and teacher feedback are explicitly needed for skills games cannot fully assess.

## F. Integration contract

Current compatible games use the shared begin/annotate/submit flow without changing their individual apps. A future isolated skill round can use:

```js
import {recordSkillEvidence} from '../exam-readiness/bridge.js';
recordSkillEvidence({
  id: recordId,
  sessionId: dailySession.id,
  gameId: 'boolean-gatekeeper',
  skillId: 'CSP-BOOLEAN',
  firstTryCorrect: true,
  mode: 'evaluate', topic: 'boolean'
});
```

Emit once on the **first** scored submission, using the shared record/session IDs if the automatic adapter is also active. Never emit on visits, generated rounds, hints, reveals, retries or unscored exploration. Add reviewed mapping fixtures before adopting new metadata. IDs/context must be controlled nonidentifying ASCII tokens; keep all user-entered text out. Explicit evidence is still locally editable practice, not tamper-proof certification.

Legacy matrix details are in COMPATIBILITY.md. Narrowly tagged rounds across all five Big Ideas support direct evidence; broad legacy topics and Create recognition use estimates. Algorithm Dance remains a launch option with no automatic isolated-skill mastery. Response Builder abstraction needs finer metadata before it can distinguish data from procedural abstraction. No massive game rewrites or misleading retroactive question histories.

## Export/import

Export includes schema/map versions, date, anonymous evidence, derived skill progress, accuracy, level, practice history, review dates and recommended game IDs. Import requires known versions/IDs, canonical ISO dates, supported game IDs, bounded safe integer counts, exact field types, valid quality, unique IDs and summaries consistent with recomputation. Unknown fields (including identifying fields), malformed JSON, duplicate records, conflicting merge records, invalid numbers and unsupported versions are rejected before mutation. Max 50,000 records; files over 64 MiB are rejected before parsing. Existing history is never automatically truncated. Local storage quota may be reached sooner; export the temporary history if warned.

Merge deduplicates by stable record ID and rejects conflicting duplicates. Replace requires explicit dialog confirmation. Cancel changes nothing. Derived mastery is recomputed rather than trusted. Another browser/device can import the same file; nothing automatically syncs. A normal successful import does not touch Session Summary or game repeat histories.

## G. Tests

Run `npm test --prefix csp-games`, `npm run test:pathway --prefix csp-games`, and `node cs-games/catalog-tests.mjs` after dependencies are installed. The existing session DOM harness was updated to inject the two newly imported adapter dependencies. Existing game tests were otherwise preserved.

New suites cover curriculum completeness/unique IDs/routes/Create reuse, threshold boundaries and deterministic mastery, recent decline, multi-session/date/context requirements, estimated caps, no time decay, review dates, balanced/weak/review recommendations, progress ingestion and duplicate prevention, export/import validation, merge conflicts, confirmation/cancel, corrupt recovery, disabled/quota-limited storage, v0 migration, property-order independence, prototype-key rejection, sequential multi-store writes, daily/manual reset separation, legacy aggregate import, no identity/custom-text copying and dashboard controls. Mapping fixtures exercise actual Internet/AI/Create generators and legacy practice topics. `tests/links.mjs` verifies all 31 live game routes. `tests/browser-check.html` provides real responsive iframe views at 320/390/768/1024/1366px without changing the product UI.

Executed results and browser limitations are recorded in reports/IMPLEMENTATION_REPORT.md and accompanying logs. DOM simulation is not rendered-browser verification. Physical Chromebook, touch hardware and native screen-reader speech are not certified by those tests.

## H. Publication and I. Outstanding issues

See reports/IMPLEMENTATION_REPORT.md for final commit, deployment, verified live behavior, tracker status and educator-review limits. Classroom review remains appropriate; this release does not expand the games into a full exam course, create a fixed readiness test or certify authentic projects.
