# Java String Lab

Static Java String practice for the Advanced Computer Science section of CS Games. The page runs from GitHub Pages without a build step, backend, or external API.

Modes: Predict the Output, Find the Index, Complete the Expression, Trace String Operations, Trace String Algorithms, Compare Strings, and Complete the String Loop. Mixed Practice can draw from all seven. New families cover loop-based count/search/reversal/filter/palindrome algorithms, `equals()`/`compareTo()`/reference equality, loop bounds, substring endpoints, accumulators, and boundary bugs.

The game includes its own Session Summary and sends per-challenge results to the shared Java Games Session Summary. Use the in-game **← Advanced CS Games** link to return to the course catalog.

Run the dedicated generator, regression, diversity, session, and Java-runtime checks with:

```sh
node java-games/string-lab/tests/generator.test.cjs
```

The generator remains DOM-free. Independent integrations can request a complete structured challenge with `StringLab.PracticeFamilies.build(familyId, seed, difficulty)` after loading the same scripts as the game. The returned challenge contains its mode, family, skill, prompt, code, answer options, correctness index, explanation, seed, and normalized signatures.
