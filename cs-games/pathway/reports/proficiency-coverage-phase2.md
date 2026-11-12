# Formative proficiency coverage, Phase 2

Baseline is the production pilot at `2d7d313`. The version 2 rubric expands the existing evaluator. Counts describe skills with a supported tier. A skill can appear in several columns, and some application skills have no separate recognition tier.

| Course | Skills | Level 2 | Level 3 | Level 4 |
| --- | ---: | ---: | ---: | ---: |
| Advanced CS | 123 | 14 → 46 | 1 → 31 | 1 → 18 |
| AP CSP | 58 | 2 → 12 | 1 → 8 | 1 → 1 |
| Total | 181 | 16 → 58 | 2 → 39 | 2 → 19 |

The [181-skill matrix](proficiency-skill-matrix.csv) includes both versions, stable IDs and the recommended practice mode for each supported new tier. The curriculum graph and published class pathways retain their IDs and ordering.

## Advanced CS

| Area | Evidence admitted | Scope and remaining gaps |
| --- | --- | --- |
| Variables | Existing state tracing across numeric and nonnumeric state remains at Levels 2–4. Declaration assembly remains Level 2. | The other existing nodes assess identification and recognition. Their questions still count at Level 2. The default recommendation skips that additional recognition sequence once students can practice state and declaration assembly. A published teacher challenge can require it. Additional application needs scored modes that assess type, conversion or state reasoning with useful variation. |
| Math | Single-operation modulus and quotient reasoning are Level 2. Comparing a cast before and after division, reasoning through precedence and working backward from a desired result are Level 3. | The generator varies the expression and plausible misconception. Casting is classified by the assessed expression family because the older generator has no tier label. Math methods and numeric limits need a separate family review. Level 4 needs linked decisions and more transfer problems. |
| Boolean and Conditionals | Level 3 covers evaluating composed expressions, boundary and flag constraints, De Morgan transformations, tracing competing branches, interpreting truth tables, and reasoning through switch conversions or fall-through. | Basic switch matches and identification stay at Level 2 even under harder presets. The approved application families and assessed mode drive credit. Short-circuit safety, coverage and Level 4 remain open for review. |
| Strings | The four validated generators for output, state tracing, indexing and expression completion support all three tiers. | The AST grader checks Java behavior. Advanced work requires interacting operations across multiple concepts. String comparisons, loops and standalone algorithms use separate generators and remain unreviewed for this release. |
| Loops | Loop Type supports Levels 2–4, including constraints such as pretest versus posttest, index access and termination. Final-value, conditional and nested tracing support Levels 2–3 in selected families. | Identifying loop components is supplemental Level 2. The other modes and advanced tracing need separate review. |
| Arrays | All 12 compositional modes support Levels 2–4. The generator certifies observation dependencies, not just code size, and validates answers with its controlled Java model and JVM regression. | Requires the compositional source marker on new events. Earlier submissions retain their original practice records. Older labels alone cannot establish a formative tier. |

## AP CSP

| Activity | Evidence admitted | Scope and remaining gaps |
| --- | --- | --- |
| Code Concepts | Level 2 for selected exact variants in variables, Boolean expressions, selection, iteration, lists, procedures and parameters. | Source category and variant must agree with the direct mapped skill. Existing Session Summary grouping remains in place. |
| Algorithm Architect | Level 3 for scored applied sequencing, selection, iteration, search/algorithm reasoning, and procedure decisions. | Returning a literal or a named value and simple initialization do not establish Level 3. Component changes within one model do not satisfy family breadth. The most complex procedure tasks have too few transfer families for Level 4. Program development, data abstraction and parameter reasoning need richer tasks with direct attribution. |
| List Lab | Level 3 for correctly executing state changes with multiple indexed operations. | Freeform construction still works as practice. It needs task constraints that distinguish meaningful indexed reasoning from a short workaround. |
| Boolean Gatekeeper | Level 3 for solving Boolean constraints where neither input can satisfy the expression by itself. | Ordinary evaluation remains practice. A separate transfer bank is needed for Level 4. |
| Binary Builder | Level 2 for binary conversion, bit capacity and pixel encoding. | Current pixel layout and visible place-value feedback make this foundational. Overflow remains practice. Add varying representation trade-offs and unscaffolded analysis before raising coverage. |
| Digital Divide and Roundoff vs. Overflow | Pilot support continues. | Prior mappings stay in use. |
| Create Performance Task | Current practice remains available. | Estimated attribution cannot enter the formative evaluator. Authentic Create work and official scoring stay separate. |

Both focused and Mixed Practice record the actual assessed mode. Binary Builder sends an explicit profile topic while its local Session Summary retains the detailed bit-length label. Algorithm Architect sends the assessed model and the component the student solved. CSP practice still uses the existing first-submission event and the direct mappings in `exam-readiness/mapping.js`. The Worker does not promote estimated mappings or backfill missing metadata. AP CSP content expectations are grounded in the [College Board course and exam description](https://apcentral.collegeboard.org/courses/ap-computer-science-principles/course).

## Progression and calibration

An area advances when its reviewed required foundations and Level 3 outcomes are demonstrated. A separate action opens the next area when Level 3 coverage is still under review. Optional Level 4 challenges remain available after Level 3, and neither recommendation limits access. The student map identifies partially reviewed areas so advancement does not imply evidence for every skill.

New foundational defaults use 4 of 5. Most application rules use at least 8 answers and 85% first-attempt accuracy, which means 7 of 8 at the minimum. Algorithm Architect uses at least 6 and 80%, which means 5 of 6, with correct responses across three models. New Advanced CS Level 4 defaults use at least 10 and 85%, which means 9 of 10 at the minimum. Where a bank has independent models the requirements include two or three correctly answered families. Binary conversion and equivalent-expression modes with narrower family metadata use one recorded family. That coverage should be revisited as generators offer additional distinct model tags.

These are provisional classroom defaults. Compare first-attempt results against teacher-reviewed transfer items and review item-family pass rates and time to advance before increasing the thresholds. Consider at least three independent models for any future Level 3 or 4 promotion. Keep the teacher's gradebook conversion separate from practice accuracy. Published teacher question counts, accuracy and minimum correct still apply through the existing policy selection. Formative results do not create certification or assign official grades.

## Compatibility

The Worker uses the versioned rubric in its progress cache key. All changes use the existing event store. Deployment requires an updated Worker and GitHub Pages assets, with no database migration. Historic awards, scores, attempts and revision history use their existing services. Independent learner files are outside this change.
