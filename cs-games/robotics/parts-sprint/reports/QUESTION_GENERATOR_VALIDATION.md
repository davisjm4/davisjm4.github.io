# Generator and scoring validation

Exact committed evidence is included in evidence/generator-validation.json and evidence/filter-matrix.json. Implementation: 11c2b87b598dbbb002e681fd0bacaa779bb93f24.

229,558 automated checks over 15000 draws reached 168 component/format instances across 56 component types. There are 219 unique normalized aliases. Every alias was checked for cross-component acceptance; typed answers require whole normalized matches. Four distinct options and exactly one key were checked on every generated draw. Image bytes were checked against the manifest's SHA-256.

Seeds: 731 + i*7919 for the 15,000 draw sequence, 9533 + i*7919 for up to 70 draws per filter cell. Deterministic reproduction was checked before history advancement. The 128 category/level/format cells include four unavailable combinations, which return eligibility errors and supported alternatives rather than silent fallback.

## Observed distributions

~~~json
{
  "mode": {
    "learn": 4988,
    "sprint": 4988,
    "find": 5024
  },
  "difficulty": {
    "Beginner": 5074,
    "Intermediate": 5151,
    "Advanced": 4775
  },
  "category": {
    "structure": 2322,
    "tools": 1478,
    "fasteners": 1919,
    "wheels": 1051,
    "electronics": 3234,
    "spacing": 1134,
    "transmission": 1216,
    "motion": 2646
  },
  "answerPositions": [
    3805,
    3775,
    3710,
    3710
  ]
}
~~~

These are observed sample distributions, not a guarantee of identical rates in every short race. All 168 identities/formats were reached. There were zero exact-repeat cooldown violations and 114 explicitly bounded component-cooldown relaxations. Small filters explain why repetition may be necessary. Recent-category and Mixed-format balancing operate within the eligible pool.

## Explicitly unavailable cells

| Category | Level | Mode | Components |
|---|---|---|---|
| wheels | Advanced | learn | 0 |
| wheels | Advanced | sprint | 0 |
| wheels | Advanced | find | 0 |
| wheels | Advanced | mixed | 0 |

## Scoring/session tests

Wrong then correct retains zero first-try credit; help is assisted; terminal submissions cannot score twice; deadline expiry precedes scoring; corrected progress is 0.4; independent first correct is 1 plus the defined streak bonus; finish target is 10. Bests require five independent attempts and completed/expired state, favor accuracy before speed/count, and are scoped by settings. Session tests cover daily reset, retained bests, confirmed full reset, storage-key isolation and blocked-storage fallback.

## Regression and scope

Recovered Robotics CI includes focused engine and shared Java session checks. Recovered navigation and full-CSP logs are included. Full local Java suite exit 0 was observed, but its complete stdout is not available. Browser tests were run locally and on the published site; the original local JSON/screenshots are unavailable. See the explicitly labeled live observation summary. Automated “invalidOrAmbiguous: 0” means tested contract checks, not an independent instructional or physical hardware review.
