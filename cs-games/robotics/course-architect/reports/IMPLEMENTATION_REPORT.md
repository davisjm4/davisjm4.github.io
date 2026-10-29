# Robo Rally Course Architect — implementation report

Date: October 29, 2026. Workstream: Robotics 1 — VEX V5. Tracker: G-121 (new ID, following G-120 Parts Sprint).

## Outcome

A complete buildless engineering workspace at `/cs-games/robotics/course-architect/`, integrated into the existing catalog and canonical Robotics pathway. Existing VEX Parts Sprint is preserved. Six stages share one design and one millimeter-based geometry engine. This exploratory activity does not invent scored attempts, modify session accuracy, add Teacher Reporting, expand QTI, or access student GitHub accounts.

## Delivered behavior

- Robot width/length, per-side safety clearance, optional estimated turn radius, explicit in-place capability, description, rectangular floor and wall margin, up to 30 rectangular obstacles.
- Five display units with invariant canonical dimensions; six standard scales, custom denominator, two-unit correspondence, A4/Letter/custom/screen drawing regions, orientation, margins and calculated recommendation.
- Connected straightaways, left/right in-place rotations and circular arcs, selected segment editing, deletion, reorder, undo/redo, reset confirmation, configurable start and finish, per-segment lane overrides.
- Exact SVG arc geometry, dimensioned world area, grid, directional arrows, scaled robot/safety footprint, obstacles, actual/drawing labels, endpoint pads, pan, zoom and fit. All editing has input/button alternatives.
- Separate drawing, annotation, consistency, floor, corridor, robot-body, obstacle, turning and unverified physical outcomes; explicit Pass/Warning/Fail/Not evaluated statuses.
- Up to 30 immutable saved designs/results/notes/diagrams, any-two comparison, explicit separate physical observations recorded as a new test, selected/all-tests Markdown, SVG diagrams and validated JSON backup/restore.
- Local storage at `roboticsGames.courseArchitect.v1`. Existing storage and session totals are untouched. Storage failure leaves work available in-tab and explains backup recovery.

## Validation

32,490 independent mathematics, geometry, conservative collision-envelope, preset, import, snapshot and notebook assertions; 35 UI contract/registry/accessibility assertions. Existing catalog, complete ecosystem navigation, shared session and Parts Sprint regression suites passed. Parts Sprint retained 229,558 checks over 15,000 selections. See evidence logs.

Browser verification covered scale failure/recommendation, invariant actual course length, immutable Test 1/Test 2 comparison, earlier segment editing, undo/redo, reset cancellation, local reload persistence, actual project JSON download and validated restore, notebook content, and connected curved-segment creation. Layout frames at 320/390/768/1024/1366 CSS px had matching client/scroll widths after repairing the 320 px diagram overflow. These are remote Chromium frame checks, not physical-device certification. Publication details and final live navigation verification are recorded in RELEASE_VERIFICATION.md.

## Limits and review

The tool is a geometric planner, not drivetrain dynamics or a driving simulator. Conservative sampled collision checks can flag near contacts. Physical Chromebook/touch, actual screen-reader speech, printed scale calibration, and real robot navigation remain classroom checks. SVG is the diagram export format; PNG is not needed for the requested PNG and/or SVG workflow. Printing must use 100% and a measured scale bar. The final VEX challenge combines team courses in the same units/scale and starts and ends at the finish line; that combined plan needs a separate physical review.
