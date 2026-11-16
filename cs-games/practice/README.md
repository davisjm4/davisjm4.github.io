# Shared practice shell (v1)

The practice shell is an **opt-in view layer**, not another assessment engine. It standardizes layout, spacing and focus without changing the source of questions, first-try scoring, mastery attribution, answer tracking, offline behavior, course access or return URLs.

## Approved student flow
1. Use course-map return and View Session in the page navigation, without duplicate report entry points.
2. Show the lab name, purpose and compact applicable settings.
3. Present one focused question and its input controls. Before the first submission, **do not show the question's answer or explanation**.
4. After a response is assessed, show a clear verdict beside the task, explain the reasoning (or a first hint where an activity intentionally supports retries), and present an unambiguous Next Question action. Revealing the solution after an unsuccessful first attempt is separate from scoring; it never becomes first-try credit.
5. Keep general reference material in labeled, collapsed content, without revealing answers to the current question before submission.
6. View Session owns detailed statistics and history. Brief live in-question progress is permitted; avoid a second full report below the activity.
7. Make unanswered skips explicit and unscored. Preserve supported learning game types, accessibility and evidence contracts.

## Integration
- CSS: `/cs-games/practice/shell.css`, opt in with `class="practice-shell"` on the body.
- Engine: the existing Java, CSP, Robotics or WPR code continues to create and assess questions.
- Initial adopters: Java shared engine activities (via `java-games/app.js` and `java-games/style.css`); Loop Lab (shared CSS through Java); CSP Roundoff vs Overflow.
- Roundoff already reveals its numerical demonstration only after an answer.
- Java engine gates **Show Answer** until an answer has been checked. The current multi-try modes may show graduated hints after an incorrect first response; do not silently convert retries into independent first-try credit.
- Do not apply the opt-in class blindly to bespoke visual labs until their focus, answer state and session links have been verified.

## Release checklist
- Valid at 320, 390, 768, 1024 and 1366 CSS px, keyboard and touch, 200% zoom and reduced motion.
- Correct/incorrect/question-not-answered states with no pre-answer reveal; first-try credit remains correct.
- Feedback near the answer action and keyboard focus stays visible.
- My Session, independent vs enrolled data attribution and Back to Course Map preserve context.
- Existing direct links, query-mode links, Canvas assignments and per-game mechanics still work.
- Full automated tests and real-device validation before broad adoption.

## Remaining rollout
Robotics, Workplace Readiness and bespoke AP CSP/Java labs retain their current engines and UI until separately migrated and checked. This first release is **not** a claim that all labs have adopted the shell.
