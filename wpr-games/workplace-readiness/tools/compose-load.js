'use strict';
/* Loads compositional content from /content/compose (Node only). */
const fs = require('fs');
const path = require('path');
const { loadLibrary } = require('./load-library.js');
const selector = require('../js/compose/selector.js');

const ROOT = path.join(__dirname, '..', 'content', 'compose');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

function loadCompose() {
  const frameworks = readJson(path.join(ROOT, 'frameworks.json')).frameworks;
  const slots = readJson(path.join(ROOT, 'slots.json')).bundles;
  const dir = path.join(ROOT, 'kits');
  const kits = [].concat(...fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => readJson(path.join(dir, f)).kits));
  return { frameworks, slots, kits };
}
function loadHybrid() { return selector.createHybrid(loadLibrary(), loadCompose()); }

module.exports = { loadCompose, loadHybrid };
