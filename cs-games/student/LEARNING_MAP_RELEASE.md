# Student learning map release

The map is the default for enrolled students. The List button opens the same pathway and skill details in reading order. The previous pathway list also remains available at `/cs-games/student/?view=classic` and loads if the map modules fail.

The prototype came from `f368271eee9de45e7c18196a28e09e37514b529f`, based on `d646f8aa8e8b1b2b81cbe368b64204f302ec4602`. The integration imports the production components and uses the existing student pathway response, authenticated profile sync, and restart endpoint. Demo data, screenshot binaries, and the in-memory demo adapter stay on the prototype review branch. AP CSP visits recurring labs in their published positions with numbered continuation labels and a shared lab icon.

The Worker adds a student-facing projection of evaluated mastery progress and close dates for the ten most recent closed attempts. The authenticated student response retains its prior fields and invalidates cached older responses after deployment. Requirements met, teacher-verified mastery, and teacher assessment scores remain separate. This release needs no database migration or backfill.

## Release verification

- Verify the Worker build with Wrangler and run the profile, pathway, and mastery suites. The integration browser tests enroll a synthetic student, answer real focused and Mixed Practice questions, confirm attribution, restart an attempt, restore it in another browser, reorder skills, and publish and remove pacing.
- Verify course and skill maps, List, keyboard focus, and profile navigation across 390, 768, 1280 and 1366 pixel viewports. Use a synthetic class for any write test. Chromium viewport and automated accessibility checks supplement physical-device and assistive-technology testing.
- Verify the Worker health and authenticated contract and confirm GitHub Pages serves the assets from the merged tree. During a staggered rollout, older Workers still supply counts, published requirements, recovery copy, and restart history. Structured checklists and closed-attempt dates appear after the Worker update.
- If a presentation issue occurs, use the classic pathway URL for immediate access. Revert the frontend commit to make the original list the default. The prior Worker can serve either frontend without a database rollback.
