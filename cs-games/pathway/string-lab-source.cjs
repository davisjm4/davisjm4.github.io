// Loads String Lab's classic-script generator (it attaches to globalThis.StringLab) so tooling and tests can read the engine's real modes and families.
const path = require('node:path');
const dir = path.join(__dirname, '../../java-games/string-lab/js');
['rng.js','words.js','java-ast.js','evaluator.js','difficulty.js','distractors.js','gen-helpers.js','families-predict.js','families-trace.js','families-index.js','families-expression.js','families-practice.js','generator.js'].forEach(f => require(path.join(dir, f)));
module.exports = globalThis.StringLab.Generator;
