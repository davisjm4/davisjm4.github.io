# Algorithm Dance Lab

Static GitHub Pages visual programming game. No backend, accounts, runtime CDN, telemetry, API keys, or model downloads. Serve over HTTP to use ES modules. The original low-poly robot and game source are MIT licensed; bundled Three.js r170 and fflate 0.8.2 retain their MIT notices.

## Architecture

| Module | Responsibility |
| --- | --- |
| engine.js / expressions.js | One validated AST; bounded interpreter, scopes, parameters, input values, expressions, lists, source-mapped timed commands and AP CSP pseudocode |
| editor.js | Tap/keyboard palette, parameter/value builders, nested bodies, reorder/remove/relocate and synchronized code |
| lessons.js / expansion-lessons.js | Authored reference choreography, stage scaffolds, behavioral and structural validation |
| motion.js | Pure absolute poses; analytic arm reach for touch targets; orientation-relative translations |
| renderer.js / software-renderer.js | Original articulated Three.js mesh rig, local assets, GPU rendering or Canvas2D projection of the same rig, final SVG/text fallback |
| player.js | Absolute beat transport, independent of rendered frame cadence; pause/resume/step/reset/replay |
| audio.js | Optional browser synthesis, metronome, local recording playback; shared audio/media clock |
| project.js | Versioned project envelope, legacy migration/backups, bounded JSON/ZIP, IndexedDB recording store |
| studio-app.js / main.js | Current lesson/Studio controller, runtime inputs, composer, capture views, files and transport |
| session.js | Anonymous daily progress, first checks, attempts, successful programs, active time; shared CSP session integration |
| app.js | Retained original-controller compatibility coverage using tests/legacy-ui.html |

Pseudocode and execution derive from the same AST. The renderer never scores the program. Incorrect instructions execute unchanged. Imported text is parsed as data, never evaluated as JavaScript. The editor provides values, references, inputs, operators and list expressions without requiring typed program syntax.

Variables use assignment; procedures have up to six student-named parameters and local scalar scope. Lists are one-based, reference-valued, and support APPEND/INSERT/REMOVE/index assignment, LENGTH, index reads and FOR EACH. Mutating a list while it is traversed is rejected, including nested traversals. Parallel tracks cannot mutate shared input lists. IF/ELSE requires Boolean expressions. Runtime inputs are captured at compilation; choosing a Song input does not generate choreography or decisions.

## Activities and movement

- **Hokey Pokey:** original five stages and ten ordered part/side verses. Students first build in/out/in and a separate shake/turn helper, then generalize. Behavioral equivalence and relevant structure both matter. Worksheet counts remain 50 / 74 / 29 conceptual lines, explicitly distinguished from displayed headers/braces and executed movement counts.
- **Head, Shoulders, Knees & Toes:** four stages: sequence, repeat, list traversal, and a student-built list/count-parameter procedure. The final target is the four touches twice (eight beats).
- **Cha-Cha Movement Lab:** one hop, repeated two hops, count-parameter claps, and an original authored 32-beat practice arrangement. This is not a commercial song recording or a claim to reproduce its complete choreography.
- **Original Project:** empty creative workspace using the same editor/interpreter/robot. Student-created input handling, selection, procedures, loops, lists, original music and choreography. No automatic Create task solution, AP scoring, evidence selection or submission certification.

Movement library: original in/out/shake for FOOT/HAND/KNEE/ELBOW/HIP/SHOULDER and HEAD/CENTER, turnAround, clap, bow, nod, wait; new touch(HEAD/SHOULDERS/KNEES/TOES), hop (jump alias), stomp(LEFT/RIGHT), slide(LEFT/RIGHT), directional quarter-turns, crissCross, chaCha(LEFT/RIGHT), charlieBrown. Left/right follow the robot's orientation. Turns preserve world position. Shoulders use opposite-hand reaches; knee/toe touches crouch. Stylized complex dance steps have consistent distinct poses.

The robot has head, waist, pelvis, shoulders/elbows/hands, hips/knees/feet. Geometry is low polygon, materials shared, no textures/shadows/postprocessing, capped pixel ratio, hidden-page pause and resource disposal. Reduced motion samples key poses. The cloud QA environment disables WebGL; physical Chromebook/GPU performance needs classroom review.

## Beat and music behavior

BPM 40–200 (default 120); one beat = 60 / BPM seconds. Pause to change tempo, preserving the beat position. Dance and optional Music tracks start together; the longer track determines performance duration. Single-step advances to the next command endpoint silently and preserves the concurrent dance pose. Animation samples absolute audio/media/monotonic time; dropped frames do not slow the program clock. Blocking instructions run in sequence within each track. Music tracks accept notes/rests/control logic and wait, not robot movements.

Sound is off until explicitly enabled and Run/Preview is pressed. Original composer: C3–C6 including sharps, rest, durations 0.25/0.5/1/2/4 beats, sine/triangle/filtered square, volume, piano buttons, 16-beat grid, editable/reorderable event list. Music blocks and composer are the same AST track. Programmed music logic is preserved unless explicitly replaced with an empty melody.

Local MP3/WAV/OGG support depends on browser codecs. Maximum 25 MiB / five minutes. Files are decoded and retained locally, never uploaded. Set the recording's BPM and start offset manually. Recordings play at their original rate; no automatic beat detection, time stretching or pitch adjustment. Short files produce a clear error instead of silently looping. Optional metronome shares the transport. Scheduling diagnostics measure scheduling lateness, not physical speaker/display latency.

JSON stores code, notes, inputs, settings and recording metadata; reselect a recording on another device. App-exported ZIP optionally embeds the recording after explicit selection. For bounded safe import, ZIPs must use the application's stored/uncompressed project.json and optional audio.bin format; encrypted/compressed/ZIP64/path-traversal/extra-file archives are rejected. Local saves migrate legacy workspaces with backups. Storage/decode/import failures preserve the current program and report an error.

## Limits and verification

400 blocks, nesting 12, call depth 16, 800 timed events, 6,000 work units, repeats 0–32, list length 128, expressions depth 12, 128 music events per track, 250 KB project JSON, performance at most five minutes. Loops and procedures are bounded even when they emit no movement.

Run from repository root:

```
npm ci --ignore-scripts --prefix csp-games
npm run test:dance --prefix csp-games
npm test --prefix csp-games
node cs-games/catalog-tests.mjs
```

Eight Dance Lab suites contain 1,821 assertions (486 interpreter/original lesson, 584 legacy joint/player, 26 session, 69 legacy UI, 231 expansion language/lesson, 296 mesh/contact/timing, 64 project/audio, 65 expanded UI). Independent tests vary list lengths, arguments, input choices and BPM; verify all 13 stages, an exact 32-beat oracle, actual Three.js forward-kinematics hand contacts, dropped frames, repeated resets, concurrent stepping, migration and archive rejection. tests/audio-browser.html exercises real browser PCM synthesis and a generated original WAV. tests/browser-harness.html embeds the real app at 390px; it does not simulate physical touch hardware.

## Extension contract

LESSONS registers title, supportedMovements, referenceChoreography, stages, learningObjectives, validationRules and completionCriteria. Add authored stages and independent behavioral/structure tests without duplicating the interpreter/editor/renderer. Recommended next activities: YMCA (named pose blocks) and Freeze Dance/Simon Says (use existing selection/Boolean support with new authored rules). No unlimited compositional challenge generator is included.

## Focused workspaces and Live mode (usability-v3)

Learn/Create/Live navigation now separates tasks. All lesson stages can be selected freely; progress still records successful checks. Build/Controls/Music/Code tools occupy the same workspace beside the stage. Project files and progress use a separate drawer. Blocks are categorized. New advanced-activity movements default to one beat; advanced timing is opt-in. Existing saved durations and authored reference routines are preserved. Piano key clicks audition a short note immediately; melody preview explicitly enables sound and reports unavailable audio.

Controls provide choice/number/switch/text creation, value editing, naming and a Use in program action that inserts a real readInput assignment into the same AST. Live adds Note, Beat and Event controls without generating response logic. Students construct their own main routine with decisions, procedures, lists and iteration.

Live inputs: on-screen touch pads or A/S/D/F/G/H/J/K keys play C4/D4/E4/F4/G4/A4/B4/C5. Note press, note release, or each beat can run the student's main routine. Optional next-beat timing; a bounded newest-pending-event buffer prevents long backlogs. Each response executes afresh with captured inputs; scalar variables do not persist between events. Responses are bounded to 32 beats, sessions to five minutes, with stop on blur/hidden. Keyboard shortcuts ignore editing fields and key repeat. The composer can feed known note events; local recordings use manually set BPM/offset and Tap tempo, not automatic onset detection. Physical audio/display latency and physical mobile multitouch remain classroom review items.
