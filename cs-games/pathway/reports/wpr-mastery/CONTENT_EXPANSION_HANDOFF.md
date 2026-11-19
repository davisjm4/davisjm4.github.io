# WPR content expansion: integration handoff

Base: PR #49 head `c8c8512b9d8b53f856533290015fb43ef1492b35`. Branch `claude/wpr-content-expansion` (stacked, not pushed: no GitHub credentials in the session). Not merged, not deployed. `WPR_AUTOMATIC` is still empty, so no skill earns automatic credit.

## Integration order
1. Merge PR #49 (or rebase this branch onto it). 2. Apply this branch (bundle, patch or cherry-pick the 5 commits). A trial merge with `origin/main` (a6e7149) was clean (no file overlap) and its authored-bank, release-audit and service tests passed.
3. Run the validation below. 4. Release review, then add skills one at a time to `WPR_AUTOMATIC` (separate change).

## Changed files (18)
Content: `wpr-games/workplace-readiness/service/issued-bank/*.mjs` (6 new), `issued-practice-bank.mjs` (appends authored items; the 3 original items and digests unchanged), `issued-practice.mjs` (optional allowlist argument, default unchanged). Audit/tests/reports: `authored-bank.mjs`, `build-readiness.mjs`, `release-audit.mjs`, `wpr-authored-bank.test.mjs`, `wpr-primary-concept.test.mjs` (assertion updated: six skills now reach threshold and are `ready-pending-release-review`), `balance-issued-bank.mjs`, and four report files.

## Compatibility and risks
- Existing issued items keep ids, family and digest; permits for them stay valid. New items are additive. Issue limit is 60 per window; the client walks all 122 in order.
- One response per family per profile, forever. A 20-family bank allows at most two misses at 90 percent, so consider extra families per skill before activation.
- Student page says "This set is practice only. It does not change mastery progress." That UI text (PR #58 area) must change when a skill is activated.
- Student progress display and the pathway engine were not exercised with credited authored events.
- No D1 schema, auth or shared mastery change.

## Validation (run from repo root unless noted)
- `node --test cs-games/pathway/tests/*.test.mjs` : 364 tests, all pass after the assertion update.
- `node --test cs-games/pathway/tests/wpr-authored-bank.test.mjs` : 8/8.
- `cd cs-games/pathway/audit/wpr-mastery && node release-audit.mjs --check && node build-readiness.mjs --check`.
- In `wpr-games/workplace-readiness` (after `npm ci`): unit suite 129/129, compose suites 102/102, Chromium suites 36/36 with `CHROME_BIN=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`.
- Not run: GitHub Actions, offline-sync browser flow for authored items, browser rendering of authored feedback states, Safari/Firefox, extension of the 18,000-seed audit to new parameter boundaries.
