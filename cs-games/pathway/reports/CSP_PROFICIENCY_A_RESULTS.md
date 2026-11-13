# Results: AP CSP proficiency audit A

Run in fresh clones of the branch at code commit `58b75ab`. Logs are in `../audit/csp-proficiency-a/test-results/`. This file and the logs are the only changes after that commit.

| Check | Result |
| --- | --- |
| New unit suite (`csp-proficiency-a.test.mjs`): real generated questions through the Worker's `cleanGameAttempt`, `normalizeEvent` and the shared evaluator | 22 of 22 |
| Real-Chromium attribution test (`csp-proficiency-a-browser.mjs`): 70 real Boolean Gatekeeper questions and 14 Architect questions, class queue read back | 26 of 26, passed on 6 separate runs; for Boolean, the reported family matched an independent calculation from the on-screen expression for 70 of 70 |
| Mutation controls (`csp-proficiency-a-controls.mjs`): break a rule in real source, the suite must fail | **8 of 8** caught |
| Whole pathway suite (`cs-games/pathway/tests/*.test.mjs`) | 315 of 315 |
| CSP suites: session, daily-session, practice, practice-ui, concepts (3), architect-redesign, expanded, ui, tests, response, test-case, collection, Boolean Gatekeeper tests and UI | 19 of 19 suites exit 0 (including the two below) |
| Enrolled-student proficiency browser suite (`cs-games/teacher/proficiency-browser-tests.mjs`, real Chromium) and `adapters-tests` | Pass |
| Regenerated proficiency matrix | One cell changed (Iteration's Level 3 recommended mode); every Supported and Unavailable column unchanged |

## Things that went wrong on the way

- The first version of the change failed three existing CSP suites (`ui-tests`, `session-ui-tests`, `architect-redesign-tests`). They run the game script in a VM with only the names they inject, so the new helper was undefined. Fixed by injecting it; same cause as a Build 5 failure.
- The first version also left Iteration unreachable in its recommended mode (40 of 40 simulated students never reached Level 3). Fixed by changing the recommended mode, and a test now follows the product's own recommendation.
- One mutation was first missed (replacing the catalog's Boolean family check with `true`) because the evaluator's own two-family rule hid it. A test with unreviewed family labels now catches it.
- A run of the whole pathway suite alongside the mutation run exceeded a 400 s limit from CPU contention; it passes alone.

## Limits

- Chromium only. Mixed Practice was tested at the unit level, not played in a browser.
- Boolean tagging varied from 8 to 17 of 70 questions between browser runs because the questions are random (about 17% expected).
- Not run: the Java and Robotics suites, and the Worker service suites. This change does not touch them.
- Not pushed: there are no GitHub credentials.
