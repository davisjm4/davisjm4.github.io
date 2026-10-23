# Repetition and pool-capacity audit

_Generated from a five-seed pre-expansion baseline and `tools/repetition-audit.js`. Repeats are averaged over five seeded sessions.

## What each measure means

| Measure | Definition |
|---|---|
| Exact challenge repeats | same mode, model, question, prompt, excerpt, response sentences, options, and item set after whitespace/punctuation normalization |
| Passage repeats | same topic and selected source-fact set, regardless of fact display order |
| Underlying model repeats | same authored question/claim/evidence/explanation/summary model, regardless of mode or shuffle |
| Semantic-task repeats | same mode + authored model + target slot/role |
| Structural patterns | mode + level + reasoning family + target role/slot category. This is a coarse structure key, not a claim of complete instructional variety. |

The baseline used the pre-expansion code and five seeded runs for each row. Its original exact-repeat key did not include the correct-answer payload, so exact-repeat comparison is indicative; passage, model, semantic, and structure counts use the same meaning in both runs. A different seed does not count as a new model. Sentence shuffling does not count as new content.

## All topics, Mixed Practice, all levels

| Challenges | Exact repeats | Passages repeated | Models repeated | Semantic tasks repeated | Structural patterns |
|---|---|---|---|---|---|
| 14 | 0 | 0 | 0 | 0 | 13.8 |
| 20 | 0 | 0 | 0 | 0 | 19.8 |
| 50 | 0 | 0.4 | 0 | 0 | 46.4 |
| 100 | 0 | 2 | 7 | 0.8 | 85.8 |
| 500 | 0 | 60 | 274.4 | 57.4 | 256.8 |

## Same difficulty across all topics

| Difficulty | Challenges | Exact repeats | Passages repeated | Models repeated | Semantic tasks repeated | Structural patterns |
|---|---|---|---|---|---|---|
| Beginner | 14 | 0 | 0 | 0 | 0 | 13.4 |
| Beginner | 20 | 0 | 0 | 0 | 0 | 18.6 |
| Beginner | 50 | 0 | 0.8 | 2 | 0.2 | 37.4 |
| Beginner | 100 | 0 | 4.2 | 34.6 | 3.8 | 60.2 |
| Beginner | 500 | 1.2 | 106 | 422 | 142 | 133.2 |
| Intermediate | 14 | 0 | 0 | 0 | 0 | 13.6 |
| Intermediate | 20 | 0 | 0 | 0 | 0 | 18.4 |
| Intermediate | 50 | 0 | 0.2 | 2 | 0.2 | 39.8 |
| Intermediate | 100 | 0 | 5.8 | 34.6 | 3 | 66.6 |
| Intermediate | 500 | 0.8 | 115.8 | 422 | 142.4 | 151.2 |
| Advanced | 14 | 0 | 0 | 0 | 0 | 13.4 |
| Advanced | 20 | 0 | 0 | 0 | 0 | 18.2 |
| Advanced | 50 | 0 | 0.6 | 2 | 0.2 | 39.4 |
| Advanced | 100 | 0 | 4.2 | 34.6 | 4 | 63.2 |
| Advanced | 500 | 0.4 | 129 | 422 | 141 | 144 |

## Baseline versus expanded library

| Selection | Difficulty | N | Baseline passage repeats | Current passage repeats | Baseline model repeats | Current model repeats | Baseline structures | Current structures |
|---|---|---|---|---|---|---|---|---|
| All topics | Beginner | 20 | 1.4 | 0 | 10 | 0 | 16 | 18.6 |
| All topics | Beginner | 50 | 9.4 | 0.8 | 40 | 2 | 31 | 37.4 |
| All topics | Intermediate | 20 | 1 | 0 | 10 | 0 | 17 | 18.4 |
| All topics | Intermediate | 50 | 17 | 0.2 | 40 | 2 | 36 | 39.8 |
| All topics | Advanced | 20 | 10 | 0 | 10 | 0 | 17 | 18.2 |
| All topics | Advanced | 50 | 40 | 0.6 | 40 | 2 | 34 | 39.4 |
| Water cycle | All levels | 14 | 3.8 | 2 | 12 | 8 | 11 | 12.2 |
| Water cycle | All levels | 20 | 8.6 | 4.2 | 18 | 14 | 13 | 15.8 |
| Water cycle | All levels | 50 | 35.4 | 19.4 | 48 | 44 | 21 | 30 |
| Water cycle | All levels | 100 | 85 | 54.4 | 98 | 94 | 25 | 40.2 |
| Water cycle | All levels | 500 | 485 | 438.2 | 498 | 494 | 26 | 50.8 |

## Every exact topic: fixed-difficulty Mixed Practice

| Topic | Difficulty | N=14 model repeats | N=20 model repeats | N=20 passage repeats | Underlying models |
|---|---|---|---|---|---|
| Honeybees and pollen | Beginner | 12 | 18 | 5.6 | 2 |
| Honeybees and pollen | Intermediate | 12 | 18 | 6.4 | 2 |
| Honeybees and pollen | Advanced | 12 | 18 | 5.8 | 2 |
| Solar panels | Beginner | 12 | 18 | 5 | 2 |
| Solar panels | Intermediate | 12 | 18 | 7.2 | 2 |
| Solar panels | Advanced | 12 | 18 | 6.8 | 2 |
| The water cycle | Beginner | 12 | 18 | 4.8 | 2 |
| The water cycle | Intermediate | 12 | 18 | 7 | 2 |
| The water cycle | Advanced | 12 | 18 | 7.4 | 2 |
| Arch bridges | Beginner | 12 | 18 | 6.2 | 2 |
| Arch bridges | Intermediate | 12 | 18 | 7 | 2 |
| Arch bridges | Advanced | 12 | 18 | 6.2 | 2 |
| Public libraries | Beginner | 12 | 18 | 5.6 | 2 |
| Public libraries | Intermediate | 12 | 18 | 6 | 2 |
| Public libraries | Advanced | 12 | 18 | 6.8 | 2 |
| Phases of the Moon | Beginner | 12 | 18 | 5.6 | 2 |
| Phases of the Moon | Intermediate | 12 | 18 | 7.4 | 2 |
| Phases of the Moon | Advanced | 12 | 18 | 7 | 2 |
| Desert cacti | Beginner | 12 | 18 | 5.8 | 2 |
| Desert cacti | Intermediate | 12 | 18 | 6.6 | 2 |
| Desert cacti | Advanced | 12 | 18 | 5.8 | 2 |
| Levers | Beginner | 12 | 18 | 4.8 | 2 |
| Levers | Intermediate | 12 | 18 | 6.6 | 2 |
| Levers | Advanced | 12 | 18 | 7.2 | 2 |
| Bicycle gears | Beginner | 12 | 18 | 4.8 | 2 |
| Bicycle gears | Intermediate | 12 | 18 | 7.6 | 2 |
| Bicycle gears | Advanced | 12 | 18 | 7 | 2 |
| Rust and iron | Beginner | 12 | 18 | 6 | 2 |
| Rust and iron | Intermediate | 12 | 18 | 8.8 | 2 |
| Rust and iron | Advanced | 12 | 18 | 7.6 | 2 |
| Mars rovers | Beginner | 12 | 18 | 6 | 2 |
| Mars rovers | Intermediate | 12 | 18 | 6.6 | 2 |
| Mars rovers | Advanced | 12 | 18 | 7.8 | 2 |
| The printing press | Beginner | 12 | 18 | 6.2 | 2 |
| The printing press | Intermediate | 12 | 18 | 6.2 | 2 |
| The printing press | Advanced | 12 | 18 | 5.6 | 2 |
| Coral reefs | Beginner | 12 | 18 | 5.4 | 2 |
| Coral reefs | Intermediate | 12 | 18 | 5.6 | 2 |
| Coral reefs | Advanced | 12 | 18 | 7.6 | 2 |
| Lightning and thunder | Beginner | 12 | 18 | 5.6 | 2 |
| Lightning and thunder | Intermediate | 12 | 18 | 7.2 | 2 |
| Lightning and thunder | Advanced | 12 | 18 | 6.2 | 2 |
| Binary numbers | Beginner | 12 | 18 | 6.2 | 2 |
| Binary numbers | Intermediate | 12 | 18 | 6 | 2 |
| Binary numbers | Advanced | 12 | 18 | 7.4 | 2 |
| Algebraic Expressions and Vocabulary | Beginner | — | — | — | 6 |
| Algebraic Expressions and Vocabulary | Intermediate | — | — | — | 6 |
| Algebraic Expressions and Vocabulary | Advanced | — | — | — | 6 |
| Coordinate Geometry and Transformations | Beginner | — | — | — | 6 |
| Coordinate Geometry and Transformations | Intermediate | — | — | — | 6 |
| Coordinate Geometry and Transformations | Advanced | — | — | — | 6 |
| Equations, Inequalities, and Solving | Beginner | — | — | — | 6 |
| Equations, Inequalities, and Solving | Intermediate | — | — | — | 6 |
| Equations, Inequalities, and Solving | Advanced | — | — | — | 6 |
| Functions, Graphs, and Linear Relationships | Beginner | — | — | — | 6 |
| Functions, Graphs, and Linear Relationships | Intermediate | — | — | — | 6 |
| Functions, Graphs, and Linear Relationships | Advanced | — | — | — | 6 |
| Geometry Fundamentals, Angles, and Lines | Beginner | — | — | — | 6 |
| Geometry Fundamentals, Angles, and Lines | Intermediate | — | — | — | 6 |
| Geometry Fundamentals, Angles, and Lines | Advanced | — | — | — | 6 |
| Area, Perimeter, Surface Area, and Volume | Beginner | — | — | — | 6 |
| Area, Perimeter, Surface Area, and Volume | Intermediate | — | — | — | 6 |
| Area, Perimeter, Surface Area, and Volume | Advanced | — | — | — | 6 |
| Statistics, Probability, and Data Interpretation | Beginner | — | — | — | 6 |
| Statistics, Probability, and Data Interpretation | Intermediate | — | — | — | 6 |
| Statistics, Probability, and Data Interpretation | Advanced | — | — | — | 6 |
| Triangles, Polygons, and Similarity | Beginner | — | — | — | 6 |
| Triangles, Polygons, and Similarity | Intermediate | — | — | — | 6 |
| Triangles, Polygons, and Similarity | Advanced | — | — | — | 6 |

Each topic/mode/difficulty was also generated for 14, 20, 50, 100, and 500 challenges across five seeds. Curated topic combinations were tested in Mixed Practice at all those lengths. The full measurements are in `tests/results/repetition-audit.json`.

## Authored library capacity

| Topic | Beginner | Intermediate | Advanced | Total |
|---|---|---|---|---|
| Honeybees and pollen | 2 | 2 | 2 | 6 |
| Solar panels | 2 | 2 | 2 | 6 |
| The water cycle | 2 | 2 | 2 | 6 |
| Arch bridges | 2 | 2 | 2 | 6 |
| Public libraries | 2 | 2 | 2 | 6 |
| Phases of the Moon | 2 | 2 | 2 | 6 |
| Desert cacti | 2 | 2 | 2 | 6 |
| Levers | 2 | 2 | 2 | 6 |
| Bicycle gears | 2 | 2 | 2 | 6 |
| Rust and iron | 2 | 2 | 2 | 6 |
| Mars rovers | 2 | 2 | 2 | 6 |
| The printing press | 2 | 2 | 2 | 6 |
| Coral reefs | 2 | 2 | 2 | 6 |
| Lightning and thunder | 2 | 2 | 2 | 6 |
| Binary numbers | 2 | 2 | 2 | 6 |
| Algebraic Expressions and Vocabulary | 6 | 6 | 6 | 18 |
| Coordinate Geometry and Transformations | 6 | 6 | 6 | 18 |
| Equations, Inequalities, and Solving | 6 | 6 | 6 | 18 |
| Functions, Graphs, and Linear Relationships | 6 | 6 | 6 | 18 |
| Geometry Fundamentals, Angles, and Lines | 6 | 6 | 6 | 18 |
| Area, Perimeter, Surface Area, and Volume | 6 | 6 | 6 | 18 |
| Statistics, Probability, and Data Interpretation | 6 | 6 | 6 | 18 |
| Triangles, Polygons, and Similarity | 6 | 6 | 6 | 18 |

There are 234 underlying authored writing models (78 / 78 / 78 Beginner / Intermediate / Advanced). Each math topic has 6 models per difficulty; each original topic has 2. A topic-specific pool enters Review after its own models are used; it does not substitute content from another topic. Topic selection is balanced across the selected topics even when their model-pool sizes differ.

The 1,000-question targets were not used as a proxy for uniqueness. This audit uses five seeds and session lengths through 500, records exact and content-level repeats separately, and reports the model pool independently. The test harness does not claim that a structurally distinct task on an existing model is a new writing problem.
