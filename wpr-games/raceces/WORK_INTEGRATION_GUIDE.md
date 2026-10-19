# Work integration guide: publishing under `/raceces-games/`

Goal: publish this site at `https://davisjm4.github.io/raceces-games/` without touching Java Games, CSP Games, CS Games, or Workplace Readiness Games.

This package does not modify GitHub and was not deployed. These steps are for the person or agent (for example ChatGPT Work) who publishes it.

## What the site needs

Everything uses relative paths (`css/style.css`, `js/...`), so it works from any subfolder. The runtime files are:

```
raceces-games/index.html
raceces-games/css/style.css
raceces-games/js/**          (engine, ui, and data/content-bundle.js)
```

`content/`, `tests/`, `tools/`, `docs`, `package.json`, and the `.md` files are optional for hosting. Keep them if the repository should carry the source and tests; leave out `node_modules` if present.

## Steps

1. **Unzip** `raceces-writing-games.zip`. It contains one folder, `raceces-games/`.
2. **Clone or open** the repository `davisjm4/davisjm4.github.io` and make sure the working tree is clean (`git status` shows nothing).
3. **Check that the target does not exist**: `ls raceces-games` in the repository root must fail. If it exists, stop and ask.
4. **Copy the folder** `raceces-games/` into the repository root, next to the other game folders. Copy nothing else, and do not edit any existing file (no landing page, no navigation, no shared CSS).
5. **Confirm the change is isolated**:
   ```
   git add raceces-games
   git status --short           # every line must start with "A  raceces-games/"
   git diff --cached --name-only | grep -v '^raceces-games/'   # must print nothing
   ```
   If anything outside `raceces-games/` appears, unstage it.
6. **Test locally** before committing: from the repository root run `python3 -m http.server 8080` and open `http://localhost:8080/raceces-games/`. Check that the page loads, a challenge appears in each mode, Check Answer gives feedback, and Session Summary opens.
7. **Commit and push** on a branch or directly, following the repository's normal practice, with a message such as `Add RACECES Writing Games at /raceces-games/`.
8. **Wait for GitHub Pages** to rebuild (usually under two minutes), then verify the live site (below).

## Verify after publishing

| Check | Expected |
|---|---|
| `https://davisjm4.github.io/raceces-games/` | The game loads with Mixed Practice selected |
| Browser console | No errors; no requests to other domains |
| Each mode | A task appears; Check Answer gives feedback; Next Challenge works |
| Session Summary | Shows the results just entered |
| Reload | The session persists |
| Reset Session | Asks for confirmation, then clears |
| `/java-games/`, CS Games, CSP Games, `/workplace-readiness-games/` (or its published path) | Unchanged and still loading |

Also confirm that session data from the other games is unaffected: this site stores only under keys that begin with `raceces-writing-games:v1:` (open DevTools → Application → Local Storage for `davisjm4.github.io` and look for those keys). It never reads or writes any other key.

## Not yet verified

The site has been tested from a local server at the site root and in emulated viewports (see `TEST_RESULTS.md`). It has **not** been loaded from the live GitHub Pages subpath, in Safari or Firefox, on a physical Chromebook or phone, or with a screen reader. Run steps 6–8 and the table above, and try it on a real Chromebook before sharing it with students.

## Rollback

Delete the `raceces-games/` folder and push, or `git revert` the commit. Nothing else depends on it.

## Optional later changes (not part of this task)

Linking the game from a landing page or adding it to a game index would modify an existing page and is deliberately not done here.

## Maintaining content

Edit `content/topics/*.json`, then run `npm install` (once), `npm run build`, and `npm test`. The build regenerates `js/data/content-bundle.js`, and the tests regenerate the reports. Never edit the bundle directly. Copy the updated `raceces-games/` folder over the old one in the repository.
