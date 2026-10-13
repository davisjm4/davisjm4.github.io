# CSP Games

Student practice at https://davisjm4.github.io/csp-games/.

Buildless HTML, CSS, and native JavaScript modules. Each game folder has an index.html, so Canvas links work without a single-page-app router. Runtime dependencies: none. There is no backend, login, telemetry, or collection of student information. New games retain statistics only in memory. The preserved Network Breaker retains only anonymous solved/streak counts in sessionStorage.

## Games

- Code Concepts: rapid one-concept practice across procedures, selection, iteration, variables/expressions, and lists. Mixed Practice opens automatically. Annotated syntax-tree metadata supplies every answer; no tracing or QTI export.

- Binary Builder: 4, 6, 8, or 16 unsigned bits.
- Boolean Gatekeeper: nested Boolean expressions; evaluate or adjust integer inputs 0–12. Solvability is enumerated.
- List Lab: one-based INSERT, REMOVE, APPEND; final-state editing or program building, accepting any valid transformation.
- Binary Search Hunt: hidden sorted values, midpoint choices, revealed comparisons, eliminated regions, present and absent targets. Lower midpoint convention.
- Packet Router: available routes, failed links, and additional failures; shortest routes are not required.
- Compression Challenge: text RLE, image RLE, and lossless optimization. Rules are deliberately bounded: 1-byte counts, 1-byte symbols, optional 1-byte image scan header, row/column scans, raw/RLE options. Optimal size is exact within these rules, not among all possible compression formats.
- Data Detective: table sorting/filtering/selection, graph comparisons and correlation, visualization configuration. Fictional datasets. Correlation is not causation.
- Algorithm Race: count-based comparisons of search, duplicate detection, and total computation; fixed explicit step models and scaled animations.
- Cybersecurity Defender: field inspection of fictional messages, invented practice passwords, reuse and MFA controls. Password-policy compliance does not establish unpredictability. All message domains use reserved .example names and are non-clickable text.
- Parallel Processing Race: exact independent-task makespan; optional dependencies with alphabetical processor queues, exhaustive optimum under that stated queue rule. Zero scheduling overhead; nonpreemptive tasks.
- Network Breaker: original full source from /network-breaker.html, with a CSP Games return link. Existing public source and links are left unchanged. Uses Edmonds–Karp minimum edge cuts.

## Tests

From this folder: `npm install`, then `npm test`. The DOM dependency is for tests only and is not loaded by students.

Pure tests cross-check binary conversions, solvable Boolean expressions, list operations, binary search, lossless encodings, packet routes, schedules, and preserved Network Breaker minimum cuts against independent exhaustive calculations. DOM tests exercise all new game modes, correct/incorrect submissions, retries, new challenges, controls, and navigation. DOM simulation does not verify visual rendering, touch hit areas, or CSS layouts on real devices.

No supported rendered-browser preview was available in the build environment. A final Chromebook/mobile visual check is recommended before assigning. Responsive layouts, keyboard controls, accessible assignment menus, and reduced-motion alternatives are included.

## Publishing and preservation

Deploy by committing only this subdirectory to the existing main branch. GitHub Pages' existing build/deploy workflow handles publication. The root portfolio, Jekyll configuration, notebooks, and /network-breaker.html are unchanged.

## Roadmap

Code Concepts is playable at /csp-games/code-concepts/. Possible future extensions include matching outputs and execution paths; Teacher Tools and Canvas QTI export are deferred. Variable Tracker, Procedure Tracer, and Bug Hunter are deferred. This collection does not claim full AP CSP curriculum coverage.

Pseudocode follows the College Board exam reference sheet: https://apcentral.collegeboard.org/media/pdf/ap-computer-science-principles-exam-reference-sheet.pdf .

Code Concepts tests: `node concepts-tests.mjs` and `node concepts-ui-tests.mjs` (the latter uses the same test-only linkedom dependency).
