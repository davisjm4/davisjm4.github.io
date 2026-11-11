# Decisions for the teacher before any real requirement is published

The tool now lets you set the numbers, but it does not choose them, and it has not applied any to a real class. These are the decisions it leaves with you. Nothing below is set for you: no class has defaults, no skill has an override, and the three presets are starting points you pick.

## What the arithmetic means at common settings

At exactly the minimum number of questions, these are the fewest correct first tries and the most mistakes a student can make. They come from the same arithmetic the tool and the engine use (`50 at 95%` needs 48, never 47.5 rounded up or down).

| Minimum questions | At 90%: correct needed | At 90%: mistakes allowed | At 95%: correct needed | At 95%: mistakes allowed |
| --- | --- | --- | --- | --- |
| 10 | 9 | 1 | 10 | 0 |
| 15 | 14 | 1 | 15 | 0 |
| 20 | 18 | 2 | 19 | 1 |
| 25 | 23 | 2 | 24 | 1 |
| 30 | 27 | 3 | 29 | 1 |
| 40 | 36 | 4 | 38 | 2 |
| 50 | 45 | 5 | 48 | 2 |
| 75 | 68 | 7 | 72 | 3 |
| 100 | 90 | 10 | 95 | 5 |

A student who falls short is never forced to restart: they keep answering and the numbers tell them how many more correct answers bring the accuracy back. But at 95% a minimum below 20 leaves no room for a single slip, which is a very different experience from 50 questions at 95%. The tool warns when a setting leaves no room for a mistake in the first questions.

## Decisions

**1. Starting numbers.** The presets are Quick Recognition 50 at 95%, Standard Practice 30 at 90% and Complex Reasoning 20 at 90%. They are built from the preferences you stated (larger counts for quick recognition, about 95% for simple skills, about 90% for substantial reasoning, smaller counts for long questions). They have not been tested against any student data, and the 30 and 20 in particular are placeholders. Decide the real counts and percentages, and for each kind of skill which one applies. Until you do, no class has any.

**2. Where to start: class defaults, areas, or skills.** The tool supports all three, with skill beating area beating class, one setting at a time. A simple approach is class defaults plus a few learning-area overrides. Decide how much per-skill tuning you want to maintain, because every override is something you will need to review again when you change the defaults. The tool tells you which skills kept their own settings whenever you make a bulk change.

**3. A minimum number of correct answers in addition to the percentage.** If you set one, students must meet both. It only changes anything when it is larger than what the percentage already requires: at 50 questions and 90% the percentage needs 45 correct answers, so a minimum of 40 changes nothing and a minimum of 48 does. Decide whether you want this for any skill; leaving it blank is the simpler rule.

**4. Skipped, revealed and hinted questions.** By default each stays in the count as incorrect, so skipping cannot raise accuracy. You can instead leave a limited share of them out. The practice pages do not yet send a record when a student skips or reveals, so this rule only applies once they do; the tool says so. Decide which behavior you want when that data exists.

**5. Difficulty requirements.** You can ask for a number of questions at a given level (for example 10 Advanced, 8 correct). Only Advanced CS skills record their levels, and for 37 of its 123 skills the level list is recorded as empty, so a difficulty requirement there is refused rather than saved. For 21 skills the levels are not recorded, so you get a warning instead. Decide whether any skill should require a level, knowing that today it can only be checked for part of the course.

**6. Question variety.** You can ask for correct answers in several different kinds of question. This can be verified for 54 of the 123 Advanced CS skills, and for none of the other courses. Where it cannot be checked the tool warns, and students' progress on that requirement stays provisional. Decide whether to ask for variety before the labs report their question kinds.

**7. Essential topics.** For a skill with several concepts, you can require a minimum on each. They are set one skill at a time. Decide which skills need them and which concepts count.

**8. Content that does not yet exist.** If a requirement needs more questions or more kinds of questions than exist, the tool lets you save a draft but not publish it, and tells you what is missing. Decide whether to lower the requirement or ask for more content. The tool never lowers a number or invents question kinds for you.

**9. Courses other than Advanced CS.** For AP CSP, Workplace Readiness and Robotics (167 skills) the repository does not record whether practice is counted automatically, which question kinds exist, or which difficulty levels exist. Every requirement there carries a warning that practice may not count automatically. Decide whether to publish requirements for those courses before that is resolved, or to wait.

**10. When you change a requirement after students have started.** Publishing creates a new version that applies from its publish time, and only skills whose effective requirement actually changed get one. For those skills the engine closes a student's open attempt, opens a new attempt under the new version that **counts from the publish time** (so a student who was 20 of 30 along starts again from zero), keeps the earlier attempt and any result in the student's history, and marks an already-met skill "review recommended" rather than removing it. The engine can carry earlier work over into the new attempt; this tool does not expose that option. Decide your practice: change numbers only at the start of a unit, or accept that students mid-way will start a new attempt. Before you publish, the Review tab shows how many skills in each learning area change and what they change from and to.

**11. Does practice before a requirement existed count?** The first time a requirement applies to a student, the engine counts from the start of their practice, so work done before you published counts toward it. A student with plenty of earlier practice could meet it on the first day. Decide whether that is what you want; the alternative is a first window that starts at publish time, which the engine supports (`firstWindow`) but this tool does not yet expose. Decision 10 is the other half: after a later change, the new attempt counts from the change.

**12. What students see.** The student view shows the requirement in words, the number answered, the correct count, the accuracy, how many more they need, and a note that they may answer more than the minimum. Decide whether students should see the exact accuracy and correct count, or a simpler picture. It also tells them that meeting a requirement is a practice milestone and that their 0 to 4 score comes from your own assessment.

**13. Which skills block a learning area.** A skill is needed to finish its area unless you mark it optional. Decide for each area which skills are required.

**14. What makes mastery official.** Browser practice can show that a student met the practice requirement, but it cannot make that official, and nothing here creates an award. Decide what the trusted source will be (for example answers re-graded on the server, or teacher-supervised assessment) before any requirement is described to students as certification.

**15. Standards scores.** Meeting a requirement never sets a 0 to 4 score. Confirm that this is what you want, and whether meeting a requirement should be a prerequisite for your own assessment or only a recommendation.

**16. The older policy editor.** The existing pacing editor has its own per-area policy form and a per-skill policy dropdown. This tool respects policies made there as skill-level settings and does not change them. Decide whether to keep that form once this one is in the redesigned editor.

## What the tool will not do for you

It will not decide that a number is fair, adopt the earlier audit's 80% and 85% suggestions, apply a preset on its own, attach a policy to a skill you did not touch, publish anything without your confirmation, or award mastery.
