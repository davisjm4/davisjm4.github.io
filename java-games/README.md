# Java Games

Static Java-reading practice at https://davisjm4.github.io/java-games/, in the existing Pages repository. HTML/CSS/native JavaScript only. No code editor, arbitrary compilation, FRQ Builder, backend, accounts, student-data uploads, telemetry, or paid services.

## Initial games

- Variable Lab: int/double/boolean/char/String; clickable annotated components; declaration/initialization/assignment; literal/value; widening and narrowing conversions; reassignment; guided declaration pieces. Mixed default.
- Debugger Lab: select a faulty lexical token or the relevant missing-component gap AND a correction, then check both together. Verified templates cover syntax, runtime, logic, and tricky earlier-source faults. Compiler diagnostics are captured from OpenJDK 17, not invented. The production site uses known templates, not a compiler.
- Loop Lab: for/while structural regions, start/update/last-used/count/after-update questions with scope enforced; increasing/decreasing steps; <, <=, >, >=, !=; nested rectangles and row-dependent grids. Optional stepped/animated execution shows initialization/conditions/body/updates. Watching after an incorrect attempt intentionally reveals the challenge and prevents independent credit; cancellation leaves it active.
- Array Lab: visual starting collections; drag/touch/keyboard working copies, reusable bank values, duplicates, insertion gaps, removal zone, reordering, replacement, undo/reset. Dynamic ArrayLists have no fixed final slots. Arrays keep fixed length. Includes zero-based indices, length/size, visited elements, sums/counts/min/max/search, numeric and String ArrayLists, array/ArrayList traversals, and 2D row-update grids.

CSP List Lab reuses the collection editor with explicit one-based indexing. Its code-building mode is preserved. Java always uses zero-based indexing.

## Sessions and privacy

Java uses localStorage key `javaGames.session.v1`; CSP uses `cspGames.session.v1`. They do not share performance or optional student identity. Each has its own printable Session Summary and confirmed Cancel/Reset dialog. Retries retain one challenge ID. First-try accuracy uses submitted challenges; revealed answers never earn independent credit. Optional name/period and results stay in the browser. Clearing data/private browsing can remove them; reports are formative evidence and are not tamper-proof. Elapsed time includes time away.

## Tests

`npm install` and `npm test` in this folder. linkedom is a test-only dependency. Compiler checks use `compiler-tests.mjs` with OpenJDK 17 and a local batch harness (`compiler-harness.java`); no compiler/server is loaded by students. Generator tests cover seeded challenges, exact loop mathematics, metadata uniqueness, and separate session stores. DOM tests exercise every mode, both parts of debugging, wrong-then-right retries, reveal locks, collection operations, walkthrough reveal/cancel, session persistence, and summary reset/print actions. CSP regressions run separately; the shared collection test checks mouse drag/drop, touch-pointer, tap/keyboard controls, duplicates, growth, undo, reset, and both index bases.

DOM simulation does not verify physical Chromebook/mobile touch behavior, rendered CSS, or printed/PDF layout. Manual visual QA remains recommended before assignment.

## Coverage and future work

`coverage.html`, `coverage.json`, and `CURRICULUM_COVERAGE.md` audit all 53 topics in the official AP CSA framework effective Fall 2025 and its clarifications. The initial four-game collection covers bounded reading/interpretation/debugging skills. It does not claim full AP CSA or EOP coverage. A district EOP blueprint was not provided. Project design/code writing remains in SkillStruck. String algorithms, Boolean equivalence, full object state/this/encapsulation/reference diagrams, file processing, sorting, recursion, and several other objectives remain on the roadmap. Proposed substantial new game designs require approval; no unapproved extra games are included.

Deploy only through the existing main-branch GitHub Pages workflow. CSP Games, legacy Network Breaker, root portfolio, and other content remain in place. No ChatGPT Sites project is created, updated, or deleted.

The current quality-update checks and instructional review are documented in `QUALITY_AUDIT.md`. Run `npm run test:quality` for randomized quality and JVM repair checks, and `npm run test:compiler` to regenerate verified compiler diagnostics. The intentionally nonterminating loop has no update; integer decrement/wrap behavior is not mislabeled as a guaranteed infinite loop.
