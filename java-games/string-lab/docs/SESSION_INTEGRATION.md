# Session integration

String Lab publishes a versioned event stream (`java-games.string-lab.v1`) from `js/session.js`. `js/shared-session-bridge.js` connects that stream to the existing Java Games tracker in `../session.js`.

The bridge buffers startup events until the shared ES module loads, then creates one shared tracker record for each `challenge_presented` event. It uses the bounded `challenge.topic` path and skill title, submits correct and incorrect outcomes once, records reveals and skips with the shared tracker methods, and annotates each record with difficulty, mode, reasoning family, skill, outcome, first-attempt status, and active milliseconds. The shared tracker’s existing active-practice timer records visible, recently active page time. No cumulative String Lab totals are added, so each challenge is counted once.

The built-in Session Summary remains available through the game’s button. The bridge also adds the standard Java Games Session Summary link to the header; both summaries use local browser storage, and the Advanced CS catalog retains its course-level summary link.

Ten bounded skills are used as topics: Concatenation, Length, Character Indexing, Substrings, Searching, String Immutability, Multi-Step String Tracing, String Algorithm Tracing, String Comparisons, and String Loop Construction. Generated text and challenge identifiers are not used as topics.
