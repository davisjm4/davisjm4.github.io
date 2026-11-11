// Regenerates the evidence gap registry and the coverage matrix CSV.
//   node cs-games/pathway/tests/build-gap-registry.mjs           write both files
//   node cs-games/pathway/tests/build-gap-registry.mjs --check   fail if either committed file differs from a fresh run
import fs from 'node:fs';
import { buildRegistry, toCsv, serialize, REGISTRY_PATH, MATRIX_PATH } from './lib/gap-registry.mjs';
import { root } from './lib/lab-flow.mjs';

const reg = buildRegistry();
const outputs = [[REGISTRY_PATH, serialize(reg)], [MATRIX_PATH, toCsv(reg)]];
if (process.argv.includes('--check')) {
  let bad = 0;
  for (const [rel, text] of outputs) {
    const file = new URL(rel, root);
    const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (have !== text) { console.error(`STALE: ${rel} differs from a fresh run`); bad++; }
  }
  if (bad) process.exit(1);
  console.log(`gap registry and coverage matrix are current (${reg.summary.entries} entries)`);
} else {
  for (const [rel, text] of outputs) { const file = new URL(rel, root); fs.mkdirSync(new URL('./', file), { recursive: true }); fs.writeFileSync(file, text); console.log('wrote', rel); }
  console.log(JSON.stringify(reg.summary));
}
