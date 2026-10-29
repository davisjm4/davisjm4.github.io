# Scale and geometry validation

## Model and independent references

World coordinates are millimeters, x right, y down; heading 0° east and +90° south. Display conversions never rescale the world. Exact factors: mm 1, cm 10, m 1000, inch 25.4, foot 304.8. All 25 conversion pairs are tested at four values with round trips.

For 1:N, drawing = actual/N and actual = drawing×N. A correspondence normalizes both inputs to millimeters before computing N. Ratios outside 1:1–1:10000 fail. Usable paper = oriented sheet minus twice the margin. Recommendation uses max(actual width/usable width, actual length/usable height, 1), rounding upward to 5/10/20/25/50/100, or an integer custom denominator beyond 100. Annotation fit is a separate check. No browser viewport or zoom is interpreted as a calibrated print size.

Straight endpoint: x'=x+L cos(h), y'=y+L sin(h). For signed sweep a and radius r, the arc center lies ±r normal to the current heading; endpoint follows the circular parameterization. In-place rotations update heading only. Arc path length is r×angle×π/180. SVG uses true circular A commands, splitting sweeps into at most 180° pieces, including full circles. World bounds use endpoints and all cardinal extrema within an arc sweep, including accumulated headings beyond one revolution.

Tests independently integrate tangent velocities using 30,000 midpoint intervals for each combination of left/right, 45/90/180/360° and three starting headings. Straight paths cover negative, positive and diagonal directions. Chained arcs/turns, path continuity, earlier segment changes, total length, scale invariance and dense bounds containment are verified. Conservative collision guards are checked against 2,000 independently sampled rectangular poses (8,000 corner-containment assertions).

## Robot envelope

Effective width W = robot width + 2×clearance; effective length L = robot length + 2×clearance. Straight lane requirement W. In-place rotation disk diameter sqrt(W²+L²). Symmetric arc lane requirement = 2×(sqrt((r+W/2)²+(L/2)²)−r). This conservative full radial-band criterion includes the outer rectangle corners; inner radial displacement never exceeds W/2. Rounded endpoint/junction pads are automatically widened to at least sqrt(W²+L²). They are shown, bounded and checked against obstacles separately.

## Preset expectations

| Instructional preset | Defined failures | Warnings | Meaning |
|---|---:|---:|---|
| Simple Rectangle | 0 | 5 | Four selected in-place maneuvers require physical verification; general method warning |
| Tight Turns | 3 | 2 | Three undersized lanes; radius 250 mm below 300 mm estimate; method warning |
| Mixed Racecourse | 0 | 2 | One in-place assumption plus method warning; entered obstacle does not intersect route |

All are examples, not measurements of a student's robot. Tight Turns repaired to 500 mm lanes and 400 mm curve radius has zero defined failures and no turns below estimate.

Run `node cs-games/robotics/course-architect/tests/validation.mjs`. Full numerical results, three example diagrams, project backup and notebook output are in evidence/.
