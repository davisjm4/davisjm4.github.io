#!/usr/bin/env node
'use strict';
/* Prints distinct reasoning signatures per skill/difficulty cell (authored patterns + composed
 * configurations, which never overlap) and per mode. Usage: node tools/compose-capacity.js [--json] */
const { loadHybrid } = require('./compose-load.js');
const SEL = require('../js/compose/selector.js');
const h = loadHybrid();
const L = ['beginner', 'intermediate', 'advanced'], M = ['decision', 'nextstep', 'order', 'find'];
const rows = [];
let ok = 0;
for (const s of h.skills.slice().sort((a, b) => a.number - b.number)) {
  const r = { skill: s.id, code: s.code, cells: {} };
  for (const l of L) {
    const cap = SEL.capacity(h, { skills: [s.id], difficulty: l });
    const modes = {};
    for (const m of M) modes[m] = SEL.capacity(h, { skills: [s.id], difficulty: l, modes: [m] }).signatures;
    r.cells[l] = Object.assign(cap, { modes });
    if (cap.signatures >= 20) ok++;
  }
  rows.push(r);
}
if (process.argv.includes('--json')) { console.log(JSON.stringify({ rows, cellsAt20: ok }, null, 1)); return; }
console.log('skill  ' + L.map(l => (l.slice(0, 3) + ' total(auth+cx) d/n/o/f').padEnd(30)).join(''));
for (const r of rows) console.log(r.code.padEnd(7) + L.map(l => { const c = r.cells[l]; return (String(c.signatures).padStart(4) + '(' + c.authoredPatterns + '+' + c.composedConfigurations + ') ' + M.map(m => c.modes[m]).join('/')).padEnd(30); }).join(''));
console.log('cells with 20+ signatures: ' + ok + ' of 66');
