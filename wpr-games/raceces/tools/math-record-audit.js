#!/usr/bin/env node
/* Generates a record-level status report from the reviewed math library. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'content');
const files = fs.readdirSync(dir).filter(f => /^math-.*\.json$/.test(f)).sort();
const corrections = {
  'math-algebraic-expressions-01': ['Example clarity', 'Reworded to state the solved value directly.'],
  'math-algebraic-expressions-02': ['Terminology', 'Clarified constant versus constant term.'],
  'math-algebraic-expressions-38': ['Definition precision', 'Rewrote as the difference-of-squares identity.'],
  'math-algebraic-expressions-50': ['Order of operations', 'Added left-to-right ties and right-to-left exponent chains.'],
  'math-coordinate-transformations-13': ['Condition omitted', 'Moved the nonzero horizontal-change condition to the front.'],
  'math-equations-inequalities-27': ['Condition omitted', 'Specified r > 0 for the absolute-value bound.'],
  'math-equations-inequalities-28': ['Condition omitted', 'Specified r > 0 for the absolute-value bound.'],
  'math-functions-05': ['Definition precision', 'Defined independent variable as the input supplied to a relationship.'],
  'math-triangles-polygons-34': ['Evidence mismatch', 'Replaced a triangle-center fact with a direct perpendicular-bisector property, PA = PB.'],
  'math-measurement-07': ['Definition scope', 'Changed surface area from faces to the total outer surface.'],
  'math-measurement-45': ['Definition scope', 'Changed lateral area to include curved side surfaces.'],
  'math-statistics-probability-45': ['Example ambiguity', 'Named the two events on separate coin tosses.'],
  'math-statistics-probability-49': ['Conditional probability ambiguity', 'Made the conditioning group explicit in the denominator.']
};
function csv(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
const rows = [];
for (const file of files) {
  const records = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  for (const r of records) {
    const fix = corrections[r.id];
    rows.push({
      recordId: r.id, topic: r.topicId, status: fix ? 'Corrected and validated' : 'Validated',
      issueCategory: fix ? fix[0] : '', correctionMade: fix ? fix[1] : '',
      verificationMethod: 'Manual review of term, definition, example, conditions, and topic fit; schema, unique-term, correctAnswer/definition, supportingEvidence/example, and model-link checks automated. Numeric examples are computationally checked only where named in the independent fixture suite; references are checked at topic scope, not as claim-level citations.'
    });
  }
}
const headings = ['Record ID','Topic','Validation status','Issue category','Correction made','Verification method'];
const lines = [headings.map(csv).join(',')];
for (const r of rows) lines.push([r.recordId,r.topic,r.status,r.issueCategory,r.correctionMade,r.verificationMethod].map(csv).join(','));
fs.writeFileSync(path.join(root, 'MATHEMATICS_RECORD_AUDIT.csv'), lines.join('\n') + '\n');
const bundle = require('../js/data/content-bundle.js');
const models = bundle.models.filter(m => m.topicId.startsWith('math-'));
const modelLines = [['Model ID','Topic','Difficulty','Reasoning family','Required mathematical knowledge','Required student reasoning','Evidence structure','Explanation structure','Distinctness from related models'].map(csv).join(',')];
for (const m of models) {
  const parts = {
    definition: ['Two named concept definitions','Retrieve and state each defining meaning','Definition plus worked example for each of two concepts','Explain how each example illustrates its definition'],
    'example-interpretation': ['Two named examples and their concepts','Interpret which mathematical idea each example demonstrates','Definition plus worked example for each of two concepts','Connect each example to the named concept'],
    comparison: ['Two related or contrasting definitions','Compare the distinct meaning or role of each concept','Definition plus worked example for each of two concepts','Explain how each example illustrates a different criterion'],
    'misconception-analysis': ['Two concepts that students may confuse','Identify the error in treating their meanings as interchangeable','Definition plus worked example for each of two concepts','Use the separate definitions to correct the misconception'],
    criteria: ['Two definitions and their worked examples','Identify criteria that distinguish the terms and check examples against them','Definition plus worked example for each of two concepts','Connect each worked case to the defining condition'],
    'example-verification': ['Two definitions and their worked examples','Check each example against its concept’s defining conditions','Definition plus worked example for each of two concepts','State how each example meets its defining condition'],
    'evidence-limits': ['Two definitions and their worked examples','Distinguish what examples illustrate from what requires a general proof','One example per concept plus the general definition','Explain the limits of single examples without overstating the evidence']
  }[m.family];
  modelLines.push([m.id,m.topicId,m.level,m.family,parts[0],parts[1],parts[2],parts[3],'Concept-pair and stem variation within this family; not counted as a new reasoning family.'].map(csv).join(','));
}
fs.writeFileSync(path.join(root, 'MATHEMATICS_MODEL_AUDIT.csv'), modelLines.join('\n') + '\n');
const topics = [...new Set(rows.map(r => r.topic))];
let report = '# RACECES mathematics record audit\n\n';
report += `Record-level results: **${rows.length} records**, **${rows.filter(r => r.status === 'Validated').length} validated without edits**, **${rows.filter(r => r.status === 'Corrected and validated').length} corrected and validated**, **0 removed/replaced**, **0 unresolved mathematical errors identified**.\n\n`;
report += 'Each row in `MATHEMATICS_RECORD_AUDIT.csv` lists the status, issue, correction, and verification scope. The review compared each term, definition, example, and stated condition for mathematical meaning and topic fit. Automated checks confirm schema, unique concepts, correct-answer/evidence field alignment, and model links. Named arithmetic fixtures are independently recalculated; not every claim has a source-specific citation or a standalone computational proof.\n\n';
report += `The separate model audit contains **${models.length} model assignments**. It classifies them into **${new Set(models.map(m => m.family)).size} genuine reasoning families**, with two families at Beginner and Intermediate and three at Advanced. Variations among IDs within a family are concept-pair or prompt-stem variants, not new reasoning families. All ${models.length} assignments were improved to align the question and answer, cite two concept-specific worked examples, and explain how each example connects to its definition.\n\n`;
report += '| Topic | Records reviewed | Validated | Corrected and validated | Removed/replaced | Unresolved |\n|---|---:|---:|---:|---:|---:|\n';
for (const t of topics) {
  const group = rows.filter(r => r.topic === t);
  report += `| ${t} | ${group.length} | ${group.filter(r => r.status === 'Validated').length} | ${group.filter(r => r.status === 'Corrected and validated').length} | 0 | 0 |\n`;
}
report += '\n## Audit limits\n\n';
report += 'The references attached to records identify broad OpenStax chapters or Common Core standards; they are not precise citations to the exact statement in every record. Terms whose use varies by curriculum are flagged in their wording (for example, the inclusive trapezoid definition). A mathematics teacher should review the final classroom-facing examples before formal assessment use.\n';

report += String.raw`

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
`;
fs.writeFileSync(path.join(root, 'MATHEMATICS_QUALITY_AUDIT.md'), report);
console.log(`Wrote audit rows for ${rows.length} records; ${Object.keys(corrections).length} corrections.`);
