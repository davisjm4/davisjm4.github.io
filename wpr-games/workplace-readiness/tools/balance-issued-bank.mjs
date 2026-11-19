// Rotates each authored item's choices (and matching comparisons) so the key positions in the
// source are balanced across a skill. Rotation keeps the cyclic order of the alternatives.
// The server shuffles again when it issues a question, so this keeps the source tidy and lets the
// quality gate measure authored position without bias. Usage: node tools/balance-issued-bank.mjs <file>...
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const arr = (items, pad) => '[\n' + items.map(t => pad + '  ' + q(t) + ',').join('\n') + '\n' + pad + ']';
export function emit(header, items) {
  const body = items.map(i => `  {
    id: ${q(i.id)}, family: ${q(i.family)}, decision: ${q(i.decision)}, concept, context: ${q(i.context)},
    scenario: ${q(i.scenario)},
    decisive: ${q(i.decisive)},
    prompt: ${q(i.prompt)},
    choices: ${arr(i.choices, '    ')},
    best: ${i.best},
    why: ${q(i.why)},
    comparison: ${arr(i.comparison, '    ')},
  },`).join('\n');
  return `${header}\nexport const items = [\n${body}\n];\n`;
}
for (const file of process.argv.slice(2)) {
  const abs = path.resolve(file);
  const text = fs.readFileSync(abs, 'utf8');
  const concept = text.match(/const concept = ('[^']+');/)[1];
  const header = text.slice(0, text.indexOf('export const items')).trimEnd();
  const {items} = await import(pathToFileURL(abs).href + '?t=' + Date.now());
  const rotated = items.map((item, n) => {
    const target = (n + (n >> 2)) % 4; // spreads targets 0..3 with a slow drift so runs are not periodic
    const shift = (item.best - target + 4) % 4;
    const turn = list => list.map((_, i) => list[(i + shift) % 4]);
    return {...item, choices: turn(item.choices), comparison: turn(item.comparison), best: target};
  });
  fs.writeFileSync(abs, emit(header, rotated));
  console.log(path.basename(file), 'rebalanced', rotated.map(i => i.best).join(''));
}
