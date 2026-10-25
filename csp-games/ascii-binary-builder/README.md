# ASCII Binary Name Builder

A static, buildless AP CSP game at `/csp-games/ascii-binary-builder/`. No backend, accounts, third-party runtime assets or uploads. Serve over HTTP for ES modules.

## Architecture and audit

Existing Binary Builder teaches numeric conversion/pixel bit counts; it does not provide a character-encoding/text editor. RGB's eight weights and tap-toggle pattern informed the new dedicated editor. Numerical code remains independent of RGB color/perceptual logic. The existing CS Games dark theme, navigation, CSP tracker and Session Summary are reused.

- `engine.js`: pure byte validation, binary conversion, ASCII decoding/labels, exact comparison, input validation, content pools, seeded finite generation and reference filtering.
- `app.js`: one selected-character editor with per-position bytes, immediate text/number readouts, four freely selectable settings, in-page drafts across setting changes, check/retry feedback, reference and shared session integration.
- `index.html` / `style.css`: responsive native buttons/form fields, visible focus, descriptive labels, control-code placeholders and space markers. Narrow screens wrap the eight controls into two ordered rows of four, with 52px-high buttons. Binary output always retains eight digits.
- `tests.mjs` / `ui-tests.mjs`: independent bit-arithmetic/control-label oracles and real DOM controller tests.

All generated targets start at zero bytes. Custom supports 1–12 printable ASCII characters, including spaces. Invalid Unicode/control/overlength input reports an error and preserves existing work; a textarea preserves pasted newlines for validation rather than silently stripping them. Target and output use textContent, including HTML-significant characters.

Custom text and workspace drafts remain in memory for this page; they are intentionally not saved to the session log or URLs. Generated-target recent history is stored locally per daily session. There is no persistent custom-project save feature. Navigation between positions/settings and viewport changes preserve the current work; reloading starts a new workspace.

## ASCII semantics

Unsigned byte values 0–255 are all editable. ASCII is the 7-bit 0–127 code, commonly embedded in an eight-bit byte. Printable range is 32–126; controls 0–31 and DEL are labeled, never inserted invisibly. SPACE uses ␣. Values 128–255 display Outside ASCII; they are not decoded as extended ASCII/Unicode. TAB is the familiar label for ASCII HT (9). Reference source: https://www.rfc-editor.org/rfc/rfc20.html . UTF-8/Unicode distinctions and A = 65 = 01000001 are explained in Learn.

## Content and sampling

94 unique single-character targets; 126 unique two-/three-character targets; 299 unique four-/six-character words (lengths 4, 5 or 6). Single-character sampling balances available uppercase/lowercase/digit/punctuation categories; short targets include curated sequences and validated combinations. Word setting intentionally uses recognizable lowercase words. All pools are validated printable ASCII.

One shared last-50 target history spans generated settings and survives reload for the current daily session. Sampling filters the finite eligible pool and picks among least-used available categories. It never retries indefinitely. If an injected tiny test pool has no unseen candidate, it relaxes exclusion only because the pool cannot satisfy it. Custom is not sampled and never enters generated-target history.

## Assessment and active time

Only Check Answer submits. Repeated unchanged checks are ignored. Incorrect bits persist; corrections can be resubmitted without changing first-try accuracy. Successful submissions show each character's decimal/binary values. Reference use, bit changes and navigation are free. Each setting has a separate mode bucket; skill metadata tags binary-representation, character-encoding and data-representation for future pathway integration.

Shared tracker daily reset and idle-aware active CSP time are reused, including visibility/interaction handling and cross-tab lease. The in-game time is explicitly labeled shared CSP practice, not a per-game-only duration. No pathway or accounts are created.

## Validation

```
npm run test:ascii --prefix csp-games
TZ=America/Los_Angeles node csp-games/ascii-binary-builder/ui-tests.mjs
npm test --prefix csp-games
node cs-games/catalog-tests.mjs
```

36,762 engine/generator assertions + 1,083 DOM assertions = 37,845 new assertions. All 256 byte patterns, independent positional sums/toggles, full ASCII classifications, all settings, privacy, retries/first checks, draft preservation, searching, daily reset and 15,000 deterministic mixed-setting rounds are covered. Zero previous-50 target repeats observed. Browser-specific interaction and publication evidence are tracked in reports/IMPLEMENTATION_STATUS.md and tracker G-108.

Full-suite integration required increasing legacy catalog assertions from 19 to 20 cards. An existing long-session test clock crossed midnight in UTC; its synthetic start moved to noon, preserving the separate rollover tests. Production shared session code was unchanged.

Physical Chromebook, touchscreen and assistive-technology testing remain classroom review items. Browser keyboard/viewport checks do not certify real hardware or a screen reader.
