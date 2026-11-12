# Independent learner pathways: implementation report

Branch `claude/independent-learner-pathway`, built on `main` at `d646f8a`. Not pushed, merged or deployed. Everything is under `cs-games/student/guest/` except the tracker hook commit and an optional hub patch (see `INTEGRATION_HANDOFF.md`).

Verification was run in a fresh clone of commit `8a94aab`. The final commit adds this report and the test logs only.

## 1. Result

A student can open `cs-games/student/guest/` with no teacher, class, account or enrollment link, choose a course, and see the whole pathway at once. They can mark areas or skills as familiar, needing practice, or a starting point, jump to any area, open any practice link, and come back later to resume. Real answers from the Java, AP CSP and Robotics games are saved in the same browser, survive the daily Session Summary reset, and stay separate from any class profile. Nothing is sent anywhere.

What it deliberately does not do: award mastery, set a 0–4 score, invent requirements, or claim tracking for activities that do not report answers. The page says which skills update it.

## 2. Baseline and audit

- `main` had moved to `d646f8a`. The interactive learning map is **not on `main`**: the student page is still the `<details>` list from `pathway-view.mjs`. I built against that renderer and the shared `studentContract` instead of guessing at a map interface.
- All three shared trackers (`java-games/session.js`, `csp-games/session.js`, Robotics Parts Sprint `session.js`) already pass an `onAttempt` hook that is used only when a class profile is active. The guest path is the `else` branch of that same line.
- Daily summaries reset by local date, so they cannot be the long-term store (confirmed against the real tracker).
- The Worker normalizes events with `cleanGameAttempt` → `questionEvidence`. The guest adapter calls the same `questionEvidence`.
- Workplace Readiness reports through `queuePractice` / `practiceEvent`, not a shared tracker.

## 3. Design decisions

| Decision | Why |
| --- | --- |
| Game pages store a **raw sanitized attempt**; the guest page resolves skill credit later | A game page needs no copy of the 550 KB graph. A graph release can add credit but never erase history. |
| Saving is **off until the learner chooses a course or marks something** | A visitor, or someone who only opens a game, gets nothing stored. |
| Allowlist sanitizer; imports drop credit, awards and verification | A file cannot assign skills or trust. Unknown fields are never copied. |
| Self-reported notes are a separate field, shown as separate dashed chips | Familiarity can never read as practice or proficiency. |
| Reuse `renderPathway`; add a temporary decorator | No second map engine. The data contract (`buildGuestView`) is what the live map should consume. |
| Per-skill "updates this page" labels from measured data | A learner is never told progress is tracked when it is not. |

## 4. Brief → delivered

| Brief item | Delivered | Evidence |
| --- | --- | --- |
| 2 Independent entry, four courses, no sign-in | `index.html`, `app.mjs`; Join a Class kept separate | Browser: no sign-in text, 4 courses, Join link |
| 3 Canonical graph, stable ids, no schedule | `pathway.mjs` uses `createPathway` with `calendar: null` | Unit: order equals `createPathway`, ids from graph, no target dates |
| 4 Self-assessment without false mastery | Marks on areas and skills, clear, exclusive Start here | Unit and browser: familiar skips ahead and is never practice |
| 5 Suggested-next logic | `suggest.mjs`, five priorities, resume, after-practice choices | Unit: each priority; browser: after-practice card with direct links |
| 6–7 Durable local store, real events, narrow hook | `store.mjs`, `evidence.mjs`, `hook.mjs`, hook commit | Unit with the real tracker; real Java, CSP and Robotics answers in Chromium |
| 8 Useful progress without requirements | Summary panel, statuses Not started / Practiced / Needs review / Familiar (self-reported) | Unit and browser |
| 9 Guest and class separate | Different key, hook branch only without a profile | Real `profile-device.js` test; Chromium with a simulated class profile |
| 10 Storage safety, backup | Versioned, validated, corrupt recovery, quota, disabled storage, export/import, confirmed clear | Unit and browser, including hostile backup file |
| 11 One map, two sources | `buildGuestView` contract, documented | Handoff; the live map is not on `main`, so the contract is **not yet exercised by it** |
| 13 Course coverage matrix | `ACTIVITY_COVERAGE.md`, `activity-coverage.csv` | Generated and checked |
| 14 Learners A–F | Below | Below |
| 15 Accessibility and devices | Keyboard, touch, 44 px targets, reduced motion, skip link | Chromium at four sizes, keyboard-only run, axe |
| 16 Tests | Section 5 | Section 5 |

## 5. Tests and what each proves

Synthetic unit tests and real-browser tests are different things and are reported separately.

| Suite | Count | Kind |
| --- | ---: | --- |
| `store.test.mjs` | 13 | Synthetic: persistence, corruption, quota, disabled storage, backup, compaction |
| `evidence.test.mjs` | 13 | Real Java session tracker driving the real hook; synthetic answers |
| `parity.test.mjs` | 4 | Real class queue (`recordGameAttempt`) and the Worker's `cleanGameAttempt` compared with guest credit |
| `pathway.test.mjs` | 16 | Courses, learners A–E, suggestions, no-network scan |
| `isolation.test.mjs` | 3 | Learner F with the real `profile-device.js` |
| `coverage.test.mjs` | 3 | Matrix and tracking data stay current and conservative |
| **Unit total** | **52** | |
| `browser-tests.mjs` | 88 checks | **Real Chromium 153**: real guest page, real Java, CSP and Robotics games |
| `negative-controls.mjs` | 22 | Breaks a rule on purpose; the suite must fail (19 unit, 3 browser) |

**Parity.** 610 events compared across every skill selector of all four courses, 280 of which credited skills: zero mismatches against the Worker. Retries and assisted answers are dropped by both paths.

**Real-browser activities.** Math Lab (focused and Mixed), Boolean Gatekeeper (CSP), Parts Sprint and Component Challenge (Robotics). Other activities are covered by the parity test and the static tracker scan only, not run in a browser.

**Learners.**

| Learner | Scenario | Demonstrated by |
| --- | --- | --- |
| A | First visit, AP CSP, 58 skills at once | Unit and browser |
| B | Marks Variables familiar, lands on Math Lab, with the keyboard only | Unit and browser |
| C | Boolean and Loops need practice, recommended from those areas | Unit and browser |
| D | Days of practice, daily summary reset, history intact | Unit (real tracker, clock moved) and browser (stored summary date aged) |
| E | Mixed Practice credits each skill shown | Unit and browser (8 real Mixed answers) |
| F | Later joins a class; guest data untouched and restored | Unit (real profile device) and browser |

All demonstration records are synthetic; the browser runs answer real games with throwaway local state.

## 6. Coverage (measured)

From `ACTIVITY_COVERAGE.md`, generated from the graph, the Java evidence registry and a static scan that follows imports to the real shared trackers.

| Course | Activities | Report to a hooked tracker | Skills whose practice updates the page |
| --- | ---: | ---: | --- |
| Advanced CS | 16 | 16 | 123 of 123 |
| AP CSP | 32 | 32 | 31 of 58 (lower bound) |
| Robotics 1 | 3 | 2 | 12 of 15 |
| Workplace Readiness | 1 | 0 | 0 of 94 |

AP CSP credit depends on the question topic, and only a sample of topics was probed, so 31 is a lower bound. The 27 other skills are labelled on the page. Individual Java modes that are not fully supported (for example Class Builder Rearrange emits no evidence, API Project Builder is practice-only) are listed per activity in the matrix.

## 7. Problems found while building

Real-browser review and the production suites caught issues the first unit tests did not:

1. `addEvent` wrote a record before the learner opted in.
2. The pathway rendered outside `.student-panel`, so the mark buttons were unstyled and 21 px tall.
3. The literal text "null" appeared on the page (`replaceChildren(null)`). Only a screenshot caught it.
4. Storage-blocked and corrupt-record warnings were hidden or cleared.
5. Merely visiting the page stored an empty record.
6. The coverage scan first reported `boolean-gatekeeper` as untracked although Chromium proved otherwise, then mishandled labs with their own `session.js`. It now follows imports and fails if a browser-verified activity is called untracked.
7. The hub patch first broke `navigation-tests.mjs` (it asserts exactly four `.course-card`). Rebuilt without that class.
8. **The hook commit broke `csp-games/session-ui-tests.mjs`** (ReferenceError in its VM harness). Fixed with a two-line change in that test, folded into the hook commit.
9. Three negative controls were first missed: two were equivalent mutations, one exposed a missing cross-course test. A killed mutation job once left `suggest.mjs` mutated; I restored it and the runner now restores files on interrupt.
10. A flaky browser step (CSP mode selector) was pinned; it passed consistently afterwards.

## 8. Existing suites

All run in a fresh clone of `8a94aab` (full list in `test-results/existing-suites.txt`).

| Area | Suites | Result |
| --- | --- | --- |
| Java session, engine and UI | `session-tests`, `tests`, `ui-tests`, Variable Lab evidence UI (177 checks) and feedback UI (45), Math Lab, Boolean, Loop redesign, Array redesign, Class Builder Rearrange session | All exit 0 |
| Java labs that evaluate tracker code | Debugger redesign, Documentation Lab (44,111 checks) and API Project step 6, Inheritance (17,754 checks), Method & Constructor, Robot Algorithms, ArrayList | All exit 0 |
| CSP | `session-tests` (shared tracker), `session-ui-tests`, `daily-session-tests`, `practice-tests`, `practice-ui-tests`, `concepts-ui-tests`, `architect-redesign`, `response-redesign`, `test-case-redesign`, `expanded`, `ui-tests` | All exit 0 |
| Pathway and mastery | `node --test cs-games/pathway/tests/*.test.mjs` | 280 of 280 |
| Robotics | Parts Sprint engine, Component Challenge UI contract and validation | All exit 0 |
| Teacher | `adapters-tests` | Exit 0 |

Exceptions, stated plainly:

- `csp-games/session-ui-tests.mjs` **failed** after the hook was first added and passes after the two-line harness fix described in section 7.
- `java-games/class-object-lab/tests/compose.test.mjs` hit the 240 s limit and did **not finish**. It is JVM-heavy and I did not compare it against `main`, so its result is unknown.
- `java-games/loop-lab/tests/browser.test.mjs` skipped itself (`puppeteer-core` not installed), so it did not run.
- The full `java-games` `npm test` chain was not run end to end.


## 9. Limits and what is not verified

- **Browsers:** Chromium only. No Firefox, Safari, physical Chromebook, touch hardware or manual screen-reader pass. Axe ran in light and dark; it cannot judge reading order or announcements.
- **The shared interactive map** is not on `main`, so the adapter contract has not been connected to it.
- **Workplace Readiness** has no guest tracking (needs an adapter on its own path). Robotics Course Architect has no tracker.
- **AP CSP** coverage is a lower bound (section 6).
- **Thresholds** for "needs review" (5+ answers under 70%), "steady" (10+ at 80%) and "due for a look" (14 days) are uncalibrated guidance, labelled as such. Parity-test floors (600 compared, 250 credited) were set from the measured results.
- **Backups** are not tamper-proof: a learner can edit their own file. That is acceptable because everything is self-reported, local and can never reach a class, but it means the numbers are a study aid.
- **Local only:** progress does not follow a learner to another device, and clearing browser data removes it. The page says so.
- **Cache token** for `session.js?v=per-mode-daily-v1` is unchanged, so the hook reaches browsers when their cache expires unless Work bumps it.
- **Tested on Node 22.** The pathway README asks for Node 24; the pathway suite (280 checks) passed on 22.
- **Not run or not finished:** see section 8 (one JVM-heavy suite timed out, one browser test skipped, full `npm test` chain not run, Worker service suites not run).

## 10. Pre-existing issues (not caused by this work)

- `cs-games/navigation-browser-tests.cjs` fails on pristine `main` with the same dynamic-import error (8 pass, then `csp-games/session.js` fails to load in its own server). Not investigated.
- `cs-games/navigation-tests.mjs` and `catalog-tests.mjs` need `linkedom`, which was not installed.
- Several suites print different assertion counts run to run (for example `csp-games/session-ui-tests.mjs`: 147, 153, 154 on `main`), because they draw random questions.
