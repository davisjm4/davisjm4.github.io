# Unified CS Games Navigation — Package A

Implementation and validation report · October 26, 2026

**Implementation commit:** [ae4c9264e9ff124bbf788d53717da4e49acab0ec](https://github.com/davisjm4/davisjm4.github.io/commit/ae4c9264e9ff124bbf788d53717da4e49acab0ec)

**Audit baseline:** `a1490cbc312807fe7e40638b18027411b86fbca3`

## Outcome

CS Games is the central entry point for three equal learning pathways. RACECES Writing & Mathematics is a shared tool below the pathway cards. Canonical directories, activity breadcrumbs, legacy redirects and course-specific reports form one navigation experience. No games, instructional content, scoring or session engines were changed.

## Final hierarchy and canonical URLs

| Level | Destination | Role |
| --- | --- | --- |
| Umbrella | https://davisjm4.github.io/cs-games/ | Three pathway cards and secondary Shared Practice Tools section |
| AP Computer Science Principles | https://davisjm4.github.io/cs-games/csp/ | CSP catalog, search, topic filters, Exam Readiness and CSP Session Summary |
| Advanced Computer Science | https://davisjm4.github.io/cs-games/advanced/ | Advanced CS catalog, search, topic filters and Advanced CS Session Summary |
| Workplace Readiness | https://davisjm4.github.io/wpr-games/workplace-readiness/ | Existing skill categories, selectors, practice modes and session reporting |
| Shared Practice Tools | https://davisjm4.github.io/cs-games/#shared-tools | Shared tool entry point |
| RACECES Writing & Mathematics | https://davisjm4.github.io/wpr-games/raceces/ | One application retaining writing subjects, Mathematics, topics and modes |

Directories use CS Games → Pathway. Activities use CS Games → Pathway → Activity. WPR retains its in-application skill-selection and practice routes; the brand link returns to the skill-selection directory. RACECES uses CS Games → Shared Tools → RACECES and retains a Workplace Readiness return. Compact static breadcrumbs share one stylesheet, with no navigation script or storage dependency. The nested Class Builder also retains its parent-lab return and gains direct CS Games and Advanced CS links.

## Upstream integration

The first repository checkout exactly matched the audit baseline. During validation, concurrent commits `994e8264b3aee4e3a58643d4010a559f40020e5f` (unified navigation) and `98cb863140be9039220b89326528d5a9992c2ba4` (published viewport verification fixture) arrived upstream. Both were preserved. The final implementation commit is a direct child of `98cb863`, adding narrowly scoped validation, the new pathway-card narrow-screen correction, nested Class Builder returns and four navigation-only test expectation updates. No force-push occurred. Publication used the connected GitHub workflow with an expected-head guard.

The attached historical CSP report archive describes snapshot `8846cf7`; its README identifies it as saved reports rather than a fresh test run. The current repository and new validation were authoritative for this implementation.

## CSP catalog and return-link corrections

The current verified inventory agrees with the audit: **32 registered CSP activities**. Before: **46 visible card appearances**, with Mixed AP Exam Practice registered but absent. After: **32 unique visible activities**, including Mixed AP Exam Practice in the mixed-practice group. The existing renderer now deduplicates card appearances. Search and every topic filter still discover all matching cross-topic activities. No activities or metadata were removed or added.

Every direct CSP activity returns to `/cs-games/csp/` and includes CS Games navigation. The 16 direct Java game entry points return to `/cs-games/advanced/` and include CS Games navigation. Advanced CS retains 24 unique catalog entries: 16 Java games and 8 existing links to CSP source activities. The latter retain their AP CSP source labels, canonical CSP return and CSP session scope; no session histories were merged.

## Legacy and reporting routes

| Route | Final behavior |
| --- | --- |
| `/csp-games/` | Canonical link, immediate redirect and fallback link to `/cs-games/csp/`; competing catalog removed |
| `/java-games/` | Existing canonical redirect to `/cs-games/advanced/` preserved |
| `/csp-games/<activity>/` | Existing playable URLs preserved; no activity redirects |
| `/java-games/<activity>/` | Existing playable URLs preserved; no activity redirects |
| `/wpr-games/` | Compatibility entry for Workplace Readiness and the shared RACECES tool; CS Games return |
| `/workplace-readiness-games/` | Existing redirect to published WPR application preserved |
| `/csp-games/session-summary/` | Existing CSP reporting; canonical CSP return |
| `/java-games/session-summary/` | Existing Advanced CS reporting; canonical Advanced CS return |
| WPR `#/summary` | Existing WPR reporting and scope preserved |
| RACECES `#/summary` | Existing shared-tool reporting and scope preserved |

Direct Canvas-style game visits, both legacy course redirects and Session Summary returns passed browser journeys. No redirect loops were observed.

## Preservation and scope

All generator, scoring, session, storage and active-time implementation files are byte-for-byte unchanged from the audit baseline. Across production scripts and styles, the only changed existing script is `cs-games/course-page.js`, the catalog renderer; the only changed existing stylesheet is the umbrella `cs-games/styles.css`. The new shared navigation stylesheet contains no session behavior. Existing WPR and RACECES application code and styles are unchanged.

Browser fixtures confirmed persisted CSP and Advanced CS scores/history, WPR reporting statistics, and RACECES totals/attempts survive hub navigation. These fixtures used an isolated test browser, not a student's session. No keys were renamed, no progress was migrated or reset, and daily reset, scoring, active-time, reporting scope and identity behavior were preserved.

**Packages B–F remain untouched.** No Teacher Tools repair, unrelated Loop Lab maintenance, tracker reconciliation, independent device/accessibility audit, QTI integration, new game/mode, content expansion, account, dashboard, backend or data collection was implemented. **The master tracker was not read or modified.**

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Catalog regression | node cs-games/catalog-tests.mjs | PASS: catalog routes, Java return links, unique cards, search, every topic filter and registered activities. |
| Unified navigation contracts | node cs-games/navigation-tests.mjs | PASS: 32 unique CSP entries; 24 unique Advanced CS entries; 51 direct activity/report pages; legacy routes; WPR and RACECES. |
| Rendered navigation journeys | node cs-games/navigation-browser-tests.cjs | PASS locally: all 12 required journeys; keyboard returns; 1366, 1024, 390 and 320px navigation; all 48 unique catalog game entry points; no page errors. |
| CSP complete regression | npm test --prefix csp-games | PASS, exit 0. Full existing suite, including generators, UI, session, daily reset, new labs and Copyright tests. Navigation expectations updated in four existing tests. |
| CSP session contracts | node csp-games/session-tests.mjs; node csp-games/daily-session-tests.mjs | PASS: storage persistence, scoring, retries, reset, daily boundaries and per-mode reporting. |
| Advanced CS session contracts | node java-games/session-tests.mjs | PASS: daily boundaries, legacy migration and per-mode summaries. |
| Published GitHub Pages | NAV_BASE_URL=https://davisjm4.github.io node cs-games/navigation-browser-tests.cjs | PASS: all required journeys, 48 game routes, four viewport widths, keyboard returns and session-preservation fixtures against live GitHub Pages. |

The browser suite executes the 12 requested journeys, plus all catalog game entry points, isolated session-preservation fixtures, and narrow navigation checks. Desktop (1366px), Chromebook (1024px), mobile portrait (390px), and narrow window (320px) navigation links remain visible and usable. Canonical directories and the homepage have no horizontal page overflow at those widths. Keyboard Enter activates the pathway returns. This is navigation regression verification, not the deferred comprehensive device/accessibility audit.

Published source verification also confirmed exact SHA-256 matches for the homepage, umbrella stylesheet, catalog renderer, shared navigation stylesheet and nested Class Builder page. The JSON evidence is included in the test-results folder.

The narrow-screen correction constrains only the new homepage pathway cards and shared-tool heading. The existing game interactions were not redesigned.

## Outstanding issues

No outstanding issue was found in the implemented navigation journeys. An unrelated pre-existing RACECES topic-picker fieldset creates approximately 18px of page overflow at a 320px viewport (measured page width 338px, both before and after). Its navigation remains within the viewport. It was documented and left unchanged under deferred Package E. Baseline/after screenshots are included as evidence.

The source-scoped CSP activities reused by Advanced CS continue to report to CSP. This preserves existing session scope and is explicitly identified on their catalog cards.

## Screenshots

Before/after and published screenshots, including four viewport widths and the documented pre-existing RACECES fieldset issue, are included in the downloadable report package.

## Files modified

The following inventory covers the audit baseline through the implementation commit, including the preserved concurrent navigation work (74 files). The follow-up report and its evidence logs are documentation-only additions.

- `.github/workflows/navigation-check.yml`
- `cs-games/advanced/index.html`
- `cs-games/catalog-tests.mjs`
- `cs-games/course-page.js`
- `cs-games/csp/index.html`
- `cs-games/index.html`
- `cs-games/navigation-browser-tests.cjs`
- `cs-games/navigation-tests.mjs`
- `cs-games/navigation.css`
- `cs-games/reports/unified-navigation/catalog-tests.txt`
- `cs-games/reports/unified-navigation/navigation-tests.txt`
- `cs-games/reports/unified-navigation/responsive-check.html`
- `cs-games/styles.css`
- `csp-games/ai-ethics-lab/index.html`
- `csp-games/algorithm-architect/index.html`
- `csp-games/algorithm-dance-lab/index.html`
- `csp-games/algorithm-race/index.html`
- `csp-games/analog-digital-lab/index.html`
- `csp-games/ascii-binary-builder/index.html`
- `csp-games/binary-builder/index.html`
- `csp-games/binary-search-hunt/index.html`
- `csp-games/boolean-gatekeeper/index.html`
- `csp-games/code-concepts/index.html`
- `csp-games/compression-challenge/index.html`
- `csp-games/computing-impact-lab/index.html`
- `csp-games/concepts-ui-tests.mjs`
- `csp-games/copyright-creative-commons-lab/index.html`
- `csp-games/copyright-creative-commons-lab/tests.mjs`
- `csp-games/coverage.html`
- `csp-games/create-task-lab/index.html`
- `csp-games/create-task-lab/ui-tests.mjs`
- `csp-games/cybersecurity-defender/index.html`
- `csp-games/data-detective/index.html`
- `csp-games/digital-divide-lab/index.html`
- `csp-games/exam-readiness/index.html`
- `csp-games/index.html`
- `csp-games/internet-layers-lab/index.html`
- `csp-games/list-lab/index.html`
- `csp-games/lossless-lossy-lab/index.html`
- `csp-games/mixed-ap-practice/index.html`
- `csp-games/network-breaker/index.html`
- `csp-games/packet-router/index.html`
- `csp-games/parallel-processing-race/index.html`
- `csp-games/response-builder/index.html`
- `csp-games/rgb-color-builder/index.html`
- `csp-games/rgb-color-builder/ui-tests.mjs`
- `csp-games/roundoff-overflow-lab/index.html`
- `csp-games/session-summary/index.html`
- `csp-games/simulation-lab/index.html`
- `csp-games/tcp-udp-lab/index.html`
- `csp-games/test-case-builder/index.html`
- `csp-games/trivial-nontrivial/index.html`
- `csp-games/vocabulary-fill-in-lab/index.html`
- `java-games/array-lab/index.html`
- `java-games/arraylist-lab/index.html`
- `java-games/boolean-conditional-lab/index.html`
- `java-games/class-object-lab/class-builder-rearrange/index.html`
- `java-games/class-object-lab/index.html`
- `java-games/debugger-lab/index.html`
- `java-games/documentation-lab/index.html`
- `java-games/inheritance-polymorphism-lab/index.html`
- `java-games/linkedlist-lab/index.html`
- `java-games/loop-lab/index.html`
- `java-games/math-lab/index.html`
- `java-games/method-constructor-lab/index.html`
- `java-games/recursion-lab/index.html`
- `java-games/robot-algorithms/index.html`
- `java-games/search-sort-lab/index.html`
- `java-games/session-summary/index.html`
- `java-games/string-lab/index.html`
- `java-games/variable-lab/index.html`
- `wpr-games/index.html`
- `wpr-games/raceces/index.html`
- `wpr-games/workplace-readiness/index.html`

## Reproduce rendered navigation checks

Install Playwright with Chromium in the test environment. Run `node cs-games/navigation-browser-tests.cjs`. Optional environment variables: `NAV_BASE_URL` selects the published origin, `CHROMIUM_EXECUTABLE_PATH` selects the browser binary, and `NAV_EVIDENCE_DIR` selects the screenshot output directory. The test creates a local static server when no published origin is specified and uses a fresh browser context for its test data.
