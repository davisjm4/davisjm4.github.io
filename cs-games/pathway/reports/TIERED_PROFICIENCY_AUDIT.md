# Formative proficiency and evidence audit

Rubric version 1 covers 181 existing skills across Advanced CS and AP CSP. The [per-skill matrix](proficiency-skill-matrix.csv) lists every stable ID and explicitly identifies the available tiers. The existing Java [mode registry](../evidence-gap-registry.json) carries objective grading checks, focused and mixed attribution, difficulty telemetry, measured source-family diversity, and the coverage gaps behind the Java rows. Those measurements establish evidence delivery. Cognitive classification requires a separate content review.

## What supports a formative level today

| Course and skill | Level 2 | Level 3 | Level 4 |
| --- | --- | --- | --- |
| Advanced CS · Trace variable state | Straightforward state tracing | Meaningful state changes, dependency depth of at least three, and correct evidence across numeric and nonnumeric state | Multistep dependencies and interacting concepts, with both categories represented. Requires demonstrated Intermediate on the skill. |
| Advanced CS · 12 Variable Lab Identify outcomes and Assemble a variable declaration | Foundational recognition, simple interpretation, or construction | Unavailable | Unavailable |
| AP CSP · Analyze the digital divide | Identify a barrier in a scenario | Predict a consequence and select an intervention based on the stated constraint | Interpret rates and evaluate data limitations in seven reviewed evidence families. Requires demonstrated Intermediate on the skill. |
| AP CSP · Distinguish roundoff and overflow | Apply explicit range and representation information to distinguish range limitations from precision loss | Unavailable | Unavailable |

Variable trace difficulty uses the generator's validated dependency slice and reasoning-family metrics. It excludes unrelated lines. Identify outcomes such as compatible types, declarations, and stored values are assessed within their specific mode. Some use contextual interpretation, so the Level 2 cap is conservative. The Digital Divide bank has five variants per family. The reviewed Level 4 families cover counts and rates, input-method and language-format denominators, online survey scope, causal limits, unknown joint coverage, and the difference between attendance and demonstrated performance. Simpler table lookups and the entire tradeoff mode remain outside Level 4. The numerical lab supplies the exact computed result, so an arithmetic operation in the prompt does not establish a harder tier.

The default 85% first-attempt target and small evidence floors are provisional guidance. The floors range from four to ten scored answers and enforce relevant family diversity. Required Intermediate and Advanced outcomes also require correct answers across different reasoning categories. These settings are reproducible starting points for classroom calibration. In Josiah's grading model, a teacher-verified Level 3 corresponds to 90% and Level 4 to 100%. The application does not convert formative levels into grades.

## Advanced CS inventory

Source review used the live Variable trace generator and its dependency tests, String Lab source families and the existing browser evidence checks, and focused samples at the three preset positions for every mode in the other 14 labs. The sample and existing test suite check behavior and attribution. Remaining cognitive tiers require explicit family-level approval.

| Lab | Reasoning observed in sources and samples | Difficulty or evidence limitation |
| --- | --- | --- |
| Variable | Type and syntax recognition, declaration assembly, state and expression tracing | Only trace has three validated cognitive tiers. Foundational modes are capped at Level 2. |
| Math | Evaluate expressions and apply modulus, casts, or numeric rules | Expanded questions report difficulty. Legacy items lack tier tags. |
| Boolean & Conditional | Evaluate expressions, trace branches, identify boundary errors | Tier metadata exists. Range Explorer visits are unscored. Mode-specific cognitive calibration is open. |
| String | Recognize operations, trace indices, reconstruct or debug strings | Difficulty is recorded where applicable. Review progression within each family. |
| Loop | Recognize loop roles, predict counts, trace state, diagnose loops | Three preset labels. Verify per-mode transition from recognition to multistep reasoning before enabling tiers. |
| Array | Find a cell, trace updates, analyze order and indices | Three preset labels. Source modes differ in cognitive demand. |
| ArrayList | Choose API calls, interpret updates and indexing | No supported tier metadata in the registry. |
| LinkedList | Connect and mutate node references | Objective structural scoring. No supported tier tags. |
| Method & Constructor | Match calls and parameters, interpret signatures and constructors | No supported tier tags. |
| Class & Object | Read constructors, evaluate aliasing and state, reason about class structure | Labels exist on supported modes. Class Builder Rearrange lacks an evidence path. |
| Inheritance & Polymorphism | Trace dispatch, relationships, and override behavior | Objective mode mapping. No supported tier tags. |
| Search & Sort | Track searches, comparisons and sorting steps | Three preset labels. Validate reasoning per family and distinguish direct tracing from algorithm analysis. |
| Recursion | Identify a base case, follow arguments, trace calls and returns | Three preset labels. Review distinct reasoning depth within each family. |
| Debugger | Spot a defect, choose a repair, diagnose its behavior | Three preset labels. Verify root-cause reasoning independently of snippet size. |
| Documentation | Select or repair accurate comments and Javadoc | No supported tier tags. API Response Explorer lacks usable emitted difficulty and node mapping. API Project Builder is practice-only. |
| Robot Algorithms | Predict, debug, or construct a route | Objective task checks. No supported tier tags. |

## AP CSP inventory and attribution

The 58-node curriculum includes 32 mapped practice activities. The table distinguishes resolver routes from demonstrated end-to-end evidence. Direct routes still need a scored event with stable question and session IDs and enough source detail. The [skill matrix](proficiency-skill-matrix.csv) joins activities to the canonical skill IDs.

| Activity or group | Scoring and cognitive focus | Attribution and tier status |
| --- | --- | --- |
| Digital Divide Lab | Keyed barrier, impact, intervention and evidence reasoning. Authored review and independent numerical checks for the evidence families. | Direct assessed mode and family. Levels 2–4 enabled for reviewed evidence. |
| Roundoff vs. Overflow Lab | Objective exact-rational range and representability checks. Classification with exact result shown. | Direct numeric node. Mixed assessed mode repaired. Level 2 only. |
| Analog vs. Digital, Lossless vs. Lossy | Keyed model-based representation classification and exactness/budget tradeoffs. | Direct nodes. Mixed assessed mode repaired. Cognitive tiers await review. |
| Binary Builder, RGB, ASCII, Compression Challenge | Objective transformations or representation choice. Repeated encoding patterns and conversion do not alone establish higher tiers. | Resolver uses specific topics or direct activity routes. RGB and ASCII exercise different skills. Proficiency unavailable pending mode and family review. |
| Data Detective | Read tables and graphs, reason about cleaning or limitations. | Topic-dependent routes. Broad defaults require validation before proficiency. |
| Code Concepts, Algorithm Architect | Interpret selection, iteration, lists, procedures and constructed algorithms. | Topic-dependent direct mappings. Variation and reasoning demand need review per outcome. |
| Boolean Gatekeeper, List Lab, Binary Search Hunt, Algorithm Race | Evaluate conditions, trace list and search behavior, compare efficiency. | Direct routes exist. Validate which interactive tasks submit keyed first attempts and how much reasoning each mode demands. |
| Internet Layers, TCP vs. UDP | Identify roles, diagnose protocol claims, interpret sequences and scenarios. | Concept-coded Internet topics and a direct transport route. Exam scope does not establish a difficulty tier. |
| Packet Router, Network Breaker, Parallel Processing Race | Routes, resilience, and parallel versus distributed execution. | Direct resolver routes. Gameplay or simulation completion alone does not qualify for this rubric. |
| Cybersecurity Defender, AI Ethics Lab, Copyright & Creative Commons | Choose safeguards, interpret impact scenarios and apply licensing conditions. | Topic or activity mappings exist. Audit per-question specificity and objective keying before enabling formative levels. |
| Computing Impact Lab, Mixed AP Practice, Response Builder | Applied impacts, broad exam questions and structured response practice. | Mostly estimated or unavailable at question-to-skill level. No proficiency credit. |
| Create Performance Task Lab, Test Case Builder, Trivial or Non-Trivial | Identify missing components, reason about tests or logic, and interpret algorithm contribution. | Create Task Lab has estimated mappings. Test Case Builder and Trivial have direct routes pending tier audit. Authentic Create evidence belongs to the student's own task and teacher review. |
| Vocabulary Fill-In | Recall or recognize a term in context. | Term route is estimated, and the profile transport does not carry all local term details. No proficiency credit. |
| Simulation Lab, Algorithm Dance Lab | Simulated behavior, experimentation, and repeated editing. | Simulation resolver exists. Dance lacks an isolated node mapping. Visits and unscored interactions produce no proficiency credit. |

The previous CSP author reports provide content-review context, bank sizes and generator checks. They do not establish external classroom calibration. College Board distinguishes the multiple-choice exam from the Create performance task and related written responses. See [AP Computer Science Principles Exam](https://apcentral.collegeboard.org/courses/ap-computer-science-principles/exam).

## Compatibility and teacher decisions

- Versioned formative calculations are derived from immutable scored attempts. Rubric versions and published policy references identify the calculation. Previously earned official awards, official scores, legacy restart windows, and published snapshots continue through the existing mastery path. No schema migration or retroactive rewrite is required. Previously displayed formative results are reproducible from the versioned code and policy; this release does not store separate formative snapshots.
- The published teacher policy's quantity, accuracy and minimum correct values apply independently within each supported tier. The formative rubric retains its required outcomes and minimum family diversity. Additional teacher challenge settings continue to govern the existing challenge. Per-tier teacher editing and reporting screens are future work.
- Missing or broad mappings, unmapped families, and label-only difficulty remain unavailable for proficiency. An unsupported course skill remains open for practice. The shared evaluator accepts normalized evidence from future guest integration and uses familiarity only for guidance. Teacher awards still use existing verification.
- For the next classroom calibration pass, check whether five to ten independent items are sufficient, inspect missed subskills by course, decide which additional modes qualify as core, and sample the CSP options for cueing and reading load. Measure gaps before enabling a new tier.
