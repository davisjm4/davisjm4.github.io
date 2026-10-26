# G-118 — AP CSP Exam Readiness Pathway

Implementation date: October 25, 2026 (America/Los_Angeles). Starting upstream: `8846cf7efa2c5b9ad54b7a50df0ebe16267e08e7`.

## A. Repository audit

31 published CSP games inspected. See [COMPATIBILITY.md](COMPATIBILITY.md) for inventory, objectives, available daily session/mode/topic data and adapter gaps. Existing daily schema, active-time lease/idle handling, optional daily report identity, game draft/history keys and consolidated catalog were inspected. All 31 live launch URLs returned HTTP 200; see [live-game-links.txt](live-game-links.txt).

## B. Curriculum mapping

58 canonical skills cover the five Big Ideas and 19 reused Create preparation skills. See [SKILL_MAP.md](SKILL_MAP.md). Mapping uses the current official CED, August 2025 clarification, current exam page and Create student handouts. Supporting topics and partial coverage are labeled. PPR recognition does not replace original program development, the individual video/PPR or written responses about the student's own program.

## C. Architecture

Versioned map, game registry, reviewed evidence adapter, event-backed local storage, deterministic model, dashboard and native import/export/reset controls. All runtime assets are local, with no framework/backend/accounts/analytics/progress uploads. Anonymous evidence never copies optional daily report identity or custom ASCII input. A tested v0→v1 migration is included. Corrupt storage is preserved with a temporary-mode warning. Daily and manual session reset never erase long-term progress; a separate confirmed pathway reset leaves daily data untouched.

## D. Mastery model

Levels 1–4: Not Yet Demonstrated, Developing, Proficient, Strong. Level 1 is insufficient evidence. Level 2 starts at 5 questions. Level 3 requires 20 direct questions, 80% overall/recent direct accuracy, 2 sessions on 2 dates and 2 contexts. Level 4 requires 40 direct questions, 90% overall/recent accuracy, 3 sessions on 3 dates with at least 5 questions on each of 3 dates and 2 contexts. Recent window is 20 direct questions. Estimated evidence cannot exceed Level 2. Review intervals are 1/3/7/14 days; time alone never lowers a level. The UI explains all thresholds and keeps coverage, accuracy and mastery separate.

## E. Recommendations

Insufficient evidence, low recent direct accuracy, due reviews, inconsistency, then oldest practice. Empty-history suggestions alternate Big Ideas. Explanations contain measured counts or explicitly state no evidence. Recognition-only skills move into review/maintenance after 5 estimated questions so they cannot permanently crowd out actionable practice. No gates or completion claims.

## F. Integration

One shared first-submission hook integrates compatible existing games. A separate explicit interface supports future tagged rounds and stable-ID deduplication. Initial available daily totals remain aggregate estimates; no invented question history. The shared tracker still owns daily counts and active time. Dance stage validation and Response Builder's ambiguous abstraction pool remain intentionally unassigned to individual skills. Vocabulary and broad legacy/Create topic evidence are estimates. See the compatibility matrix for limits. All launch links are actual main routes; no invented query parameters.

## G. Testing

Two complete CSP regression runs passed, including the final import hardening and recommendation refinements. The focused pathway suites also passed after the final dashboard explanation and explicit-interface additions. New suites test mapping/thresholds/storage/migration/privacy/reset separation/recommendations/import/export/DOM controls. Consolidated catalog and America/Los_Angeles daily session checks passed. All game launch URLs returned 200. Detailed logs are adjacent.

Rendered production verification, final commit, deployment and tracker write will be recorded after publication. DOM checks do not certify physical Chromebook/touch hardware or native screen-reader speech.

## H. Publication

Pending live verification. Do not interpret this pre-publication report as a completed release.

## I. Outstanding issues

Educator/classroom review of mappings and thresholds remains appropriate. Vocabulary/structured selection cannot establish authentic collaboration, original design or independent written responses. Lost past daily sessions cannot be reconstructed. Additional granular game metadata can improve currently estimated skills later without expanding game scope. Browser storage is device/origin-specific and may be cleared or reach quota; export backups. No claim of guaranteed AP Exam readiness.
