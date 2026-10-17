# Inheritance & Polymorphism Lab

Public route: `/java-games/inheritance-polymorphism-lab/`. Static HTML/CSS/ES modules — no backend, accounts, network calls, or build step.

Students build class hierarchies, trace which method really runs, implement abstract classes, and debug inheritance mistakes. Core idea throughout: **the reference type decides what compiles; the object decides which overridden method runs.**

## Modes (Mixed Practice is the default)

| Mode | Reasoning families | Interactions |
|---|---|---|
| Class Hierarchy Builder | build the hierarchy · what an object inherits · whose code runs · is-a assignments · repair an invalid hierarchy | `extends` pickers on a live UML diagram · tap a class box · select-all · per-row verdicts · line + fix |
| Method Override Inspector | override / overload / new / error · which declaration runs (overloads, private helpers) · calls through `super` · static hiding · override-vs-overload outcome | per-method tags · click a declaration · order the calls · predict outputs |
| Polymorphism Tracer | reference vs. object · swap the object · methods that call other methods · compile time vs. run time (casts, `ClassCastException`) · constructor chaining | compiler-type + tap the running method in the object view + output · per-object predictions with a live object view · call ordering |
| Abstract Class Workshop | which class must be abstract · what must be implemented · write the implementing header · creating objects · does it compile? | click a class header · select-all · assemble a header (several answers accepted) · per-row verdicts · outcome choice |
| Inheritance Debugger | override that isn't · invalid assignment · abstract rules · subclass-only method · `super`/constructors · weaker access · wrong assumption about what runs | kind of failure + faulty line + fix · "select every fix that works" |

94 challenges in 27 families across 15 class hierarchies of different shapes.

## Files

- `index.html`, `style.css`, `script.js` — page, styles (layered on `../style.css`), UI.
- `engine.js` — selection, challenge building, assessment (no DOM).
- `java-model.js` — a small model of the Java rules used: compile-time method availability by reference type (including `private`), assignment/cast compatibility, abstract instantiation, constructor arguments, dynamic dispatch, `super`, static hiding, constructor chaining. Answers for most challenges are computed from it.
- `scenarios.js`, `bank.js`, `raw-items.js` — hierarchies and challenge content.
- `tests/` — development-only tests.

## Scoring and sessions

Uses the shared `javaGames.session.v1` tracker via `../session.js?v=active-time-v1`, one topic per mode. One scored submission per challenge; a wrong first answer is recorded and closed as revealed; Show Answer records a reveal without an attempt; Skip / New Challenge / leaving record a skip. `addSessionNavigation()` starts the shared active-practice timer, so the game keeps no timer of its own.

## Tests (from this folder)

- `node tests/iplab-tests.mjs` — generator, content-quality, rotation, and session tests (no dependencies).
- `node tests/iplab-jvm-tests.mjs` — needs JDK 17+. Checks the model against javac/java exhaustively for every hierarchy (every reference type × object × method, every cast, every constructor chain), every challenge statement, every hand-written compile error (message and line), output, crash, fix, tag, and every header combination.
- `node tests/iplab-browser-tests.mjs` — optional; Playwright + Chromium, with the repo root served at `http://localhost:8765`.
