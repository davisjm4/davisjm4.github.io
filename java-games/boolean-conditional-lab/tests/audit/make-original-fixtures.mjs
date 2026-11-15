// Freezes option sets produced by the ORIGINAL (base 2bd0527) generators so that the shortcut measurement can be
// shown to flag them. Run inside a checkout of the base commit:  node tests/audit/make-original-fixtures.mjs out.json
// (The fixture is committed as tests/audit/fixtures/original-option-sets.json; it is test data, not used by the lab.)
import fs from "node:fs";
import { generate, makeRng } from "../../engine.js";
import { generateCoverage } from "../../generators/coverage.js";
import { generateSwitch } from "../../generators/switch-if.js";
const out = {}; const N = 150;
const G = { "coverage/fix-boundary": (r, L) => generateCoverage(r, L, "fix-boundary"), "coverage/equivalent-chain": (r, L) => generateCoverage(r, L, "equivalent-chain"), "switchIf/missing-break-fix": (r, L) => generateSwitch(r, L, "missing-break-fix"),
  "short/short-counter": (r, L) => { const q = generate("short", r, L); return q.family === "short-counter" ? q : null; }, "conditions": (r, L) => generate("conditions", r, L), "construct": (r, L) => generate("construct", r, L) };
for (const [name, g] of Object.entries(G)) { out[name] = []; for (let i = 0; out[name].length < N && i < 20000; i++) { const L = ["Intermediate", "Advanced"][i % 2]; let q = null; try { q = g(makeRng(555001 + i * 104729), L); } catch {} if (q && q.choices.length === 4) out[name].push({ level: L, question: q.question, choices: q.choices, answer: q.answer }); } }
fs.writeFileSync(process.argv[2] || "original-option-sets.json", JSON.stringify({ source: "base 2bd052725aa2280fa4480063e34d7f29140e0096", n: N, sets: out }));
console.log(Object.entries(out).map(([k, v]) => `${k}: ${v.length}`).join("\n"));
