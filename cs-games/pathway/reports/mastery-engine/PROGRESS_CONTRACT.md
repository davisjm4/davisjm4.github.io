# Progress data contract

`nodeProgress()` in `cs-games/pathway/mastery/progress.mjs` returns one object per skill, and `areaProgress()` one per learning area. A future learning map, student sidebar and teacher preview should all read these objects and compute nothing of their own, so they cannot disagree about whether a student has met a requirement. `pathwayProgress()` returns the nodes and areas for a whole class pathway in one call. Schema ids are `cs-games.mastery-progress/1`, `cs-games.mastery-area-progress/1` and `cs-games.mastery-pathway-progress/1`; a consumer should check them.

## Node progress

| Field | Meaning |
| --- | --- |
| `nodeId`, `areaId`, `title` | Identity and the skill title to show. Titles come from the graph (or the pinned published snapshot). |
| `required` | Whether the skill counts toward area completion. |
| `status` | `not-started`, `in-progress`, `requirements-met`, `review-recommended`, or `provisional` (needs verification or teacher setup). |
| `statusReason` | Why, when it is not obvious: `policy-not-approved`, `no-challenge-requirements`, `requirements-cannot-be-met`, `families-cannot-be-verified`, `policy-changed`, `stale`. |
| `attemptStatus` | The attempt state: `not-started`, `in-progress`, `requirements-not-yet-met`, `requirements-met`, `restarted`, `superseded-by-new-policy`. |
| `verification` | `provisional` for browser evidence, `verified` only when an award recorded through the trusted boundary exists for the last completed attempt. |
| `policy` | `{id, version, configured, exampleOnly}`. Show the label "example" when `exampleOnly` is true. |
| `requirements` | Required minimum questions, required accuracy as a fraction and as a percentage, minimum correct, correct answers needed at the minimum, the essential subskills (with labels), required difficulties, minimum families. Null when the policy has no challenge. |
| `attempt` | Questions attempted and correct, accuracy as a fraction and as a percentage truncated to one decimal, distinct families, excluded counts, the window start and the attempt id. |
| `remaining.questions` | Questions still needed to reach the minimum. |
| `recovery` | The arithmetic below. |
| `missing` | `subskills` (id, label, whether exposure or performance, how many), `families` (have and needed), `difficulties` (level, why, how many). |
| `diagnostics` | Coded reasons: `INSUFFICIENT_COUNT`, `LOW_OVERALL_ACCURACY`, `MISSING_SUBSKILL_EXPOSURE`, `LOW_SUBSKILL_PERFORMANCE`, `INSUFFICIENT_FAMILY_VARIETY`, `MISSING_REQUIRED_DIFFICULTY`, `LOW_DIFFICULTY_PERFORMANCE`, `INSUFFICIENT_CORRECT`, `AMBIGUOUS_SUBSKILL_EVIDENCE`, `FAMILY_METADATA_UNAVAILABLE`, `EXCESSIVE_EXCLUSIONS`. |
| `requirementChecks` | Every requirement with its required and actual values and whether it is met, for a detailed teacher view. |
| `lastCompletedAttempt` | The most recent attempt that met its requirements: attempt id, sequence, policy id and version, closing time, counts. Null if none. |
| `lifetime` | Total distinct questions answered, first-try correct, attempts, restarts. Never reset by a restart. |
| `reassessment` | Present when a new policy version or staleness means the student should practice again: `{needed, reason, earnedUnder, now}`. |
| `standards` | `{score, source: 'teacher-assessment', separateFromChallenge: true}`. The 0 to 4 score as `evaluateNode()` reports it. Null until a teacher assessment exists. The engine never sets it. |
| `award` | The official award, or null. |
| `support` | Whether the requirements can be met with the question variety available: `supported`, `provisional` or `unsupported`, each reason marked `verified` or an estimate. |
| `trust` | Counted events that are verified and provisional. |
| `limits` | Data limitations that apply, such as skips not being recorded. |
| `explanation` | `{headline, lines, text}`: a plain-language explanation using titles and labels only, never ids. |

## The recovery arithmetic

All of it comes from `arithmetic.mjs`, in exact integer basis points, and the same functions serve teacher previews and student progress.

| Field | Meaning |
| --- | --- |
| `remainingQuestions` | Questions short of the minimum. |
| `correctNeededAtMinimum` | The fewest correct answers that satisfy accuracy when exactly the minimum have been answered, or the minimum-correct requirement if larger (48 for 50 at 95%, 27 for 30 at 90%, 18 for 20 at 90%). |
| `accuracyMet` | Whether current accuracy meets the target. Nothing answered never meets it. |
| `additionalCorrectForAccuracy` | The fewest additional consecutive correct answers after which accuracy reaches the target. Null when no number can (a 100% target after any miss). 25 of 30 at 90% gives 20. |
| `additionalAnswersLowerBound` | The larger of that and `remainingQuestions`: the fewest more answers, all correct, that satisfy count and accuracy together. |
| `mistakesAllowedAtMinimum`, `mistakeBudgetAtMinimum`, `minimumCheckpointReachable` | Wrong answers that still leave the threshold reachable when exactly the minimum have been answered, the total budget at that point, and whether it is still reachable. |
| `mistakesBeforeThresholdBreaks` | Wrong answers the current accuracy can absorb before dropping under the target. |
| `lowerBoundOnly`, `otherRequirementsOutstanding` | True when a subskill, family, difficulty or other requirement is also unmet. The additional-correct figure is then an accuracy-only minimum. |
| `guaranteesRequirementsMet` | Always false. The engine never promises mastery from an accuracy calculation. |

A display must not turn `additionalCorrectForAccuracy` into a promise. When `lowerBoundOnly` is true the explanation says "counting accuracy only" and lists what else is outstanding.

## Explanations the engine writes

Below the minimum: "You've answered 24 of the 30 required questions. Your accuracy is 92%. You still need to practice questions about integer division." At the minimum with low accuracy: "You've answered 20 questions and 17 were right on the first try (85%). You don't need to restart. Keep practicing: at least 10 more correct answers in a row would bring your accuracy to 90%." With another requirement outstanding, it adds that the figure covers accuracy only. When a 100% target is out of reach: "Reaching 100% is no longer possible in this attempt. You can restart; your earlier work stays in your history." When requirements are met: "You've met the practice requirements for Modulus. This is a practice milestone. It becomes official mastery only after it is verified." After a policy change: "You met the earlier requirements for Modulus. Your teacher updated them, so a new challenge is open: answer at least 25 questions with at least 95% correct on the first try. Your earlier progress is saved." When the requirements cannot be met with the questions available, or the question variety cannot be checked, it says so and tells the student their answers are still saved.

Percentages are truncated to one decimal and never rounded up, so 94.9% is never displayed as 95%.

## Area progress

| Field | Meaning |
| --- | --- |
| `areaId`, `title`, `label` | Identity and a ready label such as "5 of 7 skills complete". |
| `status` | `complete`, `in-progress`, `not-started`, `provisional` (every required skill still needs requirements), or `no-required-skills`. |
| `requiredTotal`, `requiredCompleted`, `requiredInProgress`, `requiredNotStarted`, `requiredProvisional`, `reviewRecommended` | Counts of required skills. |
| `optionalTotal`, `optionalCompleted` | Optional skills never block completion. |
| `qualified`, `verified` | Every required skill met its practice requirements; and every one also holds an official award. Different claims. |
| `completedNodeIds`, `remainingNodeIds`, `needsConfiguration` | For drawing the map. |

## Five separate facts

A node or area can be qualified without being verified, verified under a retired policy version, complete while its pacing is behind, and have no standards score at all. Keep them in separate parts of the display: challenge qualification is `status` and `attempt`; official mastery is `verification` and `award`; area completion is the area object; the standards score is `standards.score`; and pacing comes from `pacingStatus()` in `model.mjs`, which the engine does not compute.

## Sample (Student B, at the 20-question minimum, abridged)

```json
{ "schema": "cs-games.mastery-progress/1", "title": "Trace 2D Array Algorithms",
  "status": "in-progress", "attemptStatus": "requirements-not-yet-met", "verification": "provisional",
  "policy": { "id": "example:advanced-array-reasoning", "version": 1, "configured": true, "exampleOnly": true },
  "requirements": { "minimumQuestions": 20, "requiredAccuracyPercent": 90, "correctNeededAtMinimum": 18, "minimumFamilies": 5 },
  "attempt": { "attempted": 20, "correct": 17, "accuracyPercent": 85, "distinctFamilies": 10 },
  "remaining": { "questions": 0 },
  "recovery": { "accuracyMet": false, "additionalCorrectForAccuracy": 10, "lowerBoundOnly": false, "guaranteesRequirementsMet": false },
  "missing": { "subskills": [], "families": null, "difficulties": [] },
  "lifetime": { "questionsAnswered": 20, "firstTryCorrect": 17, "attempts": 1, "restarts": 0 },
  "standards": { "score": null, "source": "teacher-assessment", "separateFromChallenge": true },
  "explanation": { "text": "You've answered 20 questions and 17 were right on the first try (85%). You don't need to restart. Keep practicing: at least 10 more correct answers in a row would bring your accuracy to 90%." } }
```

## Rules for consumers

Do not display internal ids (`nodeId`, policy ids, attempt ids) to students or in routine teacher views; use titles, labels and the explanation text. Do not recompute accuracy, thresholds or recovery in a display. Label example policies. Treat `verification: provisional` as a practice milestone, never as official mastery. The graphical map and sidebar are not built in this package.
