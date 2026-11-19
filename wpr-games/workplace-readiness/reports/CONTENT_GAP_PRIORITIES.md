# Content gaps and priorities (verified against the generator on `main` 50af5b2)

Method: `node tools/content-coverage-matrix.js` counts, for each of the 94 objectives, the distinct decisions that are *primary* to it (a kit's first-listed concept; the first concept of an authored template). One kit yields about 9 keys: its issues, its find-the-problem defects, and one ordering problem. Renamed settings, people and numbers never add a key. Tagged counts (secondary concepts) are in the matrix for context only. Files: `CONTENT_COVERAGE_MATRIX.csv/.json`, before state `CONTENT_COVERAGE_MATRIX_BEFORE.json`.

## Done in this package
15 objectives moved from 0 or 1 primary decisions to 8 to 10 (objectives under 4 keys: 47 to 32): laws-and-regulations, emerging-technology, ethical-technology-use, information-formats, acceptable-use, hardware-and-devices, judge-relevance, capital-resources, natural-resources, community-and-industry, value-of-creativity, personality-and-culture, accepting-consequences, importance-of-integrity, evaluate-solutions.

## Remaining thin objectives (fewest primary decisions first)
1. `listening-and-speaking:nonverbal-cues`: 1 primary key(s), 8 tagged (names a performed behaviour; scenarios test knowledge of the expectation, not the behaviour)
2. `customer-service-orientation:anticipate-needs`: 1 primary key(s), 8 tagged
3. `creativity-and-innovation:allocate-resources`: 1 primary key(s), 11 tagged
4. `respect-for-diversity:valuing-differences`: 1 primary key(s), 11 tagged
5. `continuous-learning-and-adaptability:credentials`: 1 primary key(s), 11 tagged
6. `reading-and-writing:tone-and-audience`: 1 primary key(s), 11 tagged
7. `initiative-and-self-direction:apply-solutions`: 1 primary key(s), 13 tagged
8. `efficiency-and-productivity:adapt-goals`: 1 primary key(s), 13 tagged
9. `workplace-safety:universal-precautions`: 1 primary key(s), 13 tagged
10. `career-and-life-management:smart-goals`: 1 primary key(s), 14 tagged
11. `critical-thinking-and-problem-solving:logical-decisions`: 1 primary key(s), 15 tagged
12. `integrity:respect-for-property`: 1 primary key(s), 17 tagged
13. `respect-for-diversity:own-bias`: 1 primary key(s), 17 tagged
14. `teamwork:team-communication`: 1 primary key(s), 17 tagged
15. `teamwork:respect-contributions`: 1 primary key(s), 19 tagged
16. `big-picture-thinking:organization-structure`: 1 primary key(s), 19 tagged
17. `conflict-resolution:work-style-differences`: 1 primary key(s), 20 tagged
18. `critical-thinking-and-problem-solving:implement-action`: 1 primary key(s), 21 tagged
19. `conflict-resolution:when-to-escalate`: 1 primary key(s), 23 tagged
20. `information-literacy:locate-sources`: 1 primary key(s), 25 tagged
21. `listening-and-speaking:audience-and-setting`: 2 primary key(s), 12 tagged
22. `reading-and-writing:conventions`: 2 primary key(s), 12 tagged
23. `initiative-and-self-direction:identify-needs`: 2 primary key(s), 14 tagged
24. `workplace-safety:emergency-protocols`: 2 primary key(s), 14 tagged
25. `career-and-life-management:benefits-and-resources`: 2 primary key(s), 17 tagged
26. `continuous-learning-and-adaptability:learning-resources`: 2 primary key(s), 17 tagged
27. `respect-for-diversity:collaborating`: 3 primary key(s), 13 tagged
28. `efficiency-and-productivity:prioritize-tasks`: 3 primary key(s), 17 tagged
29. `mathematics:personal-finance`: 3 primary key(s), 20 tagged
30. `big-picture-thinking:role-in-mission`: 3 primary key(s), 21 tagged
31. `work-ethic:accountability`: 3 primary key(s), 23 tagged
32. `information-security:security-procedures`: 3 primary key(s), 37 tagged

## Not measurable here
- Whether each keyed answer is the best a competent professional would choose. No educator or independent reviewer was used.
- Safety-sensitive objectives (universal-precautions, emergency-protocols, safety-data-sheets) were not authored without subject-matter review.
- "Primary" is strict: objectives that are secondary in many kits can look thin yet have tagged coverage.
- Objectives whose title names a performed behaviour (presenting, nonverbal cues, appearance, punctuality) cannot be assessed by scenario choice alone and remain teacher-assessed.
