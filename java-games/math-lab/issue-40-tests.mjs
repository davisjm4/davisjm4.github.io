import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const baseline = process.argv[2];
const lab = baseline ? pathToFileURL(baseline + "/").href : new URL("./", import.meta.url).href;
const { generate, structures } = await import(lab + "engine.js");
const { generateChallenge } = await import(lab + "expansion/generator.js");
const lcg = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const contextual = new Set([
  "modulus:divisible", "modulus:negative-divisor", "modulus:both-negative",
  "expressions:product-remainder", "expressions:nested-group",
]);
const out = {};
for (const [mode, shapes] of Object.entries(structures)) for (const shape of shapes) {
  if (mode === "reverse") continue;
  const rows = [3, 4].map(base => {
    const data = { ranks: [0,0,0,0], minAbs: 0, nearMean:0, zero:0 };
    for (let i=0;i<300;i++) {
      const seed = base * 1000003 + i * 7919 + shape.length;
      const q = generate(mode, shape, lcg(seed));
      assert.equal(new Set(q.choices.map(Number)).size, 4);
      assert.equal(q.choices.filter(choice => choice === q.answer).length, 1);
      if (!baseline && contextual.has(mode + ":" + shape)) {
        assert.deepEqual(q, generate(mode, shape, lcg(seed)));
        assert.equal(Object.keys(q.choiceFeedback).length, 3);
        for (const wrong of q.choices.filter(choice => choice !== q.answer)) {
          assert.ok(q.choiceFeedback[wrong]?.startsWith("This "));
        }
      }
      const a=Number(q.answer), values=q.choices.map(Number), mean=values.reduce((a,b)=>a+b,0)/4;
      const distances=values.map(x=>Math.abs(x-mean));
      data.minAbs += Number(Math.abs(a)===Math.min(...values.map(Math.abs)));
      data.nearMean += Number(a===values[distances.indexOf(Math.min(...distances))]);
      data.ranks[[...values].sort((a,b)=>a-b).indexOf(a)]++;
      data.zero += Number(a===0);
    }
    return data;
  });
  const hits = [ ...rows[0].ranks, rows[0].minAbs, rows[0].nearMean ];
  const fit = hits.indexOf(Math.max(...hits));
  const validation = [ ...rows[1].ranks, rows[1].minAbs, rows[1].nearMean ];
  out[mode+":"+shape] = { training: rows[0], validation: rows[1], best: ["rank0","rank1","rank2","rank3","minAbs","nearMean"][fit], rate: validation[fit]/300 };
}
for(const [set, start] of [["exploratory",1],["heldOut",900001]]) {
  const counts={all:{generated:0,numeric:0,ranks:[0,0,0,0]}};
  for(let seed=start;seed<start+1500;seed++){
    const q=generateChallenge({mode:"numeric-limits",difficulty:"beginner",seed});
    for(const key of ["all",q.family+":"+q.shape]){
      const c=counts[key]??={generated:0,numeric:0,ranks:[0,0,0,0]}; c.generated++;
      if(!q.choices.every(x=>/^-?\d+(\.\d+)?$/.test(x))) continue;
      c.numeric++; c.ranks[q.choices.map(Number).sort((a,b)=>a-b).indexOf(Number(q.answer))]++;
    }
  }
  out[set]=counts;
}
if (!baseline) {
  const divisible = out["modulus:divisible"];
  assert.ok(divisible.validation.zero >= 100 && divisible.validation.zero <= 200);
  assert.ok(divisible.rate < 0.75);
  assert.ok(out["modulus:negative-divisor"].validation.minAbs / 300 < 0.643);
  assert.ok(out["modulus:both-negative"].validation.minAbs / 300 < 0.583);
  assert.ok(out["expressions:product-remainder"].validation.ranks[0] / 300 < 0.65);
  assert.ok(out["expressions:product-remainder"].rate < 0.65);
  assert.ok(out.heldOut.all.ranks[0] / out.heldOut.all.numeric < 0.5);
  let nested = 0, reassemble = 0;
  for (let seed = 2300000; seed < 2300300; seed++) {
    const power = generateChallenge({ difficulty: "advanced", seed, family: "mm.pow" });
    if (power.shape === "nested") {
      nested++;
      assert.notEqual(Number(power.answer), 0, power.code);
    }
    const division = generateChallenge({ difficulty: "advanced", seed, family: "nl.int-division" });
    if (division.shape === "reassemble") {
      reassemble++;
      const divisor = division.code.match(/int \w+ = \d+;\nint \w+ = (\d+);/)?.[1];
      const factor = division.code.match(/\* (\d+) \+ /)?.[1];
      assert.ok(divisor && factor, division.code);
      assert.notEqual(divisor, factor, division.code);
    }
  }
  assert.ok(nested > 0 && reassemble > 0);
  console.error("Checked " + nested + " nested powers and " + reassemble + " quotient/remainder expressions for cancellation.");
}
console.log(JSON.stringify(out, null, 2));
