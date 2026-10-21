#!/usr/bin/env node
/* Print generated responses for manual reading: node tools/sample-compose.js [filter] [seeds] */
const C = require('../js/compose/compose.js');
const RNG = require('../js/engine/rng.js');
const lib = require('../js/data/compose-bundle.js');
const bundle = require('../js/data/content-bundle.js');
const idx = C.index(lib, bundle);
const filt = process.argv[2] || '';
const seeds = Number(process.argv[3] || 1);
for (const e of idx.entries.filter(e => e.id.includes(filt))) {
  for (let s = 0; s < seeds; s++) {
    let r;
    try { r = C.buildResponse(idx, e.id, RNG.create('sample' + s)); }
    catch (err) { console.log('\n#### ' + e.id + '\nFAILED: ' + err.message.slice(0, 1500)); continue; }
    const S = r.sentences, d = r.distractors;
    console.log('\n#### ' + e.id + ' (tries ' + r.generated.tries + ')');
    console.log('PASSAGE: ' + r.excerpt);
    console.log('Q: ' + r.question);
    ['R','A','C1','E1','C2','E2','S'].forEach(k => console.log('  ' + k + ': ' + S[k].text));
    console.log('  -- rep: ' + d.rep.join(' | '));
    console.log('  -- cross: ' + d.crossExp.join(' | '));
    console.log('  -- bad: ' + d.bad + '\n  -- badRestate: ' + d.badRestate + '\n  -- nonAnswer: ' + d.nonAnswer);
    console.log('  -- off: ' + d.offEv + ' / ' + d.offExp + '\n  -- sumNew: ' + d.sumNew);
  }
}
