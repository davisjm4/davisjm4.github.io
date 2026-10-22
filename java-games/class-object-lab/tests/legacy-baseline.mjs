/* Reproducible baseline audit of the ORIGINAL engine (class-engine-legacy.js).
 * Measures real variation (code + prompt + choice set), ignoring the random suffix the original
 * appended to its signatures. Writes test-results/legacy-baseline.json. */
import { writeFileSync } from "node:fs";
import { modeNames, generateClassObject, seededRandom, createClassObjectGenerator } from "../class-engine-legacy.js";
const out = {};
for (const mode of Object.keys(modeNames)) {
  const r = seededRandom(1234);
  const exact = new Set(), variants = new Set(), pos = [0, 0, 0, 0], sigs = new Set();
  for (let i = 0; i < 1000; i++) {
    const q = generateClassObject(mode, r);
    exact.add(q.code + "\u0001" + q.prompt + "\u0001" + [...q.choices].sort().join("|"));
    variants.add(q.variant); sigs.add(q.signature); pos[q.choices.indexOf(q.answer)]++;
  }
  // first-20 repetition in a realistic session (the original generator with recent-question avoidance)
  const g = createClassObjectGenerator(99);
  const seen = new Set(); let rep20 = 0, rep14 = 0;
  for (let i = 0; i < 20; i++) { const q = g.next(mode); const k = q.code + q.prompt; if (seen.has(k)) { rep20++; if (i < 14) rep14++; } seen.add(k); }
  out[mode] = { authoredTemplates: variants.size, exactDisplayedQuestions: exact.size, reportedSignatures: sigs.size, answerPositions: pos, repeatsIn14: rep14, repeatsIn20: rep20, difficultyLevels: "none (single level)" };
}
writeFileSync(new URL("../test-results/legacy-baseline.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([m, v]) => [m, `${v.authoredTemplates} templates, ${v.exactDisplayedQuestions} distinct, ${v.reportedSignatures} 'signatures', rep14=${v.repeatsIn14} rep20=${v.repeatsIn20}`])), null, 1));
