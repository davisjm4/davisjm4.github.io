# Roundoff vs. Overflow Lab · G-111

Static AP CSP Topic 2.1 practice: one scenario, exactly Overflow / Roundoff / Neither, one scored selection, then explanation and optional numerical demonstration. No typed calculations. Mixed is default; filters are Integer Range, Precision and Real-World Applications.

## Audit and reuse

Inspected `../app.js` Binary Builder and `../engine.js` binaryExtension: unsigned overflow and an explicitly defined modulo wrapping calculation already exist. RGB and ASCII focus on encoding, not range-versus-precision recognition. `../practice-engine.js` Mixed AP Practice includes capacity/data topics but no dedicated roundoff/overflow progression. Preserve all those routes and runtime behavior. This standalone lab follows the recent compression/analog decision-lab layout, bounded sampling and shared session conventions. Only catalog rows and test wiring change outside the new directory; shared tracker implementation is unchanged.

## Architecture

- `content.js`: 60 authored reasoning focuses, 20 per filter. Six parameter variants each, 360 distinct rendered scenarios. Objectives include asymmetric signed endpoints, negative bounds, destination narrowing, inclusive count versus index, base-dependent fractions, significant digits, tick units, cents, sensor resolution and application-specific limits. Related cases intentionally share arithmetic kernels; these are not 60 unique compression-like algorithms or unlimited stories.
- `math.js`: reduced BigInt rational arithmetic, exact operations, integer/fixed/significant-digit teaching formats and nearest-value storage with ties away from zero. Finite floating models explicitly state base, significant digits and supported magnitudes; they are not a simulation of IEEE hardware. No floating-point underflow or deliberate truncating-conversion questions.
- `engine.js`: structured numerical models, scenario/evidence generation, deterministic finite selection. Supplies exact mathematical results; never asks students to compute difficult arithmetic. Outside-range values have no claimed stored result or universal wrapping behavior.
- `app.js`: three plain equal-style choices, terminal first selection, hidden/empty feedback and visuals until submission, keyboard focus, open filters, session adapter and local recent-history persistence.
- `visual.js`: accessible text readouts plus compact SVG range diagram. Edge positions are clamped and disclosed; exact labels remain authoritative. Precision comparison uses exact/stored/difference, since a range diagram alone cannot show precision.

## Selection and sessions

One persisted daily-session history spans all filters, retaining the last50 exact question IDs and last3 family IDs. Selection first protects exact history, then family cooldown, balances eligible categories, and favors less-used families. There is no random retry loop. A small injected pool relaxes family cooldown first; only when every exact candidate is exhausted are oldest exact restrictions relaxed. All published filters contain120 instances and20 families, so fallback is unnecessary in normal practice. Reload restores recent history and trailing answer streak; long-term category/family fairness counters restart on page load.

Mixed and Applications balance all three categories. Integer Range balances Overflow/Neither; Precision balances Roundoff/Neither. All three choices remain visible in all modes. These concept-focused filters do not invent an integer precision problem just to force a third correct category.

Shared `../session.js` owns daily local-day reset, first-try totals, active CSP time excluding hidden/idle pages (existing two-minute idle convention), and Session Summary. Topic buckets represent the correct outcome; mode buckets represent the selected filter. Runs have one submission, including incorrect rounds. Learn/filter changes are not attempts. Optional future pathway skill tags: binary-representation, numerical-range, numerical-precision, overflow, roundoff. No readiness pathway built, accounts, identifying data collection, backend or uploads.

## Verification

Run from repository root:

```
npm run test:numbers --prefix csp-games
npm test --prefix csp-games
TZ=America/Los_Angeles node csp-games/roundoff-overflow-lab/ui-tests.mjs
node cs-games/catalog-tests.mjs
```

The independent test oracle uses raw rational cross-products, bit shifts and enumerated representable values. It does not call runtime classification, range or nearest-value helpers. Checks include all360 models, arithmetic, signed/unsigned boundaries at2–24bits, negative limits, decimal grids, binary fractions, significant-digit exactness and tie handling. UI checks cover all choices, scoring, state, visualization timing, SVG descriptions, summary buckets and reset. Browser viewport/keyboard checks complement DOM simulation.

See `reports/GENERATOR_VALIDATION.json`, `reports/CONTENT_REVIEW.md`, and `reports/IMPLEMENTATION_STATUS.md`. Final deployment commit and live verification are recorded in master tracker G-111 / Release History after Pages deployment.

Instructional reference: College Board AP CSP Course and Exam Description, DAT-1.B / Topic2.1, https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-course-and-exam-description.pdf . Questions are original, not copied exam items.
