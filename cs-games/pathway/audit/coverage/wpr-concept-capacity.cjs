'use strict';
// Measures distinct reasoning signatures per Workplace Readiness concept (graph node) from the real hybrid library.
// Student-visible reasoning only: authored signature or composed signature, never ids or labels.
const path = require('node:path');
const root = path.resolve(__dirname, '../../../../wpr-games/workplace-readiness');
const { loadHybrid } = require(path.join(root, 'tools/compose-load.js'));
const SEL = require(path.join(root, 'js/compose/selector.js'));
const h = loadHybrid();
const rows = {};
for (const u of h.units) {
  const concepts = u.kind === 'authored' ? (u.template.concepts || []) : (u.concepts || []);
  for (const c of concepts) {
    const r = rows[c] ??= {concept: c, sig: new Set(), fam: new Set(), byDiff: {}, byMode: {}, authored: new Set(), composed: new Set()};
    const s = SEL.reasoningOf(u);
    r.sig.add(s); r.fam.add(u.family);
    (u.kind === 'authored' ? r.authored : r.composed).add(s);
    (r.byDiff[u.difficulty] ??= new Set()).add(s);
    (r.byMode[u.mode] ??= new Set()).add(s);
  }
}
const out = Object.values(rows).map(r => ({
  concept: r.concept, signatures: r.sig.size, families: r.fam.size, authored: r.authored.size, composed: r.composed.size,
  beginner: r.byDiff.beginner?.size ?? 0, intermediate: r.byDiff.intermediate?.size ?? 0, advanced: r.byDiff.advanced?.size ?? 0,
  modes: Object.fromEntries(Object.entries(r.byMode).map(([k, v]) => [k, v.size])),
})).sort((a, b) => a.concept.localeCompare(b.concept));
if (require.main === module) console.log(JSON.stringify(out, null, 1));
module.exports = out;
