# Expansion quality audit

Tools: `tools/content-quality-audit.js` (per-kit seeded audit, student-visible text), `tools/compose-sweep.js` (every unit in every allowed setting), `js/compose/check.js` (instance logic re-derivation), `tests/content-expansion.test.js`.

## Results (final kit set)
- 66 kits (51 existing + 15 new), 3,933 units, 195,284 sweep renders, 0 validator or logic errors. Audit: 66 kits, about 90,000 renders, 0 flagged.
- New-kit cue measurements (shown here from `CONTENT_QUALITY_AUDIT.json`):

| Kit | Renders | Key position (A/B/C/D) | chi2 (3 df) | Key is longest | Key is shortest | Key is 'carry on' |
|---|---:|---|---:|---:|---:|---:|
| big-community-and-industry | 1132 | 178/154/179/173 | 2.37 | 0.156 | 0.213 | 0.139 |
| con-working-across-differences | 1047 | 150/149/139/160 | 1.48 | 0.256 | 0.003 | 0.219 |
| cre-why-originality-matters | 1179 | 174/167/165/159 | 0.69 | 0.338 | 0.006 | 0.433 |
| ctp-compare-solutions | 1357 | 228/255/226/246 | 2.49 | 0.001 | 0.052 | 0.137 |
| eff-care-for-equipment | 1016 | 120/144/156/134 | 5.05 | 0.209 | 0.226 | 0.152 |
| eff-sustainable-practices | 1012 | 176/154/164/147 | 2.98 | 0.003 | 0.128 | 0.128 |
| ili-fit-to-the-task | 1167 | 175/167/164/175 | 0.56 | 0.159 | 0.128 | 0.163 |
| int-rules-and-regulations | 993 | 168/151/159/154 | 1.05 | 0.108 | 0 | 0.146 |
| int-trust-has-consequences | 958 | 167/153/131/152 | 4.38 | 0.378 | 0.091 | 0.221 |
| ise-acceptable-use-limits | 892 | 141/174/146/133 | 6.42 | 0.145 | 0.221 | 0.138 |
| ise-every-format | 880 | 143/141/151/142 | 0.44 | 0.194 | 0.175 | 0.158 |
| ise-responsible-technology | 885 | 148/142/142/149 | 0.29 | 0.205 | 0.134 | 0.17 |
| ite-handling-devices | 978 | 132/124/116/144 | 3.32 | 0.004 | 0.159 | 0.12 |
| ite-new-technology | 962 | 132/134/134/165 | 5.34 | 0.179 | 0.051 | 0.165 |
| wet-owning-mistakes | 1303 | 214/203/201/215 | 0.76 | 0.402 | 0.054 | 0.215 |

Key position is balanced (chi-square under the 16.27 limit). The keyed answer is rarely the longest. In 4 to 14 percent of choice items the keyed answer is the engine's "carry on, nothing needs action" option; those items present only already-resolved problems and test recognition rather than a decision.

## Repaired
- `big-closing-impacts` (existing): the keyed answer was the unique longest option in 75 percent of choice items. Option text rewritten (ids, principles, tiers unchanged). Now 0 percent longest, 36 percent shortest (below the 45 percent limit, but a reverse cue exists).
- First-draft defects found by sample reading and fixed in the new kits: sentence-start lowercase from lowercase slot tokens, a keyed "carry on" answer whose reason was false, "clear" sentences that mentioned things never introduced, unrealistic setting pairings (restricted `contexts`), and a self-contained-wording pass on every ordering and plan phrase.
- Plan-order validity: the engine ranks co-occurring issues by tier and marks the reverse order "acceptable". For issues that are genuinely independent this asserts an order the facts do not support. In the new kits only the top two tiers may co-occur with other issues; every pair of lower-tier issues is excluded (`exclusive`).

## Findings not yet addressed (existing content)
- The same independent-issue ordering problem likely exists in existing kits; not measured.
- Existing kits with `contexts: any` may pair unrealistic settings and facts; not measured.
- The audit detector and the coverage key were corrected twice during this work (a.m./p.m. false positives; "resolved-only" variants that were being counted as decisions). Earlier intermediate numbers in this session's logs are superseded.

## Limits
All checks are mechanical or single-reader. Rules in the laws-and-regulations kit are stated as a workplace compliance guide; no statute is cited. No educator review, no student data, no browser verification of the new kits (the Chromium suites that exist fail identically on unmodified `main`: 7 of 36, stale after the PR #65 interface change). Not approved for automatic mastery.
