> Integrated against newer main without replacing Vocabulary or Internet Layers. See [integration verification](reports/INTEGRATION_VERIFICATION.md). Single-letter shortcuts are opt-in; Tab/Enter/Space work by default.

# TCP vs. UDP Decision Lab

Buildless GitHub Pages practice for AP CSP Topic 4.1. The student reads one networking scenario and picks one of exactly two buttons, TCP or UDP. One choice is scored. Feedback then explains why the correct protocol fits and why the other is less suitable. The default filter is Mixed, with optional filters for Reliability and Ordering, Real-Time Communication, Streaming and Interactive Applications, Network Overhead and Connections, and Protocols in Use (HTTP, QUIC and DNS). There are no difficulty levels, no typing, no drag-and-drop and no pre-answer hints.

## Files

| File | Role |
|---|---|
| `content.js` | 60 authored reasoning families (30 TCP, 30 UDP), each with structured requirement facts, 3 situations and explanations; 4 answer-neutral network conditions; protocol bindings |
| `generator.js` | Derives TCP/UDP from facts and rejects contradictory, incomplete or protocol-conflicting families; checks that each fact is stated in the scenario text; builds 360 instances; runs the repeat-avoiding generator; composes feedback |
| `session.js` | Adapter over the shared `../session.js` tracker: one scored record per answer (created only at submission), metadata annotation, repeat history and accuracy by protocol keyed to the daily session |
| `app.js`, `index.html`, `style.css` | Page, Learn panel with comparison table, keyboard shortcuts, CS Games dark theme |
| `tests/` | `validation`, `generator`, `session`, `ui` (linkedom) run in `npm test`; `browser.test.mjs` (Playwright/Chromium) runs separately |
| `tools/` | `audit.mjs` (shortcut audits), `simulate.mjs` (simulation harness), `build-reports.mjs` (regenerates `reports/`) |
| `reports/` | Implementation report, generator validation (generated), content review (generated), integration notes, raw test output |

## Run

```
npm run test:tcpudp --prefix csp-games
node csp-games/tcp-udp-lab/tools/build-reports.mjs
NODE_PATH="$(npm root -g)" node csp-games/tcp-udp-lab/tests/browser.test.mjs   # needs Playwright + Chromium
```

Add `?seed=N` to the page URL for a deterministic sequence.
