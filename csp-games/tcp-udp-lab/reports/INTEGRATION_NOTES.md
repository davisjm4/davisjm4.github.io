> Historical Claude handoff report. Current reconciliation, independent validation, corrections and release evidence: [INTEGRATION_VERIFICATION.md](./INTEGRATION_VERIFICATION.md).

# Integration notes — TCP vs. UDP Decision Lab

Base commit: `0b4270c2fa0f973f94703053e50a74ad14b8eca5`. Both patches below were applied to a fresh clone of that commit and the full test suite was rerun before delivery (see `reports/test-results/`).

## 1. Files to add

All of `csp-games/tcp-udp-lab/` from the ZIP:

- `index.html`, `style.css`, `app.js`, `generator.js`, `content.js`, `session.js`, `README.md`
- `tests/`: `validation.test.mjs`, `generator.test.mjs`, `session.test.mjs`, `ui.test.mjs`, `browser.test.mjs`
- `tools/`: `audit.mjs`, `simulate.mjs`, `build-reports.mjs`
- `reports/`: `IMPLEMENTATION_REPORT.md`, `GENERATOR_VALIDATION.md`, `GENERATOR_VALIDATION.json`, `CONTENT_REVIEW.md`, `INTEGRATION_NOTES.md`, `test-results/`

Also add `.github/workflows/tcp-udp-lab-check.yml` (included in the integration patch).

## 2. Existing files that change

These changes are not shipped as overwritten files; they are in `integration/tcp-udp-lab-integration.patch`.

| File | Change |
|---|---|
| `csp-games/index.html` | New course card first in the list, following the newest-first convention |
| `csp-games/app.js` | Catalog row in group “4 · Computer Systems and Networks”, after Packet Router |
| `csp-games/ui-tests.mjs` | Hub card and button counts 23 → 24 |
| `csp-games/package.json` | New `test:tcpudp` script, appended to `npm test` |
| `cs-games/catalog.js` | New CSP entry at the top, topic “4.1 Network Communication” |
| `cs-games/csp/index.html` | Cache bump `catalog.js?v=numerical-catalog-v1` → `tcpudp-catalog-v1` |
| `.github/workflows/tcp-udp-lab-check.yml` | New file, modeled on `lossless-lossy-lab-check.yml` |

No shared runtime file changes: `session.js`, `summary.js`, `style.css` and Session Summary are untouched.

## 3. Commands

```
git checkout 0b4270c                     # or current main; see §8
unzip tcp-udp-lab-claude-implementation.zip -d /tmp/tcpudp
cp -r /tmp/tcpudp/csp-games/tcp-udp-lab csp-games/
git apply --check /tmp/tcpudp/integration/tcp-udp-lab-integration.patch
git apply /tmp/tcpudp/integration/tcp-udp-lab-integration.patch
```

Alternatively, `integration/tcp-udp-lab-full.patch` adds the lab directory and the integration edits in one `git apply`.

## 4. Expected relative URLs

- Game: `/csp-games/tcp-udp-lab/` (live: https://davisjm4.github.io/csp-games/tcp-udp-lab/)
- From the game: `../` (CSP Games), `../../cs-games/csp/` (CS Games · AP CSP), `../session-summary/` (Session Summary)
- Hub card: `./tcp-udp-lab/` from `/csp-games/`. Catalog URL: `../../csp-games/tcp-udp-lab/` from `/cs-games/csp/`

## 5. CSS and JavaScript dependencies

- Shared: `../style.css?v=platform-java-v3` (theme tokens) and `../session.js?v=per-mode-daily-v1` (tracker, navigation, active time).
- Local ES modules use `?v=tcpudp-v1`. Bump that value on any edit to a lab module.
- No external scripts, fonts, network calls, accounts or uploads. Test-only dependency: the existing `linkedom` dev dependency. The optional browser test needs Playwright and Chromium, which are not added to `package.json`.

## 6. Session Summary integration

- A record is created only when the student answers.
  - Bucket mapping: game `tcp-udp-lab`, topic = scenario topic, mode = selected filter (Mixed or a topic).
  - An incorrect answer is closed immediately, so only one scored try is possible.
  - Skipped rounds, filter changes and the Learn panel create no records.
- Each record is annotated with: `questionId`, `familyId`, `situationId`, `topic`, `correctProtocol`, `selectedProtocol`, `learningObjective`, `cedLearningObjective`, `essentialKnowledge`, `practiceMode` (`tcp-udp-decision`), `filter`, `condition`, `skills`.
- Daily reset and active time come from the shared tracker. Repeat history and accuracy by protocol live in `localStorage['cspGames.tcpUdpLab.v1']`, keyed to the tracker's session ID, so they reset with it.
- Limitation: Session Summary shows topic and mode tables but not protocol accuracy. That is shown only inside the game.

## 7. Tests

```
npm ci --ignore-scripts --prefix csp-games
npm run test:tcpudp --prefix csp-games
npm test --prefix csp-games
ln -s ../csp-games/node_modules java-games/node_modules && node cs-games/catalog-tests.mjs
node csp-games/tcp-udp-lab/tools/build-reports.mjs      # regenerates reports/
```

Note: `npm test` rewrites two existing files in `csp-games/rgb-color-builder/reports/`. Those suites write reports as they run. Discard those changes before committing.

## 8. Browser validation

```
NODE_PATH="$(npm root -g)" PLAYWRIGHT_BROWSERS_PATH=<browsers> AXE_PATH=<axe.min.js> \
  node csp-games/tcp-udp-lab/tests/browser.test.mjs
```

The test serves the repository root itself and covers 7 viewports with keyboard and touch play, plus an axe-core scan when `AXE_PATH` is set.

Manual checks still pending:
- Safari and Firefox
- a physical Chromebook and touch device
- a screen reader (NVDA/ChromeVox): confirm the feedback announcement and the T/U/N shortcuts in focus mode

If `main` has moved past `0b4270c`, the most likely conflicts are:
- the card count in `csp-games/ui-tests.mjs`, if another game was added (use the new count + 1);
- the first lines of `csp-games/index.html` and `cs-games/catalog.js`;
- the cache value in `cs-games/csp/index.html`;
- the `test` script line in `csp-games/package.json`.

## 9. Known limitations

See `IMPLEMENTATION_REPORT.md` §6.

## 10. Internet Layers & Protocol Roles Lab

That lab does not exist at the base commit. If it is added later:
- Keep the TCP/UDP descriptions consistent: reliable while connected, no TCP guarantee language, UDP never “faster”/“unreliable”, DNS uses both.
- Avoid a duplicate “TCP vs UDP” quiz. Link to this lab for transport choice and keep that lab on layering and roles (IP addressing and routing, transport, application).
- Topic metadata here uses “4.1 Network Communication”, matching Packet Router.
