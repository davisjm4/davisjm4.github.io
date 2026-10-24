# Algorithm Dance Lab

A buildless GitHub Pages game. Open `index.html` through an HTTP server; ES modules do not run directly from file://. No runtime CDN, backend, account, API key, telemetry, or music dependency.

## Modules

| File | Responsibility |
| --- | --- |
| engine.js | Validated AST; bounded interpreter; parameter binding; source-mapped movement trace; AP CSP pseudocode; portable JSON |
| editor.js | Accessible palette, insertion destinations, reorder/remove/configure controls, nested repeats and procedure bodies |
| lessons.js | Five authored Hokey Pokey stages, reference choreography, behavior and abstraction rules; song registration interface |
| motion.js | Pure absolute joint poses and animation keyframes for each movement |
| player.js | Deterministic pause/resume/step/reset/replay clock, independent of rendering |
| renderer.js | Original articulated Three.js robot, local assets, responsive stage, context handling, resource disposal |
| software-renderer.js | Canvas2D projection of the **same 3D mesh rig** when WebGL2 is disabled |
| session.js | Daily stage checks, first-check success, active time, completion, shared CSP assessment integration |
| app.js / main.js | Lesson and Studio orchestration, highlights, progress, save/export/import, presentation |

The AST is the only program source. Pseudocode and execution derive from it. The renderer consumes commands and poses, never scoring decisions. Wrong movements and arguments are executed unchanged. Source IDs and call/loop stacks highlight the movement and its enclosing constructs.

The robot uses a transform hierarchy (head, torso, paired shoulders, elbows, hands, hips, knees, feet). Each movement has distinct joint targets. Three.js r170 is bundled as a 692 KB minified ES module under its MIT license; no 3D model downloads or textures. Original robot/game source is MIT licensed. Low polygon geometry, shared materials, no shadows, no post-processing, capped device pixel ratio, event-driven static rendering, and paused hidden-tab playback keep the scene light. The software path is an accessibility fallback; WebGL2 remains the preferred renderer.

## Lesson

1. Construct the five right-foot moves without a revealed solution.
2. Add the left-foot verse and compare the two student sequences.
3. Build `dance(part, side)` for in/out/in, plus `hokey_pokey()` for shake/turn. Definitions begin empty. `shake()` uses the most recently moved limb; explicit `shake(part, side)` is also available.
4. Supply all ten ordered pairs using calls to the two procedures. Validate all 50 observable moves and the abstractions. Unlock a continuous, previously validated full performance.
5. Compare conceptual worksheet line counts (50 / 74 / 29), retain the split abstraction or combine all five moves into one parameterized procedure. Optional iteration experiment leads into Studio.

Headers/braces in the displayed pseudocode are **not** claimed to match the worksheet conceptual counts. The separate-function worksheet count is 10×5 definition lines + 10 calls + 4 helper definition lines + 10 helper calls = 74. The parameterized count is 5 + 10 + 4 + 10 = 29. All versions still execute 50 movement commands.

Paired limbs use LEFT / RIGHT; HEAD uses CENTER. Parts include FOOT, HAND, KNEE, ELBOW, HIP, SHOULDER and HEAD. Additional Studio motions are clap, bow, nod, jump and wait. Hips/shoulders use consistent stylized tilts. Body orientation returns after a full 360° turn; limbs reset on each turn. Text labels and execution trace accompany motion. Reduced motion replaces continuous movement with discrete key poses. The release is silent (optional music was not required).

## Tests

From the repository root:

```
npm ci --ignore-scripts --prefix csp-games
npm run test:dance --prefix csp-games
npm test --prefix csp-games
```

The four new suites cover independent choreography oracles, abstraction counterexamples, bounded empty loops and recursion, source synchronization, all part/side poses, repeated playback/reset, assessment, the complete lesson and Studio controls. They do not certify physical hardware performance or GPU context restoration. `tests/browser-harness.html` embeds the real application in a 390px-wide frame for responsive QA; it is not physical touchscreen testing.

Runtime limits: 400 blocks, nesting depth 12, call depth 16, 800 emitted movements, 6,000 evaluated/loop work units, repeat counts 0–32, 100 KB import. No evaluation of imported source text.

## Expansion contract

Register a song with title, supportedMovements, referenceChoreography, stages, learningObjectives, validationRules and completionCriteria. Add lesson-specific structural rules and independent reference oracles. The current release registers only Hokey Pokey. No incomplete future songs appear in student navigation.

Recommended order: Head/Shoulders/Knees/Toes (add touch-part actions); YMCA (add named pose commands); Cha Cha Slide (add directional translation); Freeze Dance/Simon Says (add Boolean/selection AST blocks, renderer-independent semantics, editor and validator tests). No unlimited challenge generator is included.
