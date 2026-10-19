# Work integration notes

String Lab is published at `/java-games/string-lab/` and registered in the authoritative Advanced CS catalog at `cs-games/catalog.js`. The card uses the requested description and topics. The in-game return link points to `../../cs-games/advanced/` and is labeled **← Advanced CS Games**.

The application retains its four practice modes, procedural generator, Java-semantics evaluator, difficulty validation, misconception distractors, and its own Session Summary. No build step, backend, or external API is required.

`js/shared-session-bridge.js` integrates the event stream with the existing Java Games tracker. Its mapping and counting behavior are documented in `SESSION_INTEGRATION.md`. Test sources and browser artifacts are kept out of the published game directory.
