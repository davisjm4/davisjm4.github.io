# Implementation and validation · G-115

## Repository audit

Parent integration baseline: c3da699ff0c663a1468b3271848e2a7e98af2019, fetched against upstream main. No existing dedicated AI ethics lab was found. Computing Impact Lab already uses shared practice scenarios for broad computing impacts; Vocabulary Fill-in Lab covers terminology. Both are preserved. This lab adds bounded AI evidence, mitigation, tradeoff and consequence decisions rather than their explanation-building or fill-in interactions.

Reused existing dark theme, header conventions, finite generator design, shared session.js daily/active-time behavior, summary.js cumulative report and Big Idea grouping. No shared session schema/runtime change. Both catalogs and the legacy activity catalog are integrated without duplicate launches; hub count is 27.

## Experience and architecture

Five modes, five topics, Mixed defaults; four neutral native buttons; one terminal scored selection. Feedback appears only after selection and includes the key, scenario rationale and relevant alternative misconception. Next, filter changes and Learn do not score. Learn is closed by default and contains definitions and worked distinctions. No typing, audio, drag/drop, accounts or backend. All runtime assets are local. Browser state stores shared session data and at most 50 recent IDs tied to the shared daily session ID.

The 100 authored families compose to 500 instances, 20 per mode/topic combination. Selection uses finite candidate sets, weighted mode/topic/concept/family coverage, exact history 50, family cooldown 3 and concept cooldown 2 where feasible. Family restrictions relax before exact history. If every eligible question is recent, the smallest necessary oldest-history relaxation is used. Topic never broadens silently. Shared history survives filter changes and reloads in the same daily session.

The shared tracker is the only score source. Disjoint buckets preserve actual mode, concept, topic and filter accuracy beyond the 256-record retention limit. Summary includes game/topic, practice-mode/filter and Big Idea 5 totals. Readiness metadata is present; the broader pathway is not implemented.

## Executed tests

- npm run test:ethics --prefix csp-games: 37,467 engine/content assertions + 2,181 DOM/session assertions = **39,648 passed, 0 failed**.
- 27,200 measured simulation rounds over two 5,000-round Mixed seeds, 5,000 cross-mode, 5,000 cross-topic and 7,200 all-selection rounds. All 100 families and 500 instances reached. Zero avoidable exact-repeat violations; zero avoidable previous-three-family violations; zero consecutive concept repeats in measured rounds.
- Correct-answer positions: 6,753 / 6,847 / 6,852 / 6,748 (24.83% / 25.17% / 25.19% / 24.81%). Mode counts: consequence 5,428; response 5,431; issue 5,474; tradeoff 5,434; evidence 5,433.
- 4,500 necessary exact-history relaxations occurred in the 20-instance narrow pools. No family relaxation was needed in the measured corpus. A separate five-instance fallback test confirms bounded operation without broadening.
- 250 seeded paired comparisons, reload history, unknown filters and malformed data contracts tested. Author fixtures cover 16 high-risk distinctions.
- DOM suite exercises all 36 selections, 444 scored rounds, incorrect and correct choices, repeated-click lock, no pre-answer feedback, help/filter/skip exclusions, metadata, cumulative grouping, actual Summary rendering and daily/manual resets.
- TZ=America/Los_Angeles node csp-games/ai-ethics-lab/ui-tests.mjs passed.
- npm test --prefix csp-games passed across the existing game suites including Vocabulary, Internet Layers and TCP/UDP. Consolidated catalog tests passed, including actual AI Ethics rendering in Big Idea 5 and each topic filter. No unrelated generated reports included.

Raw evidence is in test-results; reproducible metrics are in GENERATOR_VALIDATION.json. Source review and full family-to-objective/rationale maps are separate reports.

## Browser and publication gates

Local Chrome interaction verified correct post-answer feedback, disabled choices, shared counters and a phone-width answer. Width harness supports 320/390/768/1024/1280 checks. Final live-URL, all-mode, keyboard, mobile, catalog and Summary checks are recorded in the publication work report and master tracker after deployment; a successful local test or commit alone does not establish publication.

Limitations: finite composed corpus, narrow-pool repetition, imperfect length neutrality, external classroom review pending. No claim of physical Chromebook/tablet/touch hardware certification, real screen-reader testing, Firefox/Safari coverage or fresh axe certification. Native controls, labels, focus styles, status feedback and reduced-motion/no-animation layout are tested where tooling permits.
