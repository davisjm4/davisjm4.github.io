# Compositional generator schema

The compositional generator builds R-A-C-E-C-E-S writing problems from **typed scenario kits** (data) and **reasoning structures** (code). It does not substitute random words. Each kit is a set of compatible phrase bundles whose relationships are declared explicitly: which feature answers which condition, which setting has which conditions, which stage needs which condition, and which observation supports or rules out which explanation. The structures read those relationships to write the question, claim, evidence, explanations, summary and misconception distractors together.

Source of truth: `content/compositional/<topicId>.json`. `npm run build` flattens it into `js/data/compose-bundle.js` (never edit the bundle). `npm run validate` runs `tools/validate-compose.js`, which checks the schema and relationships described below.

## 1. Files and modules

| File | Role |
|---|---|
| `content/compositional/<topicId>.json` | One file per existing topic, containing `design`, `process` and `observation` kits |
| `js/compose/grammar.js` | Agreement (`s3`, `agree`, `be`, `has`, pronouns), articles, capitalization, sentence finishing, and the **lint** that rejects malformed sentences |
| `js/compose/phrases.js` | Level-specific pools for evidence attributions, explanation openers, repetition openers and fiction cues. Also provides `{slot}` filling |
| `js/compose/structures-design.js` | 13 structures for design kits |
| `js/compose/structures-process.js` | 8 structures for process kits |
| `js/compose/structures-observation.js` | 4 structures for observation kits |
| `js/compose/check.js` | Per-response grammar, structure, grounding, semantic, consistency, safety and length checks |
| `js/compose/compose.js` | Catalogue of configurations, surface contexts, excerpt assembly, retry-on-failure, and the adapter to the standard response model |

## 2. Kit types and fields

All string fields may use slots: `{E}` (scenario name with its article, e.g. "the silverleaf cactus") and `{CapE}` (the same, capitalized). Design kits also allow `{mPl}` (generic plural) and, in confound text, `{F}` (the feature being tested). Observation kits allow `{observer}` and `{n0}`, `{n1}`, … (numbers drawn from `numbers` ranges). An unresolved slot fails the lint, so it can never reach a student.

### Shared fields

| Field | Meaning |
|---|---|
| `names` | At least 5 fictional names (surface variety). Combined through `nameFmt` |
| `nameFmt`, `article`, `noArticle` | How the name is displayed ("{name} cactus", "the") |
| `descr` | Short description used in the fiction cue ("desert cactus") |
| `off` | At least 2 true-but-irrelevant details: `text`, `tag`, `add` (a clause for the "summary adds new information" distractor) and `exp` (an explanation of the irrelevant detail) |
| `background` | Optional neutral sentences used only as passage filler |
| `nonAnswers` | True sentences that do **not** answer a question (the `nonAnswer` distractor) |
| `ref` | Optional short reference ("the lab") used in passage facts after the introduction names the scenario |

### Design kit (an entity whose features serve a purpose)

| Field | Meaning |
|---|---|
| `kind`, `kindPl`, `member`, `memberPl` | "cactus"/"cacti"; generic "plant"/"plants" |
| `live`, `liveVerb`, `home`, `manyFmt` | "grows in", "grows", "a hot, dry desert"; optional lead for "built in many places" |
| `goal` | Base-form verb phrase with the entity as subject ("survive in the desert") |
| `otherGoals`, `myths` | A different focus (for wrong-focus restatements) and unsupported abilities (for unsupported claims) |
| `conds` | Conditions: `clause` (present), `absent`, `np`, `tag`, and `risk` for feature conditions |
| `features[4]` | `np`, `bare`, `the`, `short`, `pl`, `mech` (base form; the feature is the subject), `benefit` (base form; the entity is the subject), `cond`, `metric`, optional `cost` |
| `metric` | `past`, `unit`, `what`, `np`, `cmp`, `better` (`lower`/`higher`), `lo`, `hi`, optional `prefix` and `avg` |
| `cost` | `clause` and `cond` (a condition that is **not** a feature condition) |
| `settings[3]` | `np`, `the`, `at` (preposition phrase), `has`, `lacks` |
| `confounds` | `clause`, `tag`, `why`, `np`, `same`, `alt`, `ruleOut`, `ruleTag` |

**Compatibility rules (validated):** each feature answers a different condition; every setting has exactly two feature conditions present and lists the other feature conditions as absent; a cost condition is never a feature condition; metric ranges are wide enough for a clear difference.

### Process kit (ordered stages producing an outcome)

| Field | Meaning |
|---|---|
| `outcome` | Singular noun phrase that can "drop" or "decrease" ("the rain that falls on {E}") |
| `at` | Location phrase ("in {E}", "for {E}") |
| `stages[3–4]` | `text`, `tag`, `from`, `product`, `pl`, `less`, `does`, `why`, optional `needs` (a condition id), `needWhy`, `boost` (`clause`/`np`) and `cause` (an override question) |
| `conds` | `clause`, `absent` (present tense), `np`, `tag` |
| `rates` | `stage`, `factor` (`np`, `short`, `lo`, `hi`), `setup`, `result` (`clause` with `{x}`/`{y}`, `lo`, `hi`), `claim`, `why`, optional `confound` (`text`, `tag`, `why`). The result must rise as the factor rises |
| `myths`, `otherFocus` | Unsupported causes; different-focus question phrases |

Rules: at least 2 stages need a condition. A `boost` is authored **only** where improving that earlier step clearly cannot fix a later blocked step.

### Observation kit (a phenomenon with competing explanations)

`cases[]`, each with `event`, `q`, `restate[]`, `answer`, `sum`, `myth`, `mythClause`, `cause`, `alt`, `altText`, `patternQ`, `patternA`, `patternSum`, optional `prediction` (`text`, `claim`, `whyNot`), `observerNote`, `numbers`, and `obs[]`. Every observation has a `role`:

| Role | Meaning |
|---|---|
| `onset` | The cause is present when the effect appears |
| `mechanism` | How the cause produces the effect |
| `reverse` | The effect fades when the cause is removed |
| `against` | Contradicts the competing explanation. Add `predExps` **only** if it also refutes the prediction |

Each observation carries at least two explanation wordings (`exps`).

## 3. Reasoning structures

| Structure | Kit | Level | Reasoning |
|---|---|---|---|
| design-function | design | B | Two features serve one purpose |
| design-feature-need | design | B | One feature, and the condition that makes it matter |
| design-setting-fit | design | B | A setting's two conditions are matched by two features |
| design-test-result | design | B | Interpret a simple controlled test plus its mechanism |
| process-requirements | process | B | Identify the two conditions a process depends on |
| process-sequence | process | B | Two consecutive steps explain a transformation |
| process-cause | process | B | A step's material from the step before plus its condition |
| observation-cause | observation | B | Two observations support a cause |
| design-select-features | design | I | Choose the two relevant features among several plausible ones (decoy feature is the off-topic distractor) |
| design-compare-settings | design | I | Where would one feature be more useful? |
| design-removal | design | I | Consequence of losing a feature |
| design-two-tests | design | I | A repeated result forms a pattern |
| design-benefit-drawback | design | I | Identify a benefit and a drawback |
| process-condition-loss | process | I | A missing condition and its effect on the next step |
| process-rate | process | I | Interpret measured rates |
| observation-pattern | observation | I | Onset plus reversal connect an effect to one cause |
| observation-prediction | observation | I | Check a prediction against observations |
| design-priority | design | A | Which of two features matters more under a setting's conditions |
| design-tradeoff | design | A | Is the benefit worth the drawback in this setting? |
| design-unfair-test | design | A | A flawed test does **not** prove the claim (confound) |
| design-competing | design | A | A control rules out the competing explanation |
| process-chain | process | A | Order-dependent causal chain (`dependency.first = 1`) |
| process-bottleneck | process | A | A proposed fix to an earlier step cannot fix a later bottleneck |
| process-rate-confound | process | A | A rate investigation where a second factor also changed |
| observation-competing | observation | A | Decide between competing explanations |

**Configuration** = structure + the scenario elements it uses (enumerated by `enumerate(kit)`). The catalogue id is `g:<kitId>:<structure>:<level>:<params>`. A configuration is a stable "virtual writing model": the generator tracks, rotates and labels it exactly like an authored model. Fictional names, numbers, wording frames, attribution phrases and passage filler vary per build and are **not** new configurations.

## 4. Response construction

`Compose.buildResponse(index, configId, rng)` returns the same object as `js/engine/model.js` (`modelId`, `topicId`, `subject`, `title`, `passageId`, `family`, `level`, `question`, `excerpt`, `excerptFacts`, `sentences{R,A,C1,E1,C2,E2,S}`, `pairs`, `dependency`, `distractors`) plus a `generated` block (structure, kit, params, surface name, numbers). Every mode, grader and Session Summary path therefore runs unchanged.

1. The structure returns question, restatement, answer, two evidence facts (each with 3 explanation clauses), summary, required facts and distractor material.
2. Evidence sentences are the source fact with a level-appropriate attribution, or the fact stated directly at higher levels. Two different explanation clauses are drawn per pair: one is the real explanation, the other becomes the "explanation tied to the other evidence" distractor for the opposite gap.
3. The passage is the fiction cue, any lead sentences, the required facts and the off-topic fact, plus filler (other kit facts, background, unused off-topic details) up to the level's fact target, within the word band (B 70–130, I 90–170, A 110–195). Facts keep the kit's natural order.
4. `check.js` runs. On any failure the combination is discarded and redrawn (up to 8 draws). A configuration that cannot be built is quarantined by the generator for that session.

## 5. Distractor construction (Choose the Missing Piece)

| Kind | Misconception | Source |
|---|---|---|
| `repeat` | Repeating evidence instead of explaining it | Opener + the source fact |
| `crossExp` (new) | Explanation linked to the wrong fact | Alternate explanation of the *other* evidence pair |
| `offExp` | Explaining a detail that does not support the claim | Kit off-topic `exp` (or the decoy feature's explanation) |
| `offFact` | Evidence unrelated to the argument | Kit off-topic fact (or decoy feature) present in the passage |
| `unsupported` | Claim not supported by the source | Structure claim frame + kit `myths` |
| `nonAnswer` (new) | True sentence that does not answer the question | Kit `nonAnswers` / structure-specific |
| `summaryLike` | Summary that adds new information | Summary + off-topic `add` |
| `wrongFocus` | Restating a different question | Kit `otherGoals` / `otherFocus` |

`js/engine/missing.js` uses the two new kinds only when a response provides them, so authored models keep their original 4-candidate pools and identical output. With 5 candidates the engine keeps the tested misconception and picks the length-balanced combination. Feedback for both new kinds is in `js/engine/feedback.js`.

## 6. Difficulty metadata

Difficulty is a property of the **structure** (its `levels`), plus level-specific phrase pools: Beginner uses explicit attributions and plainer explanation openers, and Intermediate and Advanced more often state evidence directly. Passages carry more competing facts at higher levels. `tests/compose/run-compose.js` measures the progression (see COMPOSE_TEST_RESULTS.md).

## 7. Extending the library

- **New vocabulary or scenario variety:** add `names`, `off`, `background`, `myths`, `otherGoals`/`otherFocus` or `nonAnswers` to a kit. This adds surface variety only.
- **New scenario bundle within a topic:** add a feature (with its own new condition), a setting, a stage, a rate, a confound or an observation case. Each one multiplies the configurations of every structure that uses it. Run `npm run validate`.
- **New subject or topic:** the topic must first exist in `content/topics/*.json` (the authored library). Then add `content/compositional/<topicId>.json` with the three kits.
- **New evidence relationship:** add an observation with a role, or a feature–condition–setting link.
- **New reasoning structure:** add an object to the relevant `structures-*.js` with `id`, `kit`, `family`, `levels`, `label`, `enumerate(kit)` and `build(kit, params, ctx, rng)`. If the second explanation depends on the first, return `dependency: { first: 1 }`. Then run `npm run test:compose` and read output from `node tools/sample-compose.js <structure-id> 3` before shipping.

Always read generated samples after an edit. The checks catch structural, grammatical and many semantic faults, but they cannot prove that a sentence reads naturally.
