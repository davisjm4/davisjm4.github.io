# Unified Class Learning Pathway — Build 4

The teacher interface is `/cs-games/teacher/pacing/`, linked from Teacher Tools. It is a functional interface over one class pathway model: calendar, standards/nodes, student list preview and the future map all read the same checkpoints. The graphical map is deliberately deferred.

## Current scope

Four course templates reuse existing curriculum/skill metadata. The generated graph contains **280 assessable skill nodes, 69 areas and 296 bound source question-family IDs**. The AP CSP skill IDs and CTECS skill/concept IDs are references to their existing registries, not replacement standards. The Advanced CS template includes reviewed skills from all 16 Java labs; interactive formats without validated scored evidence remain teacher-assessed. Robotics uses local objectives instead of unsupported claims of formal alignment.

Teachers can configure different class calendars/rotations, import and confirm ICS/CSV dates, edit individual dates or ranges, protect review/testing time, change checkpoint dates/requirements/targets, reorder areas or skills, add their own areas/nodes, change time estimates, recalculate all or remaining instruction, copy an independent class, save/restore backups and export JSON/CSV/ICS. Daily, weekly and unit views are projections of the same scheduled sessions. Each class has separate stable IDs. Removed requirements do not remove evidence.

The local editor works on GitHub Pages. Build 5 connects the shared class pathway service to enrolled pseudonymous profiles and immutable assessment evidence in the existing WPR Worker/D1 service. The production API and Google client await provisioning. Until then the static editor supports local planning and preview.

## Files

| File | Purpose |
| --- | --- |
| `build-graph.mjs`, `curriculum-graph.json` | Reproducible graph built from existing skill/mode catalogs |
| `calendar.mjs` | Date-only calendar, imports, classification preview, school/class meeting distinction |
| `model.mjs` | Class model, validation, version comparison, mastery/pacing calculation, student/map contract |
| `pacing.mjs` | Prerequisite/time allocation, protected windows, deficits, views and calendar exports |
| `evidence.mjs` | Trusted question metadata normalization; Mixed credits actual assessed skills |
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

For a real local Worker-backed teacher session, use the existing service's `startDev` / `WPR_DEV_TEACHER_TOKEN` workflow documented in its README. Tokens stay in session memory, not local storage or exports. `startDev` accepts optional `pathwayAdapters` for synthetic test fixtures; the CLI supplies no student identity bypass.

## Calendar contract

School dates are independent of class meeting dates. School rotation advances on instructional dates even when a particular class is absent. Holidays/PD closures and non-rotation days do not advance the cycle. An explicit normal rotation label reanchors the cycle; a non-rotation label affects that date only. Weekdays, rotation labels, period minutes and date overrides then determine class meetings. Class time zone defaults to America/Los_Angeles and is editable. Dates are date-only strings, avoiding UTC/DST shifts in school schedules.

CSV columns: `date` or inclusive `start,end`, `label`, `type`, `minutes`, `schoolday`, `rotation`, `nonrotation`. Boolean values use `true`/`false`. ICS supports all-day VEVENTs, unfolding and exclusive DTEND. Timed and recurring ICS events are rejected with actionable instructions to expand to date-limited all-day dates or CSV; unsupported recurrence is never silently ignored. Unknown classifications and early-release dates require teacher confirmation in the preview. Explicit CSV day types and recognizable school closures are classified directly.

Review/mixed/guided range edits retain existing quiz/final overrides. An explicit quiz/final/no-class edit can replace them. Protected dates allocate no new instruction. Review candidates include only skills introduced earlier; assessment targets not yet introduced produce warnings. The final exam consumes a real class meeting; a nonmeeting target date produces a warning. Deficits retain all required checkpoints and list remaining minutes plus alternatives. No time estimate is calibrated or represented as a guarantee.

## Identity and evidence integration boundary

The shared service resolves class ownership and enrollment through the existing profile database. Students authenticate with their profile session, and the service looks up that enrolled class’s published revision and verified evidence. The development-only hooks remain available for synthetic tests. Anonymous diagnostics use their separate reporting flow.

Evidence IDs must be globally stable per source attempt. Question records include `id`, `questionId`, `sessionId`, `timestamp`, `activityId`, actual `familyId`, `nodeIds`, `firstAttempt`, `correct`, eligibility and optional subskills. Requested mode may be Mixed; the assessed mode and source family determine credit. No page visit or elapsed time yields mastery. The normalizer defaults to ineligible unless called by a trusted grader adapter. Existing browser totals must not be uploaded as verified mastery. Build 5 normalizes supported browser practice against existing catalog selectors and labels it provisional. Teacher-verified checkpoint evidence is recorded separately. Automatic calibrated mastery remains future work.

An eligible assessment can provide a 0–4 score. A separate `mastery-award` binds node completion to a policy ID/version. Completion, numeric score and whether a checkpoint meets its teacher target are different fields. A stricter policy can require reassessment without erasing the earlier award or original attempts. Default policy values are null and provisional, pending the mastery calibration audit. Teacher-defined activated policies support variable question counts, accuracy and subskill coverage; they are not system-calibrated recommendations.

## Safe update contract

Published revisions are immutable snapshots. An insertion trigger changes the class head and records immutable policy definitions atomically in the same D1 database. Draft edits use optimistic draft-version checks; publishing requires a current preview token and expected published revision. Rollback stages an earlier configuration as a draft, then normal preview/publication creates a new revision. Historical revision numbers are never rewound. Node descriptors are pinned in published snapshots so a future graph release cannot remove the vocabulary of an older revision.

Students resolve the class's current published reference; no permanent independent student pathway copies are created. Pacing status is recalculated at student read/reconciliation using the latest targets and eligible evidence. Status history is append-only per profile/revision/outcome. The structured student hub revalidates the class revision on focus, reconnection and a visible-page interval. It does not reload game or assessment pages. A consumer that embeds updates in a live assessment can use the client’s active-task deferral contract to adopt pending changes at the assessment boundary.

The client cache is scoped by pseudonymous profile and class. Build 5 queues supported practice through the shared profile service, which acknowledges stable IDs and deduplicates retries. Offline use requires a previously loaded interface or pathway.

## Production deployment

Follow the [CS Games deployment runbook](../../wpr-games/workplace-readiness/service/DEPLOYMENT.md). It covers additive D1 migrations, Google teacher sign-in, the existing GitHub Pages origin, and real-device verification.
