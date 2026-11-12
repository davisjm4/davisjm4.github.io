# Independent learner pathways

Lets any student use the CS Games learning pathway with no teacher, class, account or server profile. Progress is saved in the same browser.

Entry point: `cs-games/student/guest/` (also `?course=csp|advanced|robotics|workplace`).

## What a learner can do

- Pick AP CSP, Advanced CS, Robotics 1 or Workplace Readiness and see the full course pathway immediately. Every skill is open.
- Mark a whole area or one skill as **Already familiar**, **Needs practice** or **Start here**, and clear it again. These notes shape suggestions. They are labelled self-reported and are never counted as practice.
- Jump to any area, open any skill's practice link, and see a suggested next skill with the reason.
- See practice numbers (questions answered, first-try correct, accuracy, skills practiced, areas to review, recent activity).
- Come back later and **Resume learning**. After practicing, choose to continue in the area, move to the next one, or try something different.
- Download a JSON backup, restore one, pause saving, or clear everything (with confirmation).

The pathway displays local practice and supported formative proficiency. First attempts count for activities that report through a shared tracker. The page identifies where skill tracking is available.

## Files

| File | Purpose |
| --- | --- |
| `store.mjs` | Versioned local store: allowlist sanitizer, corruption recovery, quota handling, backup/import. No network, no identity. |
| `evidence.mjs` | Turns a tracker's attempt record into a guest event (same rules as the class-backed queue) and credits skills with the Worker's own `questionEvidence`. |
| `hook.mjs` | One-line hook for the shared session trackers. |
| `progress.mjs`, `suggest.mjs` | Practice summaries (self-report kept separate) and suggested-next / resume / after-practice logic. |
| `pathway.mjs` | **Adapter contract** for the shared map: builds the same view an enrolled student's map receives from the canonical graph, with no calendar. |
| `decorate.mjs`, `app.mjs`, `index.html`, `guest.css` | The guest page mounts the interactive map and offers the classic pathway as a fallback. |
| `class-state.mjs` | Read-only check for an active class profile, used only to explain where practice is going. |
| `build-coverage-matrix.mjs` | Generates `ACTIVITY_COVERAGE.md`, `activity-coverage.csv` and `coverage-data.mjs`. |
| `integration/hub-entry-choice.patch` | Original proposal for the public hub links. |
| `INTEGRATION_HANDOFF.md`, `IMPLEMENTATION_REPORT.md` | For Work, and the full report with measured results and limits. |

## Run the checks

Node 22 or newer. From the repository root:

```sh
node --test cs-games/student/guest/tests/*.test.mjs            # 52 unit checks
node cs-games/student/guest/build-coverage-matrix.mjs --check  # matrix and tracking data are current
python3 -m http.server 8123 --bind 127.0.0.1 &                  # real-browser suite needs the repo served from its root
node cs-games/student/guest/tests/browser-tests.mjs             # 88 checks in real Chromium (Playwright)
node cs-games/student/guest/tests/negative-controls.mjs --browser   # breaks 22 rules on purpose; each must be caught
```

The browser suite finds Playwright at `/opt/npm-tools/node_modules/playwright` or `PLAYWRIGHT=<path to playwright/index.mjs>`, and axe-core at `AXE=<path to axe.min.js>` (skipped if absent). `BASE` overrides the server URL.

## Production map integration

The public entry is **Explore Learning Map** on the CS Games homepage and each course hub. The guest adapter feeds the same interactive map and proficiency evaluator as enrolled students. The map's accessible List view is always available. The original page can also be reached with `?view=classic`.

Guest map links carry `learner=guest` so practice remains local even on a browser with a signed-in class profile. Ordinary class pathway links keep using their profile. The same-origin graph and activity registry are the guest page's only data requests. Imported backups remain formative and cannot issue official assessments.

The coverage report measures skill attribution. The proficiency rubric independently determines which answers support a formative level. Older practice can be compacted to skill totals. Those totals remain available in the practice summary, and detailed evidence is required to recompute proficiency. Workplace Readiness and Robotics Course Architect remain available for practice where the map has no automatic evidence.
