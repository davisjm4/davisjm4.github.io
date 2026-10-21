# Workplace Readiness Games

Free, accounts-free practice for the 22 Workplace Readiness Skills. Short, realistic workplace situations with instant feedback, in four modes: Workplace Decisions, Best Next Step, Put the Steps in Order, and Find the Problem. Unlimited generated practice; results stay on the student's device.

An independent resource. Not an official CTECS product; not a guarantee of assessment results.

- Open `index.html`, or publish the folder to GitHub Pages (see `WORK_INTEGRATION_GUIDE.md`).
- `GAME_DESIGN.md` explains the design; `GENERATOR_SCHEMA.md` explains the content format.
- `STANDARDS_COVERAGE.md`, `REASONING_DIVERSITY_REPORT.md` and `TEST_RESULTS.md` are generated from the real content and real test runs. They include what is *not* covered or tested.

## Compositional generator (October 2026)

Alongside the 140 authored templates, a compositional generator builds workplace situations from typed components and **derives** the answer from the situation's facts. Changing a decisive fact (missing vs. verified information, unsafe vs. safe, authorized vs. not, a higher-priority problem resolved or not, a calculation's deciding constraint) changes the answer. Names, settings, wording and irrelevant numbers do not.

- **Content:** `content/compose/`: 12 reusable reasoning frameworks, typed slot pools for the 26 setting bundles, 51 kits across all 22 skills (state kits with prioritized issues, dependency-graph processes and defect documents; Mathematics numeric kits with calculated answers).
- **Engine:** `js/compose/engine.js` (catalog + rendering), `check.js` (validation and independent logic check), `selector.js` (hybrid authored + composed session engine with the same guarantees as before).
- **Capacity:** 1,871 distinct reasoning configurations, at least 20 in every skill/difficulty combination. See `DIVERSITY_REPORT.md`.
- **Docs:** `GENERATOR_SCHEMA.md` (compositional section), `INTEGRATION_GUIDE.md`, `DEVELOPMENT_REPORT.md`, `SAMPLES.md`.

```bash
npm ci && npm run build
npm test                 # build, validate, unit, compositional and browser tests
npm run sweep:compose    # render every composed unit in every allowed setting through both validators
npm run capacity         # configurations per skill/difficulty cell
npm run samples          # rewrite SAMPLES.md for human review (read it after content changes)
npm run docs:compose     # re-run the audit and regenerate DIVERSITY_REPORT.md
```
