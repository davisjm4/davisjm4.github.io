/* Quality gates for sustained generation, separate from correctness validation. */
const G = require('../js/engine/generator.js');
const Struct = require('../js/engine/structure.js');
const bundle = require('../js/data/content-bundle.js');
const T = require('./lib.js');

function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function exactKey(c) {
  return JSON.stringify([c.mode, c.level, norm(c.prompt), norm(c.question), norm(c.excerpt),
    Object.keys(c.info || {}).sort().map(k => norm(c.info[k].text)),
    (c.options || []).map(o => norm(o.text)).sort(), (c.items || []).map(x => x.id),
    c.solution || null, c.correctId || null]);
}
function structureKey(c) {
  return [c.mode, c.level, c.family, c.targetRole || c.missingRole || c.role || '',
    c.targetKey || c.missingSlot || '', c.multi ? 'multi' : 'single'].join('|');
}
function run() {
  const report = [];
  const minFamilies = { beginner: 5, intermediate: 6, advanced: 6 };
  const minExactLimit = { beginner: 0.10, intermediate: 0.05, advanced: 0.05 };
  for (const mode of Struct.MODES) for (const level of Struct.LEVELS) {
    const g = new G.Generator(bundle, 'quality|' + mode + '|' + level);
    const exact = new Set(), models = new Set(), structures = new Set(), families = {};
    let exactRepeats = 0, repeatsFirst50 = 0, repeatsFirst100 = 0, modelRepeats = 0, semanticRepeats30 = 0, distinctFirst20 = 0;
    const recentSemantic = [];
    const first20 = new Set();
    for (let i = 0; i < 1000; i++) {
      const c = g.next({ mode, level });
      const e = exactKey(c), semantic = c.signature;
      if (exact.has(e)) { exactRepeats++; if (i < 50) repeatsFirst50++; }
      if (exact.has(e) && i < 100) repeatsFirst100++;
      exact.add(e);
      if (models.has(c.modelId)) modelRepeats++;
      models.add(c.modelId);
      if (i < 20) first20.add(c.modelId);
      if (recentSemantic.includes(semantic)) semanticRepeats30++;
      recentSemantic.push(semantic); if (recentSemantic.length > 30) recentSemantic.shift();
      structures.add(structureKey(c));
      families[c.family] = (families[c.family] || 0) + 1;
    }
    distinctFirst20 = first20.size;
    const exactRate = exactRepeats / 1000;
    const item = { mode, level, tested: 1000, exactRepeats, exactRate, repeatsFirst50, repeatsFirst100, distinctFirst20,
      distinctModels: models.size, modelRepeats, distinctStructures: structures.size,
      familyCount: Object.keys(families).length, familyCounts: families, semanticRepeatsWithin30: semanticRepeats30 };
    report.push(item);
    const expectedModels = bundle.models.filter(m => m.level === level).length;
    T.ok(models.size === expectedModels, mode + '/' + level + ': all ' + expectedModels + ' authored models reached');
    T.ok(exactRate < minExactLimit[level], mode + '/' + level + ': exact duplicate rate ' + (100 * exactRate).toFixed(1) + '% under ' + (100 * minExactLimit[level]) + '% quality gate');
    T.ok(repeatsFirst50 === 0, mode + '/' + level + ': no exact challenge repeated within the first 50');
    T.ok(repeatsFirst100 === 0, mode + '/' + level + ': no exact challenge repeated within the first 100');
    T.ok(distinctFirst20 === 20, mode + '/' + level + ': 20 different writing models appeared before review begins');
    T.ok(Object.keys(families).length >= minFamilies[level], mode + '/' + level + ': reasoning family coverage (' + Object.keys(families).length + ')');
  }
  const g = new G.Generator(bundle, 'quality|mixed');
  for (const level of Struct.LEVELS) {
    for (let i = 0; i < 1000; i++) {
      const c = g.next({ mode: 'mixed', level });
      if (c.level !== level) T.ok(false, 'Mixed Practice honors ' + level + ' difficulty');
    }
  }
  return report;
}
module.exports = { run };
