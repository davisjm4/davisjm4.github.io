# Workplace Readiness mastery evidence: integration handoff

Base `c8354e7021f8aeac48104c36c288a269d0c69a87` (current main, after PR #48). Work began on `012aa9cb5abac0966de290a8b90f737a16edc395` and was rebased. Branch `fix/claude-wpr-mastery-evidence`. Final commit `ac56e605bc0b86ab03b1a8ffc9ab91bddd95cb07`. One commit. Not pushed, merged or deployed.

## Apply

```
git fetch claude-wpr-mastery-evidence.bundle fix/claude-wpr-mastery-evidence:fix/claude-wpr-mastery-evidence
# or
git apply --check claude-wpr-mastery-evidence.patch && git am claude-wpr-mastery-evidence.patch
```

## Files

| File | Change |
|---|---|
| `cs-games/pathway/wpr-primary-concepts.mjs` | New. Attribution table, `primaryAttribution`, `verifyPrimary` |
| `cs-games/pathway/mastery/wpr-automatic.mjs` | New. Enabled concepts and tiers (data only) |
| `cs-games/pathway/evidence.mjs` | `workplace` branch in `questionEvidence` (6 lines) |
| `cs-games/pathway/requirements/recommended.mjs` | Enabled Workplace Readiness skills get their tier in `auditRecommended` |
| `wpr-games/workplace-readiness/online/node-evidence.mjs` | New. Client adapter |
| `wpr-games/workplace-readiness/online/readiness.mjs` | `recordPractice` also queues the node event |
| `wpr-games/workplace-readiness/js/app/app.js` | Passes the session seed to `recordPractice` |
| `wpr-games/workplace-readiness/online/student.mjs`, `index.html` | Cache version `wpr-node-evidence-v1` |
| `cs-games/pathway/tests/wpr-primary-concept.test.mjs` | New. 19 tests |
| `cs-games/pathway/tests/wpr-primary-concept-service.test.mjs` | New. 3 tests on the dev service |
| `cs-games/pathway/audit/wpr-mastery/*.mjs` | New. Coverage rules, quality measures, matrix builder |
| `cs-games/pathway/audit/coverage/build-coverage-matrix.mjs` | Workplace Readiness rows now come from the measured primary-concept coverage; performance set imported from one place |
| `cs-games/pathway/reports/coverage/coverage-matrix.json`, `CLAUDE_MASTERY_COVERAGE_MATRIX.csv` | Regenerated (CI `--check` requires it) |

Not touched: Roundoff vs. Overflow, Cloudflare authentication, class creation, the preset UI, the PR #47 participation controls, teacher-assessed scores, the database schema, the mastery engine, the curriculum graph, the guest map.

## Event contract (existing shared fields, no new schema)

`format: game-attempt`, `kind: practice`, `courseId: workplace`, `activity: workplace-readiness`, `id: <questionId>:1`, `attempt: 1`, `mode` and `assessedMode`: the question's own mode, `topic`: primary concept id, `familyId`: reasoning unit key, `difficulty`, `evidenceRevision: wpr-primary-v1`, `correct`, `occurred`, `assisted: false`. `questionId` and `sessionId` are derived from the session seed and question id, so a reload or replay produces the same event id.

## Deploy notes

1. The Worker imports `evidence.mjs`, the graph and (through `default-pathways.mjs`) `recommended.mjs`. Node credit starts only when both the pages and the Worker are redeployed. Either order is safe: an old Worker stores the new event with no node dimension, and an old page sends no node event.
2. **Events stored by an old Worker are not re-credited later.** Deploy the Worker first if that matters.
3. **New classes only.** `auditRecommended` now returns a tier for 30 Workplace Readiness skills, so new Workplace Readiness classes created with recommended requirements start with them. Existing published pathways are not changed.
4. PR #48 (Roundoff) is already in the base. It added a checked-in coverage matrix; this commit regenerates it. `reports/coverage/CLAUDE_MASTERY_COVERAGE_AUDIT.md` and `CLAUDE_MASTERY_EXPANSION_HANDOFF.md` are hand-written and were not edited: their Workplace Readiness paragraphs (no adapter, no primary-concept rule) are now out of date.

## Decisions for the product owner

1. Review of the attribution table by a Workplace Readiness teacher. Until then treat the 30 as provisional.
2. Whether a hazard-control answer inside a non-safety kit should credit a Workplace Safety skill (cross-skill credit). Currently it earns nothing.
3. Whether existing Workplace Readiness classes should be offered the new tiers. That needs a teacher action or an approved data operation.
4. Whether the activation thresholds (4 units, 3 high confidence, 2 modes, 10 questions per unit, 50% longest-option limit) are the right bar.
5. Whether guests should see Workplace Readiness skill results on the guest map.

## Maintenance

After any change to Workplace Readiness content or the table, run `node cs-games/pathway/audit/wpr-mastery/build-matrix.mjs <dir>` and the two test files. The test `only vetted nodes are enabled` fails until `WPR_AUTOMATIC` matches the rules applied to the live catalog.

## Expansion order (most value first)

1. Revise option lengths for PPE and identify-hazards (otherwise ready). Self-representation has the same flaw but is also classed as performed behaviour.
1. Educator decision on the 8 performed-behaviour skills; presenting, appearance, diligence and dependability have enough reviewed questions to enable if scenario knowledge is accepted as evidence.
2. Educator review of the 13 skills that have enough units but too few high-confidence ones.
3. Give composed questions a per-issue concept so `find-the-defect` and ordering questions can be attributed.
4. Write primary content for the 4 skills with none, and for the 40 skills with 1 to 3 units.
5. Split the three numeric kits by concept, or merge the two mathematics skills for assessment.
