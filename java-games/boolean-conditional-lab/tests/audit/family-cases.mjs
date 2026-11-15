// Student-visible examples for the four continuation families (fixed seeds), including the feedback a wrong choice shows.
// Runs on the base commit too (no feedback there). usage: node family-cases.mjs
import { generateCoverage } from "../../generators/coverage.js"; import { generateSwitch } from "../../generators/switch-if.js"; import { generate, makeRng } from "../../engine.js";
const show = (title, q) => { console.log(`\n### ${title}`); console.log(q.question.slice(0, 220)); if (q.code) console.log(q.code.split("\n").map(l => "    " + l).join("\n")); q.choices.forEach((c, i) => console.log(`  ${i === q.answer ? "*" : " "} ${c}${q.choiceTags ? "   [" + q.choiceTags[i] + "]" : ""}`)); const wrong = q.choices.findIndex((_, i) => i !== q.answer); console.log(`  If a student picks option ${wrong + 1}: ${q.choiceFeedback?.[wrong] ?? "(no misconception feedback - explanation only: " + String(q.explanation).slice(0, 100) + ")"}`); };
show("coverage / fix-boundary (Intermediate, seed 321)", generateCoverage(makeRng(321), "Intermediate", "fix-boundary"));
show("coverage / fix-boundary (Advanced, seed 322)", generateCoverage(makeRng(322 * 104729), "Advanced", "fix-boundary"));
show("coverage / equivalent-chain (Advanced, seed 323)", generateCoverage(makeRng(323 * 7919), "Advanced", "equivalent-chain"));
show("switchIf / missing-break-fix (Advanced, seed 324)", generateSwitch(makeRng(324 * 7919), "Advanced", "missing-break-fix"));
{ let q = null; for (let i = 0; !q && i < 4000; i++) { const c = generate("short", makeRng(325 + i * 7919), "Advanced"); if (c.family === "short-counter") q = c; } show("short / short-counter (Advanced)", q); }
