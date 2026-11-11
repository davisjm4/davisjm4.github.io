# Screenshots

The twelve screenshots are in the package's `screenshots/` folder (they are not committed to the branch, to keep it small). They are produced by the browser test against the demo page, at 2x pixel density, and regenerate with:

```sh
REQ_BROWSER_DIR=/tmp/req-browser node cs-games/teacher/requirements/requirements-browser-tests.cjs
```

All use synthetic practice classes built from the Advanced CS curriculum graph. No real class, student or requirement appears, and nothing in them was saved or published.

| File | Viewport | What it shows |
| --- | --- | --- |
| `desktop-1-class-defaults.png` | 1280×800 | Class defaults tab with Standard practice chosen: the two core fields with their "Set here" tags, the Advanced disclosure, "What this means for students" (30 questions at 90%, 27 correct, up to 3 mistakes, may answer more, skipped counts as incorrect) and the engine-driven student preview |
| `desktop-2-learning-areas.png` | 1280×800 | Learning areas tab: the area list with skill counts and what each uses (Math Lab has its own setting), and Array Lab selected after being restored to the class defaults, with each value's source shown |
| `desktop-3-individual-skill.png` | 1280×800 | Individual skills tab: one skill overriding only its accuracy, each value labeled with where it comes from |
| `desktop-4-impossible-requirement.png` | 1280×800 | A requirement that cannot be met (a difficulty level the skill does not offer): the red "This can't be saved because it can't be met." alert, nothing saved |
| `desktop-5-draft-only.png` | 1280×800 | The Review tab for a requirement that more content could satisfy (11 kinds of questions asked where 10 exist): saved as a draft, listed under "Can be saved as a draft, not published", with Publish unavailable |
| `desktop-6-review-and-publish.png` | 1280×800 | Review and publish after a first publish: the defaults-and-overrides table, what changes compared with the published version (class defaults 30 changed to 40 questions at 90%), the versions that will be created, and the publish controls |
| `desktop-7-light-theme.png` | 1280×800 | The same Class defaults tab in the light theme |
| `chromebook-1-class-defaults.png` | 1366×768 | Class defaults on a Chromebook-sized screen, with the "Class defaults saved to the draft. 123 skills changed." confirmation |
| `chromebook-2-skills.png` | 1366×768 | Individual skills on a Chromebook-sized screen |
| `mobile-1-class-defaults.png` | 390×844 | Class defaults on a phone, with the tabs in a 2×2 grid |
| `mobile-2-learning-areas.png` | 390×844 | Learning areas on a phone |
| `mobile-3-review.png` | 390×844 | The review table stacked into labeled rows on a phone |

`results.json` in the same folder lists every browser check and its result (39 of 39 pass).

What to look for: the percentage is typed as `90` beside a visible `%`; each value says whether it came from the class, an area, or the skill; the explanation sentences name the engine's counts; and no identifier, JSON or raw fraction appears anywhere.
