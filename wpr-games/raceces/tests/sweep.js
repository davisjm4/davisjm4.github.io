/* Large generation sweep: every challenge must validate, grade correctly, and reject wrong answers. */
const T = require('./lib.js');
const G = require('../js/engine/generator.js');
const M = require('../js/engine/model.js');
const V = require('../js/engine/validator.js');
const Struct = require('../js/engine/structure.js');
const bundle = require('../js/data/content-bundle.js');

function run() {
  const idx = M.indexBundle(bundle);
  const stats = {
    total: 0, byMode: {}, byLevel: {}, byModeLevel: {}, byRole: {}, byFamily: {}, bySubject: {},
    signatures: new Set(), prompts: new Set(), excerpts: new Set(), optionSets: new Set(), orders: new Set(),
    missingCorrectLongest: 0, missingTotal: 0, missingPos: {}, missingByRole: {},
    wrongAnswersTested: 0, validationErrors: 0
  };
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };

  function check(ch) {
    stats.total++;
    bump(stats.byMode, ch.mode); bump(stats.byLevel, ch.level); bump(stats.byFamily, ch.family); bump(stats.bySubject, ch.subject);
    bump(stats.byModeLevel, ch.mode + '/' + ch.level);
    if (ch.role) bump(stats.byRole, ch.role);
    stats.signatures.add(ch.signature); stats.prompts.add(ch.prompt); stats.excerpts.add(ch.excerpt);
    const errs = V.validateChallenge(ch);
    if (errs.length) { stats.validationErrors++; T.ok(false, ch.id + ' invalid: ' + errs.join('; ')); }
    else T.ok(true, '');

    if (ch.mode === 'identify') {
      const g = G.grade(ch, { selected: ch.solution.ids });
      T.ok(g.correct, ch.id + ': correct selection must grade correct');
      if (!ch.multi) {
        ch.sentences.forEach(s => {
          if (s.id === ch.solution.ids[0]) return;
          const r = G.grade(ch, { selected: [s.id] });
          stats.wrongAnswersTested++;
          T.ok(!r.correct && r.feedback.notes.length > 0 && r.category, ch.id + ': wrong single selection ' + s.id + ' must fail with feedback');
        });
      } else {
        ch.solution.ids.forEach(id => { T.ok(!G.grade(ch, { selected: [id] }).correct, ch.id + ': partial multi-selection must fail'); stats.wrongAnswersTested++; });
        const extra = ch.sentences.find(s => ch.solution.ids.indexOf(s.id) < 0);
        T.ok(!G.grade(ch, { selected: ch.solution.ids.concat([extra.id]) }).correct, ch.id + ': over-selection must fail'); stats.wrongAnswersTested++;
        T.ok(!G.grade(ch, { selected: [] }).correct, ch.id + ': empty selection must fail');
      }
    } else if (ch.mode === 'rearrange') {
      const a = G.grade(ch, { order: ch.solution.order }), b = G.grade(ch, { order: ch.solution.alternate });
      T.ok(a.correct && b.correct, ch.id + ': both pair orders must be accepted');
      T.ok(!G.grade(ch, { order: ch.items.map(i => i.id) }).correct, ch.id + ': starting order must not be accepted');
      stats.orders.add(ch.items.map(i => i.id).join(','));
    } else if (ch.mode === 'missing') {
      stats.missingTotal++;
      const c = ch.options.find(o => o.id === ch.correctId);
      const L = Math.max(...ch.options.map(o => o.text.length));
      if (c.text.length === L) stats.missingCorrectLongest++;
      bump(stats.missingPos, ch.correctId);
      const mr = stats.missingByRole[ch.missingRole] = stats.missingByRole[ch.missingRole] || { n: 0, longest: 0 };
      mr.n++; if (c.text.length === L) mr.longest++;
      stats.optionSets.add(ch.options.map(o => o.text).sort().join('|'));
      ch.options.forEach(o => {
        if (o.id === ch.correctId) return;
        const r = G.grade(ch, { optionId: o.id }); stats.wrongAnswersTested++;
        T.ok(!r.correct && r.feedback.notes.length >= 2 && r.category, ch.id + ': distractor must fail with explanation');
      });
    }
  }

  // Exhaustive build sweep across every writing model, mode, and target.
  const seedsPer = { identify: 5, rearrange: 30, missing: 8 };
  bundle.models.forEach(m => {
    Struct.MODES.forEach(mode => {
      G.targetKeysFor(mode).forEach(k => {
        for (let s = 0; s < seedsPer[mode]; s++) check(G.build(idx, { mode, modelId: m.id, targetKey: k, seed: 'sweep' + s }));
      });
    });
  });
  const buildTotal = stats.total;

  // Gameplay-path sweep: the real generator with rotation, for each difficulty filter and mixed practice.
  ['all', 'beginner', 'intermediate', 'advanced'].forEach(level => {
    ['mixed', 'identify', 'rearrange', 'missing'].forEach(mode => {
      const g = new G.Generator(bundle, 'play-' + level + '-' + mode);
      for (let i = 0; i < 90; i++) check(g.next({ mode, level }));
    });
  });
  stats.gameplayTotal = stats.total - buildTotal;
  stats.buildTotal = buildTotal;
  return stats;
}

if (require.main === module) {
  T.suite('sweep', () => { const s = run(); console.log('challenges:', s.total, 'failures:', T.state.failCount || 0); });
  process.exit(T.state.failCount ? 1 : 0);
}
module.exports = { run };
