# Next Workplace Readiness assessment package — automated best-answer review

**Status: draft; no new automatic Workplace Readiness nodes enabled.** PR #49 has implemented server-issued questions and a security regression suite. Its measured banks still fall short of the existing 20-question Complex Reasoning or 30-question Standard Practice mastery requirements. Do not activate a node merely because it has many randomized instances.

## Assessment policy

Workplace Readiness is a **best / most appropriate answer** situational-judgment assessment, not a test in which every distractor must be categorically wrong. A question may contain four reasonable workplace actions when one is most appropriate under the explicitly stated conditions. Keep realistic competing actions and assess their tradeoffs. Explain to students after submission why the preferred response best balances the applicable priorities, and when a less-preferred action would make sense. Do not show the key or explanation before the assessed attempt.

**A blanket manual educator review is not required for release.** Replace that previous instruction with reproducible, automated verification and fail-closed per-skill eligibility. Automated checks and independent reasoning assessments do not prove universal semantic correctness. Unresolved cases remain ordinary practice or teacher-assessed, rather than being silently approved.

## Content repair sequence

1. **Repair known shortcuts.** Start with the two option-length problems (PPE and identify hazards). Balance specificity across alternatives; measure answer-length, position, and wording correlations across large seeded samples. Do not simply make three distractors implausible.
2. **Challenge the best answer.** For each candidate family, independently compare all options to the keyed answer using only stated facts. Evaluate immediate safety, policy requirements, professionalism, communication, authority, ethics, and skill-specific judgment as applicable. A non-keyed answer being *reasonable* is not a defect. An equally defensible top answer under the stated facts, a stronger non-keyed answer, or a missing decisive constraint is a defect.
3. **Repair attribution.** Ensure the demonstrated decision directly supports the nominated primary skill rather than a related skill. Prioritize known emergency-response, contribution recognition, authority, information-access, and sequence-dependency findings. Do not award credit to every secondary tag.
4. **Validate order and composed questions.** For ordering tasks, accept all valid sequences allowed by explicit dependencies; do not require an arbitrary total order. Sample career contexts and numeric boundaries to detect different keys or contradictory explanations. Keep stable identities for source units and changed revisions.
5. **Expand reasoning, not surface variants.** Count distinct assessed decisions, relevant constraints, competing priorities, failure modes, and misconceptions. Changed names, shuffled choices, different careers, and numeric draws alone are not new independent families. Add content in focused batches; do not lower the 20/30-question requirements to force activation.
6. **Keep the other coverage gaps explicit.** Separately track 50 coverage/attribution gaps, eight performed-behavior skills requiring observation or authentic evidence, and four skills lacking primary-concept content. Scenario recognition does not automatically demonstrate real-world performance.

## Repeatable release gates

- Run the 18,000-seed candidate audit and structural/behavioral checks. Report retained, repaired, excluded, unresolved, and practice-only families with examples and rationale. Independent automated evaluators should challenge the best-answer key; agreement is evidence, not proof.
- Every automatically eligible skill must have enough **distinct, independently server-scoreable** reasoning families to support its unchanged threshold, and must pass primary-skill attribution, explanation, and best-answer checks.
- Server scoring must verify issued question identity, authorized learner/class, immutable bank revision, response, and first-attempt behavior. Fabricated IDs, swapped concept/family, tampered response, replay, cross-profile use, and offline retry must not produce false automatic credit.
- Unverifiable offline attempts remain recoverable as unverified practice rather than silently discarded or credited.
- Keep existing automatic coverage and teacher-approved mastery intact. Enable only passing skills, individually; publish a fresh coverage matrix and run pathway, backend, browser, navigation, retry, and teacher-override regressions.
- Release only after all applicable checks pass and the deployment is independently verified. PR #49 stays in draft and its candidate nodes stay disabled until then.

The current [PR #49 repair](PR49_REPAIR.md) and [release audit](RELEASE_AUDIT.json) are the starting evidence. Original Claude classifications and educator-review suggestions are historical findings, not a current blanket approval requirement.
