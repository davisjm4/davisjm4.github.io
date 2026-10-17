# Documentation Lab

Public route: `/java-games/documentation-lab/`. A standalone Java Games page (static HTML/CSS/ES modules; no backend, accounts, network calls, or build step).

Students evaluate, repair, write, and interpret Java comments, Javadoc, and official-style Java API documentation. Supports Nevada Advanced CS Standards 2.4 (modularity, methods/parameters) and 2.5 (documentation).

## Modes (Mixed Practice is the default)

| Mode | What students do | Interactions |
|---|---|---|
| Comment Quality Inspector | Choose the most useful comment for a marked spot, or click the comment that should go | choose a comment · click a code line |
| Comment Editor | Click the faulty comment line, then choose its repair (code is always correct) | click a line + choose a repair, with live preview |
| Javadoc Builder | Build a method's Javadoc row by row, including deciding which tags to leave out | per-tag choice with live Javadoc preview |
| Read the Docs | Answer from a Java SE 17 API panel | predict a result · classify "guaranteed / not guaranteed" · click the doc line that answers |
| API Detective | Pick or build the call that meets a requirement | choose a call · assemble method + ordered arguments |

98 hand-authored challenges in 34 reasoning families (6–7 per mode). Mixed Practice draws every mode once per round of five; within a mode it rotates families and avoids repeats until the pool is used.

## Files

- `index.html`, `style.css`, `script.js` — page, styles (layered on `../style.css`), UI.
- `engine.js` — selection, shuffling, assessment, Javadoc assembly, call evaluator. No DOM.
- `bank.js` — authored challenge content (kept apart from logic so it can be reviewed and extended).
- `docs.js` — Java API reference panels, adapted from the Java SE 17 API specification.
- `tests/` — development-only tests (not loaded by students).

## Scoring

Uses the shared `javaGames.session.v1` tracker (`../session.js`) with one topic per mode. One scored submission per challenge; a wrong first answer is recorded and the challenge is closed as revealed (no later credit). "Show Answer" records a reveal without an attempt. Skip / New Challenge / leaving the page record a skip. Session Summary needs no changes.

## Tests

From `java-games/documentation-lab/`:

- `node tests/doclab-tests.mjs` — content quality and generator tests (no dependencies).
- `node tests/doclab-jvm-tests.mjs` — needs a JDK 17+. Compiles every snippet with `--release 17`, runs doclint on every correct Javadoc, checks that decoy tags fail doclint, runs every API fact on the JVM, checks every API Detective option, and compares the in-browser call evaluator against the JVM for every possible assembled call.
- `node tests/doclab-browser-tests.mjs` — optional; needs Playwright + Chromium and a local server at the repo root (`python3 -m http.server 8765`).


## API Project Builder (Stage 1 foundation)

The sixth mode is integrated behind a production gate. The development route is:

`/java-games/documentation-lab/?mode=api-builder&apiDev=1`

It uses the fictional, clearly labeled `api-project-data-v1.json` fixture. The normal selector keeps this mode disabled until verified research content replaces the fixture and sets `published` to `true`.

Files:

- `api-project-builder-engine.js` — schema validator, loader, scenario picker, request-plan validator, alternative-plan and efficiency feedback.
- `api-project-builder-ui.js` — accessible documentation browser, parameter editor, request-plan workspace, submission, explanation, and shared-session tracking.
- `api-project-data-v1.json` — development-only fictional fixture; never present it as Spotify or another real service.
- `tests/api-project-builder-tests.mjs` — validator, references, parameter, multi-request, alternative-plan, efficiency, and picker checks.

### Integration instructions for researched content

Claude's production file should preserve `schemaVersion: 1` and all required field names from the assignment contract. Replace the fixture at the same path, retain `developmentOnly: false` or omit it, and set `published: true` only after the official URLs, verification dates, endpoint parameters, response fields, accepted plans, response samples, and model targets have been reviewed. The engine accepts multiple `acceptedPlans`; use `efficiency: "smallest-sufficient"` for the intended minimum and `efficiency: "valid-less-efficient"` for a valid but unnecessary-request alternative. No UI or engine rewrite should be necessary.

Stage 2 response exploration and Stage 3 visual Java modeling are intentionally not implemented or exposed.
