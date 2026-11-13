// Algorithm Architect audit: every (mode, variant, component) with its goal and correct answer, to judge the thinking each one needs.
// Reproduce: node cs-games/pathway/audit/csp-proficiency-a/architect-components.mjs
import { generateArchitect, architectModes } from '../../../../csp-games/architect-engine.js';
const rows = new Map();
for (const mode of Object.keys(architectModes)) for (let i = 0; i < 3000; i++) {
  const q = generateArchitect(mode);
  const variant = q.structure.slice(q.mode.length + 1).split('-')[0];
  const comp = q.format === 'arrange' ? 'arrange' : q.component.replaceAll(' ', '-');
  const key = [mode, variant, comp].join('|');
  const o = q.format === 'missing' ? q.options[Number(q.correctChoice.split('-')[1])] : null; const correct = o ? (o.text ?? o.label ?? JSON.stringify(o)) : '(arrange blocks)';
  const r = rows.get(key) ?? { n: 0, goal: q.goal, correct: new Set() }; r.n++; r.correct.add(String(correct).replace(/(?<![a-z])[-−]?\d+(\.\d+)?/g, '#')); rows.set(key, r);
}
const out = [...rows.entries()].sort();
for (const [k, r] of out) console.log(k.padEnd(34), String(r.n).padStart(4), '|', r.goal.slice(0, 58).padEnd(58), '|', [...r.correct].slice(0, 2).join(' ; ').slice(0, 52));
