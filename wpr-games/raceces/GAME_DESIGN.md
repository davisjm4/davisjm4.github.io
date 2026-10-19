# Game design

## Purpose

Help students recognize and organize the parts of a structured, evidence-based response without writing paragraphs. Each challenge is one short task about one generated response built from a short neutral source excerpt.

## Student flow

1. A source excerpt (about 80–170 words) and a writing question appear on the left (stacked above the task on narrow screens).
2. One task appears on the right.
3. The student works, then chooses **Check Answer**. One scored submission per challenge.
4. Feedback names the RACECES principle, shows the correct answer or a valid arrangement, and explains the likely misconception.
5. **Next Challenge** loads a new task.

Roles are hidden until submission. After submission, a circled letter (R, A, C, E, S) appears beside every sentence, so the structure is visible for review.

## Modes

**Identify the Parts.** Seven sentences are shown in order. Single-selection prompts name one role; Cite Evidence and Explain Evidence prompts name the pair by topic ("the explanation connected to the information about rooftop installation"). "Select every sentence that…" prompts allow two selections and accept both. Beginner prompts are plain; Intermediate and Advanced prompts often contrast roles ("interprets the information about X, rather than repeating it"). The evidence-pair order shown is randomized, so position alone does not identify a pair.

**Rearrange the Response.** Seven shuffled sentences, always unsolved at the start (never a valid arrangement, at most two sentences already in place, at most one adjacent matched pair). Four ways to move, all equivalent: drag the handle; Move up/Move down buttons; tap a sentence then tap **Place here**; keyboard (focus a sentence, Enter to pick it up, arrow keys to move, Escape to release). Dragging auto-scrolls near the screen edges. Students may rearrange freely; only the submitted order is scored, and nothing is revealed before submission. Both evidence-pair orders are accepted.

**Choose the Missing Piece.** A response with one gap and four options in a native radio group; the selected option previews in the gap. Beginner challenges name the missing role; Intermediate and Advanced do not, so students infer it from context. Distractors are drawn from authored misconceptions: repeats the evidence, explains different information, a real fact that does not support the claim, an unsupported claim, a summary that adds new information, a restatement of a different focus.

**Mixed Practice** picks the least-used recent mode each time.

## Difficulty

| Level | Reasoning load |
|---|---|
| Beginner | Cause-effect, function, process, and adaptation relationships; sentences clearly different in role; five facts in the excerpt |
| Intermediate | Evaluation, scale, and cause-effect problems with similar wording across roles; seven facts |
| Advanced | Tradeoffs, process inference, and pattern reasoning where the explanation interprets rather than restates; eight facts, closer distractors |

Passage length differs by only a few sentences; difficulty is meant to come from the reasoning.

## Variation and repetition control

The generator never stops, and varies subject, source facts in the excerpt, question, claim, evidence, explanation, targeted role or slot, distractor mix, displayed pair order, starting order, and level. Rotation (see CONTENT_AND_GENERATOR_SCHEMA.md) excludes recent writing models, penalizes repeating family or topic, favors least-used roles, and balances families. A different shuffle of the same seven sentences is never counted as a new reasoning problem. The library has 30 writing models, so long practice does recur; see REASONING_DIVERSITY_REPORT.md.

## Feedback principles

- Say what was right or wrong first, then the principle.
- Explain the misconception the choice reflects ("repeats the evidence instead of explaining it").
- Name information, not positions or internal ids.
- Mark the correct answer and the student's choice with text labels, not color alone.

## Session summary

Local storage only, under keys starting with `raceces-writing-games:v1:`, so it cannot collide with Workplace Readiness Games, CS Games, or Java Games on the same origin. Tracks challenges completed, correct on the first try (equal to correct, since each challenge allows one scored submission), overall accuracy, accuracy by mode and by RACECES part, three named slip categories (evidence vs. explanation, restatement vs. answer, summary vs. new evidence) plus others, active practice time, and areas needing practice (any part or mode under 70% after at least three attempts, and frequent slip types). Active time counts only while the page is visible and the student interacted in the last 30 seconds, and caps each challenge at three minutes. The attempt log is bounded to 300 entries. No names are collected. Reset Session asks for confirmation.

## Visual design

Dark academic look with the requested palette (background `#0c1722`, panel `#152536`, border `#33495c`, text `#eff6fb` and `#b4c5d3`) and teal and gold accents. Reading text (source, question, response sentences) is set in a serif stack for comfortable line length and spacing; interface text uses the system sans stack. The one memorable element is the margin: after submission a lettered chip appears next to every sentence, revealing the structure. Chip colors: R teal, A gold, C blue, E violet, S green, each with at least 4.5:1 contrast for its letter.

## Accessibility

Skip link and landmarks; keyboard operation for every action; visible gold focus ring; Identify uses toggle buttons with `aria-pressed`; Missing uses native radios; Rearrange uses buttons with spoken position text; a polite live region announces moves, selections, and results; focus moves to the feedback after checking; selection shows a check mark and border as well as color; chips have text labels; contrast ratios are checked in the tests (lowest listed in TEST_RESULTS.md). No screen reader was run (see TEST_RESULTS.md).

## Mobile and Chromebook

One column below 920px, two columns above. Targets are at least 44px except Move buttons (40px tall, 44px wide). The action bar sticks to the bottom of the screen while the task is on screen. Tap-to-move is the touch alternative to dragging. No horizontal scrolling at 390px, 1280px, or 1366px.

## Architecture

No backend, accounts, runtime AI, or external requests. Plain HTML, CSS, and JavaScript. Engine modules (`rng`, `structure`, `model`, `identify`, `rearrange`, `missing`, `generator`, `feedback`, `validator`, `session`) load both in the browser and in Node and know nothing about the page. UI modules only render and collect answers. Content lives in JSON and is compiled to a bundle; the engine has no content in code. Every challenge is built by one pure function from a seed, so tests reproduce exactly what students see. The engine never uses an unseeded random source.

## Scope kept out

No essay or typing interface, no AI grading, no accounts or LMS, no fourth mode, and no changes to Java Games, CSP Games, CS Games, or Workplace Readiness Games. Nothing here modifies GitHub or publishes the site.
