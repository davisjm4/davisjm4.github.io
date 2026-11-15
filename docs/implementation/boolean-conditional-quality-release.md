# Boolean & Conditional Lab quality release

The four-commit Claude delivery ends at `44074afd049d0064cd83d8938c0bacc587d884c8`, based on `2bd052725aa2280fa4480063e34d7f29140e0096`. Applying the complete mail patch at its original base produced the same tree as fetching the bundle. The integration starts at `fb9413aaa47e0a3ca69b17ed80052391eeab8ea7`, after the Loop Lab and Math Lab follow-ups. The only overlapping file was the generated pathway gap registry. Regeneration on the integrated tree matched the current registry and coverage matrix.

## Integrated behavior

Conditions and Construct offer more varied plausible wrong expressions. Identify Beginner checks simple comparisons and ranges, Intermediate combines conditions with flags and denial, and Advanced requires tracing combined negations, compound conditions, or exceptions to a rule. Intermediate and Advanced Evaluate avoid questions where the first operand makes the rest irrelevant. Beginner and the purposeful Short mode retain deliberate short-circuit examples. Truth table count choices have more numerical variety, and always-true/false sampling avoids retry bias.

The continuation models wrong branch boundaries, branch order or outcomes in equivalent chains, fall-through misconceptions in Switch/If, and incorrect side-effect counts in Short. Wrong feedback is attached to the exact selected choice. The student activity and shared Java app request `bool-v6`, and the revised dependency graph uses that version through the generators. Range Explorer and shared styles retain their versions.

## Reproduction

The integration reran the same held-out methods against the baseline and release. The first two rows use 2,000 questions per cell and base seed `987654`. The four continuation families use base seed `77001731`. The strongest family cue includes the accuracy attainable by eliminating a choice selected by a very weak heuristic. Run `tests/audit/choice-shortcuts.mjs` or `tests/audit/family-shortcuts.mjs` from the lab. Use command help in the script headers for sample options.

| Cell or family | Held-out count before / after | Before | After |
| --- | ---: | ---: | ---: |
| Conditions Beginner, most similar | 2,000 / 2,000 | 100.0% | 24.7% |
| Construct Beginner, most similar | 2,000 / 2,000 | 83.2% | 26.3% |
| Coverage Fix Boundary | 4,500 / 4,500 | 100.0% | 46.8% |
| Coverage Equivalent Chain | 4,500 / 4,500 | 91.5% | 30.9% |
| Switch/If Missing Break Fix | 7,500 / 7,500 | 100.0% | 31.9% |
| Short Counter | 603 / 653 | 96.3% | 33.2% |

An independent seed block at `12547399` showed equivalent-chain similarity at 29.1% with the repair and 39.0% with joint balancing disabled. On the same block missing-break prompt overlap was 32.5% with the repair and 39.0% with balancing disabled. Each measurement had 4,500 questions. The regular suite now samples 1,200 draws per family at this seed block and checks both cues. Reverting the two family generators in a disposable copy triggers a similarity assertion. Disabling joint balancing also triggers a similarity assertion, with all imports present.

The 309,995-byte JSON fixture freezes 150 original choice sets per measured family or mode. It remains in version control so CI checks the detection method on the actual prior behavior without fetching or executing an older checkout. The fixture is test-only, includes no student data, and has a documented base, seed, and generator. The existing Trace Repair workflow runs the focused Boolean quality regression. The larger JVM and Chromium release surveys can run separately.

## Verification scope

- Independent Java checks cover displayed code, displayed correction options, integer boundary and fall-through behavior, and exact keyed results. Truth table checks use an independent evaluator. Determinism, uniqueness, explanation facts and difficulty use the generator regression suites.
- The Chromium release script exercises all ten modes at all three levels, Mixed Practice, both screen widths, scoring, keyboard selection, loaded-assets offline play, refresh, Range Explorer, and the four continued feedback families plus both extra Short tags. The script compares the feedback shown to the selected option and checks that correct answers omit the misconception note. It supports local and production runs.
- CSG-UX-03 governs feedback. CSG-MAS-01 and CSG-MAS-04 govern first attempts and credit. Historical records keep their stored correctness, activity, mode, family, difficulty, attempt and question instance identifier. They lack the displayed question and a recoverable generator seed/revision pair, so exact item replay is unavailable from historical records. Question generation by seed is version-local. Treat the saved scored event as the historical record, and treat newly generated examples as new questions. The activity has no historical question replay path. This release makes no migration, changes no eligibility or thresholds, and leaves teacher-reviewed mastery and assignment authorization in place.

## Remaining instructional limits

Fix Boundary still keys the minimal edit often enough that a shortest-choice tactic scores 43.9% and wording overlap scores 46.8% on the original held-out block. A defect-demonstrating input question could assess the same concept without this cue. The intentional two-option formats retain their 50% guessing baseline. Intermediate truth-table counts still yield only the middle numerical ranks. Those observations can inform later format and policy work.

GitHub Actions results and the production deployment and smoke results are recorded on the integration PR.
