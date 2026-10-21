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

---

# Compositional generator (added 2026-10)

The authored template system above is unchanged and still used. The compositional generator adds **kits**: typed components from which the engine builds many workplace situations and **derives** each answer from the situation's facts. Source: `content/compose/`; engine: `js/compose/`.

## Pieces

| Piece | File | Role |
|---|---|---|
| Frameworks (12) | `content/compose/frameworks.json` | Reusable reasoning frameworks A–L (critical information, competing priorities, safest action, conflicting instructions, communication failure, evidence reliability, process dependency, numeric decision, unexpected change, ethical dilemma, root cause, consequences). Each supplies prompts per mode and feedback templates; `_defaults` holds shared templates and tier explanations. |
| Typed slot pools | `content/compose/slots.json` | Per setting bundle: `powered`, `chemical`, `ppe`, `private`, `supply` (with plural), `area`. A kit lists the typed slots it needs in `requires`; bundles lacking them are excluded automatically. These extend, and never replace, the 11 base bundle slots. |
| Kits | `content/compose/kits/<skill>.json` | One workplace situation type for one skill. |
| Math source | `content/compose/src/mathematics.py` | Generates `kits/mathematics.json` (run `npm run math`). |
| Engine | `js/compose/engine.js` | Enumerates every valid state of every kit (the catalog) and renders a unit into a challenge with the standard instance contract. |
| Checker | `js/compose/check.js` | Kit validation (authoring time) and an instance logic check that re-derives the decisive fact independently. |
| Selector | `js/compose/selector.js` | Hybrid library (authored + composed) and the session engine. |

## State kits (Workplace Decisions, Best Next Step)

```json
{
  "id": "saf-powered-equipment",            // skill code prefix
  "skill": "workplace-safety", "framework": "safest-action",
  "family": "workplace-safety.cx-powered-equipment",   // must start "<skill>.cx-"
  "concepts": ["workplace-safety:identify-hazards"], "contexts": "any", "requires": ["powered", "area"],
  "setup": ["You work as {role|a} at {workplace|a}. ..."],   // variants, surface only
  "pressure": ["..."], "detail": ["..."],                    // optional surface sentences, never decisive
  "tiers": {"1": "Why a tier-1 issue comes before lower tiers.", "2": "..."},
  "issues": [{
     "id": "cord", "tier": 1, "rule": "control-hazard-first", "principle": "saf.damaged-electrical-equipment",
     "fact": ["The power cord on {powered|the} is frayed ..."],       // states the issue
     "clear": ["{Lead|the} replaced the frayed cord ..."], "done": "the cord was already replaced",  // optional: satisfied version
     "short": "the damaged cord", "action": "Keep ... switched off, tag it out ...", "brief": "tag out ... and report the cord",
     "reason": "best-answer feedback", "lesson": "takeaway",
     "shortcut": [{"text": "tempting wrong response", "brief": "...", "why": "...", "mis": "the misconception"}],
     "noProceed": false, "onlyLevels": null, "ignore": null
  }],
  "exclusive": [["a", "b"]],                // issues that must never be active together
  "proceed": {"text": "...", "why": "...", "lesson": "..."},   // the action when nothing blocks the work
  "generic": [{"text","why","mis"}], "overcaution": [{"text","why","mis"}],
  "process": {...}, "doc": {...}, "review": {"status": "approved", "checks": [...], "notes": "..."}
}
```

**States enumerated** (active issues must have different tiers, so priority is never a matter of taste; `exclusive` and `onlyLevels` prune further):

| Level | State shape | Facts the student combines |
|---|---|---|
| Beginner | one active issue; or no issue and one prerequisite stated as satisfied (`clear`) | 1 |
| Intermediate | two active issues; or one active issue plus a higher-priority constraint stated as already resolved | 2 |
| Advanced | three active issues; or two active issues plus a resolved higher-priority constraint; pressure sentence always shown | 3 |

**Answer derivation.** The decisive issue is the active issue with the lowest tier. Best answer: its `action` (Next Step, and Decisions with one active issue) or a two-step plan "First, {decisive}. Then {next}." (Decisions with two or more active issues). With no active issue, `proceed` is best.

**Distractors** (every one carries a misconception):

| Source | Role |
|---|---|
| another active issue's action | `acceptable`: a real need, but not first |
| reversed plan | `acceptable`: right steps, wrong order |
| `shortcut` of an active issue | distractor |
| `proceed` while an issue is active | distractor (skipped when the decisive issue has `noProceed`, because going ahead would not be clearly wrong) |
| a resolved issue's action | distractor: repeats something the scenario says is done |
| `generic` | distractor (must be wrong in every state of the kit) |
| `overcaution` | distractor in satisfied states |

**Signature** = `skill|state|first:<principle>|also:<principles>|resolved:<principles>` or `skill|state|clear:<principle>`. Kits may share a `principle` id when they test the same decision; shared ids collapse into one configuration.

## Process (Put the Steps in Order)

`process.steps` (`core` steps always included; others carry `issue` and are switched on with the fact that motivates them) and `process.rel` (`[before, after, why]`). A variant is valid only if it has 3–5 steps, every step takes part in a relation, no implied dependency is lost by leaving a step out (closure check), and at most 25% of permutations are valid. 3 steps = Beginner, 4 = Intermediate, 5 = Advanced. `alternatesReviewed: true` confirms that unrelated steps really are independent. `because` gives order-scenario wording for motivating facts (so the scenario does not echo step text).

## Defect documents (Find the Problem)

`doc.lines[]` each have correct `text` and `fine`; any line may carry `bad[]` defects with `level`, `why`, `principle` and optional `needs` (lines that must be shown with it, used when the defect contradicts another line). One defect per challenge; the other lines are shown in their correct form. Segments: 4 / 5 / 6 by level.

## Numeric kits

`engine: "numeric"`, `configs[]` with `vars` / `derive` / `constraints` (the existing safe expression parser) and either four `options` (numeric: `ok` "1"/"0", with constraints making every displayed value distinct; decision: `ok` expressions, exactly one must be true for the drawn numbers) or `lines` with one `bad: true` (find). Each config has its own `principle`. Independent answers: `tests/compose-numeric-oracle.test.js`.

## Instance contract

Composed instances use the authored instance contract (`templateId`, `skill`, `family`, `pattern`, `reasoning`, `mode`, `difficulty`, `concepts`, `context`, `bundle`, `scenario`, `prompt`, `principle`, `options|steps|doc`, `key`, `bestIndex|problemIndex`, `facts`, `maskValues`, `id`) plus `cx` metadata (kit, engine, framework, decision rule, signature, metrics, stated facts, numbers) and `source` (`authored`/`composed`) set by the selector. Choice keys add `source` per option. Existing consumers ignore the extra fields.

## Adding content

- **New issue in an existing kit:** give it a tier distinct from issues it may co-occur with (or add an `exclusive` pair), a principle id, a fact, an action, a brief, at least one shortcut, reason and lesson. Add `clear`/`done` only if the action is something that can genuinely already have been done.
- **New kit / scenario state / reasoning framework:** copy a kit in the same skill, change the situation, then run the loop below. A new framework goes in `frameworks.json` with prompts per mode.
- **New workplace setting:** add the bundle to `content/contexts/` and its typed slots to `content/compose/slots.json`.
- **New decision rule:** use a new `rule` id on the issue; rules are reported in the audit.
- **New constraint:** add an issue whose fact states the constraint (state the policy in the scenario if the answer depends on it).
- **Loop:** `npm run sweep:compose` (every unit in every allowed setting through both validators), `npm run capacity`, `npm run samples` and **read** the samples, then `npm test`.
