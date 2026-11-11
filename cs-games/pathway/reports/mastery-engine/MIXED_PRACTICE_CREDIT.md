# How Mixed Practice and focused practice credit skills and areas

## The path an answer takes

A student answers a question. The lab page's session tracker records the first submission and the profile client queues one practice event carrying the question id, session id, attempt number, correctness, the lab's activity id, the mode the page was set to (`mode`), the mode of the question actually shown (`assessedMode`), the question family, and the difficulty where the lab has levels. In Mixed Practice `mode` can read "mixed", but `assessedMode` is always the real mode, which Phase 2 verified for every lab that has a Mixed mode (420 of 420 sampled answers per lab credited their own node).

The mastery engine then reads the event the same way the Worker does. `normalizeEvent()` calls `questionEvidence()` with the assessed mode and family, so the nodes credited are exactly the ones the graph's selectors name. The word "mixed" is never used for credit: an event whose assessed mode is "mixed" or missing is rejected with the reason `no-assessed-mode`. Node ids a client might attach are ignored, and the tests confirm a forged list of nodes changes nothing.

## One attempt per node, whatever the practice mode

For each node the engine collects every counted event that credits it, from focused and Mixed Practice alike, and feeds them in time order to the node's single open attempt. There are no per-mode requirements: 6 focused modulus answers and 4 Mixed modulus answers are 10 modulus answers. A student never picks a node to receive credit. A student can complete a node entirely through Mixed Practice, and the demonstration's Student D completes all seven Math Lab skills that way.

If the same question is reported twice, whether as the same event, under a new event id, or once as focused and once as Mixed, it counts once: the key is the session and question id, and the first record wins. A retry never adds credit, and a question never credits a node unrelated to its mode and family.

## Worked example: Math Lab

Math Lab has seven skills: Modulus, Integer and Double Division, Casting, Mixed Expressions, Reverse Challenges, Math Methods and Random Ranges, and Numeric Limits. A student opens Mixed Practice and answers a run of questions. A modulus question credits Modulus, a division question credits Integer and Double Division, a casting question credits Casting, and a Math Methods question credits Math Methods, each exactly once, each with its own family. In the test that drives the real Math Lab engine through the real tracker and profile client, 210 Mixed draws reach all seven skills, every draw credits only its own node, and the engine's per-node counts equal the draws.

Each skill then has its own progress. With the illustrative policy of 10 questions at 90%, after Mixed Practice finishes five skills the area reads "5 of 7 skills complete"; after more Mixed Practice on the remaining two it reads "7 of 7", qualified and not verified.

## From skills to a learning area

`areaProgress()` counts the area's required skills. A skill is required when the class pathway's checkpoint is marked required and the policy's `requiredForAreaCompletion` is true. Optional skills are reported but never block completion. A required skill whose policy is provisional (no approved requirement) counts toward the total but cannot complete, so an area is never reported complete while any required skill has no approved requirement. A skill that earned its requirements under an earlier policy version counts as complete by default and shows "review recommended", because earned mastery is not silently removed; the integrator can switch that off.

The area reports qualification (every required skill met its practice requirements) and verification (every required skill also holds an official award) separately. Neither one is a standards score or a pacing status.

## Where credit is incomplete today

These are observations about what the pages report, not engine defects, and the engine states each one instead of hiding it.

Several labs report a family id the graph does not bind to a node (ArrayList, Boolean, Class and Object, Debugger, Recursion, Search and Sort, Method and Constructor, and the LinkedList Trace and Collections modes). Credit still works at the mode level, but a family-variety requirement cannot be verified for those skills, and the engine marks them provisional. Variable Lab reports one family per identify skill. Skips and reveals are not sent as events, so the denominator rule can only apply to answers that were submitted. ArrayList Mixed Practice draws Insert and Remove about 40% of the time, so that skill fills faster than its siblings, and Search and Sort has no Mixed mode. Mixed Practice shows the same difficulty control as focused practice in Math Lab, defaulting to Beginner, so a difficulty requirement above Beginner is only reached when the student chooses that level. None of these changes how an answer is credited, and each is a candidate for a later content repair that this package does not make.
