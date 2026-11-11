# Mastery policy schema

A mastery policy is the stored pathway policy plus an optional `challenge` block. It is validated by `validateMasteryPolicy()` in `cs-games/pathway/mastery/policy.mjs`, which never throws: it returns `{ok, errors, warnings, policy}`, where `policy` is a normalized copy with every default filled in.

## Top-level fields (the stored shape)

| Field | Type | Rule |
| --- | --- | --- |
| `id` | string | Stable. Required. A policy id plus a version names one immutable requirement. |
| `version` | whole number | 1 or more. Required. A change to any requirement is a new version, never an edit. |
| `provisional` | true or false | Required. A provisional policy never qualifies anyone; the node shows as needing teacher assessment. |
| `label` | string | Shown to people. Defaults to the id. |
| `minimumQuestions` | whole number or null | 1 or more. The minimum number of distinct first-try questions counted in one attempt. |
| `accuracy` | fraction or null | 0 to 1 with at most two decimal places of a percent, so `0.95` and `0.905` are valid and `95` and `0.12345` are not. Teachers type percentages; `percentToFraction(95)` gives `0.95`. |
| `coverage` | map | Legacy `{subskillId: minimumCorrect}`. Each entry becomes a subskill requirement matching events that carry that subskill id. |
| `scoreTarget` | 0 to 4 or null | The legacy teacher-score completion path in `evaluateNode()`. The challenge engine ignores it: qualification and the standards score stay separate. |
| `effectiveFrom` | ISO time or null | When a new version takes effect. A replacement attempt opens at this moment rather than whenever the check happens to run. |
| `exampleOnly` | true | Present on illustrative policies so a screen can label them. |

A policy is a practice challenge only when it is non-provisional and has both `minimumQuestions` and `accuracy`. Otherwise the node is provisional with the reason "no challenge requirements".

## The `challenge` block

All fields are optional; the defaults are shown.

| Field | Default | Meaning and validation |
| --- | --- | --- |
| `schema` | `cs-games.mastery-challenge/1` | Any other value is rejected. |
| `minimumCorrect` | null | An absolute number of correct first tries, in addition to the accuracy rule. The student must satisfy both. May exceed `minimumQuestions`. |
| `difficulties` | none | A list of `{difficulty, minQuestions, minCorrect}`. Names are matched exactly (case-insensitive) against the level on the event, so `mixed` and unlabeled answers never stand in. `minCorrect` cannot exceed `minQuestions`. |
| `subskills` | none | A list of essential subskills, below. |
| `subskillEvidence.maxUnmappedShare` | 0 | The share of counted answers allowed to lack the metadata a subskill selector needs. At 0, any such answer makes subskill evidence ambiguous and blocks qualification. |
| `families.minDistinct` | 0 | Distinct reasoning families that must each have at least `minCorrectEach` correct answers. 0 turns the requirement off. |
| `families.minCorrectEach` | 1 | Correct answers needed in a family for it to count. |
| `unscored.assisted`, `.skipped`, `.revealed` | `incorrect` | `incorrect` keeps the question in the denominator as not correct. `excluded` removes it from the denominator. Neither ever credits it as correct. |
| `unscored.maxExcludedShare` | 0.1 | Cap on excluded questions as a share of those presented. Over the cap the attempt fails its own requirement. |
| `requiredForAreaCompletion` | true | Whether the node blocks its learning area from completing. The class pathway's per-checkpoint `required` flag must also be true. |
| `review.staleAfterDays` | null | If set, a node whose requirements were met longer ago than this shows "review recommended". The earned result is never removed. |
| `description` | none | Free text for teachers. |

### Subskill entries

```json
{ "id": "negative-operands", "label": "negative operands",
  "match": { "familyIds": ["modulus:negative-dividend", "modulus:both-negative"] },
  "minExposure": 5, "minCorrect": 4, "minAccuracy": 0.8 }
```

`id` is stable, `label` is what students read. `match` may use `assessedModes`, `familyIds`, `familyPrefixes` and `topics`; when several are given, all must match. With no selector the subskill matches events that carry its id in their own `subskills` list, which is how legacy `coverage` works. `minExposure` is how many counted questions in the subskill the student must have met, `minCorrect` how many must be correct, and `minAccuracy` is an optional fraction. Requiring perfection is never the default: with 10 questions, 8 correct and 80% accuracy a single slip still passes. `minCorrect` cannot exceed `minExposure`; a `minAccuracy` of 1 raises a warning because one slip could never be recovered.

## Validation, warnings and what is rejected

Errors reject the policy: a bad version or id, a minimum below 1 or fractional, accuracy outside 0 to 1 or finer than 0.01 percent, an unknown challenge schema or selector, a duplicate subskill or difficulty, a correct count above its exposure, an unknown `unscored` rule, a malformed share. Suggested configurations (`executable: false`) are always rejected so they cannot be mistaken for approved policies. Warnings do not reject: a minimum below 5 makes the accuracy rule coarse, a non-provisional policy without a question minimum and accuracy has no challenge, and a 100% subskill accuracy is unrecoverable after one slip.

Separately from validation, `assessSupport()` checks whether the node can ever satisfy the policy. It returns `supported`, `provisional` (estimates the graph cannot confirm) or `unsupported` (verified impossibility), with each reason marked `verified` or not: fewer bound families than required, a required difficulty the skill does not offer, a fixed pool smaller than the minimum, a subskill selector that matches no family, or families and levels that are simply unknown.

## Versioning and compatibility

An attempt records the policy id, version and a content digest of the executable fields. If a policy with the same id and version but different content is presented once attempts exist against it, `syncAttempt()` throws rather than judging students against an edited requirement. A change is published as `version + 1`; earlier versions stay in the pathway's `policies` list, so old checkpoints, published revisions and recorded attempts remain interpretable. Published curriculum snapshots are not touched.

## Examples (illustrations only)

Quick Variable Identification, as the teacher described it. Variable Lab reports one family per identify skill, so only a one-family requirement is meaningful there.

```json
{ "id": "example:quick-variable-identification", "version": 1, "provisional": false, "exampleOnly": true,
  "minimumQuestions": 50, "accuracy": 0.95,
  "challenge": { "families": { "minDistinct": 1, "minCorrectEach": 1 } } }
```

Advanced Array Reasoning, applied to the 2D array tracing skill, with a required difficulty, two essential subskills and reasoning variety. Version 2 of the same id (25 questions at 95%) is the policy change used in the Student F demonstration.

```json
{ "id": "example:advanced-array-reasoning", "version": 1, "provisional": false, "exampleOnly": true,
  "minimumQuestions": 20, "accuracy": 0.9,
  "challenge": {
    "difficulties": [{ "difficulty": "advanced", "minQuestions": 10, "minCorrect": 8 }],
    "subskills": [
      { "id": "totals", "label": "row and column totals", "match": { "familyIds": ["row-sum", "column-sum", "maximum-row", "minimum-column"] }, "minExposure": 3, "minCorrect": 2 },
      { "id": "conditions", "label": "conditional array logic", "match": { "familyIds": ["conditional-total", "conditional-transform"] }, "minExposure": 3, "minCorrect": 2 } ],
    "families": { "minDistinct": 5, "minCorrectEach": 1 } } }
```

Neither is attached to any node. Both are `exampleOnly`, are labeled "EXAMPLE ONLY: not an approved mastery requirement", and the tests assert the graph and every default pathway carry none.
