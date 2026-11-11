# Compatibility with the existing policy, checkpoint and evidence structures

The requirements are stored in structures that already exist. This document lists each of them, what this package does with it, and what it guarantees not to touch. Each statement is backed by a test in `requirements-versioning.test.mjs`, `requirements-levels.test.mjs`, `requirements-limits.test.mjs` or `requirements-engine.test.mjs`.

## What exists, and how the requirements use it

| Existing structure | How it works today | What this package does |
| --- | --- | --- |
| `pathway.policies[]` | A list of versioned policies. The model requires a unique `id@version`, a whole-number version, a boolean `provisional`, a `coverage` object, and valid `minimumQuestions`, `accuracy` and `scoreTarget` values. | Each requirement level is one entry with a reserved id (`policy:req:class`, `policy:req:area:<areaId>`, `policy:req:skill:<nodeId>`). Entries pass the model's own validation and the engine's `validateMasteryPolicy`. |
| Checkpoint `policyId` + `policyVersion` | Each skill's checkpoint names the policy it is measured against. | Unchanged. After an edit each checkpoint is pointed at the most specific level that exists: skill, else area, else class, else `policy:provisional`. A test checks every reference resolves to an existing policy and version through every kind of edit. |
| `policy:provisional` | The built-in "nothing set, teacher assessment required" policy every new pathway starts with. | Kept. Skills with no requirement point at it, and an incomplete level (missing the question count or the accuracy) is stored as provisional so it can never pass for an approved one. |
| Policy versions | A published version must never change; a changed policy needs a new version. The shared service enforces it by comparing the draft with every historical version. | Respected. A version in the published revision is never edited: the first change creates the next version, further changes before the next publish edit that draft-only version, and removing a published override adds a retired marker instead of deleting. The memory adapter repeats the service's check, and a test runs a long sequence of edits to show the operations never produce an edit the service would refuse. |
| Draft, preview and publish | The shared class pathway service stores a draft, previews the changes with a token, and publishes a numbered revision, with a curriculum snapshot pinned at publish. | Unchanged. The service adapter makes the same three calls in the same order with the same tokens. The service stores the pathway as it is received, so the extra fields described below are kept. |
| `validatePathway`, `diffPathways`, `studentContract` | The model's validation, change list, and the contract students receive. | A pathway edited here still passes validation and the diff, and the student contract carries the policies. |
| The mastery engine (`mastery/`) | Judges evidence against a normalized policy: `validateMasteryPolicy`, `nodeProgress`, `pathwayProgress`. | Used as it is. Policies built here pass the engine's validation and the engine measures exactly the saved numbers. No engine file was changed. |
| `evaluateNode` (the older completion logic in `evidence.mjs`) | Accepts an ordinary policy. | Accepts a requirement policy as an ordinary policy and agrees with the new engine where both can answer (tested). |

## Fields added to a policy

A requirement policy carries the normal policy fields plus two additions the existing code ignores:

- `requirementSource`: `{ schema: 'cs-games.mastery-requirement/1', level, scopeId, explicit: [...], preset, retired? }`. `explicit` lists the settings that level chose itself; the preset is only a label and is `custom` unless the numbers match a preset exactly.
- `calibration: 'teacher-defined; not system-calibrated'`. This is the engine's own marker for a policy whose numbers did not come from calibration. The package never labels a teacher's numbers as calibrated (a negative control checks it).

Plus the engine's `challenge` block for the optional settings (minimum correct, difficulties, variety, essential topics, skipped-question handling, area completion, review reminder).

Nothing else in the pathway changes. A test compares the pathway before and after a configuration change and finds differences only in `policies` and in checkpoint `policyId` and `policyVersion`.

## Single source of truth

There is no second store. The settings a level **chose** live in `requirementSource.explicit` of its own policy. The other values in that policy are copies of what it inherited. Every operation re-derives all copies from the explicit choices, and `verifyConsistency` reports any copy that differs; a hand-edited copy is detected and repaired (tested). A change to the class defaults therefore reaches every policy that inherits from it, and a skill that chose its own value keeps it.

## Pathways, policies and checkpoints written before this feature

- **Opening a pathway here changes nothing.** Re-deriving a pathway that has no requirement policies returns it byte-for-byte, and the same holds for a pathway that uses the older editor's policies.
- **Older-editor policies** (any policy whose id is not one of the three reserved forms and not `policy:provisional`) are treated as a skill-level choice: they are shown as "Set in the older policy editor", they are not replaced by class defaults, and the policy object itself is never modified. If the teacher later sets an extra setting on such a skill, its existing question count and accuracy are carried over. If the older policy was never activated (it was still provisional), the table says so.
- **Restoring a skill to inherited** is the one action that moves a skill off an older-editor policy: the checkpoint is repointed at the area or class policy, and the older policy stays in `policies[]` (history preserved).
- **Published revisions** are never rewritten. Re-deriving a published pathway changes nothing, and repeating an edit after publishing creates no new version.

## What is never touched

| Item | Guarantee |
| --- | --- |
| Published pathway snapshots, the pinned curriculum snapshot, the schedule, sessions | Not touched by any requirement edit (each tested) |
| The curriculum graph and question families | Identical after any edit (290 nodes, 453 families, regenerated byte-identical) |
| Student evidence and mastery history | Not read, written or deleted. The engine recomputes progress from stored evidence, so changing a requirement after students have practiced keeps their evidence, and they are measured against the new version (tested here). Earlier results are kept in the engine's attempt history and flagged for review rather than removed (tested in the engine suites, `mastery-engine-attempts`) |
| Student profiles | Not touched |
| Published pathways | Students continue to see the published revision. A draft does not change what a student is shown (tested) |
| Mixed Practice | Compatible: Mixed answers count toward each skill from the question shown, once, alongside focused practice, and a Mixed answer arriving twice counts once (tested) |
| `award.mjs` (the server-only certification function) | Not imported, not exported from any browser entry point (tested) |
| Worker routes, authorization, D1 schema | Not touched. No migration. |
| Question generators and anti-repeat protections | Not touched. No question family is invented to make a requirement possible. |
| The Teacher Tools redesign | Not touched |

## Two classes, two thresholds

Requirements belong to a class pathway, not to a skill. The same skill can be measured against 30 at 90% in one class and 50 at 95% in another with no shared state, and the same student practice can meet one class's requirement and not the other's (tested in `requirements-levels` and `requirements-engine`).

## Changing a requirement after students have practiced

Practice is stored as evidence, not as a verdict. When a requirement changes, a new policy version applies from its publish time, and the same evidence is measured against it (a test checks that the evidence is intact and the new numbers apply). What happens to a result a student already earned is the engine's behavior, not something this package adds: the earlier result stays in the attempt history and is flagged "review recommended" with a reason, and a new attempt opens under the new version, counting from the publish time (see `mastery-engine/ATTEMPT_LIFECYCLE.md` and decision 10 in `TEACHER_DECISIONS.md`). That history is not persisted anywhere yet; persisting it is the separately approved step described in the engine's handoff. The earlier policy version stays in `policies[]`, and nothing is erased.
