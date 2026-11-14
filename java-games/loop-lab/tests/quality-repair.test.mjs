/* Loop Lab instructional-quality repair regression tests (audit findings D1-D4, W1).
 * Usage: node tests/quality-repair.test.mjs [rankSamples=300]
 * Pure Node (no Java needed); tests/displayed-code-jvm.test.mjs adds the JVM checks. */
import assert from "node:assert/strict";
import fs from "node:fs";
import * as E from "../loop-engine.js";
import { challengeHeaderText } from "../loop-header.js";

let checks = 0; const ok = (v, m) => { assert.ok(v, m); checks++; };
const RANK_N = Number(process.argv[2] || 300);
const NON_LOOPTYPE = E.MODES.filter((m) => m !== "looptype");

/* D1 - exposed answers. Seeds that exposed the keyed statement before the repair. */
const D1_SEEDS = [["beginner", 50102], ["beginner", 50126], ["beginner", 6725], ["advanced", 7679], ["intermediate", 6301], ["advanced", 6089]];
let d1Hit = 0;
for (const [difficulty, seed] of D1_SEEDS) {
  const q = E.generateChallenge({ mode: "algorithms", difficulty, seed });
  if (q.targetKind !== "select-statement") continue; d1Hit++;
  ok(/_{4,}/.test(q.code), `${q.id}: blank displayed`);
  ok(!q.code.split("\n").some((l) => l.includes(q.answer)), `${q.id}: keyed statement "${q.answer}" is not in the displayed code`);
}
ok(d1Hit >= 2, `previously failing seeds still generate select-statement questions (${d1Hit})`);
let selectCount = 0;
for (const difficulty of E.DIFFICULTIES) for (let i = 0; i < 3000; i++) {
  const q = E.generateChallenge({ mode: "algorithms", difficulty, seed: 50000 + i * 3 });
  if (q.targetKind !== "select-statement") continue; selectCount++;
  ok(/_{4,}/.test(q.code), `${q.id}: select-statement shows a blank`);
  ok((q.code.match(/_{4,}/g) || []).length === 1, `${q.id}: exactly one blank`);
  ok(!q.code.split("\n").some((l) => l.trim() === q.answer + ";" || l.trim().endsWith(") " + q.answer + ";")), `${q.id}: answer not visible`);
}
ok(selectCount > 300, `enough select-statement samples (${selectCount})`);

/* D2 - no family label in the student-facing header, in any mode. */
const src = fs.readFileSync(new URL("../loop-ui.js", import.meta.url), "utf8");
const stageTemplate = src.slice(src.indexOf('$("stage").innerHTML'), src.indexOf("</h2>", src.indexOf('$("stage").innerHTML')));
ok(!/variantName|topicTitle|reasoningFamily|q\.variant|q\.template|q\.concept/.test(stageTemplate), "stage header template does not interpolate variant/family fields");
const seenLabels = new Set();
for (const mode of E.MODES) for (const difficulty of E.DIFFICULTIES) for (let i = 0; i < 60; i++) {
  const q = E.generateChallenge({ mode, difficulty, seed: 100 + i * 53 });
  const header = challengeHeaderText(q);
  ok(header === `${q.modeName} · ${q.difficultyName}`, `${q.id}: header is mode and difficulty only`);
  ok(!header.toLowerCase().includes(String(q.variantName).toLowerCase()) || header.toLowerCase().includes(q.modeName.toLowerCase()) && q.variantName.toLowerCase() === q.modeName.toLowerCase(), `${q.id}: header leaks variant "${q.variantName}"`);
  ok(q.variant && q.variantName && q.reasoningFamily && q.topicTitle, `${q.id}: internal identifiers still available for reporting`);
  seenLabels.add(q.variantName);
}
ok(seenLabels.size > 60, "many distinct internal variants still exist");

/* D4/W1 - displayed code, keyed answer and prompt agree. */
const NAMED_STMT = /\b\w+(?:\+\+|--)/g;
for (const mode of NON_LOOPTYPE) for (const difficulty of E.DIFFICULTIES) for (let i = 0; i < 150; i++) {
  const q = E.generateChallenge({ mode, difficulty, seed: 100 + i * 53 });
  for (const t of q.prompt.match(NAMED_STMT) || []) ok(q.code.includes(t), `${q.id}: prompt names "${t}" which is not in the displayed code`);
  if (q.targetKind === "component") {
    ok(q.code.includes(q.answer), `${q.id}: keyed component text "${q.answer}" appears in the displayed code`);
    ok(new Set(q.choices).size === 4, `${q.id}: four unique choices`);
    const verbatim = q.choices.filter((c) => q.code.includes(c));
    ok(q.variant === "control-variable" || verbatim.length >= 3, `${q.id}: distractors are displayed fragments too (answer is not identifiable by absence)`);
  }
}
const inner = E.generateChallenge({ mode: "components", difficulty: "intermediate", seed: 1955 });
ok(inner.variant === "inner-update" && inner.code.includes("col += 1") && inner.answer === "col += 1", "seed 1955: keyed text equals displayed update");
const tri = E.generateChallenge({ mode: "nested", difficulty: "intermediate", seed: 153 });
ok(!/\+\+/.test(tri.prompt) && /adds 1 to hits/.test(tri.prompt), "seed 153: prompt no longer names a statement form");

/* Question-generation reliability, uniqueness, determinism - every mode and difficulty. */
for (const mode of E.MODES) for (const difficulty of E.DIFFICULTIES) for (let i = 0; i < 120; i++) {
  const seed = 100 + i * 53; const q = E.generateChallenge({ mode, difficulty, seed });
  ok(q.choices.length === 4 && new Set(q.choices).size === 4, `${q.id}: four unique choices`);
  ok(q.choices.filter((c) => c === q.answer).length === 1, `${q.id}: exactly one keyed choice`);
  ok(q.distractors.length === 3 && q.distractors.every((d) => q.choices.includes(d.choice) && d.choice !== q.answer && d.note), `${q.id}: three explained distractors`);
  if (i % 6 === 0) assert.deepEqual(JSON.parse(JSON.stringify(E.generateChallenge({ mode, difficulty, seed }))), JSON.parse(JSON.stringify(q)), `${q.id}: deterministic`), checks++;
}

/* D3 - numeric answer rank. Train on one seed range, validate on another. A student who always picks the modal rank
 * learned on training data should not beat tolerant limits on validation data. */
const num = (s) => (/^-?\d+$/.test(String(s)) ? Number(s) : null);
const rankOf = (q) => { const n = q.choices.map(num); if (n.some((x) => x === null)) return null; return [...n].sort((a, b) => a - b).indexOf(Number(q.answer)); };
const cells = []; let sum = 0, counted = 0;
for (const mode of NON_LOOPTYPE) for (const difficulty of E.DIFFICULTIES) {
  const mk = (from) => Array.from({ length: RANK_N }, (_, i) => E.generateChallenge({ mode, difficulty, seed: from + i * 29 }));
  const train = mk(100000).map(rankOf).filter((r) => r !== null), test = mk(900000).map(rankOf).filter((r) => r !== null);
  const minN = Math.min(100, Math.floor(RANK_N / 3)); if (train.length < minN || test.length < minN) continue;
  const cnt = [0, 0, 0, 0]; train.forEach((r) => cnt[r]++); const modal = cnt.indexOf(Math.max(...cnt));
  const acc = test.filter((r) => r === modal).length / test.length; cells.push({ mode, difficulty, acc }); sum += acc; counted++;
  ok(acc <= 0.68, `${mode}/${difficulty}: modal-rank accuracy ${acc.toFixed(3)} <= 0.68`);
  if (mode === "nested") ok(acc <= 0.6, `${mode}/${difficulty}: nested rank exploit ${acc.toFixed(3)} <= 0.60 (was ~0.94)`);
}
ok(counted >= 18, `numeric cells analysed: ${counted}`);
ok(sum / counted <= 0.47, `mean modal-rank accuracy ${(sum / counted).toFixed(3)} <= 0.47 (baseline 0.51)`);
fs.mkdirSync(new URL("../reports/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../reports/quality-repair-rank.json", import.meta.url), JSON.stringify({ samples: RANK_N, meanModalAccuracy: +(sum / counted).toFixed(3), cells: cells.map((c) => ({ ...c, acc: +c.acc.toFixed(3) })) }, null, 1));
console.log(`Loop Lab quality repair: ${checks.toLocaleString()} checks passed; ${selectCount} select-statement questions; mean modal-rank accuracy ${(sum / counted).toFixed(3)} over ${counted} numeric cells.`);
