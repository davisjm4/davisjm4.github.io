# Design checks and limitations

Each check has an independent outcome. A paper Pass cannot override a floor or robot-clearance Fail. Digital checks never mark a real robot test successful.

- Drawing: full measured rectangular floor/scale against usable oriented paper, with numeric recommended denominator on failure. Screen-only returns Not evaluated for paper.
- Annotated export: diagram extents plus 24 mm horizontal and 30 mm vertical annotation allowance against the entire sheet; oversize labels produce Warning. Printing remains uncalibrated until the scale bar is measured.
- Floor/corridor: exact circular centerline extrema expanded by lane half-width, plus widened endpoint pads and wall margins; rectangular robot safety envelopes also checked at sampled poses. Failures identify the segment and a location. Track crossings are not automatically failures.
- Body/corridor: analytic width, rectangular arc envelope and in-place disk diameter. Too-narrow lanes give the required increase in millimeters. Endpoint pads can be wider than straight lanes and must be built as drawn.
- Obstacles: separating-axis polygon tests against the inflated rectangular robot, plus distance-to-rectangle tests for rounded corridors and endpoint disks. An obstacle in a lane can fail even if it misses the robot centerline.
- Turning: missing radius estimate is Not evaluated; below-estimate arcs are Warning with a numeric increase; unselected in-place capability is Fail. Selecting capability is an assumption requiring physical verification.
- Consistency: finite bounded schema; positive physical dimensions; supported units/scales; margins leaving room; bounded segment/obstacle/test counts; recomputed connected geometry and start/finish markers.

## Conservative sampled check

A segment is divided into n intervals so centerline travel plus robot safety half-diagonal×heading sweep is at most 5 mm per interval, and heading changes at most 1°. At each pose, the robot's local half-width/half-length are inflated by half that interval's maximum corner motion (at most 2.5 mm, plus floating-point epsilon). Every intervening pose is within that displacement of the closest checked pose under this rigid rectangular-body model. The same conservative guard is applied to corridor obstacle distances. This avoids ordinary inter-sample collisions being silently missed, but can produce near-contact false failures. No complete real-world fit or physics guarantee is made.

At more than 60,000 poses, the full floor/obstacle check explicitly returns Not evaluated for the remaining design, rather than claiming a complete pass. Configurable dimension limits are exported in core.mjs: 50 m area, 5 m robot, 10 m per segment/radius, 100 segments, 30 obstacles, 30 tests, 15 MB imported file. These prevent malformed or excessively expensive work.

## Not evaluated by this build

Traction, drivetrain kinematics, speed, momentum, wheel slip, controller skill, tape thickness, measured floor imperfections, actual printer scaling, physical devices and native assistive-technology speech. No virtual driving, VEXcode, accounts, direct GitHub writes or student credentials.

Teacher review must confirm the robot can execute selected maneuvers, pads are constructed, the real course matches the plan and observed physical evidence supports any success claim. Future enhancements may include calibrated print layouts and educator-requested additional room shapes; those are not implied as delivered.
