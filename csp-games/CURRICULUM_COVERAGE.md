# AP CSP coverage audit

35 topics, six practices. Status describes current practice, not the implementation of planned games. No topic is marked Reinforced without independent explanation practice.

Source: [Effective Fall 2023, current official AP Central CED retrieved 2026-10-13](https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-and-exam-description.pdf). LO and EK identifiers are source references; summaries are paraphrased. PDF page numbers count the PDF pages, not printed framework page labels.

Classification: Not covered = no meaningful practice; Introduced = identification; Practiced = randomized application; Reinforced = varied application, analysis, and independent explanation.

## 1.1 Collaboration

- Coverage: **Not covered**
- Objectives: CRD-1.A, CRD-1.B, CRD-1.C — Develop with diverse contributors; communicate and resolve disagreements.
- Essential knowledge: CRD-1.A.1, CRD-1.A.2, CRD-1.A.3, CRD-1.A.4, CRD-1.A.5, CRD-1.A.6, CRD-1.B.1, CRD-1.B.2, CRD-1.C.1 — Perspectives, feedback, shared tools.
- Source PDF page: 39
- Activity: Computing Impact Lab (planned)
- Modes: Team roles; evidence of collaboration
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: Authentic team work and peer feedback required.

## 1.2 Program Function and Purpose

- Coverage: **Not covered**
- Objectives: CRD-2.A, CRD-2.B, CRD-2.C, CRD-2.D — Relate purpose, behavior, inputs, and outputs.
- Essential knowledge: CRD-2.A.1, CRD-2.A.2, CRD-2.B.1, CRD-2.B.2, CRD-2.B.3, CRD-2.B.4, CRD-2.B.5, CRD-2.C.1, CRD-2.C.2, CRD-2.C.3, CRD-2.C.4, CRD-2.C.5, CRD-2.C.6, CRD-2.D.1, CRD-2.D.2 — Events; intended behavior; program execution.
- Source PDF page: 41
- Activity: Response Builder (planned)
- Modes: Purpose/input/output explanations
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: Explain purpose and function of student-created programs.

## 1.3 Program Design and Development

- Coverage: **Not covered**
- Objectives: CRD-2.E, CRD-2.F, CRD-2.G, CRD-2.H — Plan, iterate, document, and refine programs.
- Essential knowledge: CRD-2.E.1, CRD-2.E.2, CRD-2.E.3, CRD-2.E.4, CRD-2.F.1, CRD-2.F.2, CRD-2.F.3, CRD-2.F.4, CRD-2.F.5, CRD-2.F.6, CRD-2.F.7, CRD-2.G.1, CRD-2.G.2, CRD-2.G.3, CRD-2.G.4, CRD-2.G.5, CRD-2.H.1, CRD-2.H.2 — User needs, prototypes, incremental development, comments.
- Source PDF page: 43
- Activity: Algorithm Architect / Response Builder (planned)
- Modes: Design choices; documentation
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: Authentic design artifacts, revisions, and documentation required.

## 1.4 Identifying and Correcting Errors

- Coverage: **Not covered**
- Objectives: CRD-2.I, CRD-2.J — Find and fix errors; design revealing tests.
- Essential knowledge: CRD-2.I.1, CRD-2.I.2, CRD-2.I.3, CRD-2.I.4, CRD-2.I.5, CRD-2.J.1, CRD-2.J.2, CRD-2.J.3 — Syntax, logic, runtime errors; expected vs actual results.
- Source PDF page: 46
- Activity: Test Case Builder (planned)
- Modes: Boundary/branch/error tests
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: No dedicated testing or debugging game yet.

## 2.1 Binary Numbers

- Coverage: **Practiced**
- Objectives: DAT-1.A, DAT-1.B, DAT-1.C — Convert representations and explain finite precision.
- Essential knowledge: DAT-1.A.1, DAT-1.A.2, DAT-1.A.3, DAT-1.A.4, DAT-1.A.5, DAT-1.A.6, DAT-1.A.7, DAT-1.A.8, DAT-1.A.9, DAT-1.A.10, DAT-1.B.1, DAT-1.B.2, DAT-1.B.3, DAT-1.C.1, DAT-1.C.2, DAT-1.C.3, DAT-1.C.4, DAT-1.C.5 — Bits, positional values, capacity, overflow, analog/digital.
- Source PDF page: 53
- Activity: Binary Builder
- Modes: Unsigned decimal → binary (4/6/8/16 bits)
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Missing capacity, overflow, rounding, and analog representations.

## 2.2 Data Compression

- Coverage: **Practiced**
- Objectives: DAT-1.D — Evaluate lossless/lossy trade-offs.
- Essential knowledge: DAT-1.D.1, DAT-1.D.2, DAT-1.D.3, DAT-1.D.4, DAT-1.D.5, DAT-1.D.6, DAT-1.D.7, DAT-1.D.8 — Storage reduction; reversibility; loss of detail.
- Source PDF page: 56
- Activity: Compression Challenge
- Modes: Text RLE; pixels; raw/RLE and scan optimization
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Lossy compression, image representation, and trade-off explanations missing.

## 2.3 Extracting Information from Data

- Coverage: **Practiced**
- Objectives: DAT-2.A, DAT-2.B, DAT-2.C — Use patterns and tools to draw supported conclusions.
- Essential knowledge: DAT-2.A.1, DAT-2.A.2, DAT-2.A.3, DAT-2.A.4, DAT-2.B.1, DAT-2.B.2, DAT-2.B.3, DAT-2.B.4, DAT-2.B.5, DAT-2.C.1, DAT-2.C.2, DAT-2.C.3, DAT-2.C.4, DAT-2.C.5, DAT-2.C.6, DAT-2.C.7, DAT-2.C.8 — Metadata, scale, trends, correlation, processing.
- Source PDF page: 58
- Activity: Data Detective
- Modes: Tables; trends; correlation; graph configuration
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Metadata, data cleaning, collection limits, and explanation missing.

## 2.4 Using Programs with Data

- Coverage: **Practiced**
- Objectives: DAT-2.D, DAT-2.E — Use computation to transform and analyze data.
- Essential knowledge: DAT-2.D.1, DAT-2.D.2, DAT-2.D.3, DAT-2.D.4, DAT-2.D.5, DAT-2.D.6, DAT-2.E.1, DAT-2.E.2, DAT-2.E.3, DAT-2.E.4, DAT-2.E.5 — Filtering, grouping, visualization; insights and limits.
- Source PDF page: 61
- Activity: Data Detective
- Modes: Sort/filter/select; visualization
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: No independent data-cleaning or large-data investigation.

## 3.1 Variables and Assignments

- Coverage: **Introduced**
- Objectives: AAP-1.A, AAP-1.B — Represent values and use assignment.
- Essential knowledge: AAP-1.A.1, AAP-1.A.2, AAP-1.A.3, AAP-1.A.4, AAP-1.B.1, AAP-1.B.2, AAP-1.B.3 — Types, names, storing and changing values.
- Source PDF page: 70
- Activity: Code Concepts
- Modes: Variable/value/assignment identification
- Identification / application / explanation: Implemented / Partial / not targeted / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Application with changing values and explanation missing.

## 3.2 Data Abstraction

- Coverage: **Introduced**
- Objectives: AAP-1.C, AAP-1.D — Use collections and explain complexity management.
- Essential knowledge: AAP-1.C.1, AAP-1.C.2, AAP-1.C.3, AAP-1.C.4, AAP-1.D.1, AAP-1.D.2, AAP-1.D.3, AAP-1.D.4, AAP-1.D.5, AAP-1.D.6, AAP-1.D.7, AAP-1.D.8 — Lists group data; representation independence.
- Source PDF page: 72
- Activity: Code Concepts / List Lab
- Modes: List/element/name identification; list edits
- Identification / application / explanation: Implemented / Partial / not targeted / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: List manipulation is practiced; abstraction explanations are not.

## 3.3 Mathematical Expressions

- Coverage: **Not covered**
- Objectives: AAP-2.A, AAP-2.B, AAP-2.C — Use arithmetic and evaluate expressions.
- Essential knowledge: AAP-2.A.1, AAP-2.A.2, AAP-2.A.3, AAP-2.A.4, AAP-2.B.1, AAP-2.B.2, AAP-2.B.3, AAP-2.B.4, AAP-2.B.5, AAP-2.B.6, AAP-2.B.7, AAP-2.C.1, AAP-2.C.2, AAP-2.C.3, AAP-2.C.4 — Order of operations, arithmetic, remainder.
- Source PDF page: 75
- Activity: Algorithm Architect (planned)
- Modes: Configure calculations
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: Arithmetic-expression application and explanations missing.

## 3.4 Strings

- Coverage: **Not covered**
- Objectives: AAP-2.D — Manipulate text values.
- Essential knowledge: AAP-2.D.1, AAP-2.D.2 — Concatenation and substring operations.
- Source PDF page: 77
- Activity: Algorithm Architect (planned)
- Modes: Text construction
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: String literals occur, but string manipulation is not practiced.

## 3.5 Boolean Expressions

- Coverage: **Practiced**
- Objectives: AAP-2.E, AAP-2.F — Construct and evaluate Boolean logic.
- Essential knowledge: AAP-2.E.1, AAP-2.E.2, AAP-2.F.1, AAP-2.F.2, AAP-2.F.3, AAP-2.F.4, AAP-2.F.5 — Comparison, AND/OR/NOT, compound conditions.
- Source PDF page: 78
- Activity: Boolean Gatekeeper / Code Concepts
- Modes: Evaluate; make TRUE; expression identification
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Independent explanations and varied contexts need expansion.

## 3.6 Conditionals

- Coverage: **Introduced**
- Objectives: AAP-2.G, AAP-2.H — Use selection to govern execution.
- Essential knowledge: AAP-2.G.1, AAP-2.H.1, AAP-2.H.2, AAP-2.H.3 — IF; IF/ELSE; conditions and branches.
- Source PDF page: 80
- Activity: Code Concepts
- Modes: Whole structure vs condition; true/false body
- Identification / application / explanation: Implemented / Partial / not targeted / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: No algorithm-construction or branch-testing application yet.

## 3.7 Nested Conditionals

- Coverage: **Not covered**
- Objectives: AAP-2.I — Use nested selection.
- Essential knowledge: AAP-2.I.1 — Conditions within branches and decision paths.
- Source PDF page: 82
- Activity: Algorithm Architect / Test Case Builder (planned)
- Modes: Nested rules; branch coverage
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: Nested-selection application missing.

## 3.8 Iteration

- Coverage: **Introduced**
- Objectives: AAP-2.J, AAP-2.K — Use repetition and determine stopping behavior.
- Essential knowledge: AAP-2.J.1, AAP-2.K.1, AAP-2.K.2, AAP-2.K.3, AAP-2.K.4, AAP-2.K.5 — Fixed repetition, condition-controlled loops, traversal.
- Source PDF page: 83
- Activity: Code Concepts
- Modes: Loop/body/item/count/stopping-condition identification
- Identification / application / explanation: Implemented / Partial / not targeted / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Loop construction, accumulators, and stopping-condition application missing.

## 3.9 Developing Algorithms

- Coverage: **Not covered**
- Objectives: AAP-2.L, AAP-2.M — Design, compare, and combine algorithms.
- Essential knowledge: AAP-2.L.1, AAP-2.L.2, AAP-2.L.3, AAP-2.L.4, AAP-2.L.5, AAP-2.M.1, AAP-2.M.2, AAP-2.M.3 — Sequencing, selection, repetition, equivalent solutions.
- Source PDF page: 85
- Activity: Algorithm Architect (planned)
- Modes: Construct and test solutions
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: Authentic algorithm design and alternative-solution validation needed.

## 3.10 Lists

- Coverage: **Practiced**
- Objectives: AAP-2.N, AAP-2.O — Access, modify, and traverse lists.
- Essential knowledge: AAP-2.N.1, AAP-2.N.2, AAP-2.O.1, AAP-2.O.2, AAP-2.O.3, AAP-2.O.4, AAP-2.O.5 — One-based indexing; insertion/removal; traversal.
- Source PDF page: 87
- Activity: List Lab / Code Concepts
- Modes: Execute operations; build transformations; index/element
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Search/traversal algorithms and complexity explanations missing.

## 3.11 Binary Search

- Coverage: **Practiced**
- Objectives: AAP-2.P — Apply binary search to ordered data.
- Essential knowledge: AAP-2.P.1, AAP-2.P.2, AAP-2.P.3 — Midpoints, sorted prerequisite, eliminated regions.
- Source PDF page: 90
- Activity: Binary Search Hunt
- Modes: Hidden values; present/absent target; lower-midpoint convention
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Need independent comparison/explanation practice.

## 3.12 Calling Procedures

- Coverage: **Introduced**
- Objectives: AAP-3.A — Call procedures with supplied inputs and use results.
- Essential knowledge: AAP-3.A.1, AAP-3.A.2, AAP-3.A.3, AAP-3.A.4, AAP-3.A.5, AAP-3.A.6, AAP-3.A.7, AAP-3.A.8, AAP-3.A.9 — Arguments, parameter positions, returns.
- Source PDF page: 91
- Activity: Code Concepts
- Modes: Call/argument matching; literal return vs output
- Identification / application / explanation: Implemented / Partial / not targeted / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Nontracing procedure application and explanation missing.

## 3.13 Developing Procedures

- Coverage: **Introduced**
- Objectives: AAP-3.B, AAP-3.C — Develop parameterized abstractions and explain their purpose.
- Essential knowledge: AAP-3.B.1, AAP-3.B.2, AAP-3.B.3, AAP-3.B.4, AAP-3.B.5, AAP-3.B.6, AAP-3.B.7, AAP-3.C.1, AAP-3.C.2 — Reuse, generalization, complexity management.
- Source PDF page: 94
- Activity: Code Concepts
- Modes: Definition/name/parameter identification
- Identification / application / explanation: Implemented / Partial / not targeted / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Procedure construction and abstraction explanation missing.

## 3.14 Libraries

- Coverage: **Not covered**
- Objectives: AAP-3.D — Use documented reusable software.
- Essential knowledge: AAP-3.D.1, AAP-3.D.2, AAP-3.D.3, AAP-3.D.4, AAP-3.D.5 — APIs, libraries, documentation, reuse.
- Source PDF page: 97
- Activity: Code Concepts expansion (planned)
- Modes: Library/interface identification
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: API use and documentation interpretation missing.

## 3.15 Random Values

- Coverage: **Not covered**
- Objectives: AAP-3.E — Use randomness to model and generate outcomes.
- Essential knowledge: AAP-3.E.1, AAP-3.E.2 — Inclusive random ranges; distributions; trials.
- Source PDF page: 98
- Activity: Simulation Lab (planned)
- Modes: Seeded trials; range/probability experiments
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: Random generators behind games do not count as student randomness practice.

## 3.16 Simulations

- Coverage: **Not covered**
- Objectives: AAP-3.F — Develop and evaluate models.
- Essential knowledge: AAP-3.F.1, AAP-3.F.2, AAP-3.F.3, AAP-3.F.4, AAP-3.F.5, AAP-3.F.6, AAP-3.F.7, AAP-3.F.8 — Assumptions, simplification, model limitations.
- Source PDF page: 99
- Activity: Simulation Lab (planned)
- Modes: Parameter changes; predictions; repeated trials
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: Existing race animations do not assess simulation design.

## 3.17 Algorithmic Efficiency

- Coverage: **Practiced**
- Objectives: AAP-4.A — Compare resource requirements and feasibility.
- Essential knowledge: AAP-4.A.1, AAP-4.A.2, AAP-4.A.3, AAP-4.A.4, AAP-4.A.5, AAP-4.A.6, AAP-4.A.7, AAP-4.A.8, AAP-4.A.9 — Step counts, growth, reasonable vs unreasonable time.
- Source PDF page: 101
- Activity: Algorithm Race
- Modes: Search/pair checks/totals; defined step models
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Broader growth/feasibility/heuristic explanation missing.

## 3.18 Undecidable Problems

- Coverage: **Not covered**
- Objectives: AAP-4.B — Explain limits of algorithmic decision-making.
- Essential knowledge: AAP-4.B.1, AAP-4.B.2, AAP-4.B.3 — No algorithm solves every instance of some decision problems.
- Source PDF page: 103
- Activity: Code Concepts expansion (planned)
- Modes: Unsolvable-in-general vs hard cases
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: No meaningful undecidability practice.

## 4.1 The Internet

- Coverage: **Practiced**
- Objectives: CSN-1.A, CSN-1.B, CSN-1.C, CSN-1.D — Explain communication among computing devices.
- Essential knowledge: CSN-1.A.1, CSN-1.A.2, CSN-1.A.3, CSN-1.A.4, CSN-1.A.5, CSN-1.A.6, CSN-1.A.7, CSN-1.A.8, CSN-1.B.1, CSN-1.B.2, CSN-1.B.3, CSN-1.B.4, CSN-1.B.5, CSN-1.B.6, CSN-1.B.7, CSN-1.C.1, CSN-1.C.2, CSN-1.C.3, CSN-1.C.4, CSN-1.D.1, CSN-1.D.2, CSN-1.D.3 — Addresses, protocols, packets, routing, scalability.
- Source PDF page: 109
- Activity: Packet Router / Network Breaker
- Modes: Select routes; reroute failed links
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Routing only: addressing, DNS, TCP/IP, HTTP, and packet reassembly missing.

## 4.2 Fault Tolerance

- Coverage: **Practiced**
- Objectives: CSN-1.E — Analyze redundancy and continued operation during failure.
- Essential knowledge: CSN-1.E.1, CSN-1.E.2, CSN-1.E.3, CSN-1.E.4, CSN-1.E.5, CSN-1.E.6, CSN-1.E.7 — Alternate paths and failure limits.
- Source PDF page: 112
- Activity: Network Breaker / Packet Router
- Modes: Minimum edge cuts; rerouting
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Need scenario distinctions between redundancy and demonstrated fault tolerance.

## 4.3 Parallel and Distributed Computing

- Coverage: **Practiced**
- Objectives: CSN-2.A, CSN-2.B — Compare sequential, parallel, and distributed processing.
- Essential knowledge: CSN-2.A.1, CSN-2.A.2, CSN-2.A.3, CSN-2.A.4, CSN-2.A.5, CSN-2.A.6, CSN-2.A.7, CSN-2.B.1, CSN-2.B.2, CSN-2.B.3, CSN-2.B.4, CSN-2.B.5 — Work division, speedup limits, dependencies.
- Source PDF page: 114
- Activity: Parallel Processing Race
- Modes: Independent assignments; dependency-constrained schedules
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Distributed systems, overhead, and explanation need expansion.

## 5.1 Beneficial and Harmful Effects

- Coverage: **Not covered**
- Objectives: IOC-1.A, IOC-1.B — Analyze computing effects across groups.
- Essential knowledge: IOC-1.A.1, IOC-1.A.2, IOC-1.A.3, IOC-1.A.4, IOC-1.A.5, IOC-1.B.1, IOC-1.B.2, IOC-1.B.3, IOC-1.B.4, IOC-1.B.5, IOC-1.B.6 — Intended/unintended impacts and trade-offs.
- Source PDF page: 121
- Activity: Computing Impact Lab (planned)
- Modes: Evidence and consequences
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: No computing-innovation impact practice.

## 5.2 Digital Divide

- Coverage: **Not covered**
- Objectives: IOC-1.C — Explain unequal computing access.
- Essential knowledge: IOC-1.C.1, IOC-1.C.2, IOC-1.C.3, IOC-1.C.4, IOC-1.C.5 — Infrastructure, cost, geography, accessibility.
- Source PDF page: 123
- Activity: Computing Impact Lab (planned)
- Modes: Access barriers; supported conclusions
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: No digital-divide practice.

## 5.3 Computing Bias

- Coverage: **Not covered**
- Objectives: IOC-1.D — Explain and investigate computing bias.
- Essential knowledge: IOC-1.D.1, IOC-1.D.2, IOC-1.D.3 — Data, design choices, unequal outcomes.
- Source PDF page: 124
- Activity: Computing Impact Lab (planned)
- Modes: Bias evidence vs assumptions
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: No bias practice.

## 5.4 Crowdsourcing

- Coverage: **Not covered**
- Objectives: IOC-1.E — Evaluate contributions from many participants.
- Essential knowledge: IOC-1.E.1, IOC-1.E.2, IOC-1.E.3, IOC-1.E.4, IOC-1.E.5, IOC-1.E.6 — Distributed contributions; collective knowledge.
- Source PDF page: 125
- Activity: Computing Impact Lab (planned)
- Modes: Participation/evidence scenarios
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: No crowdsourcing practice.

## 5.5 Legal and Ethical Concerns

- Coverage: **Not covered**
- Objectives: IOC-1.F — Evaluate responsible creation and use.
- Essential knowledge: IOC-1.F.1, IOC-1.F.2, IOC-1.F.3, IOC-1.F.4, IOC-1.F.5, IOC-1.F.6, IOC-1.F.7, IOC-1.F.8, IOC-1.F.9, IOC-1.F.10, IOC-1.F.11 — Attribution, licenses, intellectual property, data rights.
- Source PDF page: 126
- Activity: Computing Impact Lab (planned)
- Modes: Facts vs judgments; supported reasoning
- Identification / application / explanation: Planned / Planned / Not yet independently verified
- Validation: Planned deterministic structured checks; free reflection unscored
- Implementation: Not implemented
- Testing: Not implemented / not tested
- Remaining gap: No legal/ethical practice; nuanced discussion and attribution required.

## 5.6 Safe Computing

- Coverage: **Practiced**
- Objectives: IOC-2.A, IOC-2.B, IOC-2.C — Explain privacy/security risks and protections.
- Essential knowledge: IOC-2.A.1, IOC-2.A.2, IOC-2.A.3, IOC-2.A.4, IOC-2.A.5, IOC-2.A.6, IOC-2.A.7, IOC-2.A.8, IOC-2.A.9, IOC-2.A.10, IOC-2.A.11, IOC-2.A.12, IOC-2.A.13, IOC-2.A.14, IOC-2.A.15, IOC-2.B.1, IOC-2.B.2, IOC-2.B.3, IOC-2.B.4, IOC-2.B.5, IOC-2.B.6, IOC-2.B.7, IOC-2.B.8, IOC-2.B.9, IOC-2.B.10, IOC-2.B.11, IOC-2.C.1, IOC-2.C.2, IOC-2.C.3, IOC-2.C.4, IOC-2.C.5, IOC-2.C.6, IOC-2.C.7 — Credentials, phishing, MFA, encryption, data collection.
- Source PDF page: 128
- Activity: Cybersecurity Defender
- Modes: Fictional-email inspection; password policy/reuse/MFA
- Identification / application / explanation: Partial / Implemented in listed modes / Not yet independently verified
- Validation: Generated structure; evaluated operations or exact algorithm; deterministic checks
- Implementation: Existing game audited
- Testing: Logic and DOM regression tests; rendered-device QA not available
- Remaining gap: Encryption, privacy, consent, malware, and collection risks missing.

## Computational thinking practices

| Practice | Current evidence | Remaining needs |
|---|---|---|
| 1. Computational Solution Design | Partial: routing and schedules evaluate solutions. | Design for a purpose, user needs, comparing approaches, collaborative project work. |
| 2. Algorithms and Program Development | Partial: list transformations and Boolean inputs. | Constructing full algorithms and multiple valid implementations. |
| 3. Abstraction in Program Development | Introduced: Code Concepts names abstractions. | Build and explain reusable procedures and data abstractions. |
| 4. Code Analysis | Partial: expression evaluation, lists, search, counted algorithms. | Purposeful testing, debugging, edge cases, and explanation. |
| 5. Computing Innovations | Limited: security and network concepts. | Innovation impacts, groups, privacy, ethics, evidence-based explanations. |
| 6. Responsible Computing | Limited: password/reuse/MFA and phishing. | Authentic collaboration, attribution, inclusive design, responsible data use. |

## Authentic work required

Collaboration (CRD-1.C; practice 6.A), user-focused development and documentation (CRD-2.E–H), creating a program (CRD-2.F), designing procedures (AAP-3.B), explanation of complexity (AAP-1.D; AAP-3.C), attribution and responsible data use require teacher-reviewed projects, collaboration evidence, and/or writing. Browser practice can support these objectives; it cannot certify their authentic completion.
