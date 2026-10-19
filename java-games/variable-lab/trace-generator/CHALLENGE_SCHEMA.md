# CHALLENGE_SCHEMA

> **Compatibility notice.** The existing Variable Lab challenge schema could not be inspected while building this package (see `WORK_INTEGRATION_GUIDE.md`, "What was and was not inspected"). This document therefore specifies the generator's **native** schema (`schemaVersion: "1.0"`). `src/adapter.js` provides `toVariableLabChallenge()` as a configurable adapter whose default field names are an *assumption*, not a description of the real site. Work should map native fields to the real ones.

## API

```js
import { generateTraceChallenge } from './src/index.js';      // ES module, no dependencies

const challenge = generateTraceChallenge({
  difficulty: 'advanced',        // 'beginner' | 'intermediate' | 'advanced'   (default 'beginner')
  seed: 12345,                   // uint32; same seed + options + history => identical challenge
  recentSignatures: [],          // bounded recent history (see below)
});
```

A pre-built browser bundle is in `dist/` (`variable-trace-generator.iife.js` exposes `window.VariableTraceGenerator`; `variable-trace-generator.esm.js` is an ES module).

### Options

| Option | Type | Meaning |
|---|---|---|
| `difficulty` | string | `beginner`, `intermediate`, `advanced`. Throws on anything else. |
| `seed` | integer | Seeds all randomness. If omitted, `Math.random()` supplies one (the only use of it). The seed is returned in the challenge. |
| `recentSignatures` | array | Recent history, oldest first, newest last. Each entry may be `{exact, semantic, pattern, families}`, the array form `[exact, semantic, pattern, familyCodes]` produced by `RecentHistory#toJSON`, or a bare string (matched against both exact and semantic hashes). |
| `history` | `RecentHistory` | Alternative to `recentSignatures`; takes precedence. Recommended in a running session (see below). |
| `historyOptions` | object | Override windows/caps: `{exactWindow: 200, semanticWindow: {beginner, intermediate, advanced}, patternWindow, patternCap, maxEntries}`. |
| `type` | string | Force the primary variable type: `int`, `double`, `boolean`, `char`, `String`. |
| `format` | string | Force the question format: `output` (predict the output), `final` (final variable value), `checkpoint` (intermediate checkpoint). |
| `family` / `requireFamilies` | string / string[] | Require reasoning families (e.g. `'INTEGER_DIVISION'`). Throws if none can be produced within the attempt budget. |
| `maxAttempts` | integer | Default 120. |

### Other exports

| Export | Purpose |
|---|---|
| `generateTraceBatch(count, opts)` | Generates several challenges and maintains the history for you (for tests/demos). |
| `RecentHistory` | Bounded history: `record(challenge)`, `toJSON()`, `RecentHistory.fromJSON()`, optional `save(storage, key)` / `RecentHistory.load(storage, key)`. |
| `getPreSubmissionView(challenge)` | The only fields safe to show **before** the student answers. |
| `getPostSubmissionView(challenge, choiceId)` | Correctness, misconception feedback, line-by-line trace, state table. Does no scoring. |
| `toVariableLabChallenge(challenge, map?)` | Compatibility adapter (assumed field names, overridable). |
| `verifyChallengeModel(challenge)` | Re-executes the stored model and compares with the stored answer. |
| `FAMILIES`, `FAMILY_IDS`, `MISCONCEPTIONS`, `RULES`, `TYPES`, `FORMATS`, `DIFFICULTIES` | Constants for UI labels and tests. |

## Challenge object

All answer-revealing fields are marked **(post)**; never render them before submission — use `getPreSubmissionView`.

| Field | Type | Description |
|---|---|---|
| `schemaVersion` | string | `"1.0"` |
| `id` | string | Stable id, `vt-<d>-<seed hex>-<attempt>`, e.g. `vt-a-3039-1`. Unique per (seed, attempt); use it as the key for "one scored attempt per challenge". |
| `seed`, `attempt` | integer | Reproduction inputs. |
| `difficulty` | string | As requested. |
| `type` | string | Primary generated variable type (`int`, `double`, `boolean`, `char`, `String`). Stable and bounded — good for Session Summary topics. |
| `primaryType` | string | Type of the assessed value (can differ from `type`, e.g. a `char` program whose `println` concatenates to a `String`). |
| `answerType` | string | Type of the answer: `int`, `double`, `boolean`, `char`, `String`. |
| `format` | string | `output`, `final` or `checkpoint`. |
| `formatInfo` | `{id, label}` | `predict-output` / `final-value` / `intermediate-checkpoint` with display labels. |
| `reasoningFamilies` | string[] | All reasoning families present in the answer's dependency slice (see `DIFFICULTY_RULES.md`). **(post-safe)** |
| `coreReasoningFamilies` | string[] | The same minus the baseline skills `SEQUENTIAL_UPDATE` and `REASSIGN_OVERWRITE`. |
| `objectiveFamilies` | string[] | The families the generator set out to exercise. |
| `code` | string | The Java program, statements separated by `\n`, **one statement per line**. |
| `codeLines` | string[] | Same, as an array; displayed line *N* is `codeLines[N-1]`. |
| `variables` | `{name, type}[]` | Declared variables in declaration order. |
| `question.text` | string | `What does System.out.println() print?` / `What is the value of <v> after the program executes?` / `What is the value of <v> immediately after line <N> executes?` |
| `question.targetVariable`, `question.line`, `question.lineCode` | string / int / string | For checkpoint questions: the variable, the 1-based line number (guaranteed to match `codeLines`), and that line's code. `null` otherwise. |
| `choices` | `{id, text}[]` | Display-ordered options: ids `A`–`D`. 2 for Boolean answers, 3–4 for `char`, 4 otherwise. Option texts are distinct. |
| `twoChoice` | boolean | `true` for the Boolean two-choice interaction. |
| `correct` **(post)** | `{text, choiceId, index, type}` | The correct answer as printed by Java (`7.0`, `true`, `x`, `sunpop`). |
| `correctChoiceId`, `correctIndex` **(post)** | string, int | Same, as the id / index into `choices`. |
| `distractors` **(post)** | array | One per wrong choice: `{choiceId, text, misconceptionId, label, explanation, line}`. `line` is the first line where the wrong reasoning diverges from the correct execution (or `null` for formatting misconceptions). |
| `explanation.summary` **(post)** | string | e.g. ``The program prints `17`.`` |
| `explanation.lines` **(post)** | array | One entry per code line: `{line, code, text, steps[], notes[], changes[{name, before, after}], output}`. `steps` are the recorded evaluation steps in order (`"3 * 3 = 9"`, `"3 + 9 = 12"`); `notes` are instructional remarks produced by the interpreter (precedence, integer division, remainder, promotion, concatenation, short-circuit). |
| `stateHistory` **(post)** | `{variables, rows}` | For multi-variable tables: `rows[i] = {line, code, values, raw, changed[], printed}`. `values` use display form (Strings and chars quoted); `raw` is the plain Java text. Row *i* is the state **after** line *i*. |
| `difficultyMetrics` | object | Measured values the rules were checked against: `totalStatements`, `declaredVariables`, `relevantStatements`, `relevantChanges`, `irrelevantStatements`, `trapStatements`, `trapLines`, `overwrittenInitializers`, `postCheckpointStatements`, `variablesInSlice`, `dependencyDepth`, `dependencyEdges`, `maxExpressionDepth`, `operatorCount`, `families`, `coreFamilies`, `relevantLines`, `edges[{from,to,via}]`, `difficultyRules`, `validated`. |
| `signatures` | `{exact, semantic, pattern}` | 16-hex-character hashes. |
| `repetition` | object | `{accepted, relaxed, reasons[], semanticDistance}`: `relaxed: true` means no candidate satisfied every repetition rule within the attempt budget and the least repetitive valid one was returned (difficulty is never lowered). |
| `model` | `{program, target}` | The JSON typed AST and target. For tests, the JVM harness and re-verification; the UI can ignore it. **Contains the answer indirectly — never expose before submission.** |
| `debug` | object | Normalised signature sources. For tooling only. |

## Example (abridged; real output of `generateTraceChallenge({difficulty:'intermediate', type:'int', format:'checkpoint', seed:2024})`)

```json
{
  "schemaVersion": "1.0",
  "id": "vt-i-7e8-0",
  "difficulty": "intermediate",
  "type": "int",
  "format": "checkpoint",
  "formatInfo": { "id": "intermediate-checkpoint", "label": "Intermediate Checkpoint" },
  "reasoningFamilies": ["ASSIGN_COPY", "PARENTHESES", "REASSIGN_OVERWRITE", "SEQUENTIAL_UPDATE"],
  "code": "int j = 18;\nint r = 20;\nj = (r - j) * 5;\nr = j;\nSystem.out.println(r);",
  "question": { "text": "What is the value of r immediately after line 4 executes?", "targetVariable": "r", "line": 4, "lineCode": "r = j;" },
  "choices": [ {"id":"A","text":"10"}, {"id":"B","text":"20"}, {"id":"C","text":"7"}, {"id":"D","text":"18"} ],
  "correctChoiceId": "A",
  "distractors": [
    { "choiceId": "B", "text": "20", "misconceptionId": "ASSIGN_DIRECTION_REVERSED", "label": "Copied in the wrong direction", "line": 4,
      "explanation": "Copying in the wrong direction (right-hand variable receiving the left one) gives this answer (at line 4, `r = j;`, j would be 20 instead of 10). In a = b, the value of b is copied into a." },
    { "choiceId": "C", "text": "7",  "misconceptionId": "MULT_AS_ADD",   "label": "Treated multiplication as addition", "line": 3, "explanation": "…" },
    { "choiceId": "D", "text": "18", "misconceptionId": "IGNORE_UPDATE", "label": "Skipped one of the updates",         "line": 3, "explanation": "…" }
  ],
  "explanation": { "summary": "Immediately after line 4, `r` is `10`.", "lines": [ { "line": 1, "text": "`j` starts at 18." }, "…" ] },
  "difficultyMetrics": { "totalStatements": 5, "relevantChanges": 2, "dependencyDepth": 3, "variablesInSlice": 2, "coreFamilies": ["ASSIGN_COPY", "PARENTHESES"], "validated": true },
  "signatures": { "exact": "9225b513298e1862", "semantic": "9f694ebf860718fb", "pattern": "8b2a16ea00d6dcdd" }
}
```

Further real samples at every difficulty, with traces and state tables, are in `examples/EXAMPLES.md` and `examples/examples.json`.

## Correctness vocabulary

- **Printed form.** All answers are exactly what `System.out.println` prints for the value: `int` as digits, `double` as Java's `Double.toString` (`7.0`, `4.875`), `boolean` as `true`/`false`, `char` and `String` as their text (no quotes). Compare with `===` on `choices[i].text`.
- **Checkpoint semantics.** "Immediately after line N" means the state after statement N has executed and before statement N+1 runs. Line numbers count displayed lines only (there is no class/`main` wrapper in the display).
- **Tracing is derived, not written.** `explanation` and `stateHistory` come from the same interpreter run that produced the answer, and every one of them is also compared with real JVM output in `jvm/verify.mjs`.

## Recent-history entry format

`RecentHistory#toJSON()` returns `{"v": 1, "entries": [[exact, semantic, pattern, familyCodes], …]}` — hashes and family letters only. It contains no student identifier, no code, no names, no answers and no timestamps, and is capped at 256 entries (a few KB).
