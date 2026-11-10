# Targeted practice coverage

This release adds 27 original authored scenarios and preserves the 22 official skills, four practice modes, and existing compositional question families.
The diagnostic comparison informed content priorities. The Canvas report provided answer choices and item outcomes without question stems. It does not support item-level alignment claims.

| Topic | Subtopics | Distinct families | Smallest subtopic family count | Distinct configurations |
| --- | ---: | ---: | ---: | ---: |
| Workplace Attire & PPE | 3 | 11 | 3 | 11 |
| Workplace Relationships & Conflict | 3 | 13 | 4 | 81 |
| Professional Communication | 3 | 16 | 4 | 99 |
| Workplace Safety | 3 | 18 | 5 | 195 |
| Computer & Technology Skills | 6 | 28 | 3 | 173 |
| Professionalism & Work Ethic | 3 | 19 | 6 | 198 |
| Teamwork | 2 | 11 | 5 | 100 |
| Career & Life Management | 3 | 18 | 4 | 111 |
| Problem Solving & Innovation | 3 | 22 | 6 | 260 |
| Work Planning & Adaptability | 2 | 16 | 7 | 169 |
| Workplace Math | 1 | 15 | 15 | 66 |
| Workplace Information & Writing | 2 | 15 | 7 | 104 |
| Inclusive Workplaces | 1 | 8 | 8 | 70 |

Family counts reflect distinct decision patterns from the authored and compositional catalogs. Configurations count different decisive states, never names or workplace settings. Topics can overlap. Do not add the counts across rows.

Every published topic has at least six distinct families and each visible subtopic has at least three under mixed settings. The [machine-readable report](TOPIC_COVERAGE.json) enumerates every subtopic by difficulty and mode. The practice interface blocks targeted starts when an intersection has fewer than three families. Teacher diagnostics reject impossible quotas. Some deliberate limits:

- Spreadsheet tools and word processing have three distinct families each and are currently choice-based, with Beginner and Intermediate items. The tasks teach feature choice and consequences in context.
- Most new attire and PPE content is decision-based. Advanced ordering and document identification are limited in narrow attire selections.
- Formal networking, references, application documents and vendor-specific tools are still limited. The career topic includes interviewing, planning and development but does not represent every job-search task.
- Practice gives scenario-based explanations and transferable principles. The question bank uses original scenarios. It has no official exam questions or verified item equivalence.

Regenerate this report data with the WPR_COVERAGE_PATH environment variable in the online test command described in [the implementation report](IMPLEMENTATION.md).
