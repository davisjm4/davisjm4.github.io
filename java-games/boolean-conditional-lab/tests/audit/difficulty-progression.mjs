// Does the difficulty selector change what is generated? usage: node difficulty-progression.mjs
import { generate, makeRng, booleanGame, DIFFICULTIES } from "../../engine.js";
const key = q => JSON.stringify([q.question, q.code, q.choices || q.tokens.map(t => t.text)]);
console.log("Same seed at two difficulties produces an identical challenge (300 seeds):");
for (const m of Object.keys(booleanGame.modes)) { let ba = 0, bi = 0, ia = 0; for (let i = 0; i < 300; i++) { const s = 5000 + i; const [b, n, a] = DIFFICULTIES.map(L => key(generate(m, makeRng(s), L))); if (b === a) ba++; if (b === n) bi++; if (n === a) ia++; }
  console.log(`  ${m.padEnd(11)} Beg=Adv ${String(ba).padStart(3)}   Beg=Int ${String(bi).padStart(3)}   Int=Adv ${String(ia).padStart(3)}`); }
console.log("\nReachable question families per difficulty (3000 draws each):");
for (const m of ["identify", "short", "evaluate"]) for (const L of DIFFICULTIES) { const c = {}; for (let i = 0; i < 3000; i++) { const q = generate(m, makeRng(13 + i * 7919), L); c[q.family] = (c[q.family] || 0) + 1; } console.log(`  ${m}/${L.padEnd(12)} ${Object.entries(c).sort().map(([k, v]) => `${k.replace(m + "-", "")}:${(100 * v / 3000).toFixed(0)}%`).join(" ")}`); }
