# Generator schema

Authored content is JSON in `content/`. The generator turns one template plus a seed into one fully resolved challenge. The same seed and filters always produce the same stream.

## Concepts

| Term | Meaning |
|---|---|
| **Skill** | One of the 22 Workplace Readiness Skills (`content/skills.json`) |
| **Concept** | A standards bullet inside a skill, ID `skill-id:concept`. Templates declare which they assess |
| **Reasoning family** | A distinct underlying decision type within a skill, ID `skill-id.family-name` (`content/families.json`). IDs are permanent |
| **Pattern** | The specific reasoning problem a template poses. `family:pattern` is the **semantic signature** used for spacing and audits |
| **Template** | Authored instructional content with slots; one pattern each |
| **Context bundle** | A coherent setting (workplace, role, equipment...) inside a career context |
| **Instance** | A rendered challenge shown to a student |

Changing a name, setting, number or twist produces a new *instance* but **not** a new pattern.

## Template fields (common)

```json
{
  "id": "INT-D-001",              // SKILLCODE-MODELETTER-NNN (D, N, O, F)
  "skill": "integrity",
  "family": "integrity.accurate-reporting",
  "pattern": "correct-own-entry-transparently",
  "mode": "decision",              // decision | nextstep | order | find
  "difficulty": "beginner",        // beginner | intermediate | advanced
  "concepts": ["integrity:honesty-and-fairness"],
  "contexts": "any",               // or an array of context ids
  "slots": { "role": "role", "coworker": "person" },
  "facts": ["own-error"],          // facts the base scenario always states
  "twists": [{ "id": "busy", "text": "...", "facts": [] }],
  "contradictions": [["factA", "factB"]],
  "scenario": "You work as {role|a} at {workplace|a}.[[twist]]",
  "prompt": "What is the most appropriate action?",
  "principle": "One-sentence transferable takeaway.",
  "review": { "status": "approved", "checks": ["no-jurisdiction-claims", "policy-stated-in-scenario"], "notes": "..." }
}
```

### Choice modes (`decision`, `nextstep`)

Exactly four `options`, each `{ id, role, text, why, misconception?, requires? }`.

- `role`: `best` (exactly one), `acceptable` (reasonable but not best), `distractor`.
- Every non-best option needs a `misconception`: the faulty reasoning that makes it tempting.
- `requires`: facts that must be present in the scenario for the best answer to be defensible.
- Advanced templates must include an `acceptable` option.
- `nextstep` additionally needs a `timing` note and a prompt containing first / next / right now / immediately / before.

### Order mode

`steps` (3 to 5, `{id, text}`) and `precedence` (`{before, after, why}`). A response is valid when every relation holds. Rules: no cycles; every step in at least one relation; at most 25% of permutations may be valid; if more than one order is valid the author must set `alternatesReviewed: true` after confirming each alternate is professionally sound. The scenario must not narrate the steps.

### Find mode

`docType` (email, chat, procedure, schedule, post, note), `docTitle`, and 3 to 7 `segments`: exactly one with `problem: true` and a `why`; every other segment has `whyFine`. `shuffleSegments` is allowed only for order-independent types.

### Numeric templates

```json
"vars": { "rate": {"type":"int","min":14,"max":22}, "pct": {"type":"choice","values":[8,10,12]} },
"derive": { "gross": "rate*hours", "net": "round2(gross-tax-flat)" },
"constraints": ["net>0", "net!=wrongNoFlat"]
```

Expressions use `+ - * / %`, comparisons, `&& ||`, and `round round2 floor ceil min max abs`. A safe parser evaluates them; no `eval`. Constraints keep distractor values distinct.

## Text tokens

| Token | Result |
|---|---|
| `{role}` | the slot text |
| `{role\|a}` / `{role\|the}` | adds "a"/"an" or "the" |
| `{Lead\|the}` | capital first letter makes output capitalised ("The shift manager") |
| `{client.plural}` | plural form (client slot only) |
| `{coworker}`, `{coworker.obj}`, `{coworker.poss}`, `{coworker.refl}` | name and pronouns. **`.subj` is banned** because verb agreement breaks for "they" |
| `{net\|money}` `{rate\|money0}` `{n\|int}` `{p\|pct}` | number formats |
| `[[twist]]` | where the optional twist sentence is inserted |

**Slots** come from a context bundle (`workplace, role, lead, client, record, equipment, system, document, deliverable, task, hazard`) or `person`. All fields in a bundle belong to the same workplace, so text never mixes a dental role with a kitchen hazard. Authors must also check that a slot makes sense in every setting a template allows; use `contexts` to restrict.

## Instance (what the UI receives)

`{ id, templateId, skill, family, pattern, reasoning, category, mode, difficulty, concepts, context, bundle, twist, scenario, prompt, principle, options | steps | doc, key, facts }`. Option IDs are opaque (`o1`...) and shuffled; the answer lives in `key`. Order instances start in an arrangement that is not already valid.

## Validation (rejects, never displays)

**Template level:** skill, mode, family, pattern, concept and context IDs valid; id prefix matches skill and mode; tokens declared; no double determiners; no `.subj`; no answer-leaking phrases in scenario or prompt; no legal or jurisdiction claims without verified review; sensitive skills record review checks; option count, uniqueness, length and plausibility; best answer not conspicuously longest; exactly one best; acceptable option for Advanced; ordering and find structure rules.

**Instance level:** all of the above after rendering, plus: no unresolved tokens, `undefined`, `NaN` or repeated words; options unique; best answer present and unique; required facts stated; no contradictory facts; scenario length within the difficulty limit (60, 80 and 100 words); no 5-word run from the best answer in the scenario; no scenario that narrates ordering steps; the key grades as correct and every wrong response as incorrect (completable through the UI).

**Library level:** unique IDs, 22 skills, at least 12 distinct names in the people pool, bundles complete with bare nouns, families with templates, and the best-answer-length bias limit.

An instance that fails validation is discarded and another is drawn; rejected template IDs are excluded for that attempt.

## Session algorithm

1. Filters (skills, category, modes, difficulty, context) select eligible templates.
2. A shuffled **bag of skills** guarantees each skill appears once before any repeats; a skill whose templates were all just used is deferred.
3. Templates whose pattern and family were recently used are preferred, **before** choosing a mode. Pattern spacing is `min(12, patterns-1)`; family spacing is `min(5, families-1)`.
4. Mode is weighted (40/25/20/15) and damped for modes used in the last five challenges.
5. Within the pool, less recently used templates and settings are favoured.
6. The correct-answer position avoids repeating the previous position.
7. Render, validate, then return. Randomness for challenge *n* is forked from the seed, so a challenge never changes when others are requested.

## Adding a template

1. Add or confirm a family in `content/families.json`.
2. Add the template to `content/templates/<skill>.json`.
3. `npm run validate`, then `npm run sweep` (renders it 150 times across every allowed setting).
4. **Read** at least three rendered instances in different settings. Automated checks cannot judge whether a scenario makes sense.
5. `npm run build`, then `npm test`.
