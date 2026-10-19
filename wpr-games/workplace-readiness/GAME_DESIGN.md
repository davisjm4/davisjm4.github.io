# Game design

**Workplace Readiness Games** is a static, student-facing practice site for the 22 Workplace Readiness Skills. It is an independent resource, not an official CTECS product. See STANDARDS_COVERAGE.md for alignment and the disclaimer.

## Purpose and philosophy

Students practise **applying** workplace-readiness skills in realistic entry-level situations. They do not memorise definitions. A question such as "What is integrity?" is replaced by a situation: a record is wrong, nobody has noticed, and the workplace has a stated correction rule. The student evaluates it and chooses a professional response.

Universal requirements, all met: short challenges; no essays; no accounts; no backend; no AI during play; immediate instructional feedback; clear age-appropriate language; unlimited generated sessions; phone, tablet, Chromebook and desktop.

## The four practice modes

| Mode | What the student does | How it differs |
|---|---|---|
| **Workplace Decisions** | Reads a situation, picks the most appropriate of four responses | The primary mode. Plausible distractors, each tied to a named misconception |
| **Best Next Step** | Picks what to do *first* given timing and priorities | Every template records why sequence or timing matters; the prompt must signal it |
| **Put the Steps in Order** | Arranges 3 to 5 actions | Graded by **dependency rules**, not one answer order. Valid alternates are accepted and acknowledged |
| **Find the Problem** | Taps the one line in a message, note or procedure that is the problem | Large selectable lines, no typing. Every other line is explicitly sound |

Mixed Practice (all skills, all modes, all difficulties, any setting) is the default. Students can instead choose one skill, one of the three skill categories, one mode, one difficulty, or one career setting.

## Scoring and feedback

- One scored attempt per challenge. Answers lock after **Check answer**. Nobody must repeat a question to see the answer.
- After checking, the student sees: whether the choice was best, why *their* choice is less appropriate (including the misconception that makes it tempting), the best answer and why, and a one-sentence transferable takeaway.
- "Reasonable, but not the best" is used when a student picks an *acceptable* option in an Advanced item.
- Ordering feedback names the broken dependency and its reason, and shows one valid order. When a valid alternate was used, it says other orders also work.
- Feedback is generated from reasoning written into each template. It never says only "Incorrect, try again".

## Difficulty

- **Beginner:** one main concern, clear differences between responses.
- **Intermediate:** realistic constraints, two considerations, plausible alternatives.
- **Advanced:** competing priorities or stakeholders, and a distinction between an *acceptable* response and the *best* one. The validator rejects an Advanced template without an acceptable-but-not-best option. Difficulty is never raised by adding words: scenario length is capped per level.

## Session Summary

Screenshot-friendly page showing: challenges completed, first-attempt correct, missed, overall accuracy, active practice time; accuracy by skill, category and mode; and "Areas needing more practice" (a skill needs at least 2 attempts and under 70%), each with a **Practice this skill** button. With fewer than 10 answers it says results are not yet reliable. Reset session asks for confirmation, with the safe option focused.

**Active time** only accrues while the student has interacted within the last 45 seconds and the tab is visible, and no single tick can add more than 5 seconds. Time spent away or idle is excluded.

Results use browser local storage on that device only. The stored record has eight fixed fields: version, seed, stream position, filters, statistics, active time and two timestamps. No names, accounts, free text or cookies. If storage is blocked, the app keeps working from memory.

## Interface

Dark theme from the brief (`#0c1722`, `#152536`, `#33495c`, `#eff6fb`, `#b4c5d3`, teal and gold accents). System fonts only, so nothing depends on external font hosts that school filters may block. Each challenge appears as a **work ticket**: a card with a gold rule, mode, skill, difficulty and setting on one line, the scenario, then large tappable choices. No decorative card grids.

Accessibility built in and tested: keyboard operation (arrow and number keys for choices, Enter to check, focus moves to feedback then Next), visible focus rings, roving tab stops, labelled radio groups, polite live announcements, 44 px minimum tap targets, no hover-only interactions, reduced-motion and forced-colours support, and a drag-free alternative for ordering (up and down buttons per step, plus arrow keys on the handle).

## Architecture

Static HTML, CSS and plain JavaScript. No build step is required to *run* it; `npm run build` only bundles authored JSON into a single script so the app also opens from a school file share.

| Layer | Files |
|---|---|
| Standards and skill metadata | `content/skills.json`, `content/families.json` |
| Authored scenario content (separate from code) | `content/templates/*.json`, `content/contexts/*.json`, `content/people.json` |
| Randomisation | `js/core/rng.js` (seeded, no `Math.random`) |
| Text and numbers | `js/core/text.js`, `js/core/expr.js` (safe evaluator, no `eval`) |
| Generation | `js/core/generator.js`, `js/core/library.js` |
| Validation | `js/core/validator.js` |
| Grading and feedback | `js/core/grader.js`, `js/core/feedback.js`, `js/core/order.js` |
| Session tracking | `js/app/session.js`, `js/app/storage.js` |
| Interface | `js/app/ui.js`, `js/app/app.js`, `css/style.css`, `index.html` |
| Tests and tools | `tests/`, `tools/` |

## Instructional audit

Every template was written to a checklist: the situation is realistic; the student has enough information; the best response is defensible; distractors are plausible; the target skill is genuinely assessed; it is not a definition question; feedback teaches a transferable principle; it suits high school students; it needs no unexplained specialist knowledge; variations preserve the reasoning.

Then **44 generated challenges (two per skill, different modes and templates) were read in full** against that checklist. They found problems that the automated checks had not, all since fixed:

| Found by reading | Fix |
|---|---|
| Three Order scenarios narrated the steps in the correct sequence, giving the answer away | Rewrote the scenarios; added a validator rule that rejects scenarios echoing several steps |
| Refund, price, packaging, safety-glasses and work-order templates produced nonsense in some settings (a "machine operator trainee" handling refunds) | Restricted those templates to settings where they make sense |
| The `deliverable` field allowed values such as "completed transaction", producing "Will the completed transaction be ready tomorrow?" | Redefined and rewrote the values |
| Grammar glitches: "a shared a drawing set", "the shared the opening checklist", "bump the luggage cart with a cart" | Rewrote text; added repeated-word and double-determiner validation |
| An option said "client" while the scenario said "guest" | Neutral wording |
| A scenario relied on "counts" although some records are temperature logs | Generalised to accurate records |
| Best answers were the unique longest option in 58% of choice templates | Rewrote distractors; added a library rule; now 32.9% in sampled play (chance is 25%) |
| Two scenarios repeated the best answer's wording | Reworded; leakage checks run on every generated instance |

**What this audit is not.** It was done by the developer who wrote the content, covering 44 of 125 templates in full and spot-checking the rest through automated sweeps. It has not had independent review by teachers or CTE educators. Before wide classroom use, an educator should read every template, especially the safety, information-security, career/finance and diversity items.

## Accuracy and safety rules built into content

- Safety items never ask students to perform untrained tasks or fix hazards themselves; they stop, protect others, report, and follow instructions.
- Where a rule decides the answer (a policy, a posted sign, a written agreement), the **rule is stated in the scenario**. The validator requires sensitive skills to record this review.
- No jurisdiction-specific legal claim appears. Phrases such as "by law" or "OSHA requires" are rejected unless a template carries verified-source review metadata, and none does.
- Money amounts, discounts and deductions are labelled as examples.
- Scenario text never names the skill it assesses or states the principle it tests.
- Names are assigned at random, independent of role, and pronouns are used only where grammatical agreement is safe.

## Scope exclusions

No changes to GitHub, CS Games or Java Games. No AP Computer Science practice. No RACE/RACES writing platform. No official assessment questions, no accounts, no database, no essays, no teacher dashboard, no live AI.
