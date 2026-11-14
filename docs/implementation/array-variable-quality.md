# Array Lab and Variable Lab quality integration

Claude's original commit is `378986643256e7c6ade28170f4606c0b9b7d7d51`. Its bundle was verified and its patch applied cleanly to current main `790d7507a75ab5dd1b1cf17b1c04e06a388671a3`. PR #36 remains separate.

The repairs cover actual changed-cell behavior, Beginner length and index variation, redundant 2D modulus, explanations, statement-local algebraic cancellation, effective difficulty slicing, and forced type/format generation. Legitimate overwrites and cross-statement Advanced reasoning remain; R7 and R10 stay deferred. Proficiency and mastery definitions are untouched.

The generated catalog was rebuilt and certification reproduced all 36 pools and 7,584 structures. The old Java DOM assertion at `java-games/ui-tests.mjs:256` failed identically on clean main and the patched branch. It expected the misconception explanation inside the adjacent verdict. The test now asserts that explanation in the execution trace, where production renders it, and independently checks the verdict. The complete suite passed 4,917 assertions. The integration also versioned both browser entry chains and added the Trace Repair workflow to pull-request checks.

Local Chromium completed real guest answer/feedback flows in both labs at 390 and 1366 CSS pixels. The relevant course proficiency, Java evidence, and teacher adapter run passed 21 checks. The local Java runtime lacks the release-symbol table needed to compile with `--release 17`, so the existing Array advanced check must pass on the Java 17 GitHub runner. GitHub CI and hosted browser verification are distinct release gates. Claude's sampling summaries are in the supplied handoff. The ZIP does not contain the raw sampling files referenced there.
