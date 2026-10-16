# Test Case Builder — generator specification implementation

This update replaces the earlier quick-practice generator implementation. It keeps the same five modes, Mixed Practice default, four visible answer buttons, one scored submission, immediate answer/explanation, Next Challenge, navigation, and shared session tracker.

## Template inventory

56 mode-specific template slots (some families are deliberately available in more than one mode):

- **Find the Bug-Exposing Input (17):** lower-inclusive and upper-exclusive comparisons; equality; inequality; shifted constants; exclusive ranges; AND/OR; missing NOT; grouping; compound inclusivity; even-count defect; loop endpoint; skipped first adjacent pair; extra iteration; counter update; zero-iteration return; incomplete list search.
- **Predict the Result (12):** IF/ELSE arithmetic; selection chain; list sum; conditional count; repeated accumulation; REPEAT UNTIL; procedure arguments; first-match search; first/middle/last/invalid CHAR access.
- **Boundary Testing (10):** inclusive/exclusive lower and upper boundaries; shifted lower/upper range limits; range-selection defect; loop endpoint; zero-iteration return; omitted last element in a maximum search.
- **Branch Coverage (6):** IF/ELSE; second branch of a chain; nested selection; compound Boolean condition; prior-condition masking; missing branch in an existing pair of tests.
- **Edge Cases (11):** empty/singleton counting; empty sum; present/absent search; guarded first access; last element; unguarded empty access; zero/one repetition; empty-string concatenation; short/empty CHAR access; nonempty-list precondition.

These implement requested families A–G. Compound and loop input choices sometimes use equal-length two-element lists to avoid making the sole positive or extreme number the answer. The list is one clickable response, not a form.

## Removed and replaced

The previous above/below-range arithmetic questions, selecting the only empty/singleton list or shortest string, obvious index-extreme choices, and branch prompts expressed as TRUE/FALSE paths are gone. Edge cases now ask about actual program behavior. The empty-product template was removed because its distractors were weak. Obsolete template pools and their validators were removed rather than retained as hidden modes.

## Validation

Every accepted question has four distinct semantic choices and exactly one option satisfying its actual task. Bug questions compare a separately specified requirement with execution of the displayed implementation for every option. Branch questions execute actual control flow. Output questions execute the exact supplied input.

Input-choice validators reject sole sign/extreme numeric keys, unequal list lengths, unique sign/extreme coordinates, and shortest-string shortcuts. Output distractors come from branch alternatives, off-by-one counts, initialization errors, values-versus-indices, library errors, and related operations. Authored empty-traversal questions intentionally assess a fixed identity/result; answer placement still varies. A template deck exhausts each category's pool, separates related structures, and includes every category in each five-question Mixed group.

Code is indented vertically. Generated code lines are limited to 36 characters in the dedicated tests; the game-specific stylesheet also allows wrapping as a narrow-screen fallback. No shared stylesheet is changed.

## Automated checks

Run `npm test` in `csp-games` after installing its existing development dependency. The dedicated suite samples 100 questions per template (5,600 total), independently compiles the displayed pseudocode, evaluates all four choices, checks every answer position, checks copied-threshold variation, exercises invalid/duplicate/ambiguous choice rejection, checks category rotation, and tests correct/incorrect/reveal/skip/locked submissions with the real session tracker. Existing session records survive reloads and topic changes.

The complete 14-suite regression run also tests unrelated games and shared session/summary behavior. A separate seeded comparison confirms 1,000 unchanged outputs from the five unrelated generators sharing practice-engine.js. Its only production change is the Test Case Builder module version.

## Verification limits

Browser checks and deployment confirmation are reported in the completion message. The available browser has no supported viewport-resize/device-emulation API; a true 390px device run cannot be claimed. Narrow-screen protection is implemented and checked through code-width constraints and responsive CSS. These are static, original practice questions, not official College Board exam items.
