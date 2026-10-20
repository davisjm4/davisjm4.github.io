# Boolean & Conditional Lab generator quality

## Measurement method

The pre-integration and rebuilt engines were sampled with the same diagnostic harness at 1,000 seeded challenges per mode and difficulty. The baseline Boolean Lab source is the version present at commit `91ad216`; it had not changed in the audited game directory at the pre-integration repository head (`473f96c`).

- **Exact duplicate** means the same student-visible mode, prompt, code, truth table, option set, and correct answer. Option order, seed, internal id, and family label do not create uniqueness.
- **Structural pattern** normalizes variable names, numeric and Boolean literals, and strings, while retaining code, prompt, and table structure.
- **Reasoning families** are the generator's task families. Counts are out of 1,000; the quality gate rejects a family distribution outside 0.4–2.0 times the expected even share.
- The separate 100-question session test verifies that bounded recent-history avoidance yields no exact repeats in a normal session.

## Before and after: rebuilt modes

| Mode | Difficulty | Exact duplicates before → after | Structural patterns before → after | Reasoning families before → after | Family count range after (per 1,000) |
|---|---|---:|---:|---:|---:|
| Truth Table Builder | Beginner | 878 (87.8%) → 51 (5.1%) | 33 → 245 | 5 → 10 | 87–113 |
| Truth Table Builder | Intermediate | 233 (23.3%) → 10 (1.0%) | 651 → 676 | 8 → 13 | 65–94 |
| Truth Table Builder | Advanced | 196 (19.6%) → 0 (0.0%) | 772 → 888 | 10 → 13 | 59–92 |
| Switch vs. If/Else | Beginner | 454 (45.4%) → 0 (0.0%) | 3 → 308 | 4 → 9 | 95–127 |
| Switch vs. If/Else | Intermediate | 438 (43.8%) → 0 (0.0%) | 7 → 861 | 8 → 16 | 54–82 |
| Switch vs. If/Else | Advanced | 457 (45.7%) → 0 (0.0%) | 8 → 928 | 9 → 15 | 52–78 |
| Conditional Coverage | Beginner | 481 (48.1%) → 5 (0.5%) | 2 → 153 | 4 → 11 | 66–111 |
| Conditional Coverage | Intermediate | 140 (14.0%) → 1 (0.1%) | 6 → 229 | 10 → 18 | 37–70 |
| Conditional Coverage | Advanced | 185 (18.5%) → 0 (0.0%) | 8 → 287 | 12 → 17 | 47–71 |

## Quality gates

`tests/quality-gates.mjs` generates 1,000 challenges for each of the 30 mode/difficulty cells and separately reports correctness, exact diversity, structural diversity, family coverage, difficulty, distractors, session repetition, answer position, expression quality, and comparison-partition soundness.

For the rebuilt modes, the current seeded run passed all gates. Exact duplicates were below 10% for Beginner and below 5% for Intermediate and Advanced; structural patterns exceeded 100 per cell; all declared families passed the distribution bounds; and 100-question sessions had no exact repeats. Truth-table samples had no unused table variables, no non-influential variables in ordinary Intermediate/Advanced tasks, and no duplicate operands. Constant functions appeared only in tasks explicitly asking about always-true/always-false or simplification.

The baseline's structural patterns were especially limited in Switch and Coverage: only 3–8 per cell. The rebuilt generators use compositional ASTs and execution models, including 15 Truth Table activities, 16 Switch families, and 18 Coverage families.

## Remaining limitations

- Two-variable Beginner Boolean functions have a mathematically small set of meaningful functions. The 5.1% duplicate rate stays below the 10% beginner target; activity variation supplements the limited function space.
- Original Build Conditions and Construct a Condition retain only 4–10 normalized structures in this sample. Their exact rates and family distributions pass the gates, but much of their variety remains in meaningful parameter choices. Further growth should add new requirement/translation tasks rather than relabeling values.
- Complexity weights are model-based estimates, not calibrated against student performance data.
- The integrated headless DOM tests ran; physical Chromebooks, Safari, Firefox, and screen readers were not tested in this environment.
