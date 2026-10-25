# AP CSP Vocabulary Fill-in Lab · G-112

One contextual blank, four plausible terms, one scored selection, immediate explanation and Next Question. No required typing, drag/drop or difficulty levels. Mixed default; all five Big Ideas and16 narrower topics remain freely available.

## Audit and curriculum

Reviewed Code Concepts (annotated code-selection/role engine), Create Task Lab, Algorithm Architect, Packet Router/Network Breaker and Mixed AP Practice, data encoding/decision labs and Computing Impact Lab. Their code-region, construction, graph and scenario interactions remain intact. This standalone lab reinforces their terminology through contextual blanks rather than replacing their gameplay.

Primary curriculum: the official course page still links the Effective Fall2023 CED. The August2025 clarification changes introductory AP text and lists no forthcoming content corrections. Reviewed2026-10-25. `reports/CURRICULUM_MAP.md` documents107 terms (96 core concepts,11 supporting), all family objectives, requested classroom groups and official Big Idea crossovers. Core does not mean a guaranteed exam keyword. Supporting vocabulary uses related objectives rather than invented curriculum requirements.

Supplementary primary references cover TCP/DNS/UDP/HTTP roles and software/media reuse rights. Definitions, questions and explanations are original; no copied exam questions.

## Architecture

- `catalog.js`: source provenance, Big Ideas/topics, definitions, core/supporting classifications and official objective domains.
- `families.js`:150 authored instructional focuses,30 per Big Idea, four contextual cases each. Definitions, real applications, contrasts, code behavior, causes, roles and misconception checks.600 unique statements/code combinations. Related focuses intentionally share terms; not150 unrelated algorithms or unlimited independent stories.
- `engine.js`: validated instance composition, dynamic distractor subsets and unbiased shuffling, finite seeded sampling and explanatory assessment.
- `objectives.js`: source-reviewed objective index with concise original labels.
- `app.js`: filter controls, accessible blank and pseudocode, one-attempt scoring, paged/searchable independent reference and shared daily session adapter.
- `../session-groups.js`: derives Big Idea totals from disjoint topic metrics. `../summary.js` conditionally adds a By Big Idea section for tagged games. No session-schema changes, double scoring, or changes to prior game metrics. Existing VM test harnesses inject this new real module dependency.

Word banks always have four terms. One reviewed primary confusion is retained and the other two distractors are sampled from the remaining approved pool. These combinations do not count as extra instructional families. Feedback connects the authored distinction with the selected distractor’s definition. Nine conservative ambiguity-pair exclusions reject unsafe banks; context also explicitly distinguishes records/meaning and resources/abilities.

## Generator and fallback

One daily-session recent history spans all Big Idea and topic filters and reloads. Protect the last50 exact question IDs, then prefer families outside the previous3, then terms outside the previous3 when possible. Soft random balancing first selects an eligible Big Idea, then topic, term and family; it does not force an answer-position or topic cycle. Counts used for fairness restart on reload; repeat history persists.

Mixed has600 instances. Each Big Idea has120. Narrower topics contain16–64, which the UI discloses. Selected filters never silently broaden. Family cooldown relaxes when the exact-eligible pool has no fresh family. Only when all exact candidates in a small pool are exhausted are the oldest exact restrictions relaxed. A16-item topic cannot guarantee50 distinct recent questions; this limitation is explicit, not hidden behind nominal generator counts.

## Sessions and reference

Result records are created on selection, keeping unanswered correct-term metadata out of the displayed summary. Every result has stable Big Idea, topic, term, family, learning-objective and question IDs. First-try, topic, filter and Big Idea accuracy use the shared tracker. Daily local-date reset and shared active CSP time exclude hidden/idle time under existing conventions. Skips and reference/filter use do not add answer attempts. Future readiness skill metadata is prepared; no pathway implemented.

Reference browsing is independent of the question: no automatic correct-term search, selection or highlighting. Eight entries per page; optional search and Big Idea browsing; definition, example (including code where useful), common confusion, tier and objective. Classroom security groups can differ from the official objective domain, explicitly noted.

## Executed validation

```
npm run test:vocabulary --prefix csp-games
npm test --prefix csp-games
TZ=America/Los_Angeles node csp-games/vocabulary-fill-in-lab/ui-tests.mjs
node cs-games/catalog-tests.mjs
```

Generator/content checks:167,614 assertions,21,600 distractor response checks and nine deliberately invalid ambiguity fixtures. UI:679 assertions /412 scored rounds, including correct/incorrect locks, every filter, reference, grouped summary after the256-record retention limit, and daily reset. Automated checks support authored review; they do not certify every natural-language interpretation or replace teacher review.

18,000 core simulation rounds across three seeds and six Big Idea selections, plus6000 cross-filter/reload rounds and12,000 coverage rounds. See JSON for actual answer position, Big Idea, term/family coverage and narrow-filter fallback counts. All600 instances and107 terms reached. Local responsive Chrome checks320/390/768/1024/1280 found no horizontal overflow; answer controls at least115×62px (phone height64px). Real device/touch/screen-reader certification remains pending.

Final publication commit, CI/Pages status and live all-five-Big-Idea/browser/summary checks are recorded in tracker G-112 and Release History after deployment. Target: https://davisjm4.github.io/csp-games/vocabulary-fill-in-lab/
