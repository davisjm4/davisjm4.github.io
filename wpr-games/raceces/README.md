# RACECES Writing Games

A standalone practice site for high school students (grades 9–12). Students learn the structure of an evidence-based written response by working with short generated excerpts. They never write paragraphs, and the site needs no accounts, no backend, no network, and no AI at run time.

Future URL: `https://davisjm4.github.io/raceces-games/`

## The three practice modes

1. **Identify the Parts** — select the sentence (or every sentence) that plays a named role in a completed response.
2. **Rearrange the Response** — put seven shuffled sentences in order. Drag, Move buttons, tap-then-place, or keyboard.
3. **Choose the Missing Piece** — pick the best of four sentences to fill the gap.

Mixed Practice rotates across all three. A difficulty filter (All, Beginner, Intermediate, Advanced) applies to every mode. Session Summary shows accuracy by mode and by RACECES part, common slips, active time, and areas needing practice, and can be reset with a confirmation.

## Run it

Open `index.html` through any static server, for example:

```
python3 -m http.server 8080      # then visit http://localhost:8080/
```

Add `?seed=anything` to the URL for reproducible practice.

## Develop and test

```
npm install                       # Playwright, for browser tests only
npx playwright install chromium
npm test                          # build + validate + Node tests + browser tests + regenerate docs
```

| Command | What it does |
|---|---|
| `npm run build` | Rebuilds `js/data/content-bundle.js` from `/content` (always run after editing content) |
| `npm run validate` | Content validation (grounding, numbers, excluded vocabulary, excerpt length) |
| `npm run test:unit` | Node tests plus the 5,000+ challenge generation sweep |
| `npm run test:browser` | Real Chromium tests (desktop, Chromebook, mobile viewports) |
| `npm run docs` | Regenerates the data-driven docs from the latest results |

## Layout

```
index.html            css/style.css
js/engine/            rng, structure, model, identify, rearrange, missing, generator, validator, session, feedback
js/ui/                app shell and one renderer per mode, plus the summary
js/data/              generated content bundle (do not edit)
content/topics/       the content library (source of truth)
tests/  tools/        Node tests, browser tests, build and doc generators
```

## Documentation

`GAME_DESIGN.md`, `RACECES_STRUCTURE.md`, `CONTENT_AND_GENERATOR_SCHEMA.md`, `CONTENT_COVERAGE.md`, `REASONING_DIVERSITY_REPORT.md`, `TEST_RESULTS.md`, `WORK_INTEGRATION_GUIDE.md`.

## Adding content

Add a topic (with at least 8 self-contained facts) and its writing models to a file in `content/topics/`, run `npm run build && npm run validate`, then `npm test`. See `CONTENT_AND_GENERATOR_SCHEMA.md` for every field.
