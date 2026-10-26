# Boolean Gatekeeper production verification

October 25, 2026 (user local date). Synthetic release QA only; no student progress export or identifying information is committed.

- Canonical live URL: https://davisjm4.github.io/csp-games/boolean-gatekeeper/ . Existing Mixed / Evaluate / Make it TRUE controls and navigation remain. The new panels start collapsed.
- Before deployment, a visible compound AND/NOT expression was evaluated correctly in the existing game. After deployment, the original game still accepted a correct first submission and explained each subexpression.
- Truth table: completed AND correctly and OR deliberately incorrectly. Both immediately explained the correct result, and both answer controls locked until Next table. Keyboard Enter on a truth choice also worked in the mobile frame.
- Range: moved x to an included lower endpoint, then excluded it; full result changed TRUE→FALSE. With x in A but not B, OR was TRUE, AND was FALSE and NOT of the AND was TRUE. Overlap at x=4 satisfied both intervals. Reversed bounds showed an empty-range explanation. Fractional input showed a validation message and retained the last valid graph. Reset restored defaults.
- Learning interactions left the original game’s displayed first-try, submission and retry counts unchanged. They did not add assessed questions. Existing active-time tracking on the game page remains independent of scored question counts.
- The first rendered check exposed global `svg line` styles overriding highlight colors. A narrowly scoped fix in the new learning-panel stylesheet now preserves the blue/purple configured intervals and green full TRUE region. Actual computed TRUE stroke was rgb(104,224,206), 8px. Shared styles and Java files were not modified. Final canonical assets were reloaded at boolean-tools-v3. An excluded equal-bound interval (2 to 2 with its lower endpoint excluded) was verified as empty in both the configured row and the full TRUE row; no misleading included point is drawn.
- Responsive iframe outer widths 320,390,768,1024,1366 produced content widths 305,375,753,1009,1351 (vertical scrollbar accounted for). Every scrollWidth equaled clientWidth. Expanded controls, number line, expressions and truth-table interactions were inspected. Focus styling was visible on the keyboard slider. These are rendered responsive simulations, not physical Chromebook/touchscreen certification.
- No game-origin error was observed in the inspected log output; cloud browser extension metadata errors were unrelated. Physical devices and native screen-reader speech remain unverified.

See IMPLEMENTATION_REPORT.md for the five-requirement classification, scope decisions, test results and tracker status.
