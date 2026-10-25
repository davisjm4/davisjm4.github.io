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

---

## Beat, music and programming expansion — 2026-10-24

This section supersedes the silent-release/future-song limitations above. Implementation complete; classroom review pending.

### Implemented

- Original articulated robot retained; new analytic head/shoulder/knee/toe reaches, orientation-relative slides, left/right stomps and quarter turns, hop/jump, criss-cross, cha-cha and Charlie Brown. All are driven by the student's executed commands, including wrong commands.
- One AST expanded with assignment, runtime inputs, strict Boolean selection/operators, named procedure parameters, dynamic repeats, one-based lists, list mutation and FOR EACH. Bounds and nested-list traversal locks prevent runaway execution. No generated student Create task solution or AP certification.
- All five Hokey stages preserved. Added four Head/Shoulders stages and four Cha-Cha stages, including list/count abstractions, argument counterexamples and an independently specified 32-beat final arrangement.
- BPM 40–200; absolute shared beat transport; concurrent Dance/Music tracks; audio/media clock when sound is enabled, monotonic clock when silent. Pause/change BPM/resume, endpoint step, reset and replay. Dropped frames catch up instead of extending beat durations.
- Original note composer (C3–C6, sharps/rests, five note lengths, three synthesized instruments), local recording attachment with BPM/offset and original-rate playback, muted-by-default sound, metronome, scheduling diagnostics. No commercial recordings bundled.
- Version 2 project JSON, local save/migration/backups, IndexedDB media, optional audio-inclusive portable ZIP, safe bounded import, text/block capture views. Student code and attribution remain independently authored.
- CSP index and consolidated CSP catalog updated. Versioned module URLs prevent old/new playback modules from mixing in returning browsers.

### Validation

| Suite | Passing assertions |
| --- | ---: |
| Original interpreter/lesson | 486 |
| Original motion/player | 584 |
| Daily session | 26 |
| Original-controller compatibility UI | 69 |
| New language/authored lessons | 231 |
| New Three.js mesh contact/direction/absolute timing | 296 |
| Project migration/archive/audio scheduler | 64 |
| Expanded controller/editor/composer/all 13 stages | 65 |
| **Total** | **1,821** |

Full CSP `npm test` passed. Consolidated catalog and America/Los_Angeles session checks passed. No physical Chromebook, touchscreen, native GPU or speaker-latency certification is claimed.

Local real-browser QA built and checked the first Head/Shoulders sequence; built one-hop and repeated two-hop stages; imported and checked a student procedure for count-based claps; checked and ran all 18 events in the complete 32-beat Cha arrangement continuously. The final UI read Beat 32, routine finished, 32 scheduled metronome clicks, maximum scheduling lateness 2.00 ms, and zero final translation/yaw. That lateness is not physical audio/output latency.

Real browser OfflineAudioContext rendered production scheduler output: A4 ~440 Hz, C5 ~524 Hz (zero-crossing measurement), nonzero note RMS and zero RMS during the rest; scheduled onset errors 2 ms and 0 ms. Production local-audio decoding accepted a generated original 10-second WAV (160,044 bytes); the actual root file picker attached it locally. Root recording playback was initiated but its final completion was not captured before the browser session ended; automated media clock/seek/pause/error tests passed. MP3/OGG and physical speaker quality remain browser/device review items.

Responsive browser frame: 390px outer / 375px content width, advanced assignment block plus parallel A4 composer event, document scroll width 375px (no page-wide overflow). WebGL-disabled cloud browser displayed the same mesh robot through software rendering. Hardware cadence and context restoration remain unverified.

### Release and remaining review

Expansion commit/deployment and independent live checks are recorded in the release record and tracker after publication. The source report accompanies that commit; no successful local test alone is treated as deployment proof.

Classroom review: lesson clarity, stylized contact/dance readability, original-project guidance, physical Chromebook/touch use, native WebGL/context restoration, school-browser audio codecs and audio/display latency. No automatic music beat detection/time stretching, microphone recorder, polyphonic score editor or AP submission certification is included. Future YMCA needs named poses; Freeze/Simon can reuse existing Boolean/selection blocks plus authored challenges. Full commercial-song choreography is outside the authored practice arrangements.

## Usability restructuring and Live mode — 2026-10-24

- Unlocked all lesson stages and independent Next navigation. Daily completion statistics no longer control access.
- Learn/Create/Live shell; categorized palette; Build/Controls/Music/Code views alongside persistent stage; project/progress drawer; mobile stacked stage and active tool.
- Input cards with type shortcuts and Use in program (actual readInput assignment). Editable student values remain authoritative.
- New movement blocks default to one beat, with advanced timing hidden until requested. Authored references and existing saved program timings are retained.
- Piano audition directly creates/resumes audio from the key gesture; Preview explicitly enables sound. Test sound and actionable failure feedback are available.
- Live executes the student's same AST on selected note/release/beat inputs. Touch/keyboard instrument, known composer-note input, manual-BPM recording beat clock, Tap tempo, immediate/next-beat response and newest-only pending buffer. No automatic music beat detector. No generated student response algorithm. Each event reinitializes variables; 32-beat response limit and five-minute session limit.
- Existing 1,821 assertions plus 30 new navigation/input/timing/live-runner/workspace assertions pass (1,851 total). Browser-local piano audition returned Sound ready, touch-pad C4 produced a Note input and highlighted the actual student block. Browser software 3D rendering used; physical audio output/hardware certification remains pending.
