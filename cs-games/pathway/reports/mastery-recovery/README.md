# Mastery attempt recovery and qualification feedback

Base: released main `ad8c672` (includes PR #63 at `40bf028`). Draft authentication/teacher branches #56/#57 are excluded. This is a focused PR, not a production release.

## Reproduced causes

| Classroom case | Verified cause | Repair |
|---|---|---|
| Variable Trace, 26 correct / 50, 85% | Independent formative evidence has no explicit attempt boundary. `(26+k)/(50+k) >= .85` first holds at k=110. Daily Reset Session operates on daily session statistics only. | Start New Mastery Attempt in independent skill panel and practice. Append an identifiable boundary and the closing evidence IDs; evaluate new eligible answers separately. |
| String Predict, 6 correct / 7 Intermediate | 85.7% meets accuracy, but the count is below eight; coverage is an additional independent condition. Existing feedback emphasized accuracy and omitted the actionable count shortfall. | Always-visible question-count, first-try accuracy and coverage checks, plus a direct qualifying-practice link. |
| String Beginner question with Intermediate URL | Reproduced on the released source: launch Intermediate, then select Beginner. The actual generator changes correctly, but the URL remains Intermediate. | Keep URL mode/difficulty in sync with selections; show a live warning when actual difficulty or assessed mode does not advance the displayed independent target. |

A qualifying correct eighth String answer gives 7/8 = 87.5% and meets the numerical requirements. Coverage must also pass. An incorrect eighth gives 6/8 = 75% and remains incomplete. Beginner answers never fill the Intermediate Level 3 count. Mixed Practice credits the assessed skill and actual reviewed difficulty, not the selected Mixed setting.

## Implementation and evidence safety

Independent attempts are additive browser-local metadata, scoped by course and stable skill ID. Their request IDs support idempotence and stale-request rejection. Closing evidence IDs keep late pre-boundary arrivals from silently changing a closed attempt. Historical answers remain in the raw event collection, and demonstrated tiers remain recognized across explicit attempts. Fresh users without boundaries follow the unchanged evaluator path.

Boundaries are retained in the guest state for backups and separately under `cs-games:guest:mastery-attempts:v1` so an older open game tab cannot erase them when it writes the legacy guest record. Existing guest storage remains schema 1. Export/import retains boundaries without trusting an imported award or official score. Compaction cannot fold closed-attempt evidence or evidence in a course with explicit attempts. Storage failure reports an inability to save instead of trimming closed-attempt evidence; the existing 5,000-event hard capacity remains bounded and requires backup when full. Older clients cannot interpret attempts until refreshed.

Class practice uses the existing authenticated `/pathways/student/:class/restart` lifecycle, server time, optimistic concurrency and durable history. The new practice-page control synchronizes queued practice first, blocks offline failure, and reuses request IDs when retrying an uncertain response. It does not create a second class evaluator or reset class formative history. Teacher requirements, formative tiers and official scores retain their existing separate meaning. The class-target label identifies which attempt is restarting.

No D1 migration, event deletion, historical rewrite, account/ownership change, new scoring formula, threshold replacement or official-score mutation is included. No CSG-PKG-08 activation, proficiency-shadow flag change or production Worker deployment is included. Restoring an older frontend preserves the extra guest metadata, but that old frontend will display its original cumulative interpretation; refresh to the repaired version to interpret boundaries.

## Policy audit and approval boundary

Independent rubrics are defined in `proficiency/catalog.mjs` and `proficiency/coverage-phase2.mjs`. Variable Trace and applied String Level 3 use eight eligible answers at 85%, with reviewed family/subskill coverage. These are formative tier rubrics, not the class complexity presets.

Published classroom defaults use Quick Recognition 50/95%, Standard Practice 30/90%, and Complex Reasoning 20/90%, with teacher overrides. Variable Trace is assigned Complex Reasoning by the existing calibration, verified as 20/90% in an actual synthetic class contract. The practice page reads that class requirement from the server rather than substituting 8/85%.

The existing legacy coupling for checkpoints without `requirementTier` is unchanged. A broad separation/migration of historical progression, current formative proficiency, class targets and official scores is CSG-PKG-08 and remains gated.

Approval is needed to change the independent formative thresholds, replace the cumulative-per-attempt rule with a rolling/best-N window, map the three classroom presets onto formative tiers, change legacy coupling, or reinterpret historical/official results. None is required to review and release the explicit-boundary and feedback fixes in this PR.

## Automated and browser validation

The focused tests reproduce both numerical cases using real generators and the real evidence adapter. They cover fresh/repeated attempts, restart idempotence and stale actions, first-try retries, focused/Mixed attribution, family coverage, Beginner/Intermediate separation, backup persistence, legacy-tab compatibility, late offline events, daily Reset Session, storage failure, retained proficiency, guest/class isolation and teacher-reviewed scores.

The Chromium journeys exercise the visible new-attempt confirmation by keyboard, 26/50 → 0/8, String 6/7 → Beginner practice with no L3 credit → direct Intermediate practice → 7/8 completion. The synthetic enrolled journey verifies 50/20 at 90% → offline rejection → 0/20, unchanged server event rows, preserved 2.5 and 4 teacher scores, and unchanged guest history. Existing server suites cover restart races, offline replay and class ownership.

Desktop 1440×900, Chromebook-sized 1366×768 and mobile 390×844 screenshots are captured by `mastery-recovery-browser-tests.mjs`. Axe WCAG A/AA checks cover the live meter and map; keyboard focus and no horizontal overflow are asserted. CI uploads synthetic screenshots as `mastery-recovery-browser-evidence`.

Automated tests establish bounded functional and interface evidence. Real student comprehension, physical Chromebook/phone use and live screen-reader testing remain open. No classroom effectiveness or production verification is claimed.
