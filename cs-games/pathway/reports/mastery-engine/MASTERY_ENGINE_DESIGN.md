# Mastery challenge engine: design

## What this is

A small set of pure ES modules in `cs-games/pathway/mastery/` that answers one question for one student and one skill: has the practice record met the teacher's configurable requirements, and if not, what exactly is still missing? It reads practice records, a mastery policy and the history of earlier attempts, and returns a progress object that a future learning map, student sidebar and teacher preview can all display. It writes nothing, calls no network, reads no clock, and activates no requirement anywhere. Every policy in the package is an illustration used by tests, and the curriculum graph, the stored pathways and the Worker are untouched.

The engine reuses what the pathway code already has. A mastery policy is a superset of the policy `model.mjs` stores (`id`, `version`, `provisional`, `label`, `minimumQuestions`, `accuracy`, `coverage`, `scoreTarget`), so `validatePathway()` and `diffPathways()` accept it unchanged and checkpoints keep pointing at it through `policyId` and `policyVersion`. Node attribution calls the same `questionEvidence()` selector logic the Worker applies at ingest. The 0 to 4 standards score is read through `evaluateNode()`, never recomputed. An award record has the shape `evaluateNode()` already recognizes.

## Modules

| Module | Responsibility |
| --- | --- |
| `arithmetic.mjs` | Exact accuracy math in integer basis points: minimum correct, recovery, mistake allowance, truncated percentages. The only place thresholds are compared. |
| `policy.mjs` | The versioned policy schema, validation, defaults, digest, and conversion to and from the stored pathway shape. |
| `events.mjs` | Normalizes raw practice records (outbox events or stored rows) into immutable, scoped evidence. Rejects with a reason instead of guessing. |
| `evaluate.mjs` | Pure evaluation of one node's evidence against one policy: counted questions, requirements, diagnostics, recovery numbers, content support. |
| `attempts.mjs` | Attempt lifecycle and append-only history: open, complete, restart, supersede, verify invariants. |
| `progress.mjs` | The progress contract and the plain-language explanation. |
| `area.mjs` | Learning-area completion from required nodes. |
| `pathway.mjs` | Reads a stored class pathway and returns progress for every checkpoint and area. |
| `award.mjs` | Server-side only. The one place an official award can be produced, and only through a trusted-evidence boundary. Not exported by `index.mjs`. |
| `examples.mjs`, `suggestions.mjs` | Illustrative policies (executable, flagged example-only) and teacher suggestions (not executable). Kept apart on purpose. |
| `synthetic.mjs`, `demo.mjs` | Deterministic synthetic practice and the six-student demonstration. |

## What counts as a scored question

A scored question is the first submitted attempt at one distinct question, identified by session and question id, credited to the node or nodes its assessed mode and family map to in the graph. The rules below are enforced in `selectRecords()` and `creditOf()` and each has a test.

A correct first answer counts as correct. An incorrect first answer stays incorrect even if the student fixes it on a retry, and a retry never adds credit however many arrive. The same event id arriving twice, or the same question reported again under a new event id, counts once. A retry that arrives without its first attempt (the first was lost) earns nothing and is reported as a limitation, because inventing the missing first attempt would be inventing state.

Skipped and revealed questions never earn correct credit. By default each stays in the denominator as incorrect, so a student cannot raise accuracy by skipping or revealing hard questions: 18 right and 12 skipped is 60%, not 100%. A hint-assisted answer is not independent credit either and is handled the same way. A policy may instead choose `excluded` for any of the three, which takes the question out of the denominator, but only up to `maxExcludedShare` of the questions presented (10% by default). Beyond that cap the attempt fails a dedicated requirement, so excluding questions cannot be used to hide difficult ones.

A deliberate difference from the stored tallies: the Worker writes `n` and `c` as zero for assisted answers, which removes them from both numerator and denominator. The engine's default keeps them in the denominator. A teacher who prefers the Worker's behavior chooses `excluded` and accepts the cap.

Mixed Practice needs no special handling. The page reports the mode of the question actually shown as `assessedMode`, the engine credits that mode and family, and an event whose assessed mode is "mixed" or missing is rejected. Focused and Mixed answers for a node are one stream feeding one attempt, with no separate requirements by practice mode (see `MIXED_PRACTICE_CREDIT.md`).

## Five things that are never merged

The progress object reports five facts side by side. Challenge qualification is whether the practice record met the teacher's requirements. Verified or official mastery is whether a trusted-evidence boundary has awarded it. Learning-area completion is derived from required nodes. The standards score is the teacher's 0 to 4 assessment, read through `evaluateNode()` and never set by the engine, so completing a challenge cannot produce a 4 or any other score. Pacing is `pacingStatus()` in `model.mjs` and is not computed here. A node can qualify while unverified, hold an award under a retired policy version, belong to a complete area, and still have no standards score.

## Evidence trust

Browser events are self-reported and therefore provisional. `normalizeEvent()` sets `trust` only from a `trustResolver` the integrator passes in, defaults to provisional, and ignores any `trusted`, `verified` or `trust` field on the record itself (noting that it did). The engine may evaluate provisional events for practice progress and qualification previews. An official award needs two things the browser cannot supply: every counted event verified by the integrator's own resolver, and an explicit boundary object, `{kind: 'trusted-evidence-boundary', issuer, verifiedEventIds}`, covering every event the attempt claimed. With either missing, `proposeAward()` refuses with a named reason. The function lives in `award.mjs`, which the browser-safe `index.mjs` does not export, and a test pins that. The module cannot check an attestation cryptographically, so the integration must call it only from authenticated server code. No Worker authorization, client privilege or D1 migration is part of this package.

## Family diversity and question pools

The engine consumes question metadata and never generates questions. Diversity means distinct reasoning families the graph binds to the node, taken from the event's `familyId`. Different generated values and different surface wording are not families, so fifty variations of one family count as one. A family name the graph does not bind to the node is listed as unbound and does not count. If the policy asks for family variety and no list of real families is available for the node, the requirement is reported unverifiable and the node is provisional rather than passed.

This matters in the real graph. Only 54 of 290 nodes (all Advanced CS) have source-reported families, and 236 report none the graph can bind. Variable Lab reports one family per identify skill, so only a one-family requirement can be met there. `assessSupport()` flags these cases, marking verified facts (the graph lists fewer families than required, a difficulty is not offered, a fixed pool is smaller than the minimum) separately from estimates (family or level availability is simply unknown). A later content repair can strengthen a pool by having the lab report a reasoning family for every question, adding the family to the graph's bindings through `build-graph.mjs`, and then raising the family requirement. Until then the right setting is a lower family count or none, and the engine says so rather than pretending.

## Limitations stated by the engine itself

Practice pages do not record skipped or revealed questions: the session tracker emits an event only on a submitted answer. The engine applies the skip and reveal rules to any record that carries those flags, but until a server-side "question presented" record exists it cannot count a question the student only skipped, so a skip-heavy student looks better in browser data than the rules intend. Every evaluation carries a `SKIPS_NOT_RECORDED` limitation. Browser timestamps come from the student's clock, so windows rely on them being roughly right; events dated more than five minutes in the future are rejected. Subskills are selected from metadata the pages actually send (assessed mode, family, topic), because no page sends a subskill list. Events that lack the metadata a subskill selector needs make the subskill evidence ambiguous, and the node is not certified from them unless the policy allows a stated share of such events.

## Where it plugs in later

`pathwayProgress()` takes a stored pathway, a profile id and raw practice records, and returns progress for every checkpoint and area plus the updated histories. `INTEGRATION_HANDOFF.md` lists the integration points, a proposed persistence design (not a migration), and the order of work for ChatGPT Work.
