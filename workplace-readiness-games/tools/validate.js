'use strict';
/* Full content validation: library rules, every template rendered across all its contexts. */
const { loadLibrary } = require('./load-library.js');
const V = require('../js/core/validator.js');
const lib = loadLibrary();
const r = V.validateLibrary(lib, { requireAllSkills: true });
console.log('templates:', lib.templates.length, '| families:', lib.families.length, '| skills:', lib.skills.length, '| contexts:', lib.contexts.length);
console.log('library errors:', r.errors.length, '| warnings:', r.warnings.length);
r.errors.forEach(e => console.log('  ERROR', e)); r.warnings.forEach(e => console.log('  WARN', e));
process.exit(r.ok ? 0 : 1);
