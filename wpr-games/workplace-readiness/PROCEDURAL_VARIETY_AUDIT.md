# Workplace Readiness Procedural Variety Audit and Correction

> Historical baseline: this report documents the repeat-avoidance correction from commit `021975ff`; its post-change inventory is now superseded by [`CONTENT_EXPANSION_REPORT.md`](CONTENT_EXPANSION_REPORT.md), which records the later scenario expansion. The sample repetition measurements below describe the pre-expansion library and should not be read as current inventory.

Audit date: 2026-10-21. The baseline and post-change audit use the same three fixed seeds, the same 502 filter configurations, and 500 challenges per eligible configuration (469,500 generated challenges per run). Counts describe authored reasoning patterns, not surface wording.

## Source inventory

| Measure | Baseline | After |
|---|---:|---:|
| Skills | 22 | 22 |
| Templates | 125 | 125 |
| Reasoning families | 122 | 122 |
| Unique family:pattern signatures | 125 | 125 |
| Career contexts / setting bundles | 13 / 26 | 13 / 26 |

The existing content library is unchanged in this corrective patch: this work repairs scheduling across the existing pattern pool and surfaces pool size, but it does not create additional instructional content. Continuous generation, surface wording/context variation, and genuinely different authored reasoning patterns are separate properties; only the last is represented by the pattern counts below.

## Session repetition results

Across all 313 nonempty filter configurations (many have fewer than 20 patterns), mean repeat counts across the three seeds were:

| Session | Exact repeats before | Exact repeats after | Reasoning repeats before | Reasoning repeats after |
|---:|---:|---:|---:|---:|
| 14 | 3.65 | 3.61 | 8.40 | 8.40 |
| 20 | 6.77 | 6.67 | 13.71 | 13.62 |
| 50 | 26.29 | 26.18 | 43.39 | 43.35 |
| 100 | 63.68 | 63.75 | 93.24 | 93.22 |
| 500 | 403.91 | 403.27 | 493.03 | 493.02 |

Narrow pools necessarily repeat reasoning: among all configurations the mean 20-question reasoning repeat count remains 13.62. This is not hidden by the anti-repeat logic. The home screen now reports authored challenge and reasoning-pattern counts and explains when the selected pool has fewer than 20 patterns.

For the 26 configurations with at least 20 eligible patterns, the first-20 repeat guarantee changed as follows:

| Session | Mean exact repeats before → after | Mean reasoning repeats before → after | Worst reasoning repeats before → after |
|---:|---:|---:|---:|
| 14 | 0.00 → 0.00 | 0.00 → 0.00 | 0 → 0 |
| 20 | 0.47 → 0.00 | 0.82 → 0.00 | 2.67 → 0 |
| 50 | 12.05 → 10.28 | 27.23 → 26.81 | 30.67 → 30 |
| 100 | 35.14 → 35.04 | 75.38 → 75.22 | 80 → 80 |
| 500 | 281.00 → 277.23 | 472.85 → 472.83 | 480 → 480 |

After the change, all 26 configurations with at least 20 patterns had zero exact or reasoning repeats during 14- and 20-question sessions. For 50/100/500, repeat counts rise because the authored pool is finite.

## Patterns per skill and difficulty

| Skill | Beginner | Intermediate | Advanced | Advanced template modes |
|---|---:|---:|---:|---|
| Creativity and Innovation | 2 | 2 | 1 | decision |
| Critical Thinking and Problem Solving | 1 | 3 | 1 | decision |
| Initiative and Self-Direction | 2 | 2 | 1 | decision |
| Integrity | 1 | 4 | 1 | decision |
| Work Ethic | 3 | 1 | 1 | decision |
| Conflict Resolution | 1 | 3 | 1 | nextstep |
| Listening and Speaking | 2 | 3 | 1 | decision |
| Respect for Diversity | 3 | 2 | 1 | decision |
| Customer Service Orientation | 3 | 2 | 1 | decision |
| Teamwork | 3 | 1 | 1 | decision |
| Big-Picture Thinking | 1 | 4 | 1 | decision |
| Career and Life Management | 2 | 3 | 0 | none |
| Continuous Learning and Adaptability | 3 | 1 | 1 | decision |
| Efficiency and Productivity | 2 | 3 | 1 | decision |
| Information Literacy | 2 | 2 | 1 | decision |
| Information Security | 2 | 4 | 1 | nextstep |
| Information Technology | 3 | 2 | 1 | decision |
| Job-Specific Tools and Technologies | 2 | 3 | 1 | decision |
| Mathematics | 1 | 5 | 0 | none |
| Professionalism | 1 | 4 | 1 | decision |
| Reading and Writing | 3 | 2 | 0 | none |
| Workplace Safety | 1 | 6 | 1 | decision |

Three skills still have no Advanced content: Career and Life Management, Mathematics, and Reading and Writing. Advanced coverage remains concentrated in Workplace Decisions: 17 Advanced decision templates and two Advanced Best Next Step templates; there are no Advanced ordering or problem-finding templates. Most skill/difficulty pools contain one or two patterns. These are material instructional-capacity limitations and remain uncorrected by this patch.

## Filter-specific worst case and method

The worst 20-question reasoning-repeat case remains any filter with one eligible pattern (19 repeats after the first challenge). A concrete thin selection is Creativity and Innovation / Workplace Decisions / Beginner / any setting: 1 authored template and 1 pattern. This is not solved by rotating names or settings. In contrast, the context-filtered Workplace Decisions / Intermediate / Manufacturing pool has 20 patterns and now yields 20 distinct patterns in its first 20 questions; a regression test locks this previously failing bag-boundary case.

Audit signatures: exact duplicate = same mode, normalized prompt/scenario, response choices and correct answer; scenario duplicate = normalized scenario after masking generated setting values and digits; reasoning duplicate = repeated authored family:pattern. Structural variation uses mode + family:pattern + difficulty, so it intentionally does not count surface substitutions as new structures. Seeds: workplace-audit-a/b/c.

## Correction and remaining scope

- Increased pattern spacing from 12 to a 20-question window when the filtered pool supports it.
- Fixed skill-bag selection so an unused pattern in another eligible skill is selected before a recent pattern is reused.
- Exposed the eligible pattern/family counts on the session object and disclosed thin pools before practice.
- Added regression checks for the first-20 uniqueness guarantee and a context-filtered boundary case.
- No content templates were added; Advanced coverage gaps, low per-skill pools, mode×difficulty gaps, and post-20 finite-pool repetition remain. The audit does not establish that every career-setting × skill × difficulty combination has 20 distinct patterns.
