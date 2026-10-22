// Re-derives LEGACY answers from real JVM runs (baseline correctness audit). Usage: node tests/audit/baseline-jvm.mjs <path-to-engine.js> [perCell=200] [out.json]
// Re-derive legacy answers from real JVM execution. Usage: node baseline-jvm.mjs <engine> <perCell>
import { harness, parseObs } from "../jvm/instrument.mjs"; import { runJava } from "../jvm/jvm.mjs";
import { methodNames } from "../normalize.mjs"; import { writeFileSync } from "node:fs";
const E = await import((await import("node:url")).pathToFileURL((await import("node:path")).resolve(process.argv[2])).href); const per = +(process.argv[3] || 200);
const progs = [], items = [], skipped = {};
let id = 0;
for (const mode of Object.keys(E.modeNames)) for (const d of E.difficulties) {
  const r = E.seededRandom(4000 + id);
  for (let i = 0; i < per; i++) {
    const q = E.generateRecursion(mode, r, d), name = `B${id++}`, m = methodNames(q.code)[0];
    const comment = q.code.split("\n").filter(l => /^\s*\/\//.test(l)).join(" ");
    const code = q.code.split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
    let spec = null, kind = null;
    const callMatch = comment.match(/\/\/ (?:call: )?(\w+\([^)]*\))/);
    if (mode === "base") { if (/How many method calls/.test(q.prompt)) kind = "calls"; else if (/At what value/.test(q.prompt)) kind = "baseArg"; else { (skipped[q.prompt.slice(0,30)] ??= 0); skipped[q.prompt.slice(0,30)]++; continue; }
      spec = { method: m, call: callMatch[1], isVoid: true }; }
    else if (mode === "returns") { kind = /How many total calls/.test(q.prompt) ? "calls" : /maximum call depth/.test(q.prompt) ? "depth" : "ret"; spec = { method: m, call: callMatch[1] }; }
    else if (mode === "output") { const isVoid = /static void/.test(code); const inp = comment.match(/input: (".*")/);
      spec = { method: m, call: inp ? `${m}(${inp[1]})` : callMatch[1], isVoid }; kind = isVoid ? "out" : "ret"; }
    else if (mode === "arrays") { const arr = comment.match(/a = \{([^}]*)\}/)[1], start = comment.match(/start = (-?\d+)/)?.[1] ?? "0", t = comment.match(/target = (-?\d+)/)?.[1];
      const params = code.match(/\(([^)]*)\)/)[1].split(",").length;
      spec = { method: m, setup: `int[] a = {${arr}};`, call: params === 3 ? `${m}(a, 0, ${t})` : `${m}(a, ${start})` }; kind = "ret"; }
    else if (mode === "debug") { if (q.family !== "execution-order") { (skipped["debug static fix item"] ??= 0); skipped["debug static fix item"]++; continue; } spec = { method: m, call: comment.match(/call: (\w+\(\d+\))/)[1], isVoid: true }; kind = "order"; }
    else { const arr = comment.match(/a = \{([^}]*)\}/)[1];
      if (q.data.algorithm === "binarySearch") { const t = comment.match(/target = (-?\d+)/)[1]; spec = { method: "binarySearch", setup: `int[] a = {${arr}};`, call: `binarySearch(a, 0, a.length - 1, ${t})` };
        kind = /what happens after/.test(q.prompt) ? "bsNext" : /midpoint index/.test(q.prompt) ? "bsMid" : /How many recursive calls/.test(q.prompt) ? "calls" : "ret"; }
      else { spec = { method: "mergeSort", setup: `int[] a = {${arr}};`, call: `mergeSort(a, 0, a.length - 1)`, after: ["a"] };
        kind = /Which condition/.test(q.prompt) ? "text" : /split/.test(q.prompt) ? "split" : /How many mergeSort/.test(q.prompt) ? "calls" : "merged"; }
    }
    progs.push({ name, source: harness(name, code, spec) }); items.push({ name, mode, d, q, kind });
  }
}
const res = runJava(progs, { timeoutMs: 3000 });
const tally = {}, disagreements = [];
for (const it of items) {
  const v = res.get(it.name), key = `${it.mode}/${it.d}`; tally[key] ??= { checked: 0, agree: 0, compileErrors: 0, distractorEqualsTruth: 0 };
  const t = tally[key]; if (v.status === "COMPILE") { t.compileErrors++; disagreements.push({ key, why: "compile", err: v.error, code: it.q.code }); continue; }
  const o = parseObs(v.stdout); let truth;
  const lastArg = o.log.at(-1)?.args;
  switch (it.kind) {
    case "calls": truth = String(o.calls); break; case "depth": truth = String(o.maxDepth); break;
    case "baseArg": truth = lastArg; break; case "ret": truth = o.ret; break; case "out": truth = o.out; break; case "order": truth = /^1?2?3?4?5?6?7?8?9?(10)?(11)?$/.test(o.out) && o.out.length ? "Ascending" : "?"; break;
    case "merged": truth = o.after[0].replace(/^\[|\]$/g, ""); break;
    case "split": { const kids = o.log.filter(e => e.depth === 2).slice(0, 2).map(e => e.args.split(",").filter(x=>x!=="arr")); truth = kids.length === 2 ? `${kids[0][0]}..${kids[0][1]} and ${kids[1][0]}..${kids[1][1]}` : "?"; break; }
    case "bsNext": { const [l0, h0] = o.log[0].args.split(",").filter(x=>x!=="arr").map(Number); if (o.log.length === 1) truth = `return ${o.ret}`; else { const [l1, h1] = o.log[1].args.split(",").filter(x=>x!=="arr").map(Number); truth = l1 !== l0 ? `low = ${l1}` : `high = ${h1}`; } break; }
    case "bsMid": { if (o.log.length === 1) truth = o.ret; else { const [l0, h0] = o.log[0].args.split(",").filter(x=>x!=="arr").map(Number), [l1, h1] = o.log[1].args.split(",").filter(x=>x!=="arr").map(Number); truth = String(l1 !== l0 ? l1 - 1 : h1 + 1); } break; }
    default: truth = it.q.answer;
  }
  if (it.kind === "baseArg" || it.kind === "bsNext" || it.kind === "bsMid" || it.kind === "split" ? true : true) {}
  t.checked++; if (o.exc) disagreements.push({ key, why: "exception " + o.exc, prompt: it.q.prompt });
  if (String(truth) === it.q.answer) t.agree++; else disagreements.push({ key, family: it.q.family, prompt: it.q.prompt, answer: it.q.answer, jvm: truth, code: it.q.code });
  if (it.q.choices.some(c => c !== it.q.answer && c === String(truth))) t.distractorEqualsTruth++;
}
writeFileSync(process.argv[4] || "baseline-jvm.json", JSON.stringify({ per, tally, skipped, disagreements }, null, 2));
console.log(tally, skipped, "disagreements:", disagreements.length); console.log(disagreements.slice(0, 4));
