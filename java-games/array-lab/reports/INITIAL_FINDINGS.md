# Array Lab baseline — October 23, 2026

Inspected main at 80680a0. No local changes or AGENTS.md were present. Recent unrelated publishing work was preserved.

* Twelve modes exist. Nine legacy modes ignore the selected difficulty; only allocation/reference, in-place, and 2D algorithm modes use the difficulty option.
* The UI says “Difficulty for new modes” and exposes internal family names before submission.
* A page-local Set is used for recent challenges. Legacy modes ignore it, and advanced modes compare full prompt/code strings and return the final duplicate after exhausting retries.
* Perform Update mutates whichever cell is selected to the expected value. Swap similarly changes the displayed array before submission.
* Some prompts explicitly name the selected cells, ask two questions with one numeric answer, or ask for the literal just assigned.
* Existing exports depend on generateArray/assessArray/solutionArray/exportArrayQuestion and stable mode IDs. The current session tracker already provides per-mode statistics and local-calendar resets.
* Legacy regression tests deliberately force historical family IDs. Retain that compatibility path while validating the new default independently.

Required evidence will distinguish registered combinations from certified semantic structures. Generated metadata alone will not certify difficulty or a human instructional review.
