# Default class practice requirements

> The later [PR #49 repair](wpr-mastery/PR49_REPAIR.md) documents authenticated scoring and the automated coverage decision. The original findings below describe the earlier draft.


> Workplace Readiness status. The [draft evidence review](wpr-mastery/INDEPENDENT_REVIEW.md) documents 30 proposed requirements held pending educator approval and question-level integrity validation. The deployed classification remains 129 automatic nodes out of 290.


CSG-TCH-04, CSG-STU-03 and CSG-MAS-01/03. Baseline `e931fac` (PR #44).

The deployed guest course chooser, Map and keyboard-operated List were available before this change. The hosted Worker advertised profile and mastery history support. Hosted Teacher Tools requested a Google teacher session. The baseline class-creation code and isolated database tests showed the full undated pathway published on creation, with all checkpoints provisionally configured and no practice threshold. The existing editor, normalization and first-attempt de-duplication, area roll-up, restart history, offline profile outbox and teacher assessment records are reused.

| Course | Nodes reviewed | Quick Recognition | Standard Practice | Complex Reasoning | Teacher assessment |
| --- | ---: | ---: | ---: | ---: | ---: |
| Advanced CS | 123 | 18 | 61 | 40 | 4 |
| AP CSP | 58 | 0 | 7 | 3 | 48 |
| Workplace Readiness | 94 | 0 | 0 | 0 | 94 |
| Robotics | 15 | 0 | 0 | 0 | 15 |
| Total | 290 | 18 | 68 | 43 | 161 |

The 161 exceptions comprise 11 small banks and 150 skills without enough verified evidence or coverage for this rollout. Ten AP CSP nodes use reviewed direct evidence from their activities. Newly created classes assign CSP-NUMERIC to Standard Practice (30 questions at 90% accuracy) based on reviewed Roundoff vs. Overflow Lab evidence. The [coverage audit and 290-node matrix](coverage/CLAUDE_MASTERY_COVERAGE_AUDIT.md) document the remaining assessment routes. Other AP CSP skills remain available for practice and formative feedback where supported. Workplace class reporting can collect practice without individual automatic mastery mapping. Parts Sprint has 4–14 distinct components per category. Assigning 50 identifications to an individual category would rely on repetitions. Course Architect uses open design work. Component Challenge’s graph selectors are marked adapter-pending for automatic mastery. Variable declaration assembly remains teacher-assessed.

The [assignment rules](../requirements/recommended.mjs), [evidence registry](../evidence-gap-registry.json) and existing Variable/String replay and AP CSP integration tests document the coverage used for assignment. Java focused replay checked 102 registry-backed skills, with a second pass inspecting the actual scenario, source blocks and simulator inputs for the low apparent counts. For example, Loop Lab component questions identify syntax, loop-type questions select a design for a scenario, and nested loops require tracing changing state. Documentation comment repair uses an inspection and correction task, while direct documentation lookup starts at the recognition tier. Small fixed banks include Java override recognition and Documentation Lab builder. The teacher review uses bounded content facts where verified. Other generated banks can continue drawing questions. Their maximum distinct item count is unknown.

Fifty-one skills include at least one correct answer in each of two independently bound reasoning families. The binding must be present in the graph and supported by focused replay or the String Lab evidence replay. Two response options, answer shuffles and formatting changes cannot satisfy that rule. No automatic difficulty or essential-topic coverage was configured. The existing editor can add these constraints and shows available feasibility findings. Some generators supply difficulty but no dependable family metadata, or bind families without sufficiently precise subskills. Automatic target eligibility and formative Level 3 eligibility remain separate.

A new class publishes the selected starting requirements in the same database transaction as class creation. Existing classes use their existing snapshots and policies. The migration-free opt-in for an unconfigured class creates a draft and requires the existing preview and publish sequence. Tier membership and the resolved policy references are pinned in the pathway. Each field inherits separately through a skill or area override. Mixed Practice resolves to the same skill as a focused question. Modes that share a node share its policy, including LinkedList Link and Mutate. Existing history rows keep their original policy reference and attempt snapshot. Students can see the earlier threshold from the stored policy. No assessment is awarded for completing a practice target.

The prior class-policy coupling in the formative evaluator remains under CSG-PKG-08. Newly introduced tier-based targets are independent inputs to the existing target evaluator. The existing formative rubric receives the same evidence and does not consume the new practice targets. Older classes retain their evaluator behavior and policy versions. No database migration is required.
