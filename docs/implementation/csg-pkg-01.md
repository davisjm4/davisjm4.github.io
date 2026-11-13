# CSG-PKG-01 · Targeted Clarity

Implementation branch: `codex/csg-pkg-01-targeted-clarity`. Approved baseline: `6f439c9dece87e58cb53838ee2cbd1b3efb2da71`. This record covers the targeted acceptance scenarios. The full cross-domain scenarios remain scheduled with their owning packages.

| Requirement and scenario | Behavior and verification |
| --- | --- |
| CSG-UX-01/02/03 and CSG-AT-08 | Variable Lab shows and focuses its verdict directly after Check Answer, with Next Challenge and the execution trace below it. Browser checks use 320, 390, 768, 1024 and 1366 CSS px. Review includes keyboard, mobile emulation and screenshots. |
| CSG-TCH-01/03, CSG-MAS-02 and CSG-AT-03/04 | Teacher assessment success and failure appear beside Record assessment. Failed writes keep the entered score. One retry through the real local API records a single verified score. Acknowledged writes can succeed even if refreshing the report fails. Teacher roster instructions reflect active enrollment. |
| CSG-TCH-04, CSG-MAS-03 and CSG-AT-05 | Requirements distinguish unapplied fields, validation, unsaved changes, confirmed draft, and published revision. Existing Save draft, preview, publish and rollback endpoints retain their contracts. Unit coverage rejects publication when another editor changed the draft between save and preview. Full evaluator-separation acceptance is deferred to CSG-PKG-08. |
| CSG-SES-01/02 and CSG-AT-07 | String Lab shows zero attempts for untouched modes. Both summary entry points remain available. Recognizable activity titles appear in profile reports. CSV identifiers and export formats remain stable. |
| CSG-NAV-03, CSG-MAS-01, CSG-SEC-01/02 and CSG-AT-01/03/09 | Mapped practice links carry whitelisted, same-origin return state. Guest links retain independent practice. Class returns match the active class and course before restoring map state. Unsupported or stale links offer a safe route. Existing session and evidence code continues to handle attribution. |

## Verification and release

Use the existing Node 24, Chromium and synthetic local Worker harness. The production sign-in flow requires an authorized Google account. This package only changes static assets. The existing deployed Worker and database do not require a migration.

```sh
node --test cs-games/teacher/cs-games-backend-tests.mjs cs-games/teacher/wpr-profile-tests.mjs cs-games/teacher/wpr-online-tests.mjs cs-games/pathway/tests/*.test.mjs cs-games/student/guest/tests/*.test.mjs
CHROME_BIN=/path/to/chromium node --test --test-concurrency=1 cs-games/teacher/targeted-clarity-browser-tests.mjs cs-games/teacher/requirements/integration-browser-tests.mjs cs-games/teacher/independent-learner-browser-tests.mjs cs-games/teacher/proficiency-browser-tests.mjs
node cs-games/navigation-tests.mjs
node java-games/variable-lab/trace-tests.mjs
node java-games/variable-lab/feedback-ui-tests.mjs
node java-games/variable-lab/evidence-ui-tests.mjs
node java-games/session-tests.mjs
```

The combined Node suite passed 383 tests. Variable Lab trace, feedback, evidence, Java session boundaries, catalog navigation and the generated curriculum graph checks passed. Browser and deployment results are attached to the implementation pull request and Master Project Tracker. Physical Chromebook, touch-device and native screen-reader runs are separate from Chromium viewport and accessibility checks.

If needed, revert the static change through GitHub Pages. Previously recorded assessments, attempts and published revisions use the existing compatible storage formats and remain readable.

## Next package

CSG-PKG-02 starts with the existing course chooser, guest and enrolled map shells and route contract. Connect course cards to maps, preserve the activity catalogs and deep links, then add shared Map/List concept search and verify all seven CSG-AT-02 queries before retiring the area jump or recommendation surfaces. CSG-PKG-03 follows after the navigation release. CSG-PKG-04/05 depend on CSG-PKG-08 for UI that claims independent formative, target and teacher-reviewed results.
