# Algorithm Dance Lab — implementation and review status

Date: 2026-10-24. Tracker: G-119. Implementation complete; classroom review pending.

## Built

- Original articulated low-poly humanoid, local MIT-licensed Three.js r170, paired gold/right and teal/left limbs, head and torso controls, simple stage, responsive camera. No model or texture downloads.
- Shared AST for block editing, AP CSP pseudocode, bounded interpretation and source-mapped movement commands. The renderer has no scoring authority. Invalid/wrong instructions are not corrected before execution.
- Accessible tap/keyboard insertion, destination selection, reorder/remove controls, configurable parameters/arguments, procedure construction, nested repeats, synchronized instruction/call highlighting.
- Five authored Hokey Pokey stages, all ten ordered limb/side verses, separate shake/turn helper before combined abstraction, behavior + structure validation, progressive diagnostic hints, worksheet conceptual counts 50/74/29. No unlimited generator.
- Run/pause/resume/step/reset/replay; full validated routine presentation; speed and reduced-motion controls; textual trace. Target and student use identical command definitions.
- Dance Studio uses the same components. Browser-local save/reload, JSON export/import, pseudocode copy, original choreography, presentation mode. Silent by design; optional music is not included.
- Shared CSP assessment integration plus daily stage progress, first-check results, validation attempts, successful algorithms and active-time summary. Runs and Steps do not record incorrect submissions. No identifying information collected.
- CSP index and consolidated catalog integration; path-scoped CI workflow.

## Verification completed before publication

| Suite | Result |
| --- | --- |
| Interpreter / authored lesson | 486 assertions passed; independent 50-beat oracle, every missing/extra/incorrect movement position, parameter/structure checks, recursion and empty-loop limits |
| Joint motion / playback | 584 assertions passed; all supported part/side targets distinct, opposite limbs unaffected, interpolation, pause/resume/step/replay, 100 rapid Run/Reset cycles |
| Daily session / active time | 26 assertions passed, also under America/Los_Angeles |
| Full editor / lesson / Studio DOM | 69 assertions passed; all five stages, argument repair, verified-performance snapshot, nested repeat, imports, saves, day rollover |
| New total | 1,165 assertions passed |
| Existing CSP regression | Full `npm test --prefix csp-games` passed, including new suites |
| Consolidated catalog | Passed; existing Java/CSP navigation and routes preserved |
| Source hygiene | `git diff --check` passed |

Real-browser local QA completed all five lesson stages by constructing blocks and procedure calls, validating the 50-movement routine and worksheet counts. Verified 3D robot rendering, stepping/highlights, wrong-part feedback, parameter construction, Studio repeats, save/reload and playback. A 390px-wide iframe (375px content area after the scrollbar) had no horizontal overflow; tested block editing, Check, panel jumps and a deliberately wrong left-hand movement.

The cloud browser disables WebGL. The same Three.js mesh rig therefore rendered through the included Canvas2D 3D triangle projector. A final SVG movement diagram and textual trace remain available if both 3D rendering paths fail. Native GPU rendering/context restoration and physical Chromebook/touchscreen performance are **not** claimed as tested.

## Deployment

Target: https://davisjm4.github.io/csp-games/algorithm-dance-lab/

Implementation commit: [8a2be5dcbcb867997761e062a829f591856535c9](https://github.com/davisjm4/davisjm4.github.io/commit/8a2be5dcbcb867997761e062a829f591856535c9). The remote Git tree was verified identical to the tested local tree (f894032efa7e481d987c7d4064e55747b925adda).

- Pages deployment [40136591449](https://github.com/davisjm4/davisjm4.github.io/actions/runs/40136591449): success.
- Algorithm Dance Lab CI [40136592508](https://github.com/davisjm4/davisjm4.github.io/actions/runs/40136592508): success.
- Existing Create Task and RGB CI workflows (40136592360 and 40136592380): success.
- Published application independently opened in Chrome. Local Three.js asset and the original 3D robot loaded; target playback, lesson Check Algorithm, and student execution worked.
- Imported a complete parameterized routine through the Studio UI, saved it, cleared the workspace, reloaded it, and played it continuously through the final 50/50 turn. The runtime reported routine completion without manual advancement. This used the actual imported AST and calls.
- Both live CSP index and consolidated CS Games launch routes verified. Published 390px responsive frame verified (375px content/scroll width, no horizontal overflow).
- Browser console errors observed were extension metadata errors; no application errors were observed. WebGL remains disabled in the cloud browser, so native GPU rendering and physical-device performance remain unverified. Software playback was functional but had low animation cadence in this cloud environment.

Tracker G-119 was updated and read back in Master Inventory A57:L57, with status **Published — verified integration**, classroom review pending. Release History A10:G10 records the release, commit, tests, deployment and verification caveats.

## Remaining review and expansion

- Teacher/classroom review of instructional progression, clarity of stylized hip/elbow/knee motions, target comparison and code-count assumptions.
- Physical Chromebook and touchscreen checks; native WebGL2 and context-loss/restoration testing.
- Optional original instrumental rhythm remains outside the silent first release.
- Only Hokey Pokey is registered/playable. Head/Shoulders/Knees/Toes needs touch-part commands; YMCA needs pose commands; Cha Cha Slide needs translations; Freeze Dance/Simon Says needs Boolean/selection AST, editor, interpreter and validation support. Existing song registration metadata allows expansion without duplicating the programming system.
