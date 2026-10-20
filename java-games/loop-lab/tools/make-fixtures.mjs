import fs from "node:fs";
import { generateChallenge } from "../loop-engine.js";
const legacy = { iterations: ["inc-exclusive", "dec-inclusive", "zero-start", "while-decrement", "one-step", "skip-step"], final: ["sum-range", "product", "overwrite", "count-even", "continue-sum", "break-sum"], conditional: ["odd-count", "greater-sum", "continue-even", "break-target"], while: ["integer-half", "increment-sentinel", "zero-while", "decrement"], nested: ["rectangle", "diagonal", "triangular", "inner-step", "break-inner"] };
const out = [];
for (const [mode, vs] of Object.entries(legacy)) for (const variant of vs) for (const seed of [11, 222, 3333]) { const q = generateChallenge({ mode, difficulty: "beginner", seed, family: variant }); out.push({ mode, variant, difficulty: q.difficulty, seed, answer: q.answer }); }
fs.writeFileSync(new URL("../tests/legacy-fixtures.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(`wrote ${out.length} fixtures`);
