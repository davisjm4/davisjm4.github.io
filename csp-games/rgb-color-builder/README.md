# RGB Color Code Builder — G-107

A buildless, browser-local AP CSP color editor. Public route: `/csp-games/rgb-color-builder/`.

## Architecture decision

Inspected Binary Builder in `../app.js` and `../engine.js`: it supports unsigned binary representation, capacity, wrap-model overflow, and grayscale pixel storage. It has no three-channel RGB editor, hexadecimal editor, or perceptual matching. A dedicated game avoids adding unrelated UI branches to those established activities. Reuses `../style.css`, `../session.js`, the existing daily session key and active-time controller, and the unmodified Session Summary. No runtime dependencies, backend, account, or network requests.

- `engine.js`: pure conversions, CIEDE2000, finite seeded generator, hints and feedback.
- `app.js`: live DOM editor and shared tracker adapter.
- `index.html` / `style.css`: accessible labels, native selects, responsive controls, sticky side-by-side color comparison.
- `tests.mjs` / `ui-tests.mjs`: numerical, generator, session and simulated DOM integration tests.
- `reports/generator-quality.json`: measured audit; `reports/sample-256.json`: actual seed-0 targets and distances.

## Student experience

Mixed is default. Binary RGB exposes 24 individually labeled buttons with positional weights and pressed states. Hexadecimal RGB exposes six native 0–F selectors, which support touch, arrows, and native letter/digit selection. Both editors synchronize decimal, eight-bit binary, hex code, and the student swatch immediately. Editing is never a submission. Reset returns to black without a failed answer. The target's numeric values stay hidden until the first check; hints only name broad light mixtures or explain gray. Help contains fixed canonical examples independent of the target.

Check Color reports Correct or Not Yet Correct, target/student RGB and hex, perceptual distance, and channel-by-channel directions. An unchanged answer cannot be submitted repeatedly. Incorrect answers remain editable; correction is a guided retry and never changes first-try accuracy. A successful round remains available for exploration; New Color begins the next scored challenge.

## Perceptual matching and tolerance

sRGB bytes are decoded with the piecewise sRGB transfer curve, converted by the standard sRGB-to-XYZ D65 matrix, normalized against D65 white (0.95047, 1, 1.08883), then converted to CIELAB. CIEDE2000 uses kL = kC = kH = 1, including the hue wrap, achromatic cases, and blue-region rotation term. This is D65-relative Lab for both swatches; no D50 adaptation is applied or mixed into the comparison.

Acceptance is **ΔE00 ≤ 6**, inclusive. This is an intentional introductory-classroom approximation tolerance, not a claim of imperceptibility or a universal human-vision threshold. It lets students match a close mixture without memorizing exact channel codes. Changing this constant requires reviewing the documented examples and rerunning tests.

| Target | Student | ΔE00 | Result |
|---|---|---:|---|
| (255,0,0) | (245,10,10) | 2.1182 | Accept |
| (0,255,0) | (10,245,10) | 2.1051 | Accept |
| (0,0,255) | (10,10,245) | 1.0311 | Accept |
| (128,128,128) | (144,144,144) | 5.7263 | Accept |
| (128,128,128) | (146,146,146) | 6.3968 | Reject |
| (255,0,0) | (0,255,0) | 86.6082 | Reject |
| Black | White | 100.0000 | Reject |

Validated all 34 supplemental Lab test pairs from Sharma, Wu & Dalal, including reversed argument order, against published four-decimal distances (error < 0.000051).

Primary reference and test-data provenance: [CIEDE2000 implementation notes and supplemental data](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/), Sharma, Wu & Dalal (2005), DOI 10.1002/col.20070. The seven-column numerical fixture is preserved in `fixtures/ciede2000.txt`. sRGB conversion reference: [W3C CSS Color 4 sample conversion code](https://www.w3.org/TR/css-color-4/#color-conversion-code).

## Generator and limits

The **finite bank has 4,096 distinct targets**, using channel steps of 17 (0,17,…,255). Students can create all 16,777,216 RGB values. Coarse target steps offer approachable mixtures and naturally related hex pairs without revealing the target code.

Targets partition into eight families: red-dominant (640), green-dominant (640), blue-dominant (640), secondary mixtures (630), other mixed colors (1,110), grayscale including black/white (16), bright (210), dark (210). Bright means every channel is at least 170; dark means the maximum channel is at most 85, with equal-channel colors classified separately as grayscale.

Selection prefers the least-used eligible family, excludes the previous family, prohibits every exact color in the last **50 generated** rounds, and requires **ΔE00 ≥ 18** from the preceding target. A bounded scan selects from the finite candidate pools, avoiding unbounded retries. A constrained custom bank can relax family/perceptual spacing only, returns `fallback:true`, and throws a clear error when no unseen target remains; it never silently breaks exact-repeat protection. The production bank needed no fallbacks in testing.

Mixed balances the rolling ten representations and prevents streaks longer than two. One history is shared across mode changes and persisted across page reloads for the same daily session. `?seed=42` makes a fresh generator reproducible; identical history plus seed reproduces the same continuation. Existing session history intentionally influences seeded page reloads.

Audit: 20 seeds × 1,000 rounds = **20,000 rounds**. Every family appeared exactly 2,500 times; Binary 9,994, Hex 10,006; zero exact repeats within 50, zero consecutive family repeats, zero consecutive distances below 18, zero fallbacks. Minimum consecutive ΔE00 was 18.00658; maximum Mixed representation streak was two. Black and white were both covered by the archived sample.

## Session and readiness compatibility

Uses the existing `cspGames.session.v1` schema. Only checks call `submit`; edits, hints and resets do not. Distinct challenge counts, first-try correct, retries, submissions, Binary and Hex mode buckets, and aggregate Mixed/overall accuracy use established conventions. Daily local-date reset and active practice time are inherited. Midnight or an externally reset session expires the old round and creates a new target before another adjustment/check. Session totals survive ordinary reloads.

Record annotations include target/student RGB, first submitted RGB and distance, first-try result, representation, selected mode, family, prior-target distance, and skill IDs: `binary-representation`, `hexadecimal-representation`, `rgb-color-representation`, `data-representation`. This provides a future readiness-pathway bridge without building the pathway. The shared report's after-retry metric includes guided corrections after target values are shown; only first-try performance is independent evidence here.

## Validation and reproduction

```sh
npm ci --prefix csp-games --ignore-scripts
npm test --prefix csp-games
TZ=America/Los_Angeles node csp-games/daily-session-tests.mjs
NODE_PATH="$PWD/csp-games/node_modules" node cs-games/catalog-tests.mjs
```

Full `npm test --prefix csp-games` passed, including all existing CSP suites and both new RGB suites. Consolidated catalog tests and America/Los_Angeles daily-reset tests also passed. RGB numerical/generator/session suite: 22,279 assertions; simulated DOM suite: 415 assertions. Conversions exercise all 256 possible byte values, every bit position, all hex digits in all six slots, leading zeros and invalid values. DOM tests exercise both representations, live CSS/readouts, hidden target, hints, reset, wrong-then-right checks, duplicate-check prevention, independent first-try success, mode changes, cross-mode history, daily rollover and explicit session reset.

Real Chrome preview QA completed a Binary mismatch and exact correction; a Hex mismatch and accepted close match (#A8A8A8 against #AAAAAA, ΔE00 0.58); reset/new/Mixed transitions; and shared Session Summary with correct per-mode results and active minutes. Responsive iframe viewports: 320, 390, 768, 1024 and 1280px; no horizontal overflow. At 320px, binary buttons measured at least 55.25 × 46px. Native selectors are at least 60 × 48px. Both color swatches remain visible together and stick above the editor when scrolling.

Browser QA uses real Chrome rendering in responsive iframe viewports, not physical Chromebook/tablet/phone hardware or touch-device emulation. Touch-sized controls and native selects were exercised by browser pointer interaction. No physical touchscreen, screen-reader, color-vision-user study, calibrated-display, or broad browser-engine testing is claimed. Color appearance varies by display and viewer; the tolerance needs classroom feedback rather than a claim of universal visual equivalence.

## Integration and publication

Linked from `/csp-games/`, the legacy shared CSP catalog, and `/cs-games/csp/`; catalog query version changed to refresh the consolidated listing. No existing game logic or shared tracker was changed. The legacy catalog UI test's expected game-card count increases from 18 to 19. GitHub Actions runs the full CSP suite and school-timezone daily checks for future RGB changes.

The implementation is published through the repository's existing GitHub Pages workflow. The final handoff and tracker record the verified deployment URL and commit after live verification; a source commit alone is not publication evidence.
