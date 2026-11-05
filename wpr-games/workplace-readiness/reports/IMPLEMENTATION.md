# Workplace Readiness targeted practice and diagnostics

## Existing system audited

The baseline was `22096c1117fc73f864b4a3e154b3ef9c38986f54` on the repository's main branch. The GitHub Pages Workplace Readiness and Teacher Tools pages were reachable and exposed ordinary practice, the Session Summary and Canvas QTI export. The source had the 22 CTECS skills, 94 mapped concepts, 140 authored templates and 51 compositional kits. The hybrid selector validated each challenge, balanced skills, and spaced reasoning families. The session tracker used browser storage. The Teacher Tools adapter verified choices against the original grader for all four modes. The audit did not find an existing shared assignment or reporting service.

The prior Diagnostic #1 item analysis guided content priorities. It had no question stems. The new scenarios are original, and item-level alignment remains unverified.

## Classroom workflow

1. In Teacher Tools, use **Create Online Diagnostic** and add coverage groups for skills, topics or subtopics. Enter a quota for each. The builder rejects filters it cannot fill with distinct reasoning.
2. Preview the questions and explanations. Regenerate an item or the full set. Sign in to publish when the shared service is configured.
3. Share the student URL. Students start without accounts. Publication freezes the prompts, choices, keys, topic metadata and settings.
4. Students get a report, matched practice links, print and CSV options. **Performance** combines diagnostic history, recent first-attempt practice, thresholds, plans and backup/restore.
5. In Teacher Tools, open the class report. Use **Create targeted practice** next to a weak area to fill a follow-up assignment. Share its new link. Reassess after practice.
6. Students can [make a personal copy of the Google Sheets tracker](https://docs.google.com/spreadsheets/d/1LzUzmvtuJqRHy1EKDDBQA4tP91ieu52dt67ypbFnkVg/copy). The template is read-only for the school's Google Workspace. It includes import instructions, the 22-skill heat map, topic rows, checkboxes, assessment history and a summary. Imports append values to the raw tab. The tracker uses stable IDs and fixed student-editable rows.

In ordinary practice, open **Target specific topics**. Skill, topic, mode, difficulty and setting selections intersect. Multiple topics and subtopics use simple checkboxes. Copy practice link preserves the selection. Tracked teacher assignments are separately identified and have their own reports.

## Coverage and export contract

See [topic coverage](TOPIC_COVERAGE.md) for the 13 topics, 35 subtopics, thresholds and known gaps. The [filter matrix](TOPIC_COVERAGE.json) records validated eligibility by mode and difficulty. [Diagnostic sample](sample-1.csv) and [reassessment sample](sample-2.csv) contain synthetic data and use the same student CSV serializer as the site.

CSV schema version 1 includes the assessment ID and completion time, stable dimension IDs, attempt and correct counts, numeric accuracy, evidence and a practice link. Scope is one of overall, skill, topic, subtopic. Rows for separate scopes overlap. Use overall rows for total score rather than adding counts across scopes. Topic or subtopic rows can span multiple official skills, so their official skill cells are blank. Aggregate CSV is teacher-only and includes both the completed submission count and the number included in released breakdowns. CSV writers escape quotes and neutralize spreadsheet formula prefixes.

## Verification

| Check | Result |
| --- | --- |
| Authored content build and validator | 167 authored templates, 164 authored families, 22 skills, zero errors or warnings |
| Existing Workplace Readiness regression suite | 129 unit, 102 compositional and 36 Chromium browser checks passed |
| New builder, topic, grading and reporting tests | Three-topic quotas and regeneration, impossible filters, exact subtopic tags, malformed snapshots, CSV escaping, deferred and immediate grading, access control, duplicate requests, retention deletion and aggregate-only receipt completion passed |
| Chromium end to end | Published a three-topic diagnostic in development, completed it without an account, checked deferred feedback, exact targeted links, 360px layout, axe accessibility on assessment and report, CSV download and backup restore, and built class remediation from five submissions |
| Canvas export | Existing QTI package checks and Workplace Readiness adapter tests passed, including deterministic 10, 20 and 50 item builds. Canvas sandbox import was outside this run |
| Native Google Sheets | Imported two generated CSVs and appended their values to a real template copy. PPE changed from 33% with focused practice to 100% and improved. The heat-map color, history rows, checkbox values, note, practice link and progress totals were verified in native Sheets |
| Classroom hardware and production reporting | Pending. Browser checks used headless Chromium and simulated students. Production Google sign-in and cross-device use need the deployed service |

From the repository root, with Node.js 24 and the WPR package's dev dependencies installed:

```sh
npm --prefix wpr-games/workplace-readiness ci
CHROME_BIN=/path/to/chrome npm --prefix wpr-games/workplace-readiness test
CHROME_BIN=/path/to/chrome node --test cs-games/teacher/wpr-online-tests.mjs cs-games/teacher/wpr-online-browser-tests.mjs
node cs-games/teacher/qti-tests.mjs
node cs-games/teacher/workplace-adapter-tests.mjs
WPR_COVERAGE_PATH=wpr-games/workplace-readiness/reports/TOPIC_COVERAGE.json node --test cs-games/teacher/wpr-online-tests.mjs
```

## Release dependency

The review branch includes the complete development workflow. The Pages version and production reporting are pending release. Live diagnostics require a school-authorized Cloudflare Workers/D1 connection, a Google OAuth web client, teacher allowlist and the two runtime secrets described in [service deployment](../service/README.md). The independent practice filters and browser-local readiness page need only the Pages release. The Sheets template is already native and shared for viewing within the school domain.
