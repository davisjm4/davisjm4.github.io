# Diversity report: authored-only vs compositional generator

Generated 2026-10-21 by `npm run docs:compose` from `tests/results/compose-audit.json`. Baseline = the 140-template authored generator (`js/core/generator.js`, unchanged). New = the hybrid selector (`js/compose/selector.js`) over the same 140 templates plus the compositional catalog.

## What counts as a distinct reasoning problem

Authored templates keep their `family:pattern` signature. A composed challenge's signature contains only facts that change the professional decision:

- **Decision / Best Next Step:** the skill, the decisive issue's principle, the other active issues and any higher-priority constraint stated as already resolved (`first:…|also:…|resolved:…`), or the prerequisite stated as satisfied (`clear:…`). The mode is *not* part of the signature: the same state asked as a decision and as a next step counts once.
- **Put the Steps in Order:** the kit and the exact set of steps (a different prerequisite set gives a different dependency graph).
- **Find the Problem:** the defect principle.
- **Numeric:** the configuration principle (which calculation or constraint decides).

Names, settings, setting-specific vocabulary, wording variants, irrelevant detail sentences, pressure sentences, numbers that do not change the decision, and option order never change a signature. Composed and authored signatures are in separate namespaces, so totals are plain sums with no overlap.

## Summary

| Measure | Existing system | New compositional system |
|---|---|---|
| Authored templates | 140 | 140 (unchanged, still used) |
| Reasoning frameworks | — | 12 |
| Compositional kits (situation types) | — | 51 |
| Meaningful reasoning configurations | 140 authored patterns | 1871 (140 authored + 1731 composed) |
| Skill/difficulty combinations with 20+ configurations | 0 of 66 | 66 of 66 |
| Filter combinations with 20+ configurations | 29 of 502 audited | 312 of 502 audited |
| Exact repeats in 20-question sessions (sum over the 66 cells, mean of 3 seeds) | see session table | 0 |
| Reasoning repeats in 20-question sessions (sum over the 66 cells, mean of 3 seeds) | 1180 | 0 |

Composed configurations by engine: state 1386, process 151, defect 138, numeric 56. Composed units (configuration × mode) before rendering: 3117. Decision-rule ids in use: 188.

State configurations by shape: beginner:1active+0resolved = 230; beginner:0active+1resolved = 94; intermediate:2active+0resolved = 368; intermediate:1active+1resolved = 196; advanced:3active+0resolved = 338; advanced:2active+1resolved = 160.

Surface variety: rendering one configuration 8 times across its allowed settings gives on average 7.7 distinct scenario texts. This is surface variety only and is **not** counted as reasoning variety.

## Sessions (mean of 3 seeds)

| Selection | Length | Exact repeats (before → after) | Reasoning repeats (before → after) | Distinct families (before → after) |
|---|---|---|---|---|
| all-skills mixed | 14 | 0 → 0 | 0 → 0 | 14 → 14 |
| all-skills mixed | 20 | 0 → 0 | 0 → 0 | 20 → 20 |
| all-skills mixed | 50 | 0 → 0 | 3.67 → 0 | 46.33 → 39.33 |
| all-skills mixed | 100 | 1 → 0 | 20.33 → 0 | 78.33 → 60.67 |
| all-skills mixed | 500 | 43.33 → 0 | 363.33 → 0 | 133.67 → 124 |
| one skill (Integrity), mixed difficulty | 14 | 1 → 0 | 8 → 0 | 6 → 9 |
| one skill (Integrity), mixed difficulty | 20 | 2 → 0 | 14 → 0 | 6 → 9 |
| one skill (Integrity), mixed difficulty | 50 | 9.67 → 0 | 44 → 0 | 6 → 9 |
| one skill (Integrity), mixed difficulty | 100 | 25.33 → 1 | 94 → 16 | 6 → 9 |
| one skill (Integrity), mixed difficulty | 500 | 265.67 → 42.33 | 494 → 416 | 6 → 9 |
| one skill + Advanced (Mathematics) | 14 | 10 → 0 | 10 → 0 | 4 → 6 |
| one skill + Advanced (Mathematics) | 20 | 16 → 0 | 16 → 0 | 4 → 6 |
| one skill + Advanced (Mathematics) | 50 | 46 → 8 | 46 → 27 | 4 → 6 |
| one skill + Advanced (Mathematics) | 100 | 96 → 16 | 96 → 77 | 4 → 6 |
| one skill + Advanced (Mathematics) | 500 | 496 → 93.33 | 496 → 477 | 4 → 6 |
| Advanced, Best Next Step | 14 | 5.67 → 0 | 9 → 0 | 5 → 14 |
| Advanced, Best Next Step | 20 | 9 → 0 | 15 → 0 | 5 → 20 |
| Advanced, Best Next Step | 50 | 28 → 1 | 45 → 1 | 5 → 31 |
| Advanced, Best Next Step | 100 | 60.33 → 3 | 95 → 3 | 5 → 40.33 |
| Advanced, Best Next Step | 500 | 351 → 22.33 | 495 → 63.67 | 5 → 45 |
| Advanced, Put the Steps in Order | 14 | 11 → 0 | 11 → 0 | 3 → 14 |
| Advanced, Put the Steps in Order | 20 | 17 → 0 | 17 → 0 | 3 → 20 |
| Advanced, Put the Steps in Order | 50 | 47 → 2.33 | 47 → 12 | 3 → 30.67 |
| Advanced, Put the Steps in Order | 100 | 97 → 10 | 97 → 54.33 | 3 → 32 |
| Advanced, Put the Steps in Order | 500 | 497 → 91.33 | 497 → 453 | 3 → 32 |
| Advanced, Find the Problem | 14 | 11 → 0 | 11 → 0 | 3 → 14 |
| Advanced, Find the Problem | 20 | 17 → 0 | 17 → 0 | 3 → 20 |
| Advanced, Find the Problem | 50 | 47 → 1.33 | 47 → 14.33 | 3 → 35.67 |
| Advanced, Find the Problem | 100 | 97 → 9.33 | 97 → 62 | 3 → 36 |
| Advanced, Find the Problem | 500 | 497 → 92.33 | 497 → 462 | 3 → 36 |

In 500-question sessions, any configuration repeat happens only after the eligible pool is used, and never within 20 challenges when 20 or more are eligible (asserted in `tests/compose-diversity.test.js`).

## All 66 skill/difficulty combinations

Before = authored patterns. After = authored + composed configurations. Mode columns count configurations available when that mode alone is selected; Decision and Next Step share state configurations, so mode columns do not add up to the total.

| Skill | Level | Before | Authored | Composed | **Total** | Decisions | Next Step | Order | Find |
|---|---|---|---|---|---|---|---|---|---|
| 1. Creativity and Innovation | Beg | 2 | 2 | 21 | **23** | 16 | 15 | 3 | 4 |
| 1. Creativity and Innovation | Int | 2 | 2 | 32 | **34** | 25 | 26 | 5 | 3 |
| 1. Creativity and Innovation | Adv | 1 | 1 | 25 | **26** | 20 | 19 | 4 | 2 |
| 2. Critical Thinking and Problem Solving | Beg | 1 | 1 | 22 | **23** | 16 | 16 | 3 | 4 |
| 2. Critical Thinking and Problem Solving | Int | 3 | 3 | 38 | **41** | 31 | 31 | 5 | 4 |
| 2. Critical Thinking and Problem Solving | Adv | 1 | 1 | 27 | **28** | 24 | 23 | 2 | 2 |
| 3. Initiative and Self-Direction | Beg | 2 | 2 | 22 | **24** | 16 | 15 | 5 | 3 |
| 3. Initiative and Self-Direction | Int | 2 | 2 | 38 | **40** | 31 | 32 | 5 | 3 |
| 3. Initiative and Self-Direction | Adv | 1 | 1 | 35 | **36** | 32 | 31 | 2 | 2 |
| 4. Integrity | Beg | 1 | 1 | 24 | **25** | 18 | 17 | 3 | 4 |
| 4. Integrity | Int | 4 | 4 | 30 | **34** | 23 | 23 | 7 | 3 |
| 4. Integrity | Adv | 1 | 1 | 24 | **25** | 19 | 18 | 4 | 2 |
| 5. Work Ethic | Beg | 3 | 3 | 20 | **23** | 15 | 14 | 3 | 5 |
| 5. Work Ethic | Int | 1 | 1 | 30 | **31** | 23 | 24 | 5 | 2 |
| 5. Work Ethic | Adv | 1 | 1 | 24 | **25** | 19 | 18 | 4 | 2 |
| 6. Conflict Resolution | Beg | 1 | 1 | 19 | **20** | 13 | 13 | 2 | 5 |
| 6. Conflict Resolution | Int | 3 | 3 | 31 | **34** | 27 | 25 | 5 | 2 |
| 6. Conflict Resolution | Adv | 1 | 1 | 19 | **20** | 15 | 16 | 2 | 2 |
| 7. Listening and Speaking | Beg | 2 | 2 | 18 | **20** | 16 | 15 | 1 | 3 |
| 7. Listening and Speaking | Int | 3 | 3 | 36 | **39** | 34 | 34 | 3 | 1 |
| 7. Listening and Speaking | Adv | 1 | 1 | 36 | **37** | 35 | 34 | 1 | 1 |
| 8. Respect for Diversity | Beg | 3 | 3 | 17 | **20** | 14 | 13 | 2 | 4 |
| 8. Respect for Diversity | Int | 2 | 2 | 26 | **28** | 24 | 24 | 2 | 1 |
| 8. Respect for Diversity | Adv | 1 | 1 | 21 | **22** | 20 | 19 | 1 | 1 |
| 9. Customer Service Orientation | Beg | 4 | 4 | 19 | **23** | 16 | 16 | 2 | 4 |
| 9. Customer Service Orientation | Int | 2 | 2 | 34 | **36** | 31 | 31 | 3 | 1 |
| 9. Customer Service Orientation | Adv | 1 | 1 | 27 | **28** | 25 | 24 | 2 | 1 |
| 10. Teamwork | Beg | 3 | 3 | 18 | **21** | 15 | 14 | 3 | 3 |
| 10. Teamwork | Int | 1 | 1 | 37 | **38** | 32 | 33 | 4 | 1 |
| 10. Teamwork | Adv | 1 | 1 | 36 | **37** | 34 | 33 | 2 | 1 |
| 11. Big-Picture Thinking | Beg | 1 | 1 | 25 | **26** | 20 | 19 | 3 | 3 |
| 11. Big-Picture Thinking | Int | 4 | 4 | 31 | **35** | 26 | 26 | 5 | 3 |
| 11. Big-Picture Thinking | Adv | 1 | 1 | 23 | **24** | 20 | 19 | 2 | 2 |
| 12. Career and Life Management | Beg | 2 | 2 | 20 | **22** | 18 | 17 | 2 | 2 |
| 12. Career and Life Management | Int | 3 | 3 | 38 | **41** | 36 | 36 | 2 | 2 |
| 12. Career and Life Management | Adv | 4 | 4 | 37 | **41** | 35 | 35 | 3 | 2 |
| 13. Continuous Learning and Adaptability | Beg | 3 | 3 | 17 | **20** | 15 | 14 | 2 | 3 |
| 13. Continuous Learning and Adaptability | Int | 1 | 1 | 31 | **32** | 28 | 29 | 2 | 1 |
| 13. Continuous Learning and Adaptability | Adv | 1 | 1 | 25 | **26** | 24 | 23 | 1 | 1 |
| 14. Efficiency and Productivity | Beg | 3 | 3 | 17 | **20** | 14 | 14 | 2 | 3 |
| 14. Efficiency and Productivity | Int | 3 | 3 | 33 | **36** | 30 | 30 | 3 | 2 |
| 14. Efficiency and Productivity | Adv | 1 | 1 | 34 | **35** | 31 | 30 | 3 | 1 |
| 15. Information Literacy | Beg | 2 | 2 | 26 | **28** | 21 | 21 | 2 | 5 |
| 15. Information Literacy | Int | 2 | 2 | 29 | **31** | 25 | 25 | 3 | 2 |
| 15. Information Literacy | Adv | 1 | 1 | 20 | **21** | 18 | 17 | 1 | 2 |
| 16. Information Security | Beg | 2 | 2 | 23 | **25** | 19 | 18 | 2 | 4 |
| 16. Information Security | Int | 4 | 4 | 32 | **36** | 26 | 26 | 6 | 3 |
| 16. Information Security | Adv | 1 | 1 | 26 | **27** | 22 | 23 | 2 | 2 |
| 17. Information Technology | Beg | 3 | 3 | 17 | **20** | 16 | 15 | 1 | 3 |
| 17. Information Technology | Int | 2 | 2 | 29 | **31** | 28 | 28 | 1 | 1 |
| 17. Information Technology | Adv | 1 | 1 | 22 | **23** | 21 | 20 | 1 | 1 |
| 18. Job-Specific Tools and Technologies | Beg | 2 | 2 | 19 | **21** | 16 | 15 | 0 | 5 |
| 18. Job-Specific Tools and Technologies | Int | 3 | 3 | 25 | **28** | 23 | 23 | 3 | 1 |
| 18. Job-Specific Tools and Technologies | Adv | 1 | 1 | 29 | **30** | 28 | 27 | 1 | 1 |
| 19. Mathematics | Beg | 1 | 1 | 19 | **20** | 16 | 0 | 1 | 3 |
| 19. Mathematics | Int | 5 | 5 | 18 | **23** | 18 | 1 | 0 | 4 |
| 19. Mathematics | Adv | 4 | 4 | 19 | **23** | 17 | 1 | 1 | 4 |
| 20. Professionalism | Beg | 1 | 1 | 19 | **20** | 16 | 15 | 0 | 4 |
| 20. Professionalism | Int | 4 | 4 | 22 | **26** | 20 | 20 | 3 | 2 |
| 20. Professionalism | Adv | 1 | 1 | 22 | **23** | 21 | 20 | 1 | 1 |
| 21. Reading and Writing | Beg | 3 | 3 | 17 | **20** | 14 | 13 | 1 | 5 |
| 21. Reading and Writing | Int | 2 | 2 | 22 | **24** | 21 | 21 | 0 | 2 |
| 21. Reading and Writing | Adv | 4 | 4 | 20 | **24** | 19 | 19 | 1 | 3 |
| 22. Workplace Safety | Beg | 2 | 2 | 28 | **30** | 18 | 18 | 5 | 6 |
| 22. Workplace Safety | Int | 6 | 6 | 49 | **55** | 38 | 37 | 10 | 6 |
| 22. Workplace Safety | Adv | 1 | 1 | 42 | **43** | 35 | 34 | 6 | 2 |

## Narrow filters below 20 (disclosed)

190 of 502 audited filters have fewer than 20 configurations. By kind: one skill + decision 27, one skill + nextstep 31, one skill + order 66, one skill + find 66. All 156 all-skills × mode × difficulty × career-setting filters reach 20. When a selection has fewer than 20, the home screen says so (existing warning, now based on reasoning configurations), unused configurations are served first, and review practice continues.

Empty selections (no authored or composed content; Start stays disabled): `job-specific-tools-and-technologies/order/beginner/any-setting`, `mathematics/nextstep/beginner/any-setting`, `mathematics/order/intermediate/any-setting`, `professionalism/order/beginner/any-setting`, `reading-and-writing/order/intermediate/any-setting`. These were empty before as well.

<details><summary>All 502 audited filters (before → after)</summary>

| Selection | Before | After |
|---|---|---|
| all-skills/mixed/mixed-difficulty/any-setting | 140 | 1871 |
| all-skills/mixed/beginner/any-setting | 47 | 494 |
| all-skills/mixed/intermediate/any-setting | 62 | 753 |
| all-skills/mixed/advanced/any-setting | 31 | 624 |
| all-skills/decision/beginner/any-setting | 18 | 358 |
| all-skills/decision/intermediate/any-setting | 21 | 600 |
| all-skills/decision/advanced/any-setting | 20 | 534 |
| all-skills/nextstep/beginner/any-setting | 3 | 327 |
| all-skills/nextstep/intermediate/any-setting | 21 | 585 |
| all-skills/nextstep/advanced/any-setting | 5 | 503 |
| all-skills/order/beginner/any-setting | 14 | 48 |
| all-skills/order/intermediate/any-setting | 9 | 82 |
| all-skills/order/advanced/any-setting | 3 | 47 |
| all-skills/find/beginner/any-setting | 12 | 85 |
| all-skills/find/intermediate/any-setting | 11 | 50 |
| all-skills/find/advanced/any-setting | 3 | 38 |
| all-skills/decision/beginner/agriculture | 17 | 357 |
| all-skills/decision/intermediate/agriculture | 21 | 600 |
| all-skills/decision/advanced/agriculture | 18 | 532 |
| all-skills/nextstep/beginner/agriculture | 3 | 327 |
| all-skills/nextstep/intermediate/agriculture | 21 | 585 |
| all-skills/nextstep/advanced/agriculture | 5 | 503 |
| all-skills/order/beginner/agriculture | 14 | 48 |
| all-skills/order/intermediate/agriculture | 9 | 82 |
| all-skills/order/advanced/agriculture | 3 | 47 |
| all-skills/find/beginner/agriculture | 12 | 85 |
| all-skills/find/intermediate/agriculture | 11 | 50 |
| all-skills/find/advanced/agriculture | 3 | 38 |
| all-skills/decision/beginner/automotive | 18 | 358 |
| all-skills/decision/intermediate/automotive | 20 | 599 |
| all-skills/decision/advanced/automotive | 20 | 534 |
| all-skills/nextstep/beginner/automotive | 3 | 327 |
| all-skills/nextstep/intermediate/automotive | 21 | 585 |
| all-skills/nextstep/advanced/automotive | 5 | 503 |
| all-skills/order/beginner/automotive | 14 | 48 |
| all-skills/order/intermediate/automotive | 9 | 82 |
| all-skills/order/advanced/automotive | 3 | 47 |
| all-skills/find/beginner/automotive | 12 | 85 |
| all-skills/find/intermediate/automotive | 10 | 49 |
| all-skills/find/advanced/automotive | 3 | 38 |
| all-skills/decision/beginner/business | 16 | 356 |
| all-skills/decision/intermediate/business | 20 | 599 |
| all-skills/decision/advanced/business | 18 | 532 |
| all-skills/nextstep/beginner/business | 3 | 327 |
| all-skills/nextstep/intermediate/business | 21 | 585 |
| all-skills/nextstep/advanced/business | 5 | 503 |
| all-skills/order/beginner/business | 14 | 48 |
| all-skills/order/intermediate/business | 9 | 82 |
| all-skills/order/advanced/business | 3 | 47 |
| all-skills/find/beginner/business | 12 | 85 |
| all-skills/find/intermediate/business | 10 | 49 |
| all-skills/find/advanced/business | 3 | 38 |
| all-skills/decision/beginner/construction | 18 | 358 |
| all-skills/decision/intermediate/construction | 20 | 599 |
| all-skills/decision/advanced/construction | 18 | 532 |
| all-skills/nextstep/beginner/construction | 3 | 327 |
| all-skills/nextstep/intermediate/construction | 21 | 585 |
| all-skills/nextstep/advanced/construction | 5 | 503 |
| all-skills/order/beginner/construction | 14 | 48 |
| all-skills/order/intermediate/construction | 9 | 82 |
| all-skills/order/advanced/construction | 3 | 47 |
| all-skills/find/beginner/construction | 12 | 85 |
| all-skills/find/intermediate/construction | 10 | 49 |
| all-skills/find/advanced/construction | 3 | 38 |
| all-skills/decision/beginner/culinary | 17 | 357 |
| all-skills/decision/intermediate/culinary | 21 | 600 |
| all-skills/decision/advanced/culinary | 19 | 533 |
| all-skills/nextstep/beginner/culinary | 3 | 327 |
| all-skills/nextstep/intermediate/culinary | 21 | 585 |
| all-skills/nextstep/advanced/culinary | 5 | 503 |
| all-skills/order/beginner/culinary | 14 | 48 |
| all-skills/order/intermediate/culinary | 9 | 82 |
| all-skills/order/advanced/culinary | 3 | 47 |
| all-skills/find/beginner/culinary | 12 | 85 |
| all-skills/find/intermediate/culinary | 11 | 50 |
| all-skills/find/advanced/culinary | 3 | 38 |
| all-skills/decision/beginner/education | 16 | 356 |
| all-skills/decision/intermediate/education | 17 | 596 |
| all-skills/decision/advanced/education | 19 | 533 |
| all-skills/nextstep/beginner/education | 3 | 327 |
| all-skills/nextstep/intermediate/education | 21 | 585 |
| all-skills/nextstep/advanced/education | 5 | 503 |
| all-skills/order/beginner/education | 14 | 48 |
| all-skills/order/intermediate/education | 9 | 82 |
| all-skills/order/advanced/education | 3 | 47 |
| all-skills/find/beginner/education | 12 | 85 |
| all-skills/find/intermediate/education | 10 | 49 |
| all-skills/find/advanced/education | 3 | 38 |
| all-skills/decision/beginner/engineering | 18 | 358 |
| all-skills/decision/intermediate/engineering | 19 | 598 |
| all-skills/decision/advanced/engineering | 17 | 531 |
| all-skills/nextstep/beginner/engineering | 3 | 327 |
| all-skills/nextstep/intermediate/engineering | 21 | 585 |
| all-skills/nextstep/advanced/engineering | 5 | 503 |
| all-skills/order/beginner/engineering | 14 | 48 |
| all-skills/order/intermediate/engineering | 9 | 82 |
| all-skills/order/advanced/engineering | 3 | 47 |
| all-skills/find/beginner/engineering | 12 | 85 |
| all-skills/find/intermediate/engineering | 10 | 49 |
| all-skills/find/advanced/engineering | 3 | 38 |
| all-skills/decision/beginner/healthcare | 17 | 357 |
| all-skills/decision/intermediate/healthcare | 17 | 596 |
| all-skills/decision/advanced/healthcare | 19 | 533 |
| all-skills/nextstep/beginner/healthcare | 3 | 327 |
| all-skills/nextstep/intermediate/healthcare | 21 | 585 |
| all-skills/nextstep/advanced/healthcare | 5 | 503 |
| all-skills/order/beginner/healthcare | 14 | 48 |
| all-skills/order/intermediate/healthcare | 9 | 82 |
| all-skills/order/advanced/healthcare | 3 | 47 |
| all-skills/find/beginner/healthcare | 12 | 85 |
| all-skills/find/intermediate/healthcare | 10 | 49 |
| all-skills/find/advanced/healthcare | 3 | 38 |
| all-skills/decision/beginner/hospitality | 16 | 356 |
| all-skills/decision/intermediate/hospitality | 20 | 599 |
| all-skills/decision/advanced/hospitality | 19 | 533 |
| all-skills/nextstep/beginner/hospitality | 3 | 327 |
| all-skills/nextstep/intermediate/hospitality | 21 | 585 |
| all-skills/nextstep/advanced/hospitality | 5 | 503 |
| all-skills/order/beginner/hospitality | 14 | 48 |
| all-skills/order/intermediate/hospitality | 9 | 82 |
| all-skills/order/advanced/hospitality | 3 | 47 |
| all-skills/find/beginner/hospitality | 12 | 85 |
| all-skills/find/intermediate/hospitality | 10 | 49 |
| all-skills/find/advanced/hospitality | 3 | 38 |
| all-skills/decision/beginner/it | 17 | 357 |
| all-skills/decision/intermediate/it | 18 | 597 |
| all-skills/decision/advanced/it | 18 | 532 |
| all-skills/nextstep/beginner/it | 3 | 327 |
| all-skills/nextstep/intermediate/it | 21 | 585 |
| all-skills/nextstep/advanced/it | 5 | 503 |
| all-skills/order/beginner/it | 14 | 48 |
| all-skills/order/intermediate/it | 9 | 82 |
| all-skills/order/advanced/it | 3 | 47 |
| all-skills/find/beginner/it | 12 | 85 |
| all-skills/find/intermediate/it | 10 | 49 |
| all-skills/find/advanced/it | 3 | 38 |
| all-skills/decision/beginner/manufacturing | 18 | 358 |
| all-skills/decision/intermediate/manufacturing | 20 | 599 |
| all-skills/decision/advanced/manufacturing | 18 | 532 |
| all-skills/nextstep/beginner/manufacturing | 3 | 327 |
| all-skills/nextstep/intermediate/manufacturing | 21 | 585 |
| all-skills/nextstep/advanced/manufacturing | 5 | 503 |
| all-skills/order/beginner/manufacturing | 14 | 48 |
| all-skills/order/intermediate/manufacturing | 9 | 82 |
| all-skills/order/advanced/manufacturing | 3 | 47 |
| all-skills/find/beginner/manufacturing | 12 | 85 |
| all-skills/find/intermediate/manufacturing | 11 | 50 |
| all-skills/find/advanced/manufacturing | 3 | 38 |
| all-skills/decision/beginner/media | 16 | 356 |
| all-skills/decision/intermediate/media | 19 | 598 |
| all-skills/decision/advanced/media | 17 | 531 |
| all-skills/nextstep/beginner/media | 3 | 327 |
| all-skills/nextstep/intermediate/media | 21 | 585 |
| all-skills/nextstep/advanced/media | 5 | 503 |
| all-skills/order/beginner/media | 14 | 48 |
| all-skills/order/intermediate/media | 9 | 82 |
| all-skills/order/advanced/media | 3 | 47 |
| all-skills/find/beginner/media | 12 | 85 |
| all-skills/find/intermediate/media | 10 | 49 |
| all-skills/find/advanced/media | 3 | 38 |
| all-skills/decision/beginner/retail | 16 | 356 |
| all-skills/decision/intermediate/retail | 21 | 600 |
| all-skills/decision/advanced/retail | 19 | 533 |
| all-skills/nextstep/beginner/retail | 3 | 327 |
| all-skills/nextstep/intermediate/retail | 21 | 585 |
| all-skills/nextstep/advanced/retail | 5 | 503 |
| all-skills/order/beginner/retail | 14 | 48 |
| all-skills/order/intermediate/retail | 9 | 82 |
| all-skills/order/advanced/retail | 3 | 47 |
| all-skills/find/beginner/retail | 12 | 85 |
| all-skills/find/intermediate/retail | 11 | 50 |
| all-skills/find/advanced/retail | 3 | 38 |
| creativity-and-innovation/mixed/beginner/any-setting | 2 | 23 |
| creativity-and-innovation/decision/beginner/any-setting | 1 | 16 |
| creativity-and-innovation/nextstep/beginner/any-setting | 0 | 15 |
| creativity-and-innovation/order/beginner/any-setting | 1 | 3 |
| creativity-and-innovation/find/beginner/any-setting | 0 | 4 |
| creativity-and-innovation/mixed/intermediate/any-setting | 2 | 34 |
| creativity-and-innovation/decision/intermediate/any-setting | 0 | 25 |
| creativity-and-innovation/nextstep/intermediate/any-setting | 1 | 26 |
| creativity-and-innovation/order/intermediate/any-setting | 0 | 5 |
| creativity-and-innovation/find/intermediate/any-setting | 1 | 3 |
| creativity-and-innovation/mixed/advanced/any-setting | 1 | 26 |
| creativity-and-innovation/decision/advanced/any-setting | 1 | 20 |
| creativity-and-innovation/nextstep/advanced/any-setting | 0 | 19 |
| creativity-and-innovation/order/advanced/any-setting | 0 | 4 |
| creativity-and-innovation/find/advanced/any-setting | 0 | 2 |
| critical-thinking-and-problem-solving/mixed/beginner/any-setting | 1 | 23 |
| critical-thinking-and-problem-solving/decision/beginner/any-setting | 0 | 16 |
| critical-thinking-and-problem-solving/nextstep/beginner/any-setting | 0 | 16 |
| critical-thinking-and-problem-solving/order/beginner/any-setting | 1 | 3 |
| critical-thinking-and-problem-solving/find/beginner/any-setting | 0 | 4 |
| critical-thinking-and-problem-solving/mixed/intermediate/any-setting | 3 | 41 |
| critical-thinking-and-problem-solving/decision/intermediate/any-setting | 1 | 31 |
| critical-thinking-and-problem-solving/nextstep/intermediate/any-setting | 1 | 31 |
| critical-thinking-and-problem-solving/order/intermediate/any-setting | 0 | 5 |
| critical-thinking-and-problem-solving/find/intermediate/any-setting | 1 | 4 |
| critical-thinking-and-problem-solving/mixed/advanced/any-setting | 1 | 28 |
| critical-thinking-and-problem-solving/decision/advanced/any-setting | 1 | 24 |
| critical-thinking-and-problem-solving/nextstep/advanced/any-setting | 0 | 23 |
| critical-thinking-and-problem-solving/order/advanced/any-setting | 0 | 2 |
| critical-thinking-and-problem-solving/find/advanced/any-setting | 0 | 2 |
| initiative-and-self-direction/mixed/beginner/any-setting | 2 | 24 |
| initiative-and-self-direction/decision/beginner/any-setting | 1 | 16 |
| initiative-and-self-direction/nextstep/beginner/any-setting | 0 | 15 |
| initiative-and-self-direction/order/beginner/any-setting | 1 | 5 |
| initiative-and-self-direction/find/beginner/any-setting | 0 | 3 |
| initiative-and-self-direction/mixed/intermediate/any-setting | 2 | 40 |
| initiative-and-self-direction/decision/intermediate/any-setting | 0 | 31 |
| initiative-and-self-direction/nextstep/intermediate/any-setting | 1 | 32 |
| initiative-and-self-direction/order/intermediate/any-setting | 0 | 5 |
| initiative-and-self-direction/find/intermediate/any-setting | 1 | 3 |
| initiative-and-self-direction/mixed/advanced/any-setting | 1 | 36 |
| initiative-and-self-direction/decision/advanced/any-setting | 1 | 32 |
| initiative-and-self-direction/nextstep/advanced/any-setting | 0 | 31 |
| initiative-and-self-direction/order/advanced/any-setting | 0 | 2 |
| initiative-and-self-direction/find/advanced/any-setting | 0 | 2 |
| integrity/mixed/beginner/any-setting | 1 | 25 |
| integrity/decision/beginner/any-setting | 1 | 18 |
| integrity/nextstep/beginner/any-setting | 0 | 17 |
| integrity/order/beginner/any-setting | 0 | 3 |
| integrity/find/beginner/any-setting | 0 | 4 |
| integrity/mixed/intermediate/any-setting | 4 | 34 |
| integrity/decision/intermediate/any-setting | 1 | 23 |
| integrity/nextstep/intermediate/any-setting | 1 | 23 |
| integrity/order/intermediate/any-setting | 1 | 7 |
| integrity/find/intermediate/any-setting | 1 | 3 |
| integrity/mixed/advanced/any-setting | 1 | 25 |
| integrity/decision/advanced/any-setting | 1 | 19 |
| integrity/nextstep/advanced/any-setting | 0 | 18 |
| integrity/order/advanced/any-setting | 0 | 4 |
| integrity/find/advanced/any-setting | 0 | 2 |
| work-ethic/mixed/beginner/any-setting | 3 | 23 |
| work-ethic/decision/beginner/any-setting | 1 | 15 |
| work-ethic/nextstep/beginner/any-setting | 0 | 14 |
| work-ethic/order/beginner/any-setting | 1 | 3 |
| work-ethic/find/beginner/any-setting | 1 | 5 |
| work-ethic/mixed/intermediate/any-setting | 1 | 31 |
| work-ethic/decision/intermediate/any-setting | 0 | 23 |
| work-ethic/nextstep/intermediate/any-setting | 1 | 24 |
| work-ethic/order/intermediate/any-setting | 0 | 5 |
| work-ethic/find/intermediate/any-setting | 0 | 2 |
| work-ethic/mixed/advanced/any-setting | 1 | 25 |
| work-ethic/decision/advanced/any-setting | 1 | 19 |
| work-ethic/nextstep/advanced/any-setting | 0 | 18 |
| work-ethic/order/advanced/any-setting | 0 | 4 |
| work-ethic/find/advanced/any-setting | 0 | 2 |
| conflict-resolution/mixed/beginner/any-setting | 1 | 20 |
| conflict-resolution/decision/beginner/any-setting | 0 | 13 |
| conflict-resolution/nextstep/beginner/any-setting | 0 | 13 |
| conflict-resolution/order/beginner/any-setting | 0 | 2 |
| conflict-resolution/find/beginner/any-setting | 1 | 5 |
| conflict-resolution/mixed/intermediate/any-setting | 3 | 34 |
| conflict-resolution/decision/intermediate/any-setting | 2 | 27 |
| conflict-resolution/nextstep/intermediate/any-setting | 0 | 25 |
| conflict-resolution/order/intermediate/any-setting | 1 | 5 |
| conflict-resolution/find/intermediate/any-setting | 0 | 2 |
| conflict-resolution/mixed/advanced/any-setting | 1 | 20 |
| conflict-resolution/decision/advanced/any-setting | 0 | 15 |
| conflict-resolution/nextstep/advanced/any-setting | 1 | 16 |
| conflict-resolution/order/advanced/any-setting | 0 | 2 |
| conflict-resolution/find/advanced/any-setting | 0 | 2 |
| listening-and-speaking/mixed/beginner/any-setting | 2 | 20 |
| listening-and-speaking/decision/beginner/any-setting | 1 | 16 |
| listening-and-speaking/nextstep/beginner/any-setting | 0 | 15 |
| listening-and-speaking/order/beginner/any-setting | 0 | 1 |
| listening-and-speaking/find/beginner/any-setting | 1 | 3 |
| listening-and-speaking/mixed/intermediate/any-setting | 3 | 39 |
| listening-and-speaking/decision/intermediate/any-setting | 1 | 34 |
| listening-and-speaking/nextstep/intermediate/any-setting | 1 | 34 |
| listening-and-speaking/order/intermediate/any-setting | 1 | 3 |
| listening-and-speaking/find/intermediate/any-setting | 0 | 1 |
| listening-and-speaking/mixed/advanced/any-setting | 1 | 37 |
| listening-and-speaking/decision/advanced/any-setting | 1 | 35 |
| listening-and-speaking/nextstep/advanced/any-setting | 0 | 34 |
| listening-and-speaking/order/advanced/any-setting | 0 | 1 |
| listening-and-speaking/find/advanced/any-setting | 0 | 1 |
| respect-for-diversity/mixed/beginner/any-setting | 3 | 20 |
| respect-for-diversity/decision/beginner/any-setting | 1 | 14 |
| respect-for-diversity/nextstep/beginner/any-setting | 0 | 13 |
| respect-for-diversity/order/beginner/any-setting | 1 | 2 |
| respect-for-diversity/find/beginner/any-setting | 1 | 4 |
| respect-for-diversity/mixed/intermediate/any-setting | 2 | 28 |
| respect-for-diversity/decision/intermediate/any-setting | 1 | 24 |
| respect-for-diversity/nextstep/intermediate/any-setting | 1 | 24 |
| respect-for-diversity/order/intermediate/any-setting | 0 | 2 |
| respect-for-diversity/find/intermediate/any-setting | 0 | 1 |
| respect-for-diversity/mixed/advanced/any-setting | 1 | 22 |
| respect-for-diversity/decision/advanced/any-setting | 1 | 20 |
| respect-for-diversity/nextstep/advanced/any-setting | 0 | 19 |
| respect-for-diversity/order/advanced/any-setting | 0 | 1 |
| respect-for-diversity/find/advanced/any-setting | 0 | 1 |
| customer-service-orientation/mixed/beginner/any-setting | 4 | 23 |
| customer-service-orientation/decision/beginner/any-setting | 1 | 16 |
| customer-service-orientation/nextstep/beginner/any-setting | 1 | 16 |
| customer-service-orientation/order/beginner/any-setting | 1 | 2 |
| customer-service-orientation/find/beginner/any-setting | 1 | 4 |
| customer-service-orientation/mixed/intermediate/any-setting | 2 | 36 |
| customer-service-orientation/decision/intermediate/any-setting | 1 | 31 |
| customer-service-orientation/nextstep/intermediate/any-setting | 1 | 31 |
| customer-service-orientation/order/intermediate/any-setting | 0 | 3 |
| customer-service-orientation/find/intermediate/any-setting | 0 | 1 |
| customer-service-orientation/mixed/advanced/any-setting | 1 | 28 |
| customer-service-orientation/decision/advanced/any-setting | 1 | 25 |
| customer-service-orientation/nextstep/advanced/any-setting | 0 | 24 |
| customer-service-orientation/order/advanced/any-setting | 0 | 2 |
| customer-service-orientation/find/advanced/any-setting | 0 | 1 |
| teamwork/mixed/beginner/any-setting | 3 | 21 |
| teamwork/decision/beginner/any-setting | 1 | 15 |
| teamwork/nextstep/beginner/any-setting | 0 | 14 |
| teamwork/order/beginner/any-setting | 1 | 3 |
| teamwork/find/beginner/any-setting | 1 | 3 |
| teamwork/mixed/intermediate/any-setting | 1 | 38 |
| teamwork/decision/intermediate/any-setting | 0 | 32 |
| teamwork/nextstep/intermediate/any-setting | 1 | 33 |
| teamwork/order/intermediate/any-setting | 0 | 4 |
| teamwork/find/intermediate/any-setting | 0 | 1 |
| teamwork/mixed/advanced/any-setting | 1 | 37 |
| teamwork/decision/advanced/any-setting | 1 | 34 |
| teamwork/nextstep/advanced/any-setting | 0 | 33 |
| teamwork/order/advanced/any-setting | 0 | 2 |
| teamwork/find/advanced/any-setting | 0 | 1 |
| big-picture-thinking/mixed/beginner/any-setting | 1 | 26 |
| big-picture-thinking/decision/beginner/any-setting | 1 | 20 |
| big-picture-thinking/nextstep/beginner/any-setting | 0 | 19 |
| big-picture-thinking/order/beginner/any-setting | 0 | 3 |
| big-picture-thinking/find/beginner/any-setting | 0 | 3 |
| big-picture-thinking/mixed/intermediate/any-setting | 4 | 35 |
| big-picture-thinking/decision/intermediate/any-setting | 1 | 26 |
| big-picture-thinking/nextstep/intermediate/any-setting | 1 | 26 |
| big-picture-thinking/order/intermediate/any-setting | 1 | 5 |
| big-picture-thinking/find/intermediate/any-setting | 1 | 3 |
| big-picture-thinking/mixed/advanced/any-setting | 1 | 24 |
| big-picture-thinking/decision/advanced/any-setting | 1 | 20 |
| big-picture-thinking/nextstep/advanced/any-setting | 0 | 19 |
| big-picture-thinking/order/advanced/any-setting | 0 | 2 |
| big-picture-thinking/find/advanced/any-setting | 0 | 2 |
| career-and-life-management/mixed/beginner/any-setting | 2 | 22 |
| career-and-life-management/decision/beginner/any-setting | 1 | 18 |
| career-and-life-management/nextstep/beginner/any-setting | 0 | 17 |
| career-and-life-management/order/beginner/any-setting | 1 | 2 |
| career-and-life-management/find/beginner/any-setting | 0 | 2 |
| career-and-life-management/mixed/intermediate/any-setting | 3 | 41 |
| career-and-life-management/decision/intermediate/any-setting | 1 | 36 |
| career-and-life-management/nextstep/intermediate/any-setting | 1 | 36 |
| career-and-life-management/order/intermediate/any-setting | 0 | 2 |
| career-and-life-management/find/intermediate/any-setting | 1 | 2 |
| career-and-life-management/mixed/advanced/any-setting | 4 | 41 |
| career-and-life-management/decision/advanced/any-setting | 1 | 35 |
| career-and-life-management/nextstep/advanced/any-setting | 1 | 35 |
| career-and-life-management/order/advanced/any-setting | 1 | 3 |
| career-and-life-management/find/advanced/any-setting | 1 | 2 |
| continuous-learning-and-adaptability/mixed/beginner/any-setting | 3 | 20 |
| continuous-learning-and-adaptability/decision/beginner/any-setting | 1 | 15 |
| continuous-learning-and-adaptability/nextstep/beginner/any-setting | 0 | 14 |
| continuous-learning-and-adaptability/order/beginner/any-setting | 1 | 2 |
| continuous-learning-and-adaptability/find/beginner/any-setting | 1 | 3 |
| continuous-learning-and-adaptability/mixed/intermediate/any-setting | 1 | 32 |
| continuous-learning-and-adaptability/decision/intermediate/any-setting | 0 | 28 |
| continuous-learning-and-adaptability/nextstep/intermediate/any-setting | 1 | 29 |
| continuous-learning-and-adaptability/order/intermediate/any-setting | 0 | 2 |
| continuous-learning-and-adaptability/find/intermediate/any-setting | 0 | 1 |
| continuous-learning-and-adaptability/mixed/advanced/any-setting | 1 | 26 |
| continuous-learning-and-adaptability/decision/advanced/any-setting | 1 | 24 |
| continuous-learning-and-adaptability/nextstep/advanced/any-setting | 0 | 23 |
| continuous-learning-and-adaptability/order/advanced/any-setting | 0 | 1 |
| continuous-learning-and-adaptability/find/advanced/any-setting | 0 | 1 |
| efficiency-and-productivity/mixed/beginner/any-setting | 3 | 20 |
| efficiency-and-productivity/decision/beginner/any-setting | 1 | 14 |
| efficiency-and-productivity/nextstep/beginner/any-setting | 1 | 14 |
| efficiency-and-productivity/order/beginner/any-setting | 1 | 2 |
| efficiency-and-productivity/find/beginner/any-setting | 0 | 3 |
| efficiency-and-productivity/mixed/intermediate/any-setting | 3 | 36 |
| efficiency-and-productivity/decision/intermediate/any-setting | 1 | 30 |
| efficiency-and-productivity/nextstep/intermediate/any-setting | 1 | 30 |
| efficiency-and-productivity/order/intermediate/any-setting | 0 | 3 |
| efficiency-and-productivity/find/intermediate/any-setting | 1 | 2 |
| efficiency-and-productivity/mixed/advanced/any-setting | 1 | 35 |
| efficiency-and-productivity/decision/advanced/any-setting | 1 | 31 |
| efficiency-and-productivity/nextstep/advanced/any-setting | 0 | 30 |
| efficiency-and-productivity/order/advanced/any-setting | 0 | 3 |
| efficiency-and-productivity/find/advanced/any-setting | 0 | 1 |
| information-literacy/mixed/beginner/any-setting | 2 | 28 |
| information-literacy/decision/beginner/any-setting | 0 | 21 |
| information-literacy/nextstep/beginner/any-setting | 0 | 21 |
| information-literacy/order/beginner/any-setting | 1 | 2 |
| information-literacy/find/beginner/any-setting | 1 | 5 |
| information-literacy/mixed/intermediate/any-setting | 2 | 31 |
| information-literacy/decision/intermediate/any-setting | 1 | 25 |
| information-literacy/nextstep/intermediate/any-setting | 1 | 25 |
| information-literacy/order/intermediate/any-setting | 0 | 3 |
| information-literacy/find/intermediate/any-setting | 0 | 2 |
| information-literacy/mixed/advanced/any-setting | 1 | 21 |
| information-literacy/decision/advanced/any-setting | 1 | 18 |
| information-literacy/nextstep/advanced/any-setting | 0 | 17 |
| information-literacy/order/advanced/any-setting | 0 | 1 |
| information-literacy/find/advanced/any-setting | 0 | 2 |
| information-security/mixed/beginner/any-setting | 2 | 25 |
| information-security/decision/beginner/any-setting | 1 | 19 |
| information-security/nextstep/beginner/any-setting | 0 | 18 |
| information-security/order/beginner/any-setting | 0 | 2 |
| information-security/find/beginner/any-setting | 1 | 4 |
| information-security/mixed/intermediate/any-setting | 4 | 36 |
| information-security/decision/intermediate/any-setting | 1 | 26 |
| information-security/nextstep/intermediate/any-setting | 1 | 26 |
| information-security/order/intermediate/any-setting | 1 | 6 |
| information-security/find/intermediate/any-setting | 1 | 3 |
| information-security/mixed/advanced/any-setting | 1 | 27 |
| information-security/decision/advanced/any-setting | 0 | 22 |
| information-security/nextstep/advanced/any-setting | 1 | 23 |
| information-security/order/advanced/any-setting | 0 | 2 |
| information-security/find/advanced/any-setting | 0 | 2 |
| information-technology/mixed/beginner/any-setting | 3 | 20 |
| information-technology/decision/beginner/any-setting | 1 | 16 |
| information-technology/nextstep/beginner/any-setting | 0 | 15 |
| information-technology/order/beginner/any-setting | 1 | 1 |
| information-technology/find/beginner/any-setting | 1 | 3 |
| information-technology/mixed/intermediate/any-setting | 2 | 31 |
| information-technology/decision/intermediate/any-setting | 1 | 28 |
| information-technology/nextstep/intermediate/any-setting | 1 | 28 |
| information-technology/order/intermediate/any-setting | 0 | 1 |
| information-technology/find/intermediate/any-setting | 0 | 1 |
| information-technology/mixed/advanced/any-setting | 1 | 23 |
| information-technology/decision/advanced/any-setting | 1 | 21 |
| information-technology/nextstep/advanced/any-setting | 0 | 20 |
| information-technology/order/advanced/any-setting | 0 | 1 |
| information-technology/find/advanced/any-setting | 0 | 1 |
| job-specific-tools-and-technologies/mixed/beginner/any-setting | 2 | 21 |
| job-specific-tools-and-technologies/decision/beginner/any-setting | 1 | 16 |
| job-specific-tools-and-technologies/nextstep/beginner/any-setting | 0 | 15 |
| job-specific-tools-and-technologies/order/beginner/any-setting | 0 | 0 |
| job-specific-tools-and-technologies/find/beginner/any-setting | 1 | 5 |
| job-specific-tools-and-technologies/mixed/intermediate/any-setting | 3 | 28 |
| job-specific-tools-and-technologies/decision/intermediate/any-setting | 1 | 23 |
| job-specific-tools-and-technologies/nextstep/intermediate/any-setting | 1 | 23 |
| job-specific-tools-and-technologies/order/intermediate/any-setting | 1 | 3 |
| job-specific-tools-and-technologies/find/intermediate/any-setting | 0 | 1 |
| job-specific-tools-and-technologies/mixed/advanced/any-setting | 1 | 30 |
| job-specific-tools-and-technologies/decision/advanced/any-setting | 1 | 28 |
| job-specific-tools-and-technologies/nextstep/advanced/any-setting | 0 | 27 |
| job-specific-tools-and-technologies/order/advanced/any-setting | 0 | 1 |
| job-specific-tools-and-technologies/find/advanced/any-setting | 0 | 1 |
| mathematics/mixed/beginner/any-setting | 1 | 20 |
| mathematics/decision/beginner/any-setting | 0 | 16 |
| mathematics/nextstep/beginner/any-setting | 0 | 0 |
| mathematics/order/beginner/any-setting | 1 | 1 |
| mathematics/find/beginner/any-setting | 0 | 3 |
| mathematics/mixed/intermediate/any-setting | 5 | 23 |
| mathematics/decision/intermediate/any-setting | 3 | 18 |
| mathematics/nextstep/intermediate/any-setting | 1 | 1 |
| mathematics/order/intermediate/any-setting | 0 | 0 |
| mathematics/find/intermediate/any-setting | 1 | 4 |
| mathematics/mixed/advanced/any-setting | 4 | 23 |
| mathematics/decision/advanced/any-setting | 1 | 17 |
| mathematics/nextstep/advanced/any-setting | 1 | 1 |
| mathematics/order/advanced/any-setting | 1 | 1 |
| mathematics/find/advanced/any-setting | 1 | 4 |
| professionalism/mixed/beginner/any-setting | 1 | 20 |
| professionalism/decision/beginner/any-setting | 1 | 16 |
| professionalism/nextstep/beginner/any-setting | 0 | 15 |
| professionalism/order/beginner/any-setting | 0 | 0 |
| professionalism/find/beginner/any-setting | 0 | 4 |
| professionalism/mixed/intermediate/any-setting | 4 | 26 |
| professionalism/decision/intermediate/any-setting | 1 | 20 |
| professionalism/nextstep/intermediate/any-setting | 1 | 20 |
| professionalism/order/intermediate/any-setting | 1 | 3 |
| professionalism/find/intermediate/any-setting | 1 | 2 |
| professionalism/mixed/advanced/any-setting | 1 | 23 |
| professionalism/decision/advanced/any-setting | 1 | 21 |
| professionalism/nextstep/advanced/any-setting | 0 | 20 |
| professionalism/order/advanced/any-setting | 0 | 1 |
| professionalism/find/advanced/any-setting | 0 | 1 |
| reading-and-writing/mixed/beginner/any-setting | 3 | 20 |
| reading-and-writing/decision/beginner/any-setting | 1 | 14 |
| reading-and-writing/nextstep/beginner/any-setting | 0 | 13 |
| reading-and-writing/order/beginner/any-setting | 1 | 1 |
| reading-and-writing/find/beginner/any-setting | 1 | 5 |
| reading-and-writing/mixed/intermediate/any-setting | 2 | 24 |
| reading-and-writing/decision/intermediate/any-setting | 1 | 21 |
| reading-and-writing/nextstep/intermediate/any-setting | 1 | 21 |
| reading-and-writing/order/intermediate/any-setting | 0 | 0 |
| reading-and-writing/find/intermediate/any-setting | 0 | 2 |
| reading-and-writing/mixed/advanced/any-setting | 4 | 24 |
| reading-and-writing/decision/advanced/any-setting | 1 | 19 |
| reading-and-writing/nextstep/advanced/any-setting | 1 | 19 |
| reading-and-writing/order/advanced/any-setting | 1 | 1 |
| reading-and-writing/find/advanced/any-setting | 1 | 3 |
| workplace-safety/mixed/beginner/any-setting | 2 | 30 |
| workplace-safety/decision/beginner/any-setting | 1 | 18 |
| workplace-safety/nextstep/beginner/any-setting | 1 | 18 |
| workplace-safety/order/beginner/any-setting | 0 | 5 |
| workplace-safety/find/beginner/any-setting | 0 | 6 |
| workplace-safety/mixed/intermediate/any-setting | 6 | 55 |
| workplace-safety/decision/intermediate/any-setting | 2 | 38 |
| workplace-safety/nextstep/intermediate/any-setting | 1 | 37 |
| workplace-safety/order/intermediate/any-setting | 2 | 10 |
| workplace-safety/find/intermediate/any-setting | 1 | 6 |
| workplace-safety/mixed/advanced/any-setting | 1 | 43 |
| workplace-safety/decision/advanced/any-setting | 1 | 35 |
| workplace-safety/nextstep/advanced/any-setting | 0 | 34 |
| workplace-safety/order/advanced/any-setting | 0 | 6 |
| workplace-safety/find/advanced/any-setting | 0 | 2 |

</details>

## Distractors

In 3,000 sampled composed choice challenges, every non-best option carried a misconception (8301 of 8301). Sources: proceed 911, acceptable (real but lower-priority issue) 1986, sc 1584, plan 1862, generic 907, redo 693, over 115, b 8, c 11, w3 70, w1 70, w2 70, d 6, a 8. (`sc` = issue-specific shortcut; `plan` = plan options; `redo` = repeating a step the scenario says is already done; `over` = over-caution in a satisfied state; `w1`–`w3`, `a`–`d` = numeric misconception options.)

## Difficulty

Mean decision-relevant facts per state configuration: beginner 1 (active priorities 0.71); intermediate 2 (active priorities 1.65); advanced 3 (active priorities 2.68). Ordering steps: beginner 3, intermediate 4, advanced 5 (maximum valid orders beginner 1, intermediate 6, advanced 8).

## Performance

Catalog build at page load: 102 ms (Node, this machine). Mean generation + validation per challenge: 0.5 ms. Compose bundle: 475 KB uncompressed. Chromebook timings were not measured.
