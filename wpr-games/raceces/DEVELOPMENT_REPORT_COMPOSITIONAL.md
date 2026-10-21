# Development report — compositional generator for R-A-C-E-C-E-S Writing Games

## 1. Original architecture (verified in the repository)

15 topics, one per subject, each with 9 source facts. There are 90 authored writing models: 2 per topic per difficulty, 30 per difficulty, across 8 reasoning families. `Model.buildResponse` turns a model into one response object, which the Identify, Rearrange and Missing engines consume. The generator rotates models with bounded history, exhausts unseen models before "Review practice", and honors subject, topic and level filters. A topic-specific session reached review after **2** problems.

## 2. New compositional architecture

- `js/compose/` engine: grammar layer, phrase pools, 25 reasoning structures, checker, and an assembler that emits the **same response object** as `model.js` (the compatibility adapter).
- **45 kits** (design, process and observation for each of the 15 topics) in `content/compositional/`, aligned to the existing topic ids so topic selection stays meaningful. The content is clearly fictional ("In this fictional example…", "In a hypothetical investigation…"), but every mechanism is real science applied to invented entities: waxy coatings reduce water loss, zinc corrodes in place of iron, parity digits detect a flipped bit, Earth's shadow dims a full moon, and so on.
- **Hybrid selection:** the existing generator chooses from the 90 authored models plus 1,361 generated configurations together, with the same exhaustion and review labels. It adds structure- and kit-aware rotation, and a hard rule against the same structure twice in a row (compositional mode only).
- **Genuine order dependency:** the `process-chain` structure's second explanation builds on the first, so Rearrange accepts only one pair order (with specific feedback), and Identify and Missing always show that pair first. All other responses accept both pair orders.
- **Two new misconception distractors:** an explanation tied to the wrong evidence (`crossExp`) and a true sentence that does not answer the question (`nonAnswer`).

## 3–6. Counts

| Item | Count |
|---|---|
| Scenario frameworks (kit types) | 3: design, process, observation |
| Reasoning structures | 25 (13 design, 8 process, 4 observation; 8 Beginner, 9 Intermediate, 8 Advanced) |
| Compatible content bundles (kits) | 45 |
| Generated configurations | 1,361 (plus 90 authored) |
| Topic/difficulty combinations meeting the 20-problem target | **45 of 45** (minimum 24, maximum 45) |
| Generated reasoning structures per combination | 8–9 for 41 combinations; 7 for Levers, Moon phases, Rust and Lightning at Advanced |

## 7. Duplicate rates (details in DIVERSITY_REPORT.md)

- 0 exact repeats and 0 configuration repeats in the first 20 questions of every topic and difficulty (3 seeds each). No structure appears twice in a row.
- 0 exact repeats of **generated** challenges in any 100-question topic session. The few exact repeats observed are authored models, as before.
- Within 20 questions, up to 4 challenges reuse an evidence pair with a *different* question and claim. This is reported as evidence overlap, not hidden.
- Long topic sessions necessarily revisit configurations (24–45 per topic and difficulty). Revisits change name, numbers, wording and target, and are labeled "Review practice".

## 8. Grammar and coherence validation

Every displayed sentence and every distractor passes the lint. The lint rejects unresolved slots, a/an errors, subject–verb slips at clause starts, object/subject pronoun errors, capitals left inside embedded sentences, adjacent duplicate words, and spacing and punctuation faults. The semantic checks require that:
- each piece of evidence is grounded in its source sentence (70% overlap of content-word stems; numbers must match);
- explanations do not merely restate their evidence;
- the summary introduces no new content words, while the new-information distractor does;
- the unsupported claim contains something the passage does not say;
- no foreign scenario name appears;
- banned classroom terms are absent;
- passage length is within the level's band.

95.2% of builds pass on the first draw; the rest are redrawn (maximum observed 7 of 8 draws).

**Problems this process found and fixed during development:**
- a semantically wrong answer ("exposed to short bursts of rain");
- stacked openers;
- "without they";
- mid-sentence capitals;
- a scenario name colliding with an off-topic sentence ("Parrotfish Reef");
- the safety filter catching "frost kills";
- two configurations that were valid only on lucky draws;
- a quarantine bug exposed by a forced-failure test.

Manual reading also led to short scenario references in process passages, because the scenario name was being repeated in every sentence.

## 9. Distractor testing

9,000 challenges were checked (1,000 per mode × difficulty). Every Missing Piece item has exactly 4 distinct options, exactly one keyed answer, no option that duplicates a visible sentence, and feedback plus a category for every wrong option. Answer position χ² = 5.8 (df 3). The correct option is the longest only 14.5% of the time. Both new distractor kinds appear and are graded with their own feedback.

## 10. Difficulty validation

Measured on generated challenges:

| Level | Share needing inference | Share with competing conditions or explanations | Share with qualified or comparative claims | Mean passage sentences |
|---|---|---|---|---|
| Beginner | 0% | 0% | 2% | 6.4 |
| Intermediate | 85% | 0% | 50% | 7.5 |
| Advanced | 100% | 100% | 89% | 8.9 |

Difficulty comes from which reasoning a structure requires, not from word count.

## 11. Integration compatibility

- Without the compositional library, generator output is byte-identical to the published version (SHA-256 test).
- The original Node suites pass (89,032 checks). The compositional suite has about 145,000 checks and 0 failures.
- The ZIP author reported 19/19 passes for the new browser suite and 87/90 for the original suite on the package baseline. These are package-reported results, not results from this independent integration run.
- The independent browser suites could not launch here because the Playwright Chromium executable was unavailable; the attempted browser download returned an invalid empty archive. The title and storage-key assertions were corrected in the original suite. The Mixed Practice balance assertion remains unchanged; the generator produced a 6/6/6 split in a separate seeded check. Current execution details are in `COMPOSE_TEST_RESULTS.md`.

## 12. Deliverable

`raceces-compositional-generator.zip`. Its contents are listed in README.md.

## 13. Remaining limitations

1. **No independent educator review.** All content was written and checked by me. Automated checks cannot certify that every sentence is natural or that every distractor is unarguably wrong to every reader. `samples/review-sample.md` (90 responses) is provided for a teacher's review.
2. **Evidence overlap.** Different structures sometimes reuse the same evidence pair with a different claim. Distinct evidence relationships per topic and difficulty number fewer than configurations (see DIVERSITY_REPORT.md).
3. **Advanced has 7 generated structures** for Levers, Moon phases, Rust and Lightning (others have 8). A sound "proposed fix" process scenario was not authored for those topics.
4. **Some template wording is formulaic** across topics: the same explanation frames recur with different content, and some phrases are stiff ("the storing of the pattern", "more flower patches found each week"). Students on long sessions will notice recurring frames even when the reasoning differs.
5. **One observation case per topic,** so observation-based structures have few configurations (1–3 each). Adding a second case per topic is the most efficient next expansion.
6. **Only Chromium was tested,** at 1366, 390 and 360 widths. There was no Safari or Firefox testing, no physical Chromebook or phone, and no screen-reader pass on generated content. The UI itself is unchanged, so earlier accessibility results should carry over, but this is unverified.
7. **Three stale checks in the original browser suite** (pre-existing) were left untouched.
8. **"Fictional" framing:** each passage opens with a fiction cue, but individual sentences inside it read like plain facts about invented entities. A teacher may want to tell students explicitly that these are invented examples.
