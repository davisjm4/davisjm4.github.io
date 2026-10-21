# Development report: Workplace Readiness compositional generator

Built against `davisjm4/davisjm4.github.io` at commit **b900c9f**, directory `wpr-games/workplace-readiness/`. Developed and tested locally; nothing was pushed. Integration steps are in `INTEGRATION_GUIDE.md`; measurements in `DIVERSITY_REPORT.md`; readable examples in `SAMPLES.md`. Raw test output is in `tests/results/`.

## Summary

| Measure | Existing system | New compositional system |
|---|---|---|
| Authored templates | 140 | 140 (unchanged, still served) |
| Reasoning frameworks | — | 12 |
| Meaningful reasoning configurations | 140 (authored patterns) | 1,871 = 140 authored + 1,731 composed (no overlap: separate signature namespaces) |
| Skill/difficulty combinations with 20+ configurations | 0 of 66 | 66 of 66 (minimum 20, maximum 55) |
| Filter combinations with 20+ configurations | 29 of 502 audited | 312 of 502 audited |
| Exact repeats in 20-question sessions | up to 17 per session (e.g. Advanced Order, Advanced Find) | 0 in every audited selection and all 66 cells |
| Reasoning repeats in 20-question sessions | 1,180 summed over the 66 cells (mean of 3 seeds) | 0 |

Authored patterns are counted directly. Composed configurations are generated, validated reasoning states. They are counted only when a decision-relevant fact differs, and the two counts never overlap.

## 1. Existing source inventory

Verified on the live repo: 140 templates, 137 families, 140 `family:pattern` patterns, 22 skills, 13 career contexts, 26 setting bundles, and 28 people. The library validated with 0 errors and 0 warnings, and all 129 unit tests passed. Patterns per skill/difficulty cell ranged from 1 to 6 (none reached 20).

Core files reviewed: `generator.js`, `library.js`, `validator.js`, `grader.js`, `expr.js`, `order.js`, `text.js`, `rng.js`, `feedback.js`, `schema.js`, `app/*.js`, the templates, contexts, people, and the build, audit and test tools. The 20-question repeat-avoidance fix in `createSession` (`patternSpacing = min(20, patterns)`) is present. It is preserved in the authored generator, which is unmodified, and reimplemented with the same guarantees in the hybrid selector.

## 2. Reusable reasoning frameworks: 12

Defined in `content/compose/frameworks.json` (A–L):
- A. critical information
- B. competing priorities
- C. safest action
- D. conflicting instructions
- E. communication failure
- F. evidence reliability
- G. process dependency
- H. numeric decision
- I. unexpected change
- J. ethical dilemma
- K. root cause
- L. consequences

Each framework supplies prompts per mode and inherits shared feedback templates. Kits per framework: consequences 8, competing priorities 8, communication failure 5, numeric 5, critical information 4, evidence reliability 4, ethical dilemma 4, safest action 4, conflicting instructions 3, process dependency 3, root cause 2, unexpected change 1.

The frameworks run on four generation engines:
- **state**: prioritized issues (decisions and next steps)
- **process**: dependency graphs (ordering)
- **defect**: single-defect documents (find the problem)
- **numeric**: calculated answers

## 3. Compositional scenario types: 51 kits

The 51 kits contain 230 typed issue components and 56 numeric configs, spread across all 22 skills. Kits per skill:
- 2 kits each for 17 skills
- 3 kits each for Creativity and Innovation, Integrity, Big-Picture Thinking, and Information Security
- 5 kits for Mathematics

Six kits are beginner-only by design, because their situations would not realistically happen together: everyday integrity requests, workstation security, tool selection, office etiquette, closing habits, and source checks.

## 4. Meaningful decision-state configurations: 1,731 composed

By engine:
- **state: 1,386**
  - beginner: one active issue 230; one prerequisite satisfied 94
  - intermediate: two issues 368; one issue plus a resolved higher-priority constraint 196
  - advanced: three issues 338; two issues plus a resolved constraint 160
- **process: 151** dependency graphs
- **defect: 138** defect types
- **numeric: 56**

There are 3,117 units (configuration × mode). Decision and next-step versions of the same state share one signature. 188 decision-rule ids are in use.

## 5. Skills supported

All 22, with their original names, IDs, codes, categories and concept IDs. Every kit's concepts are validated against `skills.json`.

Review-required skills (Workplace Safety, Information Security, Integrity, Career and Life Management, Mathematics) carry the `no-jurisdiction-claims` check. Any answer that depends on a policy has that policy stated in the scenario. No legal or regulatory claims are made.

## 6. Mode/difficulty coverage

Every mode/difficulty combination has composed content:
- Decisions and Next Step use state kits (and numeric kits for Decisions).
- Order uses process kits: 3, 4 or 5 steps by level, with up to 8 valid orders at Advanced. Every valid order is accepted.
- Find uses defect documents with 4, 5 or 6 lines by level.

Advanced Decisions use plan options (correct order, reversed order, shortcut first, shortcut second). Advanced Next Step offers one or two acceptable-but-lower-priority actions.

Difficulty is measured, not just longer text. Decision-relevant facts per state rise from 1 (Beginner) to 2 (Intermediate) to 3 (Advanced), and active priorities from 0.71 to 1.65 to 2.67.

## 7. Counterfactual correctness (`tests/compose-engine.test.js`)

- **Missing vs. satisfied** (94 pairs): an issue active vs. the same prerequisite stated as satisfied. The key changes from that issue's action to proceeding, and the old action becomes a "repeats a finished step" distractor.
- **Priority** (196 pairs): two active issues vs. the higher one resolved. The key moves to the other issue, and the lower issue is keyed acceptable while the higher one is active.
- **Adding a higher-priority issue** (150+ checks): the key moves to the higher-tier issue.
- **Irrelevance** (3,000+ renders): setting, names, wording, details, pressure and numbers never changed a key or a signature, while surface text did vary.
- **Numeric pairs**: bulk price worth it vs. not, percent coupon vs. fixed coupon, and over budget vs. within budget all flip the keyed choice (50 draws each).
- **Ordering** (169 extensions): adding a prerequisite step adds a dependency and changes the signature.
- **Tampering**: the checker rejects a key moved to a lower-priority issue and a scenario missing its decisive fact.

**Independent numeric oracle** (`tests/compose-numeric-oracle.test.js`): every one of the 56 configs is recomputed in separate JavaScript from the raw inputs only, at 1,000 draws each (56,000 instances). The test checks that:
- the key shows the oracle's value
- no distractor shows it
- every input appears in the scenario
- flagged calculation lines really are wrong and the other calculation lines are right

During development the oracle found only bugs in its own matching (for example, "9 boxes" matched inside "8.9 boxes"). Those were fixed; no content error was found.

## 8. Exact duplicates

There were zero exact duplicates (same mode, scenario, prompt, options, steps and document lines) in:
- 500-question mixed sessions (3 seeds)
- sessions of 14, 20, 50 and 100 questions
- every audited 20-question selection

## 9. Structural diversity

Mixed practice: no reasoning configuration repeated within 500 questions (3 seeds). The skill bag still gives each skill once per 22 challenges. All four modes, all three difficulties, both sources and all 13 settings appear.

The minimum reasoning gap is at least 20 whenever 20 or more configurations are eligible. Single-skill sessions use every eligible configuration before repeating any. In small pools (single skill + Order or Find), unused configurations come first and then review continues (tested on 30+ such pools).

Surface variety is reported separately and not counted as reasoning: a configuration rendered 8 times gives about 7.7 distinct scenario texts. Session-by-session comparisons are in `DIVERSITY_REPORT.md`.

## 10. Every skill/difficulty combination

Format: before (authored patterns) → **after** (authored + composed). Per-mode counts are in `DIVERSITY_REPORT.md`.

| Skill | Beg before → after (auth+cx) | Int before → after | Adv before → after |
|---|---|---|---|
| 1. Creativity and Innovation | 2 → **23** (2+21) | 2 → **34** (2+32) | 1 → **26** (1+25) |
| 2. Critical Thinking and Problem Solving | 1 → **23** (1+22) | 3 → **41** (3+38) | 1 → **28** (1+27) |
| 3. Initiative and Self-Direction | 2 → **24** (2+22) | 2 → **40** (2+38) | 1 → **36** (1+35) |
| 4. Integrity | 1 → **25** (1+24) | 4 → **34** (4+30) | 1 → **25** (1+24) |
| 5. Work Ethic | 3 → **23** (3+20) | 1 → **31** (1+30) | 1 → **25** (1+24) |
| 6. Conflict Resolution | 1 → **20** (1+19) | 3 → **34** (3+31) | 1 → **20** (1+19) |
| 7. Listening and Speaking | 2 → **20** (2+18) | 3 → **39** (3+36) | 1 → **37** (1+36) |
| 8. Respect for Diversity | 3 → **20** (3+17) | 2 → **28** (2+26) | 1 → **22** (1+21) |
| 9. Customer Service Orientation | 4 → **23** (4+19) | 2 → **36** (2+34) | 1 → **28** (1+27) |
| 10. Teamwork | 3 → **21** (3+18) | 1 → **38** (1+37) | 1 → **37** (1+36) |
| 11. Big-Picture Thinking | 1 → **26** (1+25) | 4 → **35** (4+31) | 1 → **24** (1+23) |
| 12. Career and Life Management | 2 → **22** (2+20) | 3 → **41** (3+38) | 4 → **41** (4+37) |
| 13. Continuous Learning and Adaptability | 3 → **20** (3+17) | 1 → **32** (1+31) | 1 → **26** (1+25) |
| 14. Efficiency and Productivity | 3 → **20** (3+17) | 3 → **36** (3+33) | 1 → **35** (1+34) |
| 15. Information Literacy | 2 → **28** (2+26) | 2 → **31** (2+29) | 1 → **21** (1+20) |
| 16. Information Security | 2 → **25** (2+23) | 4 → **36** (4+32) | 1 → **27** (1+26) |
| 17. Information Technology | 3 → **20** (3+17) | 2 → **31** (2+29) | 1 → **23** (1+22) |
| 18. Job-Specific Tools and Technologies | 2 → **21** (2+19) | 3 → **28** (3+25) | 1 → **30** (1+29) |
| 19. Mathematics | 1 → **20** (1+19) | 5 → **23** (5+18) | 4 → **23** (4+19) |
| 20. Professionalism | 1 → **20** (1+19) | 4 → **26** (4+22) | 1 → **23** (1+22) |
| 21. Reading and Writing | 3 → **20** (3+17) | 2 → **24** (2+22) | 4 → **24** (4+20) |
| 22. Workplace Safety | 2 → **30** (2+28) | 6 → **55** (6+49) | 1 → **43** (1+42) |

Fifteen cells sit at 20–22, which meets the target with little margin: CON-B, CON-A, LIS-B, DIV-B, DIV-A, TEA-B, CAR-B, CLA-B, EFF-B, ILI-A, ITE-B, JST-B, MAT-B, PRO-B and RAW-B. In-browser and Node tests confirmed 20 consecutive challenges with no reasoning repeat in all 66 cells (3 seeds).

## 11. Performance and determinism

- **Determinism**: same seed and filters give an identical 300-challenge stream. Challenge n is independent of later requests. `Math.random` is never called (tested). `renderUnit` is pure.
- **Speed (Node, this machine)**:
  - catalog build about 100 ms at page load
  - generation plus both validations 0.5 ms per challenge
  - 2,000-challenge sessions stay under the 25 ms/challenge test bound
- **History**: bounded at 400 entries plus a last-seen map. A resume replays the stream, as before.
- **Bundle**: `compose-bundle.js` is 486 KB uncompressed and 127 KB gzipped (in addition to the existing 355 KB content bundle).
- **Not measured**: timings on a Chromebook.

## 12. Regression results

- **Library validation**: 140 templates, 0 errors, 0 warnings.
- **Unit tests (existing)**: 129 of 129 pass. `content-bundle.js` is byte-identical.
- **Compositional tests (new)**: 102 of 102 pass, with the oracle at 1,000 draws. They cover:
  - 12 bulk runs of 1,000 challenges each
  - all 66 cells at 100 challenges each
  - all 13 settings
  - zero generation rejections
  - balanced answer positions (chi-square under 16.27)
  - text checks: no unresolved tokens, double articles, a/an errors or "they is"
- **Sweep**: every composed unit rendered in every allowed setting bundle with 2 seeds (162,084 renders), with 0 validator or checker errors.
- **Browser tests in the supplied package**: 34 of 36 passed. During integration, both reported defects were corrected:
  - Mathematics + Advanced now explicitly verifies that generated advanced questions are available and preserve the selected filters.
  - The WPR Games return link is inside the site header landmark; the composed-page axe test now includes the `region` rule rather than suppressing it.
- **Browser suite in this environment**: not run to completion because Chromium is not installed at either path in `tests/browser/harness.js`; Puppeteer reports that `executablePath` is required. Production browser checks are recorded separately after deployment.
- **The 12 compositional browser tests in the supplied run** cover:
  - play-through in all four modes
  - narrow-filter repeat avoidance
  - keyboard play
  - axe with no WCAG A/AA violations on composed challenge and feedback screens
  - 360×740, 390×844 and 1366×768 with no horizontal scroll
  - fallback to the authored generator
- **Fallback visibility**: if the compositional engine or bundle fails to load, authored questions remain usable and a persistent alert explains that the expanded pool is unavailable. The authored-only capacity is not reported as compositional capacity.
- **Two existing browser tests updated** (same assertions, none removed): they had hard-coded the authored-only stream.
  - The persistence test now computes its expected challenge with the active generator.
  - The ordering test now looks for any 5-step challenge with more than one valid order, instead of one specific authored template, and submits a valid alternate built from the key's precedence relations.
- **Compatibility**: four modes, filters, one-attempt scoring, feedback, Session Summary, local persistence and resume, privacy (stored keys unchanged), and keyboard controls were all exercised by the existing and new browser tests.

## 13. ZIP contents

`workplace-readiness-compositional-generator.zip`:
- `README.md`: package overview
- `INTEGRATION_GUIDE.md`, `DEVELOPMENT_REPORT.md`, `DIVERSITY_REPORT.md`, `GENERATOR_SCHEMA.md`, `SAMPLES.md`
- `patches/workplace-readiness.patch`: changes to existing files, relative to b900c9f
- `workplace-readiness/`: the complete game directory with the generator integrated, excluding `node_modules`
- `test-results/`: raw outputs

## 14. Integration instructions

See `INTEGRATION_GUIDE.md`. In short:
1. Add `content/compose/`, `js/compose/`, `js/data/compose-bundle.js`, the new tools and the new tests.
2. Apply the small changes to `index.html`, `js/app/app.js`, `tools/build-bundle.js`, `package.json` and `tests/browser/app.test.js`.
3. Run `npm run build` and `npm test`.
4. Keep the cache-busting versions, and bump the compose-bundle version whenever compose content changes.

## 15. Remaining limitations

1. **Narrow single-mode filters.** 190 of the 502 audited filters stay under 20: one skill + Order + difficulty (66), one skill + Find + difficulty (66), and some one skill + Decision or Next Step selections (58). The existing warning is shown and practice continues honestly. Five selections are still empty and were empty before (JST/Order/Beginner, MAT/Next Step/Beginner, MAT/Order/Intermediate, PRO/Order/Beginner, RAW/Order/Intermediate).
2. **Thin margins.** Fifteen cells sit at 20–22 configurations (listed in §10). Long single-cell sessions there move into review sooner than in other cells.
3. **Priority tiers are authoring judgment.** Each kit orders its issues by tier and states why. Pairs whose order is debatable are kept apart with `exclusive` or a shared tier. This produces defensible keys, but it has not been reviewed by an educator or CTE subject-matter expert.
4. **Template-built feedback.** Feedback for acceptable options, plans and repeated steps is built from shared templates plus kit text. Manual reading found and fixed agreement and phrasing problems; others may remain in combinations not read.
5. **What a configuration counts.** A configuration is a decision state, not a fully authored scenario. Two states in the same kit share their setup and situation, and differ in the facts and the decision they require. I counted only decision-relevant differences, and the decision and next-step versions of a state count once. Even so, a reviewer may judge some pairs (for example, one active issue vs. that issue plus a resolved higher-priority constraint) as closely related.
6. **Numeric context.** Mathematics configs use the setting's supply and area vocabulary, but the arithmetic situations are generic across settings.
7. **Not tested:** Safari, Firefox, physical Chromebooks, tablets, screen readers (axe automated checks only), and Chromebook performance.
8. **In-progress sessions.** Students mid-session at deploy time get a new stream after the update. Their statistics are kept.
9. **No independent content review** of SAMPLES.md by a teacher. I read about 90 samples plus targeted renders, and fixed every issue I found.

## Fresh-extract verification

The final ZIP was extracted into an empty folder. A fresh clone of the live repository was made, and the upstream HEAD had moved to **00e27ae**: 8 commits after b900c9f, all in Teacher Tools and String Lab. No upstream commit after 8464f54 touches `wpr-games/workplace-readiness/`, and nothing outside it loads its scripts. Only links and a redirect point there.

In that clone:
- `patches/workplace-readiness.patch` applies cleanly (`git apply --check`).
- With the packaged directory installed, `npm ci` and `npm run build` regenerated `compose-bundle.js` byte-identically.
- Validation passes with 0 errors and 0 warnings.
- Unit tests: 129/129. Compositional tests: 102/102, with the oracle at 1,000 draws.
- Sweep: 162,084 renders, 0 errors.
- Browser tests in the supplied raw run: 34/36. The two cited issues were fixed in this integration, but local Chromium-based verification could not run in this environment because Chromium is unavailable.

One intermittent failure found during this check was fixed. On about 3.7% of random seeds, the order-mode play-through test saw fewer than its fixed threshold of 8 composed challenges in 18. Order mode serves authored templates more often by design: there are 26 authored order patterns, and they are weighted 3×. Measured over 300 seeds, the composed count in 18 order challenges ranged from 3 to 18, with a median of 11. The test now plays until it has exercised at least 6 composed challenges (up to 40). After the fix, 24 of 24 repeated play-through runs passed.
