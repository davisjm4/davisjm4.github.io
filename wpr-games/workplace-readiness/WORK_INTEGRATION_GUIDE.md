# Integration guide: publishing as a standalone GitHub Pages section

Workplace Readiness Games is a self-contained static site. It does **not** touch, import from, or require CS Games or Java Games. Publishing it means adding one folder to the repository that serves GitHub Pages.

## 1. What to publish

Target URL: `/workplace-readiness-games/` (for the repository `davisjm4/davisjm4.github.io` that is `https://davisjm4.github.io/workplace-readiness-games/`).

Copy the contents of this package into a folder of that name at the repository root.

**Required at runtime (this is all the browser loads):**

```
workplace-readiness-games/
  index.html
  css/style.css
  js/data/schema.js
  js/data/content-bundle.js        <- generated from /content; contains all scenarios
  js/core/rng.js  expr.js  text.js  order.js  library.js
  js/core/feedback.js  grader.js  validator.js  generator.js
  js/app/storage.js  session.js  ui.js  app.js
```

**Optional but recommended to publish** (so the next developer can maintain it): `content/`, `tools/`, `tests/`, `package.json`, and the six `.md` documents. None of these is loaded by students.

**Do not publish:** `node_modules/`.

## 2. Routes

The app is a single page using hash routes, so GitHub Pages needs **no server configuration, no `404.html` and no rewrite rules**.

| URL | Screen |
|---|---|
| `/workplace-readiness-games/` or `#/` | Home and options |
| `#/practice` | Practice (reloading resumes the same challenge) |
| `#/summary` | Session summary |

Linking to `#/practice` directly starts practice with the last-used options (or Mixed Practice if there are none).

## 3. Paths

Every path inside `index.html` is **relative** (`css/style.css`, `js/...`), and no JavaScript fetches a file. The site therefore works unchanged:

- under `/workplace-readiness-games/` on GitHub Pages,
- at the root of any other host,
- opened directly from a file share (`file://`) on a locked-down school device.

There are no external requests: no CDN, no web fonts, no analytics, no network calls during play. A strict `Content-Security-Policy` of `default-src 'self'; style-src 'self'; script-src 'self'` is compatible if you wish to add one (the app uses no inline scripts or styles except one `style="width:NN%"` attribute on summary bars, which needs `style-src-attr 'unsafe-inline'` or can be changed to a CSS class if a strict policy is required).

## 4. Build and test commands

Running the site needs nothing installed. Maintaining it needs Node 18 or later.

```
npm install            # only needed for the browser tests (axe-core, puppeteer-core)
npm run build          # regenerate js/data/content-bundle.js from /content (run after ANY content edit)
npm run validate       # library-level validation: 22 skills, all templates, all settings
npm run sweep          # render every template 150x in every allowed setting and validate each instance
npm run coverage       # skill x mode x difficulty matrix and uncovered concepts
npm run test:unit      # 5 suites, no dependencies beyond Node
npm run test:browser   # real-Chromium play-through and accessibility; needs Chromium and puppeteer-core
npm run docs           # regenerate STANDARDS_COVERAGE.md, REASONING_DIVERSITY_REPORT.md, TEST_RESULTS.md
npm test               # build + validate + unit + browser
```

The browser tests look for Chromium at the paths in `tests/browser/harness.js`; edit `findChrome()` to point at your own Chromium or Chrome, or set it to a path from `npx puppeteer browsers install chrome`.

## 5. Deployment checklist

Before merging:

1. `npm run build` was run after the last content edit, and `js/data/content-bundle.js` is committed.
2. `npm run validate` reports 0 errors and 0 warnings.
3. `npm run test:unit` passes.
4. The folder is named exactly `workplace-readiness-games`.
5. No other folder in the repository was modified.

After publishing, open the live URL and confirm:

1. The home page loads with **Mixed practice** selected and no browser console errors.
2. **Start practice** shows a challenge. Answer one, check that feedback appears and **Next challenge** works.
3. Each mode loads when chosen in *Practice mode* (Decisions, Best Next Step, Put the Steps in Order, Find the Problem).
4. On a phone or a narrow browser window, nothing scrolls sideways and every button is easy to tap.
5. Keyboard only: Tab to Start practice, press Enter, use arrow keys to choose, Enter to check, Tab then Enter for Next.
6. **Session summary** shows your totals; **Reset session** asks for confirmation.
7. Reload the practice page: you stay on the same challenge. Close and reopen the tab: **Continue practice** appears on the home page.
8. In Application > Local Storage there is one key, `wrg.v1`, and no cookies.
9. The footer disclaimer is visible.
10. Hard-refresh after any later update (the browser may cache `content-bundle.js`).

On a real school Chromebook, confirm that local storage is allowed; if the district blocks it, the app still works but forgets results when the tab closes.

## 6. Updating content later

Edit the JSON under `content/`, never `js/data/content-bundle.js` (it is overwritten). Then `npm run validate && npm run sweep && npm run build && npm test`. Read several rendered challenges in different settings before publishing: automated checks cannot tell whether a scenario makes sense. See GENERATOR_SCHEMA.md.

## 7. Known limitations to tell stakeholders

- Tested in headless Chromium only. Safari, Firefox, physical Chromebooks and real screen readers have not been tested.
- About 125 distinct reasoning problems; each appears many times in a long session, in different settings.
- Advanced difficulty is limited, and absent for Career and Life Management, Mathematics, and Reading and Writing.
- The content has been reviewed by its author only. Have a CTE educator review every template before relying on it for assessment preparation.
- It is an independent practice resource, not an official CTECS product, and it makes no promise about assessment results.
