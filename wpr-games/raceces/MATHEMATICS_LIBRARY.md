# Mathematics expansion

## Scope

The mathematics expansion is part of the existing RACECES Writing Games. Mathematics is a selectable subject in the existing topic filter and Mixed Practice. The game continues to practice response structure through Identify the Parts, Rearrange the Response, and Choose the Missing Piece.

## Topic taxonomy

| Topic | Coverage |
|---|---|
| Algebraic Expressions and Vocabulary | Algebraic language, equivalent expressions, operations, exponents, radicals, polynomials, factoring, substitution |
| Equations, Inequalities, and Solving | Solutions, equality properties, linear and compound inequalities, systems, absolute value, quadratics, verification |
| Functions, Graphs, and Linear Relationships | Relations, functions, domain and range, function notation, slope, intercepts, proportional and nonlinear relationships |
| Geometry Fundamentals, Angles, and Lines | Basic geometric objects, segments, rays, angle relationships, parallel lines, transversals, postulates and reasoning |
| Triangles, Polygons, and Similarity | Triangle classifications and theorems, congruence, similarity, triangle centers, quadrilaterals, polygon angle relationships |
| Area, Perimeter, Surface Area, and Volume | Length and area measures, circles, composite figures, solid formulas, dimensional reasoning, units, rates, scale |
| Coordinate Geometry and Transformations | Coordinates, distance, midpoint, slope, rigid motions, coordinate rules, dilations, invariants and proofs |
| Statistics, Probability, and Data Interpretation | Sampling, variables, summaries, distributions, displays, association, study design, probability and expected value |

The authored files under content/math-*.json contain 407 distinct normalized term-definition concepts: 50 in Algebraic Expressions and Vocabulary and 51 in each of the other seven topics.

## Record schema

Each concept record includes:

- Stable ID and topic ID
- Subtopic, term, definition, and an example
- Correct answer, supporting evidence, and an evidence-to-definition explanation
- Compatible question types
- A common misconception or incorrect interpretation
- Difficulty and validation metadata, including reference title and URL

The build adapter maps each record into a source fact with that stable record ID. Math models cite those IDs directly. It fails the build for missing metadata, repeated terms within one topic, missing records, or a model whose evidence records do not support its declared question type.

## Model and compatibility design

Each topic has 60 bounded concept-pair assignments: 20 Beginner, 20 Intermediate, and 20 Advanced. Beginner uses definition retrieval and example interpretation; Intermediate uses comparison and misconception analysis; Advanced uses criteria reasoning, example verification, and evidence-limit reasoning. This adds a third Advanced family to improve consecutive-session variety. Twenty different concept pairs per level provide one full no-repeat session, but stems within a family are not counted as distinct reasoning tasks. The earlier claim of 18 reasoning families per topic overstated diversity.

For math challenges, each cited source fact pairs a definition with its authored example. Explanations connect the worked example to the defining condition. Excerpt context is trimmed or expanded to stay within the established difficulty word band. Mode, target role, and sentence ordering continue to vary through the existing RACECES generator.

The three response modes use the same shared response builder and graders as the existing subjects. Topic and difficulty filters and teacher-shareable links use the existing settings pipeline.

## Difficulty

- **Beginner:** direct meanings and identifying what a definition describes.
- **Intermediate:** compare related definitions and state the distinction between them.
- **Advanced:** use the definition and worked example to identify criteria and check how a concept applies.

## Mathematical validation

The record inventory is checked for required fields, stable IDs, exact duplicate term-definition pairs, per-topic minimums, model counts, and model-to-record compatibility. The content validator checks challenge grounding, numeric consistency, readability bands, and complete response structure. Regression fixtures independently calculate representative algebra, equation, function, geometry, measurement, coordinate, statistics, and probability examples.

Reference sources used to check terminology and scope:

- [OpenStax Elementary Algebra 2e](https://openstax.org/details/books/elementary-algebra-2e)
- [OpenStax College Algebra, linear functions](https://openstax.org/books/college-algebra/pages/4-1-linear-functions)
- [OpenStax College Algebra, equation and inequality review](https://openstax.org/books/college-algebra/pages/2-key-concepts)
- [Common Core State Standards for Mathematics](https://corestandards.org/wp-content/uploads/2023/09/ADA-Compliant-Math-Standards.pdf)
- [OpenStax Introductory Statistics, key terms](https://openstax.org/books/introductory-statistics/pages/1-1-definitions-of-statistics-probability-and-key-terms)

Automated checks cannot establish that every explanation is a sound inference or that every misconception is the one students most often hold. The references support a content audit; they are not direct citations attached to individual classroom responses. A mathematics teacher should review the generated samples before using the material as a formal assessment.

## Adding future math content

1. Add concept records to the appropriate content/math-*.json file. Keep IDs stable and unique.
2. Include a precise definition, checked example, correct answer, evidence, explanation, misconception, difficulty, compatibility types, and validation reference.
3. Ensure each record belongs to the topic and is not a numerical rewording of an existing record.
4. Add or revise a compatible model in tools/build.js. Use two distinct evidence records and one separate off-focus record; keep both explanation sentences tied to their evidence.
5. Run npm run build, npm run validate, and npm test. Review generated examples and reports before publishing.

Do not edit js/data/content-bundle.js directly; the build script regenerates it from the content sources.
