# Development Report

**Package:** `search-sort-lab.zip` → place at `java-games/search-sort-lab/`. Not deployed or independently published.

## Implemented
- Six modes, each at Beginner/Intermediate/Advanced, backed by 55 challenge families (binary 13, selection 9, insertion 8, merge 11, name 5, compare 9), five verified simulators, misconception-based distractors, per-challenge difficulty metadata, seeded generation, bounded repeat avoidance.
- Interface: mode/difficulty selectors, code panel with Java highlighting, labeled array cells (index + text labels for low/mid/high/min/compare/key/shift/sorted/ruled-out), split/merge trees after answering, four answer choices, one-attempt scoring with answer lock, explanation + misconception note, review-only trace, running score, Session Summary (totals, by mode/difficulty/skill, skills needing practice), restart, keyboard (1–4, arrows, Enter).
- Counting questions state exactly what counts; all counts come from simulators and are re-derived independently.

## Generator testing (1,000 per cell; last full run)
| Mode | Beginner tested | Intermediate tested | Advanced tested | Issues |
|---|---|---|---|---|
| Binary Search Tracker | 1000 | 1000 | 1000 | none |
| Trace Selection Sort | 1000 | 1000 | 1000 | none |
| Trace Insertion Sort | 1000 | 1000 | 1000 | none |
| Merge Sort Trace | 1000 | 1000 | 1000 | none |
| Name That Algorithm | 1000 | 1000 | 1000 | none (see diversity) |
| Compare the Work | 1000 | 1000 | 1000 | none |

18,000 challenges: every one solvable, independently re-derived, exactly one correct choice, 4 distinct choices, valid braces/parentheses, difficulty metadata consistent, same seed reproduces. 160,665 checks.

## Diversity findings (separately measured; `tests/results/quality-report.json`)
- **Exact uniqueness (1000 samples/cell):** 100% in 13 of 18 cells. Name That Algorithm 99.4% / 99.8% / 99.8% (beginner/intermediate/advanced); binary advanced 99.9%; compare advanced 99.9%.
- **Normalized structural signatures** (digits stripped; family + variant + stem/code shape), Beginner / Intermediate / Advanced: binary 18 / 67 / 152; selection 10 / 35 / 64; insertion 11 / 23 / 37; merge 7 / 31 / 42; name 178 / 260 / 542; compare 10 / 22 / 36. Distinct family:variant reasoning patterns are only 4–6 per Beginner mode (except Name, 16), so **Beginner modes vary mostly in arrays and distractor combinations, not in reasoning structure** (a real limitation).
- **Operation diversity:** 3–5 families at Beginner, 3–9 at Intermediate, 4–10 at Advanced per mode; family entropy 0.88–0.998; no family above 50% of a cell (largest: Name beginner 47.7%, intermediate 49.5%).
- **Distractors:** 28–89 distinct misconception notes per cell; 0.7% of 54,000 distractors use a generic fallback.
- **Repetition (200-challenge simulated sessions, all cells):** 0 exact repeats; same reasoning structure within the previous 2 challenges ≤5%; adjacent same-family ≤5%.
- **15 non-failing flags remain:** families whose answer space is inherently tiny (e.g. a first midpoint of a short array is 2 or 3; Compare "which search is faster" has three outcomes). These are answer-space limits, not repeated questions.
- Variety issues the tests found and I fixed: Name That Algorithm had one code template per algorithm (82.7% unique), Compare growth had ~21 combinations, beginner Merge/Selection/Compare had too few structures, and two families had biased answers (unsorted binary search almost always −1; insertion-vs-selection always "Insertion").

## Correctness
- Java implementations simulated are documented at the top of `engine/algorithms.js` and in README.
- `algorithms.test.mjs`: 18,550 checks (empty/single/two-element, sorted/reverse, duplicates, negatives, missing targets, first/middle/last positions, odd/even sizes, uneven merge halves, multiset preservation, input not mutated, counters vs hand-instrumented code).
- Binary search: duplicates return the documented index (not first/last); defects (`high=mid`, `low=mid`, `low<high`) behave as documented.
- **Real JVM** (`jvm.test.mjs`): 600 random arrays run through real Java versions of all algorithms and variants; results and every counter equal the simulators. 574 distinct displayed snippet shapes compile with the JDK compiler. This found two real bugs (duplicate variable names in "misleading names" code; a snippet missing its `merge` helper), both fixed.
- Algorithm identification: answers are checked by a structure-only classifier that ignores identifier names; trace evidence is generated only when it excludes the other candidate algorithm.

## Limitations / not done
- No real browser test: layout, touch, Chromebook sizing, screen readers, print were not exercised. UI test is a simulated DOM.
- No drag-and-drop; single-select multiple choice only.
- Session Summary difficulty/skill breakdown is in-memory on this page.
- Canvas QTI export not implemented (by design).
- Shared `session.js`/catalog/hub integration is untested against the live repository.
