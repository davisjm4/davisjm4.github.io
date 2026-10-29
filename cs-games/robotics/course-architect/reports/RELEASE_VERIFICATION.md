# Release verification — October 29, 2026

Implementation commit: **522b7bc7ff9c429ab2eaa413347edd901011ef27**.

Published application: https://davisjm4.github.io/cs-games/robotics/course-architect/

- GitHub Pages run 40898853958: success.
- Robotics activities verification 40898855329: success (new scale/geometry tests and existing Parts Sprint/session checks).
- Unified navigation verification 40898854788: success.
- All 16 triggered implementation workflows completed successfully (including the broader CSP regression workflows); exact run IDs are in evidence/release-ci.json.
- Eight published source files have matching SHA-256 hashes against the tested checkout. See evidence/published-assets.json.
- Hub, Robotics, Parts Sprint, CSP, Advanced, WPR, RACECES and Teacher Tools URLs return HTTP 200.

## Published browser workflows

Verified CS Games → Robotics → Course Architect. Robotics lists both new Course Architect and existing VEX Parts Sprint. Followed Course Architect's Robotics return, launched existing Parts Sprint, used CS Games home and re-entered Robotics/Course Architect. Confirmed final activity URL/title.

On the published application, saved Test 1 at 1:5, applied recommended 1:20, saved Test 2 and compared. Test 1 retained 7,400 mm actual path and its paper-fit failure; Test 2 retained the same actual path and passed paper fit. Warning counts changed 6→5 because the annotated export also fit. Preparing both notebook entries included both exact saved scales/results and did not invent a successful physical observation. Downloaded Test 2 SVG from the live app; its bytes exactly match the diagram generated independently from the recorded design. Published screenshot included.

Local browser workflows additionally exercised earlier segment editing, undo/redo, reset cancellation, project JSON download/validated restore, reload persistence and adding a connected left curve. Remote Chromium frames at 320/390/768/1024/1366 CSS px had no page-wide horizontal overflow after the small-screen fix. Physical touch/Chromebook and actual screen-reader speech were not tested.

A browser evidence-download attempt temporarily stalled the first tab. A new tab recovered; published navigation, save/compare, notebook generation and SVG download then succeeded. No feature was marked passed solely from that failed attempt. Keyboard numeric input/Tab and undo were exercised; live screen-reader output and physical printer/robot behavior remain classroom review.

## Tracker reconciliation

The existing tracker was searched for Robo Rally and G-121; no duplicate simulator entry existed. G-120 Parts Sprint was preserved.

- Master Inventory **A59:L59**: G-121, published/live verified, classroom review pending; source path, URL, scope, features, math/geometry/export evidence, SHA, limits and future follow-up.
- Release History **A24:G24**: Build 2 release, implementation SHA, Pages/CI evidence.
- Issues & Risks **A8:G8**: I-008, conservative geometry and unverified physical devices/AT/robot/printer follow-up.

All three written ranges were read back and matched every expected value. Existing row formatting was preserved and WRAP applied to new text; no dropdown/validation/chip constraints were present in those targets. Spreadsheet visual verification was limited to native format metadata rather than a signed-in visual inspection.

## Remaining limits

Physical navigation is never inferred from digital results. The planner uses conservative body/obstacle envelopes, finite pose limits, explicit turning assumptions and rounded endpoint pads; real drivetrain behavior is outside scope. SVG export is delivered; no PNG export is claimed. Browser storage is device-specific; regular JSON backups are necessary. Classroom teaching effectiveness remains unreviewed. These are documented limits, not a claim that a real robot has passed.
