// Runs the real java-games/app.js against variable-lab/index.html (linkedom) and checks the evidence metadata the page attaches to each
// question and the Mixed Practice trace-difficulty control.
// Uses the real engine and the real session tracker; synthetic data only. Requires linkedom (java-games devDependency).
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as J from '../engine.js';
import * as S from '../session.js';
const require = createRequire(import.meta.url), { parseHTML } = require(process.env.CSP_DOM_LIBRARY || 'linkedom');
let checks = 0; const plain = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x)); // objects created inside the vm context have a different realm prototype
const eq = (a, b, m) => { assert.deepEqual(plain(a), plain(b), m); checks++; }, ok = (x, m) => { assert.ok(x, m); checks++; };
function launch(initialMode) {
  const { window, document } = parseHTML(fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8'));
  Object.defineProperty(window.HTMLSelectElement.prototype, 'value', {
    configurable: true,
    get() { return this.querySelector('option[selected]')?.getAttribute('value') || this.querySelector('option')?.getAttribute('value') || ''; },
    set(v) { for (const o of this.querySelectorAll('option')) { o.removeAttribute('selected'); if (o.getAttribute('value') === v) o.setAttribute('selected', ''); } },
  });
  const memory = new Map(), tracker = S.createSessionTracker({ storage: { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) } });
  const requests = [];
  const context = { window, document, console, Math, Set, setTimeout, clearTimeout, diagnostics: {},
    J: { ...J, generate: (game, mode, forced, options) => { requests.push({ mode, options }); return J.generate(game, mode, forced, options); } },
    sessionTracker: () => tracker, addSessionNavigation: () => {}, roundSummary: () => '' };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8').replace(/import[^;]+;/g, ''), context);
  const $ = id => document.getElementById(id);
  const setMode = m => { $('mode').value = m; $('mode').onchange(); };
  const current = () => Object.values(tracker.snapshot().records).at(-1);
  if (initialMode) setMode(initialMode);
  return { $, setMode, tracker, requests, current };
}
// 1. Focused practice: every mode attaches explicit evidence metadata that normalizes to its node.
for (const mode of ['trace', 'identify', 'assemble']) {
  const t = launch(mode), r = t.current();
  ok(r.details?.practiceMode, `${mode}: page annotated practiceMode`);
  eq(r.details.practiceMode, mode === 'identify' ? `identify/${r.topic}` : mode);
  eq(r.mode, mode, 'existing record.mode semantics unchanged');
  if (mode === 'trace') { ok(r.details.format && r.details.family && r.details.difficulty, 'trace keeps format, family and difficulty'); ok(r.details.practiceMode !== r.details.format); }
}
// 2. Mixed Practice: the page shows the trace difficulty control and passes the chosen difficulty only for trace-capable draws.
const m = launch('mixed');
ok(!m.$('difficulty-wrap').hidden, 'difficulty control is visible in Mixed Practice');
eq(m.requests.at(-1).options, { difficulty: 'beginner' }, 'default Mixed trace difficulty remains beginner');
m.$('difficulty').value = 'advanced'; m.$('difficulty').onchange();
eq(m.requests.at(-1).options, { difficulty: 'advanced' });
let advancedTrace = 0, others = 0;
for (let i = 0; i < 80; i++) { m.$('new').onclick(); const r = m.current(); const ev = r.details; ok(ev?.practiceMode, 'every Mixed question is annotated');
  if (r.mode === 'trace') { eq(ev.difficulty, 'advanced', 'presented difficulty equals recorded difficulty'); advancedTrace++; } else { eq(ev.difficulty, undefined, 'untiered modes record no difficulty'); others++; } }
ok(advancedTrace > 5 && others > 5, 'Mixed produced both trace and non-trace questions');
// 3. Focused trace keeps the difficulty control; other focused modes hide it (existing behavior).
const f = launch('identify'); ok(f.$('difficulty-wrap').hidden, 'difficulty hidden for identify');
f.setMode('trace'); ok(!f.$('difficulty-wrap').hidden, 'difficulty visible for trace');
// Normalization of these annotations to curriculum nodes is verified in cs-games/pathway/tests/mastery-evidence.test.mjs.
console.log(`Variable Lab evidence UI: ${checks} checks passed (real app.js, real engine, real tracker).`);
