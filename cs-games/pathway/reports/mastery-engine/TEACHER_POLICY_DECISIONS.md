# Decisions for the teacher before any real mastery requirement is activated

The engine is built and tested, but no requirement is attached to any skill, and nothing in this package decides how much practice earns mastery. These are the questions that need an answer first. For each one, the table says what the engine does today (its default, chosen to be cautious, not to settle the question) and what could be chosen instead. The numbers in the "starting points" section restate preferences you have already described; they are not calibrated against student data.

## What the arithmetic means at common settings

At exactly the minimum number of questions, these are the fewest correct first tries and the most mistakes a student can make. A student who falls short of the target is never required to restart: the engine tells them to keep going and states exactly how many more correct answers in a row would recover it. For example, 17 of 20 or 26 of 30 at 90%, or 47 of 50 at 95%, each recover with 10 more correct answers, while 18 of 20 at 95% needs 20.

| Minimum questions | At 90%: correct needed | At 90%: mistakes allowed | At 95%: correct needed | At 95%: mistakes allowed |
| --- | --- | --- | --- | --- |
| 10 | 9 | 1 | 10 | 0 |
| 15 | 14 | 1 | 15 | 0 |
| 20 | 18 | 2 | 19 | 1 |
| 25 | 23 | 2 | 24 | 1 |
| 30 | 27 | 3 | 29 | 1 |
| 40 | 36 | 4 | 38 | 2 |
| 50 | 45 | 5 | 48 | 2 |

Two things follow from the table. At 95% a minimum below 20 leaves no room for a single slip, which is a very different experience from 50 questions at 95%. And a quick 50-question challenge at 95% allows only two mistakes, while 20 long questions at 90% allows two as well, so "stricter" depends on the count as much as the percentage.

## Decisions

**1. How many questions, by kind of skill.** The engine takes any whole number. You described larger counts for quick recognition and smaller ones for long multistep questions. Decide the counts, and decide how each skill is classified, because the graph labels only two kinds (15 nodes are "multi-step tracing" and 275 are "application"), so quick-recognition skills have to be identified by you. A related question: should a skill's count scale with its question bank size, or be a flat number per tier?

**2. First-try accuracy thresholds.** You favor about 90% for substantial reasoning and about 95% for simple recognition. The audit's earlier 80% and 85% suggestions are not used anywhere. Confirm the percentages, and confirm which skills count as "simple." The engine accepts any percentage with at most two decimal places and always compares exactly, so 92.5% is as easy to set as 90%.

**3. An absolute number of correct answers in addition to the percentage.** The engine can require a minimum count of correct first tries on top of the percentage, and then the student must meet both. Do you want that for any skill, and is it ever meant to replace the percentage?

**4. Subskills.** For skills with several concepts, an essential subskill can require a minimum number of questions seen, a minimum number correct, and optionally a minimum accuracy. Decide for each such skill which concepts are essential. Decide how forgiving to be: the default asks for no perfection, so a student who answers 9 of 10 modulus questions correctly can pass, but you choose the exposure, the correct count and any subskill percentage. Decide what should happen when some answers cannot be placed in a subskill because the lab did not report the needed detail: the default blocks qualification (no uncertain evidence is certified) and a stated share of unplaceable answers can be allowed instead.

**5. Reasoning-family variety.** Do you want a minimum number of distinct question families, and how many correct answers in a family should count? Today this can be verified for only 54 of 290 skills (all Advanced CS). Of those, 53 have 3 or more families, 51 have 5 or more, 33 have 8 or more, and 23 have 10 or more. Variable Lab reports exactly one family per identify skill, so no meaningful variety requirement exists there yet; a content repair would have to come first. Where families cannot be verified, the engine marks the requirement provisional and will not pass it. Should a missing-family skill simply have no variety requirement, or wait for the content repair?

**6. Difficulty requirements.** Should any skill require questions at a specific level (for example 10 Advanced questions, 8 correct)? The graph does not yet record which levels each skill offers, so the engine treats availability as unknown and flags it. Also decide whether a Mixed-level question can ever satisfy a named level (today it cannot).

**7. Skipped, revealed and hinted questions.** By default each stays in the denominator as not correct, so skipping cannot raise accuracy. You could instead take them out of the denominator, limited to a stated share of questions (10% by default). The Worker's existing tallies take hint-assisted answers out of both sides; the engine does not copy that by default. Which do you want? Also note that practice pages do not currently send skips or reveals at all, so the rule only applies once a server record of questions shown exists; decide whether you want that built.

**8. Does earlier practice count toward a student's first attempt?** The engine's first attempt reaches back to the start of a student's practice, so work done before a requirement existed counts. A student with plenty of earlier practice could qualify as soon as a policy is switched on. The alternative is to start every student's first attempt on the day the requirement is published. Which is right for your classes?

**9. Restarts.** Students can restart an unsuccessful attempt at any time before it is met, with all history kept. Should restarts be limited, delayed, or approved by you? Should a student ever be allowed to restart after meeting a requirement (today they cannot; they keep practicing, or a new policy opens a new attempt)?

**10. When a requirement changes.** A student who already met the old requirement keeps that result and sees "review recommended" with a plain explanation, and a new attempt opens under the new version. Decide: should the earlier completion still count toward the learning area while the new attempt is open (today it does)? Should students working on the old requirement carry their answers over to the new one (today they start from zero, and carrying over is an explicit option)? Who approves publishing a stricter version?

**11. Does meeting a requirement ever lapse?** Today it does not: later mistakes never undo a result. You can set a number of days after which a skill is flagged "review recommended" (the result is never removed). Do you want that, and how many days?

**12. Which skills block a learning area.** A skill blocks area completion unless it is marked optional. Which skills in each area are required? Remember an area never shows complete while any required skill has no approved requirement.

**13. What makes mastery official.** Browser practice can show that a student met the practice requirements, but it cannot make that mastery official. Decide what the trusted source will be: answers re-graded on the server, a teacher-supervised session, a teacher's confirmation of the practice record, or something else. Nothing official can be recorded until that exists and is built separately.

**14. Standards scores.** Completing a challenge never sets a 0 to 4 score. Confirm that this is what you want, and whether meeting a challenge should be a prerequisite for a teacher assessment or only a recommendation.

**15. What students see.** The engine writes plain explanations such as "You've answered 24 of the 30 required questions. Your accuracy is 92%." Decide whether students see the exact accuracy and the number of correct answers still needed, and how to word the "practice milestone, not yet verified" message.

## Suggested starting points (not approved, not executable)

These come from your stated preferences. They are in `cs-games/pathway/mastery/suggestions.mjs` as inert data: the engine refuses to run them as policies, and no node refers to them. A teacher can adapt one and publish it under its own id, which is what makes it real.

| Tier | Questions | Accuracy | Intended for | Basis |
| --- | --- | --- | --- | --- |
| Quick recognition | 50 | 95% | short, single-step recognition or foundational questions | larger counts for quick challenges; about 95% for simple skills |
| Standard practice | 30 | 90% | typical application questions | about 90% for substantial reasoning; the count is a placeholder for you to set |
| Complex reasoning | 20 | 90% | long, multistep tracing or reasoning questions | smaller counts for lengthy questions; about 90% |

By the graph's own labels, the 15 multi-step tracing skills (all Advanced CS) would map to Complex reasoning and the other 275 skills to Standard practice, because only two complexity labels exist. Which skills belong in Quick recognition is yours to decide.

## The illustrative policies used in tests

`examples.mjs` holds five policies written only to exercise the engine: Quick Variable Identification (50 at 95%), a quick-recognition policy for Integer and Double Division with two subskills and three families, Advanced Array Reasoning (20 at 90%, version 1) and a stricter version 2 (25 at 95%), and a small 10-at-90% policy for the seven Math Lab skills. Each is flagged `exampleOnly` and labeled "EXAMPLE ONLY: not an approved mastery requirement." They are not proposals.
