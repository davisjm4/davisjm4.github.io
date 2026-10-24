# Publication and handoff

Verified October 24, 2026.

- Live game: https://davisjm4.github.io/csp-games/create-task-lab/
- Deployed implementation commit: `ba7a672dedb76311494f47f0c6353b4283343d31`
- Implementation commit: https://github.com/davisjm4/davisjm4.github.io/commit/ba7a672dedb76311494f47f0c6353b4283343d31
- Successful GitHub Pages run: https://github.com/davisjm4/davisjm4.github.io/actions/runs/40124182327
- Successful Create Task Lab CI run: https://github.com/davisjm4/davisjm4.github.io/actions/runs/40124182413

## Actual live verification

Chrome loaded the published game, its modules, stylesheet and playable challenge. Mixed and All Topics are the defaults, and no difficulty selector exists. A correct source selection was accepted and locked; a subsequent diagnosis was intentionally answered incorrectly and produced the correct explanation and highlighted corrected code. Next Question loaded another activity. Copy Challenge Link reported success. The real session summary showed the new game, 2 attempts, 1 first-try correct, 50% accuracy, and separate mode/topic totals.

Both the published CSP Games launch card and consolidated AP CSP catalog linked to the correct game URL. Browser preview checks additionally exercised parameter-versus-argument scoring, complete Boolean expressions, multi-line source regions, mode changes and topic filters.

Responsive QA used real Chrome frames with outer dimensions 390×844, 768×1024 and 1366×768. Inner widths with the vertical scrollbar were 375, 753 and 1351 pixels. The tested game documents had no horizontal overflow at those widths. Measured source targets met the 44-pixel minimum. This is responsive desktop-browser emulation, not physical Android, tablet or Chromebook hardware or actual hardware touch-event testing.

## Tracker

The master project tracker was updated and the exact values were read back successfully:

https://docs.google.com/spreadsheets/d/16Zr5Nn2ubN2ecBvOZUbeDpOnxqGHvDUty08QqqMPtnA/edit

- Master Inventory: `A44:L44`, ID `G-106`, status `Published — verified integration`.
- Release History: `A9:G9`.

Neighboring row formatting was retained. Native spreadsheet visual inspection was not performed; the write and values were verified through the connector. The tracker explicitly retains physical-device and educator review as follow-up work.

## Remaining limits

The bounded AST interpreter and separate scenario oracles validate the original examples; arbitrary external pseudocode is not compiled. Finite behavioral probes do not prove all-input equivalence. There is no independent human educator certification. Physical touch/device testing is unverified. The wider Java regression suite stopped at the pre-existing RACECES adapter fixture (`23 !== 15`); the complete CSP suite, catalog checks, timezone daily reset, and new CI passed.

This publication record is a documentation follow-up to the verified implementation commit above; it does not alter game behavior.
