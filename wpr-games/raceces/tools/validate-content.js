#!/usr/bin/env node
const V = require('../js/engine/validator.js');
const bundle = require('../js/data/content-bundle.js');
const r = V.validateContent(bundle);
r.warnings.forEach(w => console.log('warn:', w));
if (r.errors.length) { r.errors.forEach(e => console.error('ERROR:', e)); console.error(r.errors.length + ' content error(s).'); process.exit(1); }
const wc = r.wordCounts;
const rng = k => `${Math.min(...wc[k])}-${Math.max(...wc[k])}`;
console.log('Content valid. Excerpt words: beginner ' + rng('beginner') + ', intermediate ' + rng('intermediate') + ', advanced ' + rng('advanced') + '.');
