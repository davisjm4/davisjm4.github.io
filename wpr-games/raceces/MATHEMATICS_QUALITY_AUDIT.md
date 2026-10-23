# RACECES mathematics record audit

Record-level results: **407 records**, **394 validated without edits**, **13 corrected and validated**, **0 removed/replaced**, **0 unresolved mathematical errors identified**.

Each row in `MATHEMATICS_RECORD_AUDIT.csv` lists the status, issue, correction, and verification scope. The review compared each term, definition, example, and stated condition for mathematical meaning and topic fit. Automated checks confirm schema, unique concepts, correct-answer/evidence field alignment, and model links. Named arithmetic fixtures are independently recalculated; not every claim has a source-specific citation or a standalone computational proof.

The separate model audit contains **480 model assignments**. It classifies them into **7 genuine reasoning families**, with two families at Beginner and Intermediate and three at Advanced. Variations among IDs within a family are concept-pair or prompt-stem variants, not new reasoning families. All 480 assignments were improved to align the question and answer, cite two concept-specific worked examples, and explain how each example connects to its definition.

| Topic | Records reviewed | Validated | Corrected and validated | Removed/replaced | Unresolved |
|---|---:|---:|---:|---:|---:|
| math-algebraic-expressions | 50 | 46 | 4 | 0 | 0 |
| math-coordinate-transformations | 51 | 50 | 1 | 0 | 0 |
| math-equations-inequalities | 51 | 49 | 2 | 0 | 0 |
| math-functions | 51 | 50 | 1 | 0 | 0 |
| math-geometry | 51 | 51 | 0 | 0 | 0 |
| math-measurement | 51 | 49 | 2 | 0 | 0 |
| math-statistics-probability | 51 | 49 | 2 | 0 | 0 |
| math-triangles-polygons | 51 | 50 | 1 | 0 | 0 |

## Audit limits

The references attached to records identify broad OpenStax chapters or Common Core standards; they are not precise citations to the exact statement in every record. Terms whose use varies by curriculum are flagged in their wording (for example, the inclusive trapezoid definition). A mathematics teacher should review the final classroom-facing examples before formal assessment use.


## Student-facing sample review

A deterministic file contains 960 actual rendered challenges: 720 across all 8 topics × 3 difficulties × 3 practice modes (10 per cell), plus 240 Mathematics Mixed Practice challenges. Automated validation, correct/incorrect grading, and four-choice uniqueness checks found zero failures. A manual review of 24 rendered challenges covered every topic and difficulty, rotating across Identify the Parts, Rearrange the Response, and Choose the Missing Piece. **The remaining 696 of the 720 stratified samples and all 240 Mixed Practice samples were not manually reviewed.** This does not meet the requested 720-item human review threshold; an educator review remains a release limitation.

The manual review found and corrected one evidence mismatch in math-triangles-polygons-34: the example about perpendicular bisectors meeting at the circumcenter did not directly demonstrate the definition. It now states the defining property that a point P on the perpendicular bisector of AB has PA = PB. No critical or high-severity issue remains in the inspected 24; this is not a claim about unreviewed generated outputs.

## Before and after

**Before (published implementation):** “What broader conclusion about precise mathematical reasoning follows from segment addition postulate and angle addition postulate?” The answer merely repeated both definitions, and the evidence/explanations included generic wording such as “exactly what the answer describes.” The prompt asked for a broad inference that the answer did not make.

**After (seeded generated example):** “Do the examples meet the definitions of factor and product? What conditions support each?” The answer identifies each role, Cites give 6x as a product of factors and 4x as the product of 4 and x, and each Explain connects that example to multiplication. The second evidence pair contributes a separate concept/example.

## Session diversity

The generator now offers 20 underlying concept-pair assignments per topic/difficulty (60 per topic), using 7 reasoning families across the 8 topics. Family mix is 10/10 at Beginner, 10/10 at Intermediate, and 7/7/6 at Advanced. These are assignments within families, not 480 independent reasoning structures. Three-seed sessions using Mathematics across all topics showed zero exact or configuration repeats at 14, 20, 50, and 100 challenges. A single Algebra topic across all difficulties showed zero configuration repeats through 50 and 40 repeats by 100 (60 total assignments). With one topic and one difficulty, all 20 assignments were distinct through 20; a 50-question session necessarily reviewed 30 assignments, and 100 reviewed 80. Exact displayed repeats remained zero in these seeded runs because mode/target variation changes the display; that does not create a new underlying reasoning task.

## Reference checks

Ambiguous conditions were checked against OpenStax College Algebra and Statistics materials, including [absolute-value inequalities](https://openstax.org/books/college-algebra-corequisite-support/pages/2-7-linear-inequalities-and-absolute-value-inequalities), [linear functions and slope](https://openstax.org/books/college-algebra-2e/pages/4-1-linear-functions), [independent and mutually exclusive events](https://openstax.org/books/statistics/pages/3-2-independent-and-mutually-exclusive-events), and [conditional probabilities in two-way tables](https://openstax.org/books/statistics/pages/3-4-contingency-tables). Geometry formulas were checked against [OpenStax geometric formulas](https://openstax.org/books/prealgebra-2e/pages/c-geometric-formulas). These sources corroborate the reviewed topic statements; they do not replace record-specific citations or a teacher review.

## Browser and release limits

The local Playwright browser suite could not launch because Chromium is unavailable. The Playwright installation attempt failed because the CDN response was an invalid/truncated archive. The connected browser was used for a pre-change live inspection only; post-publication browser verification is still required.
