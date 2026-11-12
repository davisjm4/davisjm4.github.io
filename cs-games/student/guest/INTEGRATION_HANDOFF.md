# Integration handoff for ChatGPT Work

Branch `claude/independent-learner-pathway`, built on `main` at `d646f8a` (Merge PR #23, `codex/mastery-requirements`). Not pushed, not merged, not deployed. Delivered as Git bundles, a patch and a ZIP; exact commit ids are in the package's `PACKAGE_MANIFEST.md`.

## What is isolated and what is not

Everything lives in `cs-games/student/guest/`. It does **not** touch the production student map, `pathway-view.mjs`, the Teacher Tools, the Worker, the curriculum graph or the shared scoring.

Outside that directory there are exactly two things, both separable:

1. **Tracker hook** (its own commit, "Integration hook: route first-attempt practice to the guest store…", four files). One import and one changed line in each of:
   - `java-games/session.js` → `onAttempt: activeProfile ? recordGameAttempt('advanced', …) : recordGuestAttempt('advanced')`
   - `csp-games/session.js` → same with `'csp'`
   - `cs-games/robotics/parts-sprint/session.js` → same with `'robotics'` (Component Challenge reuses this tracker)

   The fourth file is `csp-games/session-ui-tests.mjs` (two lines). That existing test strips every `import` from `csp-games/session.js` and evaluates it in a VM that only has the names the test injects, so it must also import `recordGuestAttempt` and inject it beside `recordGameAttempt`. Without that line it fails with `ReferenceError: recordGuestAttempt is not defined`. I found this by running the production suites against pristine `main`. Any other test that evaluates a tracker's source the same way needs the same line; none of the other session-related suites I ran did (see the report).

   Cherry-pick the commit as one unit, or leave it out and the guest page still works but records nothing from games.
2. **Hub entry choice** (`integration/hub-entry-choice.patch`, **not applied** on this branch). Adds an "Explore on Your Own / Join a Class" panel and a nav link to `cs-games/index.html`. It deliberately does not use `.course-card`, because `cs-games/navigation-tests.mjs` asserts exactly four of them. With the patch applied, `navigation-tests.mjs` and `catalog-tests.mjs` exit 0 (they need `linkedom`, see below).

## Decision for you: cache token

Many games import `session.js?v=per-mode-daily-v1`. The hook changes `session.js` without changing that token, so a browser with a cached copy keeps the old behavior until its cache expires. Bump the token across the importers when the hook ships if you want it to take effect immediately. I did not, to keep the change to three files.

## The shared-map adapter contract

`buildGuestView(graph, courseId, state, { today })` in `pathway.mjs` returns the **same object an enrolled student's map receives** (`studentContract` in `cs-games/pathway/model.mjs`), built from the canonical graph with the existing `createPathway` prerequisite ordering and `calendar: null`. Course sequence, node ids, areas, edges, practice links and `status: 'Self-paced'` all come from there. Nothing is copied.

It adds optional fields. A map that ignores them still renders a complete pathway.

```
node.guest = { mark, markSource ('skill'|'area'|null), status, statusLabel, selfReported,
               answered, correct, accuracy, lastDate, lowAccuracy, suggested, reason }
area.guest = { mark, answered, correct, practiced, skills, review }
view.guest = { source: 'independent', courseId, totals {answered, correct, unmapped, accuracy},
               practicedSkills, notPracticedSkills, skillCount, reviewAreas[],
               suggestion { primary, alternatives, all }, resume, recent[], areaOrder[], summary }
```

Suggested shape for a data source the live map can accept, so enrolled and independent students use one map:

```
PathwaySource = { kind: 'enrolled' | 'independent',
                  load(): view,                       // enrolled: server view; independent: buildGuestView(...)
                  mark?(id, state|null, scope, where), // independent only
                  launch(node),                        // records "where I left off"; independent only
                  subscribe(listener) }                // re-render on storage / focus
```

Copy rules for the map when `view.guest` exists: no "synced", "teacher assessment", "verified mastery" or target-date wording; show `node.guest.statusLabel` and `node.guest.selfReported` as **separate** chips (self-report is dashed gold, practice is solid mint on this page); never label familiarity as Meeting or Exceeding.

### The decorator is temporary

`decorate.mjs` adds the guest controls around the existing `renderPathway` output. It relies on that renderer's documented order (one `<details>` per run of skills in an area, one `<li>` per skill, in `view.nodes` order). If you change `pathway-view.mjs`, update or drop the decorator. The interactive map should read `node.guest` directly. `practiceHref()` reuses the renderer's own links (focused mode, Mixed link, Workplace skill), so no practice URL logic is duplicated.

## Storage and privacy

- Key `cs-games:guest:v1` (schema 1) plus `cs-games:guest:v1:corrupt` (unreadable copy kept aside). One `sessionStorage` key, `cs-games:guest:launch`, remembers the skill just opened so the "what next" card can appear.
- Per event: id, question id, course, activity, requested and assessed mode, topic, family, difficulty, first-attempt correctness, time, local date, and (after the guest page resolves them) skill ids with the graph version. Marks, last position per course, archived per-skill totals.
- Never stored: names, email, school id, passwords, tokens, recovery credentials, class identifiers. Never sent anywhere: the guest modules use no network API (enforced by a source-scan test), and the one request the page makes is a same-origin GET of the curriculum graph.
- Saving is **off until the learner chooses a course or marks something**. Visiting the page, or opening a game, writes nothing.
- Raw practice details are stored, and skill credit is resolved by the guest page. A graph release that adds a skill can credit earlier practice; a release can never erase it.

## Guest and class stay separate

The hook branch runs only when `activeProfile` is null, so class-backed answers go to the class queue and never to the guest store, and guest answers are never queued for a class. Guest data is under a different key from the `wrg.profile.<id>.` prefix, so the existing class sign-out (`device.clear()`) leaves it alone. Tested with the real `profile-device.js`, and in Chromium with a simulated class profile on the same browser. The guest page reads (never writes) one key to tell the learner that a class profile is active.

## Not implemented on purpose: opt-in import into a class

There is no transfer path. A safe future design: the learner chooses "Share my practice with my teacher", sees a preview, and the server stores it as a separate **self-reported** record kind that is never eligible for mastery policies, awards or the 0–4 score and is shown to teachers as unverified. The backup format already carries only practice answers and notes, and import already ignores credit, awards and verification, which is the property that design needs.

## Tiered proficiency

When an approved Beginner/Intermediate/Advanced model exists, `summarizeProgress` is the extension point. Add its results as a separate field beside `practiceStatus`. Do not reuse `status`, so familiarity can never read as proficiency.

## Verifying

```sh
node --test cs-games/student/guest/tests/*.test.mjs
node cs-games/student/guest/build-coverage-matrix.mjs --check
node cs-games/student/guest/tests/browser-tests.mjs        # repo served on :8123
node cs-games/student/guest/tests/negative-controls.mjs --browser
```

## Findings about the existing repository

- `cs-games/navigation-browser-tests.cjs` fails on pristine `main` (`d646f8a`) exactly as it does on this branch: 8 pass, then `Failed to fetch dynamically imported module …/csp-games/session.js`. Not caused by the hook, and not investigated further.
- `cs-games/navigation-tests.mjs` and `catalog-tests.mjs` need `linkedom`, which is not installed in the build environment. They pass on `main` once it is.
- Workplace Readiness reports through its own `queuePractice` / `practiceEvent` path in `profile-student.mjs`, not a shared tracker. A guest adapter for that path is follow-up work.
- AP CSP: only 31 of 58 skills can be credited from the question topics probed (a lower bound), and 27 are labelled on the page.

## Open decisions

Cache token (above). Whether to apply the hub patch. When the map lands, whether it replaces the decorator. Whether the "needs review" and "steady" thresholds in `progress.mjs` (`GUIDANCE`) should be tuned against student data; they are uncalibrated guidance and are labelled that way.
