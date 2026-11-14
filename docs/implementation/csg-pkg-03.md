# CSG-PKG-03 · My Session

Requirements: CSG-SES-01/02, CSG-SEC-02, CSG-MAS-01. Acceptance: CSG-AT-07 and applicable responsive checks in CSG-AT-08. Base: [CSG-PKG-02, PR #32](https://github.com/davisjm4/davisjm4.github.io/pull/32), merge `0b19e29eaaf1e1d779484012ff53419a1e4fd68e`. The four PR checks and [Pages deployment](https://github.com/davisjm4/davisjm4.github.io/actions/runs/43560545661) passed. A production browser verified course entry, concept search and List return, guest scope and the Workplace RACECES link. The profile recovery regression passed locally and in CI. Physical device and native screen-reader parity remain pending for area-jump removal.

## Shared report

My Session uses the existing Advanced CS, AP CSP and Robotics daily trackers, preserving first-try denominators, local day rollover and idle-time accounting. Workplace Readiness and RACECES use their own existing session periods, displayed as activity sessions. The compatibility readers leave these two formats untouched. Their established report controls retain reset, full breakdowns and Workplace diagnostic and readiness reporting.

Independent History links to guest learning history and backup. Class Progress links to the authenticated profile, where synced and teacher-reviewed results remain available. Daily class-profile reports describe the practice on the current device. Shared copy includes only report metrics, while an optional guest name and period are held in the page for printing. The daily reset requires confirmation. It clears only the chosen tracker and preserves learning history and synced evidence.

| Previous report | Compatibility path |
| --- | --- |
| Advanced CS course report | Original URL. The report retains topic rows, API project reflections, Response Explorer checks and hints, and Variable Lab trace results. |
| AP CSP course report | Original URL. The report retains topic, Big Idea and network breakdowns. |
| String Lab | Existing in-page summary, its own scope, mode and difficulty rows, and original summary data copy. |
| Search & Sort | Existing in-page breakdowns by mode, skill and difficulty, with its page-specific restart. |
| Workplace Performance and RACECES | Original views remain accessible for their detail, reset and applicable exports. |
| Robotics | Original Parts Sprint and Component Challenge reports and race results. |

## Verification

Run `CHROME_BIN=/path/to/chromium node --test --test-concurrency=1 cs-games/teacher/my-session-browser-tests.mjs`. Local Chromium exercised a real Java answer, game-to-report entry, first-try totals, legacy report continuity, named PDF, copy, cancel and confirm reset, day rollover, same-browser class/independent separation, legacy Workplace and RACECES readers, and 320–1366px reflow. The synthetic name appears in the PDF, while storage, backups and copied metrics contain only practice data. The reports trigger no guest writes to the service.

The shared report and legacy activity controls coexist while detailed parity is tracked. Verify real-play coverage in each remaining activity, and preserve lab-specific controls until the shared experience carries their scope, original export format and restart behavior. In particular, Search & Sort rows exist only in the current game page and cannot be reconstructed from daily totals. Next implementation package is CSG-PKG-04. Its independent formative, target and official columns depend on the CSG-PKG-08 migration gate.
