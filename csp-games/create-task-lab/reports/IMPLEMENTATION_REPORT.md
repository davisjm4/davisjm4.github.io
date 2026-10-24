# Create Performance Task Lab — implementation and verification

Date: October 24, 2026. Starting main: `3fbbc2e1dd24631d11bdefb76a15bf47c5c5e705`.

## A. Implementation

The lab implements What's Missing? (four diagnoses, including a correct-program control), Identify the Component (source selection), and Mixed (default). There is no difficulty selector or progression. One submission locks the score and shows concise conceptual feedback. Gold highlighting identifies a corrected instruction or a removed defective instruction. Identifiers, values, expressions, calls, headers, statements, bodies, and bounded multi-line blocks are selectable using source buttons or line-range brackets. No dragging, writing, or editor is required.

The annotated syntax tree defines executable behavior and exact source regions. Twenty original everyday scenarios cover greeting, discounts, qualifying-score counts, shopping totals, name search, repetition, counting to a limit, indexed access, adding/removing names, menu choice, ranges, Boolean negation, robot movement, copying items, averages, user input, button events, maximum score, and quiz answers. All use one short procedure, simple data, and at most a loop containing one conditional. They are examples of individual concepts, not claims of complete valid Create submissions.

Existing dark theme, CSP session tracker, two-minute idle cutoff, multi-tab active-time lease, daily local-date reset, and session summary are reused. Both CSP launch navigation and consolidated CS Games catalog include the lab. Performance stays in the browser.

## B. Actual instructional families

| Concept | What's Missing? | Identify the Component |
| --- | ---: | ---: |
| Procedures | 10 | 13 |
| Parameters and Arguments | 9 | 9 |
| Selection and Boolean Logic | 10 | 10 |
| Iteration | 9 | 10 |
| Lists and Data | 10 | 10 |
| Input and Output | 9 | 12 |
| Program Behavior and PPR | 6 | 4 |
| **Total** | **63** | **68** |

Total: **131**. Nine draft families that overlapped other reasoning patterns were explicitly excluded from counts and sampling. Distribution was adjusted from the planning table to give input/output its own substantial group. A family describes a distinct location/role, evidence obligation, or error mechanism; changing names, values, or wording never increments this count.

## C. Generation and diversity

- **389 distinct corpus instances**, from 393 candidate family/form combinations, with four exact duplicates removed.
- **171 distinct normalized program structures** in the corpus. This is separate from 131 instructional patterns; multiple questions can legitimately address different components of one simple structure.
- Each family has 2–3 distinct caller/data-flow configurations. Four mutations erase one otherwise distinct caller form.
- **15,720 generated checks**, across every family, all three forms, 20 seeds and both question phrasings.
- **7,200 balanced sampling rounds**, spanning Mixed and both modes, with every topic filter.
- **Zero exact question repeats in the previous 50 rounds** in those samples. Different concepts may reuse a program; narrow filters may repeat a family with a different instance.
- **16.7% valid controls** among sampled diagnosis rounds (one in six).
- **25,457 content assertions**, **32,226 baseline/displayed model executions**, and **62,238 counterfactual call comparisons** in the content validation pass. Sampled-round validation performs further checks, not included in the execution count above.

The corpus uses structural changes in how values enter a call, not just different literal values. Additional seeds provide bounded, repeatable data variations. The generator is extensible, but is not described as mathematically infinite.

## D. Instructional accuracy and source alignment

Research used current publicly linked College Board documents and 2026 written-response/scoring materials. Sources were accessed October 24, 2026. The current linked CED/student handouts retain their Fall 2023 effective date; that date is not presented as the access date.

| Source | Role |
| --- | --- |
| [College Board student handouts](https://apcentral.collegeboard.org/media/pdf/ap-csp-student-task-directions.pdf) | Full program and PPR submission requirements |
| [AP CSP Course and Exam Description](https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-and-exam-description.pdf) | Official concepts and exam conventions |
| [PPR tip sheet](https://apcentral.collegeboard.org/media/pdf/ap-csp-personalized-project-reference-tip-sheet.pdf) | PPR evidence and readability guidance |
| [2026 written-response prompts](https://apcentral.collegeboard.org/media/pdf/ap26-frq-computer-science-principles.pdf) | Current phrasing about iteration, calls and procedure/list evidence |
| [2026 scoring guidelines](https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam/past-exam-questions) | Official terminology and response-specific scoring distinctions |
| [CodeHS Create task guidance](https://help.codehs.com/en/articles/661536-ap-csp-performance-task) and [Sample A tutorial](https://codehs.com/tutorial/david/sample-a-csp-performance-task) | Common student structures and misconceptions; no substantial code copied |

BJC was investigated through its public course index, but the specific current Create pages could not be retrieved; no correctness claim relies on inaccessible BJC content. Third-party scoring commentary is not treated as an authority over College Board.

The lab distinguishes full-program requirements from PPR boxes. The full program needs input/output, a complexity-managing collection, a student-developed procedure with parameter(s), calls, and sequencing/selection/iteration in the selected procedure algorithm. PPR evidence shows the selected procedure using a functionality-affecting parameter, its call, list storage, and use of the same list to manage complexity. It does not have separate input/output boxes. Individual scoring rows can have their own criteria; the lab does not promise points or infer complete task validity from a short fragment.

Questions and feedback distinguish parameter/argument, definition/call, Boolean expression/conditional statement, selection/control structure, loop/loop body, index/element, RETURN/DISPLAY, and list storage/list use. Input/output phrases receive explicit practice in both modes. Button events count as input and robot movement counts as output. WHEN notation is explained rather than represented as an AP reference-sheet command. Not every procedure needs a return, not every loop needs a counter, and input is not limited to keyboard entry.

Most wording is original instructional paraphrase. The lab does not claim its questions are direct quotations from released exams.

## E. Verification

The baseline AST executes against a separate expected-output function for each scenario. Mutation validation checks one authored subtree edit, verifies the reconstructed defective program, and detects its behavioral difference or an explicit structural obligation. Additional calls expose parameter defects hidden by a matching displayed argument. Source-span validation confirms a unique target and correct boundaries. False structural diagnoses are selected as distractors; common misconceptions provide fallback distractors. Direct parameter practice permits selecting the corresponding argument, so confusing the two is graded incorrect.

- Full **CSP npm test suite passed**, including new content/UI tests and existing games/session regressions.
- New deterministic **UI simulation: 912 checks passed**.
- Consolidated catalog regression passed: playable routes, unique entries, search/topic filters, summary and navigation.
- Daily reset/migration/per-mode summary checks passed in `America/Los_Angeles`.
- Wider Java npm suite ran through its shared/QTI/adapter checks, then stopped at an existing RACECES fixture: **23 topic IDs versus 15 expected**, at `cs-games/teacher/raceces-adapter-tests.mjs:22`. No unrelated content or test was changed to suppress this failure. Checks after that failing command were not reached by that suite.
- Browser QA: desktop scoring/correction; phone-width identifier, argument, nested-expression and multi-line selection; mode/topic switching; tablet and Chromebook-width checks. The narrow-screen overflow found in the inherited code-row style was repaired.

Browser evidence and publication status are recorded in `PUBLICATION.md` after release. Viewport checks use a real Chrome iframe with 390×844, 768×1024 and 1366×768 outer dimensions; scrollbar width reduces the inner layout viewport. This verifies responsive browser layout, not physical Android/Chromebook hardware. Hardware touch events and a separate external educator review remain unverified.

A GitHub workflow reruns the full CSP suite and school-timezone daily reset and retains the review artifacts.

## F. Publication

Target: https://davisjm4.github.io/csp-games/create-task-lab/

See `PUBLICATION.md` for the deployed source commit, actual live verification, and master tracker update. A successful push alone is not treated as deployment proof.

## G. Limits

The deterministic interpreter executes the rendered structured subset. It does not parse/compile arbitrary student code. Its zero-iteration REPEAT UNTIL, one-based list access, call/return, and other semantics have direct fixture tests. Finite probes do not prove equivalence for all inputs or formally prove the absence of every possible instructional ambiguity.

The original library is deliberately small-code recognition practice. It is not a submission generator, grading rubric, score guarantee, or a substitute for the student’s own code and official instructions. Assistant-authored review and automated validation do not constitute independent human educator certification. Physical touchscreen/hardware checks are deferred. The unrelated RACECES fixture failure remains documented.
