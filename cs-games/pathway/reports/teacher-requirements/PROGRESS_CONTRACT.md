# Student progress display contract

This is what a student-facing screen (the sidebar, the learning map later, My Class Progress) reads to show progress against a teacher's requirement. It is a thin mapping over the mastery engine's own progress object. **Nothing in it recalculates accuracy, thresholds or recovery**, so a screen built on it cannot disagree with the engine, and the teacher's preview, which uses the same function, cannot disagree with either.

```js
import { studentRequirementView } from 'cs-games/pathway/requirements/index.mjs';
const view = studentRequirementView(progress);   // `progress` is the `progress` field of mastery nodeProgress()
```

The schema id is `cs-games.student-requirement-view/1`. It is additive to the engine's contract in `reports/mastery-engine/PROGRESS_CONTRACT.md`; that document explains the underlying progress object.

## Shape

An example for a skill with 50 questions at 95%, after 20 correct answers:

```json
{
  "schema": "cs-games.student-requirement-view/1",
  "title": "Integer and Double Division",
  "status": "in-progress",
  "statusLabel": "In progress",
  "example": false,
  "requirement": {
    "headline": "Answer at least 50 questions with at least 95% right on the first try.",
    "minimumQuestions": 50, "accuracyPercent": 95, "correctNeededAtMinimum": 48, "minimumCorrect": null,
    "keepGoing": "You can answer more than 50 questions to raise your accuracy.",
    "mixedNote": "Questions from Mixed Practice count toward this skill too."
  },
  "progress": {
    "answered": 20, "required": 50, "answeredLabel": "20 of 50 questions",
    "correct": 20, "accuracyPercent": 100, "accuracyLabel": "100%",
    "questionsShare": 0.4, "accuracyMet": true
  },
  "remaining": { "questions": 30, "correctInARowForAccuracy": 0, "accuracyOnlyLowerBound": false, "mistakesBeforeAccuracyBreaks": 1 },
  "explanation": { "headline": "You've answered 20 of the 50 required questions. Your accuracy is 100%.", "lines": [], "text": "…" },
  "milestoneNote": null,
  "standardsNote": "Your 0 to 4 standards score comes from your teacher's assessment. Practice does not change it.",
  "standardsScore": null,
  "reassessment": null
}
```

| Field | Meaning | How to show it |
| --- | --- | --- |
| `title` | The skill's name | As the card title. There is no node id in the view. |
| `status`, `statusLabel` | One of `not-started`, `in-progress`, `requirements-met`, `review-recommended`, `provisional` | Show `statusLabel` ("Not started", "In progress", "Requirements met", "Review recommended", "Waiting for your teacher"). Do not invent other states. |
| `example` | True when the policy is marked example-only | Label the card as an example. |
| `requirement.headline` | The requirement in one sentence | Show first. `null` when the skill has no requirement. |
| `requirement.keepGoing` | Reminds students they may answer more | Show beside the progress; it is why a student never has to restart to improve. |
| `requirement.mixedNote` | Mixed Practice counts too | Show once, small. |
| `requirement.correctNeededAtMinimum` | Correct answers needed at exactly the minimum | Optional "48 correct needed at 50 questions". |
| `progress.answeredLabel` | "20 of 50 questions", or "63 questions (50 required)" once past the minimum | Use as given: it reads naturally above the minimum, and never says "63 of 50". |
| `progress.questionsShare` | 0 to 1, capped at 1 | Drives a progress bar. It never exceeds 100%. |
| `progress.accuracyLabel` | "96%", or "No answers yet" | Truncated, never rounded up: 94.9% is shown as 94.9% and does not meet 95%. |
| `progress.accuracyMet` | Whether the accuracy rule currently holds | Colour plus a word, never colour alone. |
| `remaining` | What is left, from the engine's recovery numbers | Optional supporting text. `accuracyOnlyLowerBound` means the number counts the accuracy rule only and other rules may add more. |
| `explanation.text` | The engine's own sentences, joined | Show `headline`, and `lines` as supporting text. Never show identifiers. |
| `milestoneNote` | Present when requirements are met but not verified | Show it with "Requirements met". It says the result is a practice milestone. |
| `standardsNote`, `standardsScore` | The teacher's 0 to 4 score | `standardsScore` is only what already exists; it is `null` when the teacher has not assessed. It is never raised by meeting a requirement. |
| `reassessment` | Present when an earlier result was earned under a different requirement | Show the reason. The earlier result is never removed. |

## Rules for any screen that uses it

1. **Show what the engine reports, with the teacher's words.** A requirement of 30 questions at 90% reads "Answer at least 30 questions with at least 90% right on the first try." Never reconstruct it from the numbers on the client.
2. **Meeting a requirement is a practice milestone.** Say "Requirements met", show `milestoneNote`, and do not call it mastery, certification or an award, and do not show a 4. Until a trusted evidence source exists, nothing is verified.
3. **No identifiers.** The view has no node, policy, attempt or student identifiers and no UUIDs, and a test checks that none appears in any text. Do not add them to the display.
4. **A student may answer more than the minimum.** The same attempt continues until the requirement is met; there is no forced restart. Use `answeredLabel` and `keepGoing` as given.
5. **A first wrong answer stays.** Do not suggest that retrying the same question repairs accuracy; it does not, and the engine counts only the first answer.
6. **Unconfigured skills show no numbers.** `requirement.headline` is `null` and `progress` is `null`; show the status and nothing invented.
7. **Do not merge the two measures.** Practice status and the 0 to 4 standards score come from different sources. Keep them apart on screen.

## Status labels

Every status the engine can report has a label (a test iterates them): `not-started` Not started; `in-progress` In progress; `requirements-met` Requirements met; `review-recommended` Review recommended; `provisional` Waiting for your teacher.

## The teacher's preview uses the same view

`previewStudentStates({ effective, title, graph })` runs synthetic answers through the real engine and returns the same `view` object for four sample students: just starting, partway (40% of the minimum, all correct), one answer short of the accuracy goal at the minimum, and exactly meeting the requirement. The samples cover the question count, the accuracy, the minimum-correct count and how skipped questions are handled. They do **not** simulate topic, difficulty or variety rules; the preview says so when those rules are set. The "just met" sample is exactly the engine's threshold, and a test checks, for every preset and for a minimum-correct case, that one fewer correct answer does not meet it.
