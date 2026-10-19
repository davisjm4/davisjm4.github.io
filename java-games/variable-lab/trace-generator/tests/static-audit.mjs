// Static audit of the generator source: no eval, no dynamic code, no DOM / Node-only APIs (browser independent).
import fs from 'node:fs';
const dir = new URL('../src/', import.meta.url);
let bad = 0, files = 0;
const rules = [
  [/\beval\s*\(/, 'eval()'], [/\bnew\s+Function\b/, 'new Function'], [/\bFunction\s*\(/, 'Function()'],
  [/\brequire\s*\(/, 'require()'], [/\bprocess\./, 'process.*'], [/\bdocument\./, 'document.*'], [/\bwindow\./, 'window.*'],
  [/from\s+['"]node:/, 'node: import'], [/from\s+['"](?!\.)/, 'bare/absolute import'], [/\bMath\.random\b/, 'Math.random (only allowed for the default seed in index.js)'],
];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  files++;
  const src = fs.readFileSync(new URL(f, dir), 'utf8').replace(/\/\/.*$/gm, '');
  for (const [re, name] of rules) {
    if (re.test(src)) {
      if (name.startsWith('Math.random') && f === 'index.js') continue;
      console.log(`  FAIL ${f}: ${name}`); bad++;
    }
  }
}
console.log(`static audit: ${files} source files scanned, ${bad} violations`);
process.exit(bad ? 1 : 0);
