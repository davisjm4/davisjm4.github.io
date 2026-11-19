#!/usr/bin/env node
'use strict';
/* Seeded quality audit of composed kits, per kit, from student-visible text only.
 * Checks: checkInstance logic errors; answer position and length cues; proceed-as-key rate;
 * sentence-start capitalisation and doubled words; scenario sentences that restate a "clear" fact
 * about something never introduced; unrealistic context pairings are NOT detectable here (see reports).
 * Usage: node tools/content-quality-audit.js [--n=3000] [--kits=prefix] [--out=path.json] */
const fs = require('fs');
const { loadLibrary } = require('./load-library.js');
const { loadCompose } = require('./compose-load.js');
const SEL = require('../js/compose/selector.js');
const K = require('../js/compose/check.js');
const args = process.argv.slice(2);
const opt = (k, d) => (args.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1] || d;
const N = +opt('n', 3000), only = opt('kits', ''), outPath = opt('out', '');
const lib = loadLibrary(), cx = loadCompose(), h = SEL.createHybrid(lib, cx);
const wc = s => String(s).trim().split(/\s+/).length;
const rows = [];
const skills = [...new Set(cx.kits.filter(k => k.id.startsWith(only)).map(k => k.skill))];
const per = new Map();
for (const skill of skills) {
  for (const seed of ['qa-1', 'qa-2']) {
    const { challenges } = SEL.generateMany(h, N, { seed: seed + skill, filters: { skills: [skill] } });
    for (const c of challenges) {
      const u = h.unitsById[c.templateId]; if (!u || u.kind !== 'composed' || !u.kitId.startsWith(only)) continue;
      const r = per.get(u.kitId) || { kit: u.kitId, skill, renders: 0, sig: new Set(), choice: 0, pos: [0, 0, 0, 0], longest: 0, shortest: 0, proceedKey: 0, logic: 0, lowerStart: 0, doubled: 0, examples: [] };
      per.set(u.kitId, r); r.renders++; r.sig.add(u.signature);
      if (K.checkInstance(c, h).length) r.logic++;
      const texts = [c.scenario || '', ...(c.options || []).map(o => o.text)];
      texts.forEach(t => {
        if (/(^|(?<![ap]\.m)[.!?]\s)[a-z]/.test(t)) { r.lowerStart++; if (r.examples.length < 2) r.examples.push(t.slice(0, 110)); }
        if (/\b(\w+) \1\b/i.test(t)) r.doubled++;
      });
      if (c.options) {
        r.choice++; const bi = c.options.findIndex(o => o.id === c.key.bestId); r.pos[bi]++;
        const L = c.options.map(o => wc(o.text)), m = Math.max(...L), mn = Math.min(...L);
        if (L[bi] === m && L.filter(x => x === m).length === 1) r.longest++;
        if (L[bi] === mn && L.filter(x => x === mn).length === 1) r.shortest++;
        if ((c.key.options[c.key.bestId].source || '') === 'proceed') r.proceedKey++;
      }
    }
  }
}
for (const r of per.values()) {
  const e = r.choice / 4, chi = r.pos.reduce((a, p) => a + (p - e) * (p - e) / e, 0);
  rows.push({ kit: r.kit, skill: r.skill, renders: r.renders, signatures: r.sig.size, choiceItems: r.choice, position: r.pos, chiSquare3df: +chi.toFixed(2),
    longestIsBest: +(r.longest / (r.choice || 1)).toFixed(3), shortestIsBest: +(r.shortest / (r.choice || 1)).toFixed(3), proceedIsKey: +(r.proceedKey / (r.choice || 1)).toFixed(3),
    logicErrors: r.logic, lowercaseSentenceStarts: r.lowerStart, doubledWords: r.doubled, examples: r.examples });
}
rows.sort((a, b) => a.kit.localeCompare(b.kit));
const flag = r => [r.logicErrors ? 'logic' : '', r.chiSquare3df > 16.27 ? 'position-bias' : '', r.longestIsBest > 0.45 ? 'long-cue' : '', r.shortestIsBest > 0.45 ? 'short-cue' : '',
  r.lowercaseSentenceStarts ? 'lowercase-start' : '', r.doubledWords ? 'doubled-word' : ''].filter(Boolean);
rows.forEach(r => r.flags = flag(r));
console.log('kits audited:', rows.length, '| renders:', rows.reduce((a, r) => a + r.renders, 0), '| flagged:', rows.filter(r => r.flags.length).length);
rows.filter(r => r.flags.length).forEach(r => console.log(' ', r.kit.padEnd(28), r.flags.join(','), r.examples[0] ? '| ' + r.examples[0] : ''));
if (outPath) fs.writeFileSync(outPath, JSON.stringify(rows, null, 1) + '\n');
