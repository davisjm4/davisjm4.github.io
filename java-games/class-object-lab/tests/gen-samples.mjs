/* Writes the instructional review sample set (GENERATED_SAMPLES.md): 5 challenges per mode/difficulty
 * (195), chosen with fixed seeds and preferring distinct families, plus counterfactual pairs.
 *   node class-object-lab/tests/gen-samples.mjs [outfile] */
import { writeFileSync } from "node:fs";
import { generateChallenge, MODE_IDS, MODE_NAMES, LEVELS } from "../compose/engine.js";

const out = process.argv[2] || "GENERATED_SAMPLES.md";
const L = ["# Generated review samples", "", "Five challenges for each of the 39 mode/difficulty combinations (195 total), produced by `node class-object-lab/tests/gen-samples.mjs` with fixed seeds. Within a cell the script prefers different semantic families and reasoning configurations. Each distractor is listed with the misconception model that produced it.", ""];
let n = 0;
for (const mode of MODE_IDS) {
  L.push(`## ${MODE_NAMES[mode]} (\`${mode}\`)`, "");
  for (const difficulty of LEVELS) {
    L.push(`### ${difficulty}`, "");
    const chosen = [], keys = new Set(), famCount = {};
    for (let s = 0; chosen.length < 5 && s < 400; s++) {
      const c = generateChallenge({ mode, difficulty, seed: 20261021 + s * 1009 });
      if (keys.has(c.reasoningSignature)) continue;
      if ((famCount[c.family] || 0) >= Math.ceil(5 / 2) && s < 300) continue;
      keys.add(c.reasoningSignature); famCount[c.family] = (famCount[c.family] || 0) + 1; chosen.push(c);
    }
    chosen.forEach((c, i) => {
      n++;
      L.push(`#### ${mode} · ${difficulty} · sample ${i + 1} — \`${c.family}\``, "");
      L.push(`Complexity score ${c.metrics.score}; features: ${c.metrics.features.join(", ") || "none"}.`, "");
      L.push("```java", c.code, "```", "");
      if (c.context) L.push(`*${c.context}*`, "");
      L.push(`**${c.prompt}**`, "");
      c.choices.forEach((ch, k) => {
        const tag = ch === c.answer ? "**correct**" : `${c.why[ch].label} (\`${c.why[ch].misconception}\`)`;
        L.push(`${String.fromCharCode(65 + k)}. \`${ch.replace(/\n/g, " ⏎ ")}\` — ${tag}`);
      });
      L.push("", `Explanation: ${c.explanation}`, "");
      if (c.steps?.length) L.push("Trace: " + c.steps.map((s) => `\`${s.code}\` → ${s.effect}`).join("; "), "");
    });
  }
}
writeFileSync(out, L.join("\n").replace(/\n*$/, "\n"));
console.log(`Wrote ${n} samples to ${out}`);
