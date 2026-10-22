// Diversity audit used for BOTH the baseline and the final measurement. Usage: node tests/audit/audit.mjs <path-to-engine.js> <out.json> [perSeed=1000] [seeds=3]
// Usage: node audit.mjs <engine.js path> <out.json> [perSeed=1000] [seeds=3]
import { writeFileSync } from "node:fs";
import { skeleton, promptKey, answerKind, reasoningKey, exactKey } from "../normalize.mjs";
const [enginePath, outPath, perSeedArg, seedsArg] = process.argv.slice(2);
const E = await import((await import("node:url")).pathToFileURL((await import("node:path")).resolve(enginePath)).href);
const perSeed = +(perSeedArg || 1000), seeds = [11, 2027, 90210, 31337, 4242].slice(0, +(seedsArg || 3));
const modes = Object.keys(E.modeNames), diffs = E.difficulties;
const FILLERS = new Set(["0","1","2","3","4","5","6","7","8","9","10","-1","true","false",'""','"0"','"1"']);
const out = { engine: enginePath, perSeed, seeds, cells: {} };
const skelByCell = {};
for (const mode of modes) for (const d of diffs) {
  const exact = new Map(), sk = new Map(), rk = new Map(), dk = new Map(), ck = new Map(), gen = new Map(), fam = new Map(), famSk = new Map(), pos = [0,0,0,0];
  let n = 0, kindMismatch = 0, fillerish = 0, distractors = 0, depthSum = 0, callSum = 0, lenSum = 0, invalid = 0;
  for (const seed of seeds) {
    const r = E.seededRandom(seed * 7919 + modes.indexOf(mode) * 101 + diffs.indexOf(d));
    for (let i = 0; i < perSeed; i++) {
      const q = E.generateRecursion(mode, r, d); n++;
      if (q.choices.length !== 4 || new Set(q.choices).size !== 4 || q.choices.filter(c => c === q.answer).length !== 1) invalid++;
      const ek = exactKey(q), s = skeleton(q.code), k = reasoningKey(q);
      const legacy = q.generator !== "compositional-v1";
      const declared = legacy ? `legacy|${k}` : q.reasoning, concept = legacy ? `legacy|${k}` : `${q.family}|${promptKey(q.prompt, q.code)}`;
      dk.set(declared, (dk.get(declared) || 0) + 1); ck.set(concept, (ck.get(concept) || 0) + 1); gen.set(legacy ? "legacy" : "compositional", (gen.get(legacy ? "legacy" : "compositional") || 0) + 1);
      exact.set(ek, (exact.get(ek) || 0) + 1); sk.set(s, (sk.get(s) || 0) + 1); rk.set(k, (rk.get(k) || 0) + 1);
      fam.set(q.family, (fam.get(q.family) || 0) + 1);
      if (!famSk.has(q.family)) famSk.set(q.family, new Set()); famSk.get(q.family).add(s);
      pos[q.choices.indexOf(q.answer)]++;
      const ak = answerKind(q.answer);
      for (const c of q.choices) if (c !== q.answer) { distractors++; if (answerKind(c) !== ak) kindMismatch++; if (FILLERS.has(c) && answerKind(c) !== ak) fillerish++; }
      depthSum += q.callDepth || 0; callSum += q.callCount || 0; lenSum += q.code.split("\n").filter(l => !/^\s*\/\//.test(l)).length;
    }
  }
  const exp = n / 4, chi2 = pos.reduce((a, o) => a + (o - exp) ** 2 / exp, 0);
  // skeletons shared between labelled families -> labels that do not reflect structure
  const skFam = new Map(); for (const [f, set] of famSk) for (const s of set) { if (!skFam.has(s)) skFam.set(s, new Set()); skFam.get(s).add(f); }
  const sharedLabels = [...skFam.values()].filter(x => x.size > 1).map(x => [...x].sort().join("+"));
  // top reasoning-key concentration
  const top = [...rk.values()].sort((a, b) => b - a);
  out.cells[`${mode}/${d}`] = {
    generated: n, invalidChoiceSets: invalid,
    exactDuplicatePct: +((1 - exact.size / n) * 100).toFixed(2), distinctExact: exact.size,
    skeletons: sk.size, reasoningPatterns: rk.size, declaredReasoning: dk.size, strictConcepts: ck.size, generatorShare: Object.fromEntries(gen),
    top5ReasoningSharePct: +(top.slice(0, 5).reduce((a, b) => a + b, 0) / n * 100).toFixed(1),
    familyLabels: fam.size, familyDistribution: Object.fromEntries([...fam].sort()),
    labelsSharingIdenticalSkeleton: [...new Set(sharedLabels)],
    distractorKindMismatchPct: +(kindMismatch / distractors * 100).toFixed(1),
    genericFillerPct: +(fillerish / distractors * 100).toFixed(1),
    answerPositions: pos, chi2: +chi2.toFixed(2),
    meanDepth: +(depthSum / n).toFixed(2), meanCalls: +(callSum / n).toFixed(2), meanCodeLines: +(lenSum / n).toFixed(2),
  };
  skelByCell[`${mode}/${d}`] = new Set(sk.keys());
}
// Difficulty overlap: share of Advanced skeletons that also appear at Beginner
for (const mode of modes) {
  const b = skelByCell[`${mode}/Beginner`], i = skelByCell[`${mode}/Intermediate`], a = skelByCell[`${mode}/Advanced`];
  out.cells[`${mode}/Advanced`].advancedSkeletonsAlsoInBeginnerPct = +([...a].filter(s => b.has(s)).length / a.size * 100).toFixed(1);
  out.cells[`${mode}/Intermediate`].intermediateSkeletonsAlsoInBeginnerPct = +([...i].filter(s => b.has(s)).length / i.size * 100).toFixed(1);
}
// 100-question sequential practice (uses the shipped createRecursionGenerator, i.e. the student's view)
out.sessions = {};
for (const mode of modes) for (const d of diffs) {
  const res = [];
  for (const seed of [101, 202, 303]) {
    const g = E.createRecursionGenerator(seed), seenE = new Set(), seenR = new Map(), seenS = new Set();
    let exactRep = 0, reasonRep = 0, consecSame = 0, prevR = null, maxRun = 0, run = 0;
    for (let i = 0; i < 100; i++) {
      const q = g.next(mode, d), e = exactKey(q), k = reasoningKey(q), s = skeleton(q.code);
      if (seenE.has(e)) exactRep++; seenE.add(e);
      if (seenR.has(k)) reasonRep++; seenR.set(k, i); seenS.add(s);
      if (k === prevR) { consecSame++; run++; } else run = 1; maxRun = Math.max(maxRun, run); prevR = k;
    }
    res.push({ exactRepeats: exactRep, reasoningRepeats: reasonRep, distinctReasoning: seenR.size, distinctSkeletons: seenS.size, consecutiveSameReasoning: consecSame });
  }
  out.sessions[`${mode}/${d}`] = res;
}
writeFileSync(outPath, JSON.stringify(out, null, 2));
const rows = Object.entries(out.cells).map(([k, v]) => `${k.padEnd(26)} dup%=${String(v.exactDuplicatePct).padStart(5)} skel=${String(v.skeletons).padStart(4)} reason=${String(v.reasoningPatterns).padStart(4)} decl=${String(v.declaredReasoning).padStart(4)} strict=${String(v.strictConcepts).padStart(3)} top5=${String(v.top5ReasoningSharePct).padStart(5)}% labels=${v.familyLabels} mis%=${String(v.distractorKindMismatchPct).padStart(5)} fill%=${String(v.genericFillerPct).padStart(5)} chi2=${String(v.chi2).padStart(6)} depth=${v.meanDepth} lines=${v.meanCodeLines} inv=${v.invalidChoiceSets}`);
console.log(rows.join("\n"));
for (const [k, v] of Object.entries(out.sessions)) console.log(k.padEnd(26), v.map(x => `ex${x.exactRepeats}/rr${x.reasoningRepeats}/dr${x.distinctReasoning}/ds${x.distinctSkeletons}/cs${x.consecutiveSameReasoning}`).join("  "));
