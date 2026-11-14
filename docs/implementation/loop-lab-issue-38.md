# Loop Lab issue 38 follow-up

Baseline commit `2bd052725aa2280fa4480063e34d7f29140e0096`. Scope covers the existing Loop Lab Conditional mode and Advanced Iterations. It touches feedback under CSG-UX-03 and keeps the same mode, variant, difficulty, and first-attempt evidence contracts under CSG-MAS-01 and CSG-MAS-04. There is no evidence migration. The standalone Boolean and Conditional Lab is outside this change.

Conditional distractors come from simulated branch, threshold, accumulator, and termination mistakes. For example, count matches instead of summing them, treat a match for both divisors as two updates, or test the break threshold before adding. Iteration distractors include using the final loop variable as the count when that value is nonnegative, counting the final failed condition, changing only one pointer, advancing the counter twice, and applying one limit of a compound condition. The compound loop can reach either limit first. The iteration count remains the number of body entries. Beginner zero-iteration examples remain available.

The four affected cells use modeled alternatives only. Candidates that produce the same value as the original, duplicate another choice, or fail to terminate are discarded. If fewer than three distinct alternatives remain, the generator deterministically draws a new instance from the same variant. There were zero filler choices in the 2,000 held-out questions.

## Rank-only shortcut

Run `node java-games/loop-lab/tests/issue-38.test.mjs` for the repair or pass an absolute path to the baseline checkout's `loop-engine.js`. For each mode and level, train on 500 seeds starting at 100000 and validate on 500 starting at 900000, stepping by 29. Only four-choice integer questions qualify. Rank 0 is the smallest numeric choice. Ties choose the smallest rank. The variant rows train on samples within their own variant. They can expose cues that the aggregate strategy misses.

| Mode / difficulty | Variant | Held out n | Before | After | Held-out ranks before | Held-out ranks after |
| --- | --- | ---: | ---: | ---: | --- | --- |
| conditional/beginner | all | 500 | 48.8% | 40.8% | 20 / 133 / 244 / 103 | 34 / 156 / 204 / 106 |
| conditional/beginner | greater-sum | 107 | 49.5% | 43.0% | 6 / 26 / 53 / 22 | 4 / 15 / 46 / 42 |
| conditional/beginner | break-target | 129 | 45.0% | 39.5% | 0 / 0 / 58 / 71 | 0 / 27 / 51 / 51 |
| conditional/beginner | continue-even | 126 | 61.9% | 39.7% | 0 / 38 / 78 / 10 | 13 / 50 / 50 / 13 |
| conditional/beginner | odd-count | 138 | 50.0% | 46.4% | 14 / 69 / 55 / 0 | 17 / 64 / 57 / 0 |
| conditional/intermediate | all | 500 | 56.6% | 33.2% | 16 / 103 / 283 / 98 | 65 / 179 / 166 / 90 |
| conditional/intermediate | greater-sum | 70 | 42.9% | 35.7% | 6 / 20 / 30 / 14 | 3 / 14 / 25 / 28 |
| conditional/intermediate | continue-even | 78 | 52.6% | 52.6% | 0 / 31 / 41 / 6 | 8 / 41 / 25 / 4 |
| conditional/intermediate | break-target | 86 | 55.8% | 31.4% | 0 / 0 / 48 / 38 | 0 / 29 / 27 / 30 |
| conditional/intermediate | else-count | 84 | 44.0% | 27.4% | 0 / 7 / 37 / 40 | 23 / 27 / 21 / 13 |
| conditional/intermediate | odd-count | 91 | 45.1% | 45.1% | 10 / 41 / 40 / 0 | 8 / 41 / 42 / 0 |
| conditional/intermediate | compound-and | 91 | 95.6% | 16.5% | 0 / 4 / 87 / 0 | 23 / 27 / 26 / 15 |
| conditional/advanced | all | 500 | 53.2% | 34.8% | 56 / 94 / 266 / 84 | 63 / 119 / 174 / 144 |
| conditional/advanced | compound-and | 110 | 94.5% | 17.3% | 0 / 6 / 104 / 0 | 19 / 25 / 34 / 32 |
| conditional/advanced | two-divisors | 131 | 45.8% | 42.0% | 18 / 49 / 60 / 4 | 3 / 40 / 55 / 33 |
| conditional/advanced | nested-if-break | 126 | 36.5% | 38.9% | 38 / 27 / 46 / 15 | 11 / 24 / 49 / 42 |
| conditional/advanced | else-count | 133 | 48.9% | 27.8% | 0 / 12 / 56 / 65 | 30 / 30 / 36 / 37 |
| iterations/advanced | all | 500 | 55.4% | 41.4% | 146 / 277 / 61 / 16 | 122 / 207 / 152 / 19 |
| iterations/advanced | not-equal | 68 | 55.9% | 60.3% | 30 / 38 / 0 / 0 | 18 / 41 / 8 / 1 |
| iterations/advanced | multiplicative | 90 | 50.0% | 32.2% | 45 / 45 / 0 / 0 | 29 / 35 / 26 / 0 |
| iterations/advanced | body-modifies-counter | 97 | 58.8% | 42.3% | 57 / 40 / 0 / 0 | 41 / 34 / 22 / 0 |
| iterations/advanced | two-pointer | 73 | 60.3% | 64.4% | 10 / 44 / 19 / 0 | 19 / 47 / 6 / 1 |
| iterations/advanced | halving | 85 | 34.1% | 31.8% | 4 / 29 / 36 / 16 | 14 / 27 / 28 / 16 |
| iterations/advanced | compound-condition | 87 | 93.1% | 71.3% | 0 / 81 / 6 / 0 | 1 / 23 / 62 / 1 |

The variant measurement still exposes a strong shortcut for the compound loop, two pointers, and the exact `!=` stopping condition. Exact target loops naturally yield few plausible counts below the answer. For a follow-up, consider choosing the final successful check or the first failing condition and showing each trace choice as a state or a condition/value pair. That preserves the trace objective and avoids invented counts. This PR leaves issue #38 open for those remaining cues.

The issue-specific test uses student-visible Java and compiles and runs all 2,000 held-out snippets on a real JVM. Its instrumentation increments a counter on entry to the shown loop or prints the variable the prompt asks for. Each result must match exactly one choice. The existing browser and full generator suites exercise the original entry points. Release and production results are recorded on the PR.
