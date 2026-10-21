#!/usr/bin/env node
'use strict';
/* Renders every composed unit in every allowed setting bundle with several seeds and runs both the
 * existing instance validator and the compositional logic checker. Usage:
 *   node tools/compose-sweep.js [kitIdPrefix] [--seeds=N] [--show=N]   */
const { loadLibrary } = require('./load-library.js');
const { loadCompose } = require('./compose-load.js');
const SEL = require('../js/compose/selector.js');
const K = require('../js/compose/check.js');
const args = process.argv.slice(2);
const prefix = args.find(a => !a.startsWith('--')) || '';
const seeds = +((args.find(a => a.startsWith('--seeds=')) || '--seeds=2').split('=')[1]);
const show = +((args.find(a => a.startsWith('--show=')) || '--show=0').split('=')[1]);
const lib = loadLibrary(), cx = loadCompose();
const kv = K.validateCompose(lib, cx);
const kitErr = kv.errors.filter(e => e.startsWith(prefix));
if (kitErr.length) { console.log('KIT ERRORS (' + kitErr.length + ')'); kitErr.slice(0, 60).forEach(e => console.log('  ' + e)); }
const h = SEL.createHybrid(lib, cx);
const units = h.catalog.units.filter(u => u.kitId.startsWith(prefix));
let n = 0; const errs = {}; const shown = []; const shownKey = {};
for (const u of units) {
  for (const hst of u.hosts) for (let s = 0; s < seeds; s++) {
    n++;
    let c, p;
    try { c = SEL.renderUnit(h, u, { seed: 'sw' + s, contextId: hst.context }); p = SEL.validate(h, c); }
    catch (e) { p = [e.message]; }
    if (p) p.forEach(x => { const k = u.kitId + ' :: ' + x.replace(/^[^:]*: /, '').slice(0, 150); errs[k] = (errs[k] || 0) + 1; });
    else if (s === 0 && shown.length < show) {
      const sk = u.kitId + '|' + u.engine + '|' + u.mode + '|' + u.difficulty + '|' + (c.cx.state && c.cx.state.resolved.length ? 'r' : '') + (c.cx.state && c.cx.state.plan ? 'p' : '');
      if (!shownKey[sk]) { shownKey[sk] = 1; shown.push(c); }
    }
  }
}
const keys = Object.keys(errs);
console.log('units ' + units.length + ' | renders ' + n + ' | distinct errors ' + keys.length + ' | failing renders ' + keys.reduce((a, k) => a + errs[k], 0));
keys.sort((a, b) => errs[b] - errs[a]).slice(0, 40).forEach(k => console.log('  ' + errs[k] + 'x ' + k));
for (const c of shown) {
  console.log('\n--- ' + c.templateId + ' ' + c.mode + '/' + c.difficulty + ' ' + c.context + ' :: ' + c.reasoning);
  console.log(c.scenario); console.log('Q: ' + c.prompt);
  (c.options || []).forEach(o => console.log((o.id === c.key.bestId ? ' * ' : '   ') + '[' + c.key.options[o.id].role + '] ' + o.text + '\n       why: ' + c.key.options[o.id].why));
  (c.steps || []).forEach(s => console.log('   - ' + s.text));
  if (c.key.example) console.log('   example: ' + c.key.example.join(' > '));
  if (c.doc) c.doc.segments.forEach(s => console.log((s.id === c.key.problemId ? ' X ' : '   ') + s.text));
  console.log('Takeaway: ' + c.principle);
}
