# Java Variable Trace Generator

Procedural, seeded challenge generator for Variable Lab's "Trace the Variable" mode (typed Java AST -> Java-semantics interpreter -> misconception distractors -> difficulty validation -> anti-repetition).

```js
import { generateTraceChallenge } from './src/index.js';
const c = generateTraceChallenge({ difficulty: 'advanced', seed: 12345, recentSignatures: [] });
```

Browser bundle: `dist/variable-trace-generator.iife.js` (`window.VariableTraceGenerator`).

Start with `WORK_INTEGRATION_GUIDE.md`. Other docs: GENERATOR_ARCHITECTURE, CHALLENGE_SCHEMA, DIFFICULTY_RULES, DISTRACTOR_MODELS, REASONING_DIVERSITY_REPORT, TEST_RESULTS. Run `npm test` for everything (JVM and browser stages skip if javac/Playwright are missing). Examples: `examples/EXAMPLES.md`.
