# Class Learning Pathways

In Teacher Tools, create a class with a name and course, then share its enrollment link. The class and its first published pathway are created in the same transaction. Students enroll with a pseudonymous profile and can open the full self-paced sequence immediately. Teachers can open a published student preview from the class overview.

The optional editor at `/cs-games/teacher/pacing/` supports customizing learning goals and adding target dates. Teachers save a draft, preview it, and explicitly publish each later change.

## Current scope

Four course templates reuse existing curriculum/skill metadata. The generated graph contains **290 assessable skill nodes, 69 areas and 453 bound source question-family IDs**. The AP CSP skill IDs and CTECS skill/concept IDs are references to their existing registries, not replacement standards. The Advanced CS template includes reviewed skills from all 16 Java labs; interactive formats without validated scored evidence remain teacher-assessed. Robotics uses local objectives instead of unsupported claims of formal alignment.

Teachers can configure different class calendars/rotations, import and confirm ICS/CSV dates, edit individual dates or ranges, protect review/testing time, change checkpoint dates/requirements/targets, reorder areas or skills, add their own areas/nodes, change time estimates, recalculate all or remaining instruction, copy an independent class, save/restore backups and export JSON/CSV/ICS. Daily, weekly and unit views are projections of the same scheduled sessions. Each class has separate stable IDs. Removed requirements do not remove evidence.

Shared classes use the existing Cloudflare Worker and D1 service for pseudonymous student profiles, Google teacher authentication, and versioned evidence. The static editor still supports local planning and preview.

## Files

| File | Purpose |
| --- | --- |
| `build-graph.mjs`, `curriculum-graph.json` | Reproducible graph built from existing skill/mode catalogs |
| `calendar.mjs` | Date-only calendar, imports, classification preview, school/class meeting distinction |
| `model.mjs` | Class model, validation, version comparison, mastery/pacing calculation, student/map contract |
| `pacing.mjs` | Prerequisite/time allocation, protected windows, deficits, views and calendar exports |
| `evidence.mjs` | Trusted question metadata normalization; Mixed credits actual assessed skills |
| `evidence-gap-registry.json` | Machine-readable coverage registry for every Java activity and mode (generated and tested) |
| `client.mjs` | Profile/class-scoped cache, revision polling/focus/online reconciliation, active-task deferral, evidence outbox |
| `../teacher/pacing/` | Teacher pacing editor and structured student preview |
| `../../wpr-games/workplace-readiness/service/pathways.mjs` | Authenticated revision service in existing backend |
| `reports/IMPLEMENTATION_REPORT.md` | Audit, acceptance evidence and limitations |

## Run and verify

Use Node 24 (the existing development service uses `node:sqlite`). No new runtime framework or production package dependency is introduced.

```sh
node cs-games/pathway/build-graph.mjs
node --test cs-games/pathway/tests/*.test.mjs
node cs-games/teacher/wpr-online-tests.mjs
node csp-games/exam-readiness/tests/model.test.mjs
node csp-games/exam-readiness/tests/integration.test.mjs
```

For a real local Worker-backed teacher session, use the existing service's `startDev` / `WPR_DEV_TEACHER_TOKEN` workflow documented in its README. Teacher sessions use the existing revocable two-hour session and same-tab session storage. `startDev` accepts optional `pathwayAdapters` for synthetic test fixtures; the CLI supplies no student identity bypass.

## Calendar contract

A self-paced pathway has `calendar: null`, `examDate: null`, no sessions and no checkpoint targets. For optional pacing, teachers enter the term and meeting rules. Targets stay private unless the teacher chooses to include suggested dates and publishes. Removing pacing clears the dates in the draft and preserves earlier revisions. Scheduled legacy publications retain their original display and interpretation.

School dates are independent of class meeting dates. School rotation advances on instructional dates even when a particular class is absent. Holidays/PD closures and non-rotation days do not advance the cycle. An explicit normal rotation label reanchors the cycle; a non-rotation label affects that date only. Weekdays, rotation labels, period minutes and date overrides then determine class meetings. Class time zone defaults to America/Los_Angeles and is editable. Dates are date-only strings, avoiding UTC/DST shifts in school schedules.

CSV columns: `date` or inclusive `start,end`, `label`, `type`, `minutes`, `schoolday`, `rotation`, `nonrotation`. Boolean values use `true`/`false`. ICS supports all-day VEVENTs, unfolding and exclusive DTEND. Timed and recurring ICS events are rejected with actionable instructions to expand to date-limited all-day dates or CSV; unsupported recurrence is never silently ignored. Unknown classifications and early-release dates require teacher confirmation in the preview. Explicit CSV day types and recognizable school closures are classified directly.

Review/mixed/guided range edits retain existing quiz/final overrides. An explicit quiz/final/no-class edit can replace them. Protected dates allocate no new instruction. Review candidates include only skills introduced earlier; assessment targets not yet introduced produce warnings. The final exam consumes a real class meeting; a nonmeeting target date produces a warning. Deficits retain all required checkpoints and list remaining minutes plus alternatives. No time estimate is calibrated or represented as a guarantee.

## Identity and evidence integration boundary

The shared service resolves class ownership and enrollment through the existing profile database. Students authenticate with their profile session, and the service looks up that enrolled class’s published revision and verified evidence. The development-only hooks remain available for synthetic tests. Anonymous diagnostics use their separate reporting flow.

Evidence IDs must be globally stable per source attempt. Question records include `id`, `questionId`, `sessionId`, `timestamp`, `activityId`, actual `familyId`, `nodeIds`, `firstAttempt`, `correct`, eligibility and optional subskills. Requested mode may be Mixed; the assessed mode and source family determine credit. No page visit or elapsed time yields mastery. The normalizer defaults to ineligible unless called by a trusted grader adapter. Existing browser totals must not be uploaded as verified mastery. Build 5 normalizes supported browser practice against existing catalog selectors and labels it provisional. Teacher-verified checkpoint evidence is recorded separately. Automatic calibrated mastery remains future work.

Optional practice goals reuse versioned policy definitions and count only synced independent first attempts mapped to the skill. They leave the checkpoint's assessment policy and recorded awards intact. An eligible assessment can provide a 0–4 score. A separate `mastery-award` binds node completion to a policy ID/version. Completion, numeric score and whether a checkpoint meets its teacher target are different fields. A stricter policy can require reassessment without erasing the earlier award or original attempts. Default policy values are null and provisional, pending the mastery calibration audit. Teacher-defined activated policies support variable question counts, accuracy and subskill coverage; they are not system-calibrated recommendations.

## Practice evidence attribution convention

A scored game attempt reaches a node only when its **assessed mode** equals the node selector's `modeId` (or one of `modeIds`). The profile client chooses `assessedMode` as `details.practiceMode || details.format || details.mode || record.mode`, so games must send `practiceMode` explicitly whenever the display format or requested setting differs from the assessed skill.

- `practiceMode` is the skill of the question actually shown, never the requested setting (`mixed`) and never a display format (`output`, `final`).
- `reasoningFamily` (or `family`) is the generator's reasoning family. When a node has family bindings, the server credits only nodes that contain the event's family, so a mode/family mismatch credits nothing.
- `difficulty` is copied from the question shown and omitted for modes without tiers. Beginner evidence is never relabelled.
- Variable Lab: `trace`, `assemble`, `identify/<variant>` (`java-games/variable-lab/evidence.js`).
- String Lab: selector `modeId` is the engine mode id (`predict`, `trace`, `index`, `expr`, `algorithms`, `compare`, `loop`; node key `algo` maps to `algorithms`); `familyIds` and `questionFamilies` hold the generator family ids (`java-games/string-lab/js/shared-session-bridge.js`).
- Advanced CS labs (`java-games/lab-evidence.js`): `practiceMode` is the drawn question's own mode in focused and Mixed Practice. `family` is namespaced `<mode>/<family>` for Inheritance, Documentation and LinkedList (family ids repeat across modes) and is already `<mode>:<generator>` for Robot Algorithms. Boolean also records its difficulty. LinkedList `link` and `mutate` credit one node (`references`); Method & Constructor `order-args` credits `match-call`; Inheritance and Documentation credit one node per mode; Robot `build` and `debug` each credit their own node.
- Math Lab Mixed Practice rotates all seven scored modes (`java-games/math-lab/mixed.js`); the difficulty control applies to Math Methods and Numeric Limits questions it draws.
- `cs-games/pathway/evidence-gap-registry.json` lists, for every Java activity and mode, whether credit is available and why not when it is not. Regenerate with `node cs-games/pathway/tests/build-gap-registry.mjs`; `--check` fails when it is stale.
- Skips and revealed answers emit no practice event. Only a first, unassisted submission produces `n=1`.
- `cs-games/pathway/tests/mastery-evidence.test.mjs` and `java-evidence-coverage.test.mjs` exercise this flow end to end with synthetic profiles (the latter for every Advanced CS lab mode, focused and Mixed). Graph releases must stay additive: keep every node and family id and do not change `version` without a snapshot migration, because pathway validation compares `graphVersion`.

## Safe update contract

Published revisions are immutable snapshots. An insertion trigger changes the class head and records immutable policy definitions atomically in the same D1 database. Draft edits use optimistic draft-version checks; publishing requires a current preview token and expected published revision. Rollback stages an earlier configuration as a draft, then normal preview/publication creates a new revision. Historical revision numbers are never rewound. Node descriptors are pinned in published snapshots so a future graph release cannot remove the vocabulary of an older revision.

Students resolve the class's current published reference; no permanent independent student pathway copies are created. Pacing status is recalculated at student read/reconciliation using the latest targets and eligible evidence. Status history is append-only per profile/revision/outcome. The structured student hub revalidates the class revision on focus, reconnection and a visible-page interval. It does not reload game or assessment pages. A consumer that embeds updates in a live assessment can use the client’s active-task deferral contract to adopt pending changes at the assessment boundary.

The client cache is scoped by pseudonymous profile and class. Build 5 queues supported practice through the shared profile service, which acknowledges stable IDs and deduplicates retries. Offline use requires a previously loaded interface or pathway.

## Production deployment

Follow the [CS Games deployment runbook](../../wpr-games/workplace-readiness/service/DEPLOYMENT.md). It covers additive D1 migrations, Google teacher sign-in, the existing GitHub Pages origin, and real-device verification.


## Automatic pathway rollout

The automatic-pathway release requires additive D1 migration `0006_class_creation_requests.sql`. It adds a nullable creation-request digest and a unique index scoped to the owning teacher. Existing rows retain their class IDs and invite digests. Retrying class creation with the same key returns the same class and currently valid enrollment link. The creation key and enrollment credential are held as separate digests in D1.

For rollout after approval:

1. Record the current Pages SHA, Worker version and D1 restore point. Verify the migration and provisioning in a staging D1 database with synthetic data.
2. Apply migration 0006 to the CS Games D1 database. Confirm the migration before publishing the Worker. Deploy the Worker and verify health, rejected unauthenticated requests, synthetic provisioning and published pathway reads.
3. Publish the matching GitHub Pages release. Verify Teacher Tools → Create class → Copy enrollment link → Enroll → Student pathway with a synthetic profile. Confirm shared teacher sign-in and read-only compatibility with the existing CS Games Test revision.
4. Owner-authenticated My Classes backfills active classes without a pathway row. Valid enrollment and existing student pathway access provide the same backfill if the teacher has yet to visit. Backfill is idempotent and leaves all existing drafts and published revisions intact. There is no global rewrite or production data change at PR time.
5. If rollout needs reversal after an undated pathway has been written, retain a Worker and student reader compatible with `calendar: null` and roll forward a targeted fix. The earlier reader assumes a calendar. Preserve profile and pathway writes that occurred after the restore point.

Regression coverage includes four canonical course sequences (Advanced CS 123 skills, AP CSP 58, Robotics 15, Workplace Readiness 94), request retries, concurrent creation, injected transactional failure, draft/preview/publication, legacy revision preservation, synthetic practice and cross-device recovery. Run the Chromium workflow with `CHROME_BIN` set to the browser executable:

```sh
node --test cs-games/pathway/tests/automatic.test.mjs cs-games/teacher/cs-games-backend-tests.mjs
CHROME_BIN=/path/to/chromium node --test cs-games/teacher/automatic-pathway-browser-tests.mjs
```

Node-level progress requires an existing verified metadata mapping for a question. Activities with broader tagging still open for practice, and their available totals remain in the existing student progress report. The Workplace Readiness link targets its CTECS skill; a concept-level question filter requires the future concept adapter. Focused Java modes may cover several related skills. The browser run uses synthetic profiles at 390, 768 and 1280 pixels. Physical Chromebook and production sign-in are rollout checks.

## Optional mastery requirements

Open a class in Teacher Tools and choose **Customize mastery requirements**. The editor uses the same shared pathway draft as the learning goals and pacing editor. Class defaults can be overridden by learning area and individual skill. Teachers can choose or edit a preset, set question count and first-try accuracy, optionally set a minimum correct count, and use supported difficulty, subskill and question-family requirements. The review screen explains available evidence and publication limits. Teachers explicitly save and publish changes. A new class starts with the full undated pathway and no selected requirements.

The Worker reuses the imported engine and reads independently mapped game practice from the existing performance events. Focused and Mixed Practice use the assessed mode and family. The student's first tracked attempt can include practice already saved to the profile. Once an attempt is recorded, a later requirement version opens a fresh window at publication. Restarting opens a fresh window on the server clock and retains the earlier attempt. The pathway displays recent attempts and retains the full attempt history in D1. Student-side practice milestones, verified teacher awards, and teacher-assessed 0–4 scores stay distinct. The Worker never calls the engine's award proposal module.

The earlier pacing policy controls are consolidated in the requirements editor. Previously published policies and any assessment records keep their original interpretation. The old policy itself remains stored and immutable. Review and publish continue to use the existing class pathway revisions and owner checks.

### Mastery rollout

This change is stacked on the automatic class pathways release. Stage migrations 0006 and 0007 in order before deploying the corresponding Worker build, then publish the matching Pages assets after approval. Migration 0007 adds attempt states, durable attempts and idempotent restart requests with profile retention. Existing classes, practice events and published pathways are unaffected by the migration. Check `masteryHistoryReady` on the Worker health response, and use two synthetic browser profiles to verify a draft, publication, game-to-pathway sync and restart. Record the D1 restore point and Worker/Pages versions before rollout. If reverting application code after teacher requirements have been published, keep the additive tables and immutable publications for forward recovery.

The integration evaluates mapped first attempts recorded by the current games. Activity launches and unreported skips or reveals carry no question record. Activities without per-skill mapping remain available for practice, and known coverage gaps are shown in the editor. Course-specific difficulty, subskill and diversity claims depend on the graph and the verified evidence registry. Initial attempt state is materialized when the student opens the pathway. A physical Chromebook, real Google handoff and load on the target D1 plan are staging checks. Trusted automated certification remains a separate decision.

```sh
node --test cs-games/pathway/tests/*.test.mjs
CHROME_BIN=/path/to/chromium node --test cs-games/teacher/requirements/integration-browser-tests.mjs
```

### Evidence routes for standards proficiency

The practice rubric classifies audited evidence by the understanding it demonstrates. Activity difficulty controls are optional. A single Mixed Practice setting can supply evidence for several levels when its question families distinguish the reasoning each level requires. Coverage reports describe the current automated rubric. Students can demonstrate any standard through assessed performance, a project or portfolio, an explanation or interview, or an objective assessment.

The shared evaluator accepts normalized practice evidence for independent learners and published classes. The map offers course-specific demonstration guidance in both contexts. Independent learners can retain their work in a portfolio and ask an instructor or mentor for feedback. Enrolled teachers can record the assessed level and optionally record an official mastery award through **Teacher Tools → My Classes → Student profiles → View progress → Teacher assessment**. The optional evidence type is stored with the assessment. Practice evidence cannot assign a standards grade, and a teacher score of at least 3 can inform progression while remaining separate from the formative practice level.
