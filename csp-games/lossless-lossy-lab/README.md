# Lossless vs. Lossy Compression Lab

Buildless GitHub Pages practice: one scenario, two buttons, one scored selection, then feedback explaining both methods. Mixed default; optional Text & structured data, Images & visual assets, Audio & video, Storage & bandwidth filters. No difficulty levels, preliminary rationale selection, typing or sorting.

## Audit and architecture

Existing Compression Challenge teaches RLE text/pixel encoding, scan order and constrained storage optimization. Its lossless encoding workflow is a different instructional objective, so it is preserved. The new standalone decision lab adopts the Analog vs. Digital Lab interface/session pattern and bounded-sampler design; it does not replace or change the original compressor.

- content.js: 60 authored context/fidelity contrasts, each with an exact-source and approved-approximation case; three independent resource profiles (transfer allowance, storage allocation, delivery deadline).
- engine.js: constructs 360 validated compositions, classifies explicit fidelity/feasibility models, rejects contradictory/ambiguous/infeasible models, samples finitely, and builds item-specific feedback for both methods.
- app.js: open filters, plain Lossless/Lossy buttons, post-answer explanation, one-attempt locking, Next/skip, shared daily assessment and history persistence.
- index.html / style.css: CS Games dark theme, focus handling, accessible status feedback, native keyboard controls and responsive layout. No runtime external assets/backend/accounts/uploads.

## Instructional model

Exact reconstruction is a hard constraint for the exact-source case. A tested exact-retaining setting must fit its allocation. Approximation cases explicitly approve information loss for the named copy, do not require original recovery, and have a resource limit that the available exact-retaining setting exceeds while the approved approximation fits. Both methods are considered under item-specific hypothetical trial sizes; these percentages are not real codec benchmarks or universal compression ratios.

When a source and preview are mentioned, the focus box identifies which item is compressed. Source code itself is never silently treated as safe to damage; an approved visual preview is a different item. Scientific/financial approximation variants specify permitted precision loss or a separately scoped view-only asset. Medical image examples specify exact retention versus non-diagnostic viewing requirements. All 60 contrasts have both labels; file type or extension cannot determine the answer. Generated questions contain no codec extensions or method names.

Feedback ties the decisive requirement to the artifact's consequence/purpose and discusses the alternative. Learn covers exact reconstruction, information loss, fidelity, redundancy, storage/bandwidth and the fact that size reduction depends on the data and method. Primary references: College Board CED Topic 2.2 and BJC compression, linked in the interface/report.

## Diversity and sampling

60 families × 2 fidelity cases × 3 resource profiles = 360 scenario compositions. These are 120 authored fidelity cases combined with three constraint types, not 360 independently authored stories. Each filter has 15 families and 90 compositions. All 18 requested coverage tags are represented.

One rolling last-50 question-ID history spans topic changes and reloads within the daily session. Previous three families are excluded where possible; exact exclusion takes priority. If only a tiny injected pool exhausts exact candidates, drop oldest exact restrictions after relaxing family cooldown. Selection filters finite arrays and cannot spin in retry loops. Answer balancing/streak limits, family usage and topic coverage guide selection; semantic-case avoidance adds variety in Mixed when feasible. Normal-pool tests require no exact/family relaxation.

## Assessment

One answer only; wrong rounds close using the existing shared single-attempt convention without gaining correct credit. Reference use/filter switches/skips do not count as answered. Shared summary records topic/mode first-try results and idle-aware CSP active time. Skill tags prepare future compression/tradeoff pathway mapping without building a pathway. Local history resets with the established daily session. No student identity is collected by this game.

## Tests and review

```
npm run test:compression --prefix csp-games
TZ=America/Los_Angeles node csp-games/lossless-lossy-lab/ui-tests.mjs
npm test --prefix csp-games
node cs-games/catalog-tests.mjs
```

41,685 engine/content/generator assertions + 84 DOM assertions = 41,769 new assertions. Core: 15,000 rounds over three seeds and five filters, 7,500 Lossless / 7,500 Lossy, zero exact repeats in 50, zero previous-three-family violations and maximum answer streak two. Further 3,000 reload/switch rounds: 1,496 Lossless / 1,504 Lossy, zero exact/family violations, maximum streak two. A separate 6,000-round coverage run reached all 360 compositions.

Authoring audit also checks length-based shortcuts: the best single word-count threshold predicts 203/360 (56.4%) labels, versus an initial 100% shortcut that was repaired. See reports/GENERATOR_VALIDATION.json. These checks do not certify natural-language ambiguity absence; educator/classroom review remains pending. reports/CONTENT_REVIEW.md supplies the 60 authored contrasts and 120 representative cases for review.

browser-harness.html offers 320/390/768/1024/1280px frames for actual browser keyboard/pointer/layout QA. Physical Chromebook, tablet, touchscreen and screen-reader checks remain separate review items. No literal unlimited semantic-content claim.
