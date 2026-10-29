# Classroom teacher guide — Robo Rally Course Architect

## Introduce scale (5–8 minutes)

Open CS Games → Robotics → Robo Rally Course Architect. The initial Simple Rectangle is explicitly an instructional example. Ask why a 4 m room cannot be drawn at 1:5 on notebook paper. Convert 4 m to 400 cm; at 1:20, 400÷20=20 cm on paper. A 30 cm robot becomes 1.5 cm wide. Emphasize: larger N gives a smaller drawing; changing drawing scale changes no physical measurements. Zoom is only screen magnification.

## Measure (10 minutes)

Teams measure their own robot width/length and available rectangular floor with a ruler/tape. Replace every example value, add justified per-side clearance and wall margin, and locate rectangular obstacles from the same upper-left origin. Leave minimum turning radius blank until estimated or measured. Select in-place capability only if the real drivetrain supports it. Choose one display unit; conversions preserve real dimensions.

## Choose scale and design (15–25 minutes)

Choose actual paper, orientation and margins. Predict N, compare it with the live calculation, then use Recommend or a correspondence such as 2 cm drawing = 1 m actual (1:50). Verify the robot and floor drawing dimensions.

In Design Course, set the start x/y and heading (0° right, 90° down). Set lane width. Add straightaways, left/right in-place rotations and left/right circular arcs. Edit lengths, angles, radii and lane overrides. Select segments from the diagram or text list. An earlier edit moves later geometry by recomputation; reorder/delete and undo/redo are available. The gold rectangle is the correctly proportioned robot; its dashed outline adds safety clearance. Curved travel has an arc length distinct from its radius. Endpoint/turn pads are drawn wider when needed and are part of the course students must construct.

## Interpret checks and require iteration

Run Check Design. Read separate paper, floor, body/lane, obstacle and turning outcomes. A scale can be mathematically valid but too large for paper; a drawing can fit while the physical course fails. Warnings identify assumptions/uncertainty. Not evaluated means missing information or an unsupported real-world claim. A digital Pass never proves successful driving.

Require at least three saved tests: (1) baseline with prediction; (2) one justified measurement/geometry revision addressing a specific problem; (3) another revision plus comparison. Record observations, exact changes, reasoning and reflection before Save Test. Ask students to explain which constraints improved and which tradeoffs got worse. Tight Turns is a useful diagnostic preset: lanes are too narrow and the radius is below the supplied estimate. Increasing lanes to 50 cm and radius to 40 cm removes its defined failures, while real driving still needs verification.

## Add each test to the existing GitHub notebook

Select saved tests, click Prepare Notebook Entry, then Copy/Download Markdown. Download matching SVG diagrams from the selected-diagrams control or each individual test. In the student's existing GitHub notebook repository, upload SVGs beside the notebook file (or use the class's images folder and edit the relative links). Paste the generated Markdown below the appropriate project heading, preview it, and commit. It already includes measurements, formulas, design table, digital results and reflections. The app does not sign in or write to GitHub.

Download the project JSON at the end of each class. Work lives only in that device/browser; cleared storage or a different device can lose local work. Restore validates the JSON and asks before replacing the current project.

## Build and physically test

Use tape and the same measured origin. Transfer lengths with actual = drawing×N; verify straight distances, curve radii, rounded endpoint pads and start/finish markings. If printing SVG, choose 100% (no fit-to-page), then physically measure the scale bar before trusting the print. Annotations have their own sheet-fit outcome.

Drive slowly, note contact, turning difficulty and measurement differences. Open Record an actual physical test, select the saved design actually built, enter the observed outcome/struggles/differences/adjustments/improvement and save a new entry. No field is automatically successful. Revise the physical and digital design and retest. The final VEX challenge combines team courses at consistent units/scale and begins/ends at the finish; review that combined layout separately.

## Suggested evidence for mastery

Students should explain the conversion and N calculation using their own measurements, distinguish radius from arc length, identify a quantitative constraint, compare at least two revisions, and support claims with separate digital and physical evidence. Assess reasoning and documented improvement rather than treating a green check as proof of engineering success. Physical Chromebook/touch, screen-reader speech, printing and real robot tests remain local classroom validation.

## Curriculum references

- https://education.vex.com/stemlabs/v5/stem-labs/robo-rally/designing-and-scaling-a-racecourse
- https://education.vex.com/stemlabs/v5/stem-labs/robo-rally/understanding-scale
- https://education.vex.com/stemlabs/v5/stem-labs/robo-rally/converting-units
- https://education.vex.com/stemlabs/v5/stem-labs/robo-rally/robo-rally-challenge

These were checked on October 29, 2026. This tool supports planning and evidence collection; VEX's physical build-and-drive process remains necessary.
