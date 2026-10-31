# Question generator validation

Executed October 31,2026 with tests/validate.mjs.

```json
{
  "status": "PASS",
  "assertions": 196730,
  "reasoningFamilies": 66,
  "playableInstances": 75,
  "familiesByMode": {
    "choose": 25,
    "fix": 18,
    "tools": 12,
    "solution": 20
  },
  "modeCounts": {
    "choose": 25,
    "fix": 18,
    "tools": 12,
    "solution": 20
  },
  "difficultyCounts": {
    "Beginner": 26,
    "Intermediate": 33,
    "Advanced": 16
  },
  "categoryCounts": {
    "motion": 20,
    "spacing": 10,
    "structure": 7,
    "wheels": 3,
    "fasteners": 13,
    "transmission": 10,
    "tools": 12
  },
  "simulatedSelections": 20000,
  "distinctInstancesSelected": 75,
  "distribution": {
    "mode": {
      "solution": 5697,
      "choose": 6080,
      "fix": 4968,
      "tools": 3255
    },
    "difficulty": {
      "Advanced": 5579,
      "Beginner": 6883,
      "Intermediate": 7538
    },
    "category": {
      "motion": 4562,
      "spacing": 3268,
      "tools": 3149,
      "fasteners": 2737,
      "transmission": 2920,
      "structure": 2588,
      "wheels": 776
    },
    "answerPosition": {
      "0": 3285,
      "1": 3425,
      "2": 3449,
      "3": 4144
    }
  },
  "unfilteredMixedModeDistribution": {
    "solution": 78,
    "choose": 77,
    "fix": 77,
    "tools": 72
  },
  "actualExactRepeats": 19321,
  "avoidableExactRepeats": 0,
  "immediateFamilyRepeats": 4832,
  "avoidableFamilyRepeats": 0,
  "consecutiveAnswerPositions": 0,
  "narrowPoolNotices": 19696,
  "emptyFilterSelections": 45,
  "invalidSchemaChallenges": 0,
  "technicalCertification": "Automated structural and grading checks only; no claim of human-certified engineering correctness.",
  "technicalFlags": [
    {
      "id": "driver-access-constraint",
      "review": "Both named tool sizes supplied; inspect contextual best-choice reasoning."
    }
  ],
  "physicalTouch": "Not performed",
  "physicalChromebook": "Not performed",
  "nativeScreenReader": "Not performed",
  "browserWorkflows": "Separate UI evidence required"
}
```

The aggregated mode/difficulty distribution includes deliberately narrow filters; it is not the Mixed-only balance statistic. The separate Mixed distribution is measured independently. Exact and family repeats are actual counts, including unavoidable filtered-pool repetitions. Eligible pools with more than50 instances retain an exact50 cooldown; cross-mode shared family IDs prevent cosmetic duplicate reasoning claims. Empty filter cells return explicit unavailable text without silently changing constraints.

Automated checks enumerate every possible candidate subset for every case, verifying correct combinations, omissions and extras. Shared-session tests verify wrong→correct, reveal, local-day rollover, progress reload and unrelated storage preservation. Official tools and supplied length constraints have independent oracles. Automated checks do not certify every real assembly; the source-linked editorial review is AI review and independent VEX educator review remains pending.

Content targets: delivered66 unique families/75 authored cases versus requested100/300. Shuffle order/word changes are not additional cases. This shortfall is intentional rather than silently inflated. Browser, physical device and assistive-technology limits are recorded separately.
