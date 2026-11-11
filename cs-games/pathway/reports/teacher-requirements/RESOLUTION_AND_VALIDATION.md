# Resolution and validation logic

This is the exact behavior of `cs-games/pathway/requirements/`. Everything here is a pure function of the pathway it is given: no storage, no network, no clock. Time is passed in.

## Settings a level can choose

| Setting | Stored in the policy as | Entered as | Notes |
| --- | --- | --- | --- |
| Minimum questions | `minimumQuestions` | whole number, 1 to 1000 | `30.5`, `-3`, `1e2`, blank and `0` are refused |
| Required accuracy | `accuracy` (a fraction, `0.9`) | percentage, 1 to 100, at most two decimals | `95`, `95%` and `92.5` are accepted; `0.90` is refused (it would mean under 1%) |
| Minimum correct answers | `challenge.minimumCorrect` | whole number, optional | required in addition to accuracy |
| Difficulty levels | `challenge.difficulties[]` | level, questions, correct | e.g. 10 Advanced questions, 8 correct |
| Question variety | `challenge.families` | kinds, correct in each | |
| Essential topics | `challenge.subskills[]` | per skill only | each skill has its own topics, so class and area levels refuse them |
| Skipped, revealed, hinted | `challenge.unscored` | count as incorrect, or leave out (limited share) | default: count as incorrect |
| Needed to finish the area | `challenge.requiredForAreaCompletion` | yes or no | default yes |
| Review reminder | `challenge.review.staleAfterDays` | days, optional | flags "review recommended"; never removes a result |

Accuracy is held as integer basis points inside the engine (`95` becomes `9500`), so `0.95 * 50` floating-point noise cannot occur. Every percentage from 1.00 to 100.00 in steps of 0.01 is tested to convert exactly.

## The three levels

A level is one policy with a fixed id: `policy:req:class`, `policy:req:area:<areaId>`, `policy:req:skill:<nodeId>`. Any other id is either `policy:provisional` ("nothing set") or a policy written by the older pathway editor, which this package treats as a legacy skill-level choice and does not rewrite (see `EXISTING_POLICY_COMPATIBILITY.md`).

**Precedence is per setting: skill, then area, then class.** For each setting independently, the value comes from the first level in that chain that chose it. A skill that sets only its accuracy takes its question count from its area, or from the class if the area did not set one. Each value is reported with its source (`default`, `class`, `area`, `skill`, or `legacy`), which is what the screens show as "Class defaults", "This learning area" and "Set for this skill".

**Intent and derived copies.** Each level policy records in `requirementSource.explicit` the settings that level chose itself. Its other values are copies of what it inherited. Every operation works like this:

1. read the explicit choices of every level (`readIntent`);
2. apply the edit to those choices;
3. write every level policy again from the choices, resolving inherited values down the chain (`writeIntent`);
4. point each checkpoint at the most specific level that exists.

Because step 3 re-derives every copy, changing the class defaults reaches every policy that inherits from it, and a hand-edited copy is overwritten. `verifyConsistency` reports any stored copy that differs from what its explicit choices would produce; a test edits a copy by hand and checks it is detected and repaired.

**Checkpoints.** A checkpoint references `policyId` and `policyVersion`, exactly as before. After an edit it points at the skill's own policy if one exists, else its area's, else the class's, else `policy:provisional`. Checkpoints that point at a legacy policy are left alone unless the teacher restores that skill to inherited.

## Operations

All return `{ ok, pathway, errors, warnings, changed, kept, problems, incomplete }` and never modify their input.

| Operation | What it does |
| --- | --- |
| `applyToClass`, `applyToAreas`, `applyToSkills` (all `setSettings`) | Set (and optionally `clear`) settings at one level for one or many scopes. Lower levels that set the same setting **keep their own value** and are listed in `kept`; `replaceLowerOverrides: true` clears just the overlapping settings instead. |
| `resetToInherited` | Remove a level's own settings (all, or only listed `fields`) so it follows the level above. For a skill this also restores it from a legacy policy. |
| `clearSkillOverridesInAreas` | Remove every skill's own settings inside chosen areas in one step. |
| `copyAreaSettings` | Copy what a source area **chose itself** to other areas. It is a copy, not a live link. Refuses a source with nothing of its own, an unknown area, or no destination. |
| `stampPublishTime` | Set `effectiveFrom` on requirement policy versions the published revision does not have yet. Returns a copy. |

Rules every operation follows:

- Typed input is validated first (`validateSettings`); invalid input is rejected with a plain message and **nothing changes**.
- A level that has settings must leave every skill it touches with **both** a question count and an accuracy. Class defaults need both outright; an area or skill may set one and inherit the other, but is refused if nothing above supplies the other.
- Every changed policy is also checked with the engine's own `validateMasteryPolicy`, and the pathway is checked with the existing `validatePathway`.
- A blocked problem (below) rejects the whole edit; nothing is saved.
- Repeating the same edit changes nothing and creates no new version. The order of edits at different levels does not change the result.
- Areas or skills that are no longer in the plan have their settings retired and nothing keeps pointing at them.

## Impossible and risky requirements

The check uses the engine's `assessSupport` plus the facts the repository can verify (`buildContentFacts`). Each finding carries `verified` (true or false) and `basis` (`verified` or `estimate`), and one of four statuses.

| Status | Meaning | Can save a draft | Can publish |
| --- | --- | --- | --- |
| `ok` | nothing found | yes | yes |
| `warning` | an estimate or something that cannot be verified | yes | yes, after the teacher acknowledges the notes |
| `draft-only` | a verified shortfall that content could fix later | yes | **no** |
| `blocked` | impossible as written | **no** (nothing is saved) | no |

| Finding | Status | Verified? |
| --- | --- | --- |
| A difficulty level the skill is known not to offer (including a skill with no levels at all) | `blocked` | verified |
| Question pool smaller than the minimum, where the pool is fixed | `blocked` | verified |
| Question pool smaller than the minimum, where more questions can be added | `draft-only` | verified |
| More kinds of questions required than exist | `draft-only` | verified |
| An essential topic with no questions | `draft-only` | verified |
| Question variety on a lab that does not report its question kinds | `warning` | cannot be verified |
| It is not known whether a required difficulty level exists | `warning` | cannot be verified |
| Estimated pool size smaller than the minimum | `warning` | estimate, labeled as one |
| Practice on the skill is not verified to be counted automatically | `warning` | cannot be verified |
| The minimum leaves no room for a mistake (under 20 questions at a high accuracy) | `warning` | verified arithmetic; a student can keep answering to recover |
| 100% accuracy | warning on the form | one mistake can never be recovered inside an attempt |
| A minimum-correct count larger than the question minimum | warning on the form | students will answer more than the minimum |

Blocking applies through areas and the class: if one skill under a class or area edit cannot meet it, the whole edit is refused and the message names the skill. Nothing is lowered, rewritten or "fixed" to make a requirement possible, question families and the curriculum graph are identical after any edit, and the requirements code does not reach into question generation, the labs, the Worker or authentication (tests check each).

**What the repository can and cannot verify today.** For the Advanced CS course (123 skills): practice evidence is verified for all 123; question kinds are bound for 54 (variety can be checked there, and for the other 69 it is a warning); difficulty levels are recorded for 65, 37 have a recorded empty list (a difficulty requirement is blocked for those), and 21 are unknown (a warning). For the other courses (CSP, Workplace Readiness, Robotics: 167 skills) no practice evidence, question kinds or difficulty levels are recorded, so every check there is a warning and a teacher is told practice may not count automatically. No question-pool size is recorded for any skill; pool checks run only when a host supplies sizes.

## Review and change summary

`reviewRequirements(draft, published, graph, { facts, acknowledged })` returns what the Review tab shows:

- `table`: one row for the class defaults, one for each learning area or skill that has settings of its own, and one for each skill still on an older-editor policy, each with its settings in words and the number of skills it governs; plus counts of skills using the class, an area, their own settings, an older policy, or nothing. No identifiers appear;
- `differences`: what changes for teachers and students compared with the published version, as plain sentences ("12 skills in Math Lab: 50 questions at 95% (was 30 questions at 90%)."), including own settings that were added, changed or removed;
- `problems`: findings grouped under a plain heading in the fixed order cannot be saved, can be saved as a draft but not published, worth knowing;
- `pendingPolicies`: requirement versions the published revision does not have yet;
- `readiness.canSaveDraft` (false only for blocked findings) and `readiness.canPublish`, with readable `reasons`.

`canPublish` is false when there are no changes, a blocked or draft-only finding exists, a level has settings but not both numbers, or warnings exist and the teacher has not acknowledged them.

## Versioning

- **Draft:** before anything is published, edits reuse version 1 and activate nothing.
- **First change after publishing:** creates the next version of the affected policies. The published version stays byte-for-byte what it was.
- **More edits before the next publish:** change that draft-only version in place, so a long editing session does not create a long history.
- **Publish:** `stampPublishTime` sets `effectiveFrom` once on each new version; earlier versions keep their own time.
- **Removing an override after publishing:** adds a retired marker version instead of deleting history. Turning requirements off leaves skills with no requirement, never a stale one.
- **History:** every earlier version stays in `pathway.policies[]`.

`effectiveFrom` is stamped at publish so a replay of student evidence is deterministic. What students are evaluated against is the published revision; a draft is not read by progress (a test checks that a draft does not change what a student is shown).

## What this does not do

It does not decide that a requirement is fair, calibrate a threshold, award mastery, set a standards score, or change what counts as a question. Those remain the teacher's decisions and the engine's measurements.
