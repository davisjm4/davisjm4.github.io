# Test evidence provenance

Files prefixed `independent-` are the executed integration results against current main. The other bundled text logs are Claude’s historical handoff runs against `0b4270c`; their browser/axe output was not rerun here. Current connected-browser checks and review changes are described in [INTEGRATION_VERIFICATION.md](../INTEGRATION_VERIFICATION.md).

# Raw test output

Captured from a fresh clone of base commit `0b4270c` with `integration/tcp-udp-lab-full.patch` applied and dependencies installed with `npm ci`. Lab suites ran with `TZ=America/Los_Angeles`. The browser test used Playwright 1.56 with Chromium build 1194 and axe-core 4.10.2.

| File | Command |
|---|---|
| validation.txt, generator.txt, session.txt, ui.txt | `node csp-games/tcp-udp-lab/tests/<name>.test.mjs` |
| npm-test-full.txt | `npm test --prefix csp-games` (all existing CSP suites plus this lab) |
| catalog-tests.txt | `node cs-games/catalog-tests.mjs` |
| browser-chromium.txt | `node csp-games/tcp-udp-lab/tests/browser.test.mjs` |
