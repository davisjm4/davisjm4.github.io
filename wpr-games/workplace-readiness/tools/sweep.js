'use strict';
/* Renders every template many times across every context and reports instance-level problems. */
const { loadLibrary } = require('./load-library.js');
const V = require('../js/core/validator.js');
const G = require('../js/core/generator.js');
const LIB = require('../js/core/library.js');
const lib = loadLibrary();
const per = parseInt(process.argv[2] || '120', 10);
const seen = {};
let total = 0;
for (const t of lib.templates) {
  const ctxs = LIB.contextsFor(lib, t);
  for (let i = 0; i < per; i++) {
    total++;
    let c;
    try { c = G.renderTemplate(t, lib, { seed: 'sweep' + i, id: String(i), contextId: ctxs[i % ctxs.length] }); }
    catch (e) { const k = t.id + ' THROW ' + e.message; seen[k] = (seen[k] || 0) + 1; continue; }
    const r = V.validateChallenge(c, lib);
    r.errors.concat(r.warnings.map(w => 'WARN ' + w)).forEach(e => {
      const k = t.id + ' ' + e.replace(/^c[a-z0-9]+: /, '').slice(0, 140); seen[k] = (seen[k] || 0) + 1;
    });
  }
}
const keys = Object.keys(seen);
console.log('rendered', total, 'instances from', lib.templates.length, 'templates; distinct problems:', keys.length);
keys.forEach(k => console.log(seen[k], k));
process.exit(keys.some(k => !/ WARN /.test(k)) ? 1 : 0);
