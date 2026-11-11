# Component guide: the requirements editor

The editor is a standalone component in `cs-games/teacher/requirements/`. It is vanilla DOM, uses the CS Games design tokens with fallbacks, needs no framework or build step, and does not depend on the Teacher Tools redesign. It was built standalone because the redesign lives on a separate branch; nothing from it was overwritten or imported.

Open `cs-games/teacher/requirements/index.html` through a static server to try it. The demo page builds two synthetic practice classes from the real Advanced CS curriculum graph. **Nothing is saved anywhere and nothing is published to students**: the demo's Publish button only updates the in-page copy.

## Files

| File | Purpose |
| --- | --- |
| `editor.mjs` | `createRequirementsEditor(root, options)`: the four tabs, the Review tab, saving and publishing. |
| `form.mjs` | The settings form shared by all three levels: presets, the two core fields, the Advanced section, the live explanation, the student preview. |
| `adapter.mjs` | `createMemoryAdapter` (demo and tests) and `createServiceAdapter` (the existing shared-service calls), plus the rule that a published version cannot change. |
| `dom.mjs` | A few helpers for building elements. No HTML strings are ever interpolated, so teacher-entered text cannot become markup. |
| `requirements.css` | Namespaced `.mreq` styles over the site tokens, with a light theme. |
| `demo.mjs`, `index.html` | The demonstration page. |
| `requirements-browser-tests.cjs` | The Playwright test and screenshot script. |

## Mounting

```js
import { createRequirementsEditor } from './requirements/editor.mjs';

const editor = createRequirementsEditor(document.getElementById('requirements'), {
  graph,                 // curriculum-graph.json (required)
  registry,              // evidence-gap-registry.json (optional, enables content checks)
  pathway,               // the DRAFT pathway object (required)
  published,             // the published revision, or null
  adapter,               // { saveDraft, publish, history? } (see below)
  tab: 'class',          // 'class' | 'areas' | 'skills' | 'review'
  theme: null,           // 'light' sets data-theme="light"; null follows the page
  now: () => new Date().toISOString(),   // clock used for the publish timestamp
  onChange: (pathway) => {},             // called after every accepted edit and after a publish
  facts,                 // optional prebuilt buildContentFacts(...) result
});
```

Add `<link rel="stylesheet" href="requirements.css">` after the site stylesheet. The returned object has `getPathway()`, `getPublished()`, `setPathway(p)`, `setPublished(p)`, `showTab(key)` and `destroy()`.

The component never writes to storage and never makes a request of its own. Everything it needs reaches it through `options`, and everything it saves leaves through the adapter. A browser test checks that a whole session stores nothing and talks to no other server.

## Adapters

An adapter is `{ saveDraft(pathway), publish({ pathway, acknowledged }), history?() }`. `publish` resolves `{ pathway, published, history?, message? }`.

- `createMemoryAdapter({ pathway, published, now })` keeps a draft, a published revision and a revision list in memory. It enforces the rule the shared service enforces: a policy version that was published can never be changed, a new version must be created.
- `createServiceAdapter({ request, token, entry })` makes the calls the existing pathway editor already makes, in the same order with the same tokens: `POST /pathways/teacher/<id>/draft`, then `.../preview`, then `.../publish` with the preview token. The host passes its own `request` function and the entry object it already keeps (`entry.draftVersion`). The adapter adds no endpoint and sends nothing new.

Publishing flow inside the editor: the Review tab enables Publish only when `readiness.canPublish` is true; clicking it calls `stampPublishTime` (sets `effectiveFrom` on the new requirement versions) and then `adapter.publish`.

## The four tabs

**Class defaults.** A starting-point chooser (Quick recognition, Standard practice, Complex reasoning, Custom), the two core fields, an Advanced settings disclosure, "What this means for students" (the live explanation), and "What students will see" (sample screens from the real engine). Save writes the class defaults; Remove restores skills to unconfigured after a confirmation.

**Learning areas.** A list of areas with how many skills each holds and what it currently uses. Select one or more, edit, and save; copy another area's own settings; restore selected areas to the class defaults (confirmation first); remove every individual skill setting inside the selected areas.

**Individual skills.** Filter by area, search by name, select one or many skills (including ones the filter hides, which are counted in the hint), and override only the settings you want. Each value shows its source. Restore to inherited asks first.

**Review and publish.** The defaults-and-overrides table, a plain list of what changes compared with the published version, problems grouped under plain headings, an acknowledgement for warnings, Save draft and Publish, and the published history.

Where a form has an inherited value it is shown read-only with its source ("Class defaults", "This learning area", "Set for this skill", "Older policy editor"); the "Set here" tag marks what the current level chose itself.

## Accessibility

Checked by the browser tests, not assumed:

- A real ARIA tab pattern: `role=tablist`, `tab`, `tabpanel`, only the selected tab in the tab order, and Arrow, Home and End keys move between tabs.
- Every field, button and checkbox in every tab has an accessible name; no positive `tabindex`; a visible focus ring on every control.
- Status messages are in a `role=status` polite live region; errors use `role=alert`; the live explanation is announced politely. Errors are not red-only: they say what is wrong and how to fix it.
- Percent is typed as a number beside a visible `%` mark with the instruction "Type a percentage, like 90 (not 0.90)".
- Touch and click targets are at least 44 px high at every size tested, including desktop.
- No sideways page scroll at 1280×800, 1366×768 (Chromebook), 820×1180, 390×844 and 320×640. At phone width the tabs wrap into a 2×2 grid and the review table stacks into labeled rows.
- Text contrast of at least 4.5:1 (3:1 for large text) in the dark and light themes on every tab.
- Closing a disclosure, redrawing a list or confirming an action does not lose the keyboard position.

## Theme

The styles read the site tokens (`--panel`, `--line`, `--ink`, `--muted`, `--accent`, `--gold`, `--focus`) with built-in fallbacks, so the component looks right on a page that does not define them. `theme: 'light'` (or `data-theme="light"` on any ancestor) gives a light surface with its own readable palette. All rules are under `.mreq`, so they cannot leak into the page.

## Wording rules the component follows

Labels and numbers, never raw data: no JSON, no policy ids or node ids, no `undefined` or `NaN` anywhere in any tab (a browser test reads all four tabs' text for these). Percentages are typed and shown as percentages. Skills and areas are shown by their titles.
