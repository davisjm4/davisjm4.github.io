/* Compositional generator test suite. Every count below is an executed check.
   Writes tests/results/compose-results.json (used by tools/gen-compose-docs.js). */
const T = require('../lib.js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const G = require('../../js/engine/generator.js');
const M = require('../../js/engine/model.js');
const V = require('../../js/engine/validator.js');
const S = require('../../js/engine/structure.js');
const RNG = require('../../js/engine/rng.js');
const C = require('../../js/compose/compose.js');
const Ck = require('../../js/compose/check.js');
const Gr = require('../../js/compose/grammar.js');
const bundle = require('../../js/data/content-bundle.js');
const lib = require('../../js/data/compose-bundle.js');

const out = { ranAt: new Date().toISOString() };
const idx = G.makeIndex(bundle, lib);
const cidx = idx.compose;
const LEVELS = S.LEVELS, MODES = S.MODES;
const topics = bundle.topics.map(t => t.id);
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const exactKey = c => JSON.stringify([c.mode, c.level, norm(c.prompt), norm(c.question), norm(c.excerpt),
  S.SLOTS.map(k => norm(c.info[k].text)), (c.options || []).map(o => norm(o.text)).sort(), (c.items || []).map(x => x.id), c.correctId || null, c.targetKey || c.missingSlot || null]);

function gradeAll(ch) {
  const errs = V.validateChallenge(ch);
  T.ok(!errs.length, ch.id + ' invalid: ' + errs.join('; '));
  if (ch.mode === 'identify') {
    T.ok(G.grade(ch, { selected: ch.solution.ids }).correct, ch.id + ' identify solution');
    if (!ch.multi) ch.sentences.forEach(s => { if (s.id !== ch.solution.ids[0]) { const r = G.grade(ch, { selected: [s.id] }); T.ok(!r.correct && r.feedback.notes.length && r.category, ch.id + ' wrong selection fails with feedback'); } });
    else { T.ok(!G.grade(ch, { selected: [ch.solution.ids[0]] }).correct, 'partial multi fails'); }
  } else if (ch.mode === 'rearrange') {
    T.ok(G.grade(ch, { order: ch.solution.order }).correct, ch.id + ' rearrange solution');
    if (ch.solution.alternate) T.ok(G.grade(ch, { order: ch.solution.alternate }).correct, ch.id + ' alternate pair order accepted');
    T.ok(!G.grade(ch, { order: ch.items.map(i => i.id) }).correct, ch.id + ' start order rejected');
  } else {
    ch.options.forEach(o => { const r = G.grade(ch, { optionId: o.id }); T.ok(r.correct === (o.id === ch.correctId), ch.id + ' option grading'); if (!r.correct) T.ok(r.feedback.notes.length >= 2 && r.category, ch.id + ' distractor feedback'); });
  }
}

T.suite('grammar helpers', () => {
  [['slow water loss', 'slows water loss'], ['carry pollen', 'carries pollen'], ['reach water', 'reaches water'], ['have roots', 'has roots'], ['be ready', 'is ready'], ['keep dust off', 'keeps dust off'], ['go home', 'goes home'], ['push hard', 'pushes hard']]
    .forEach(([a, b]) => T.eq(Gr.s3(a), b, 's3 ' + a));
  [['apple', 'an'], ['tool', 'a'], ['hour', 'an'], ['unit', 'a'], ['island', 'an'], ['one', 'a'], ['eight-digit', 'an']].forEach(([w, a]) => T.eq(Gr.article(w), a, 'article ' + w));
  const bad = ['the plant has a apple.', 'This is is wrong.', 'It have roots.', 'The {E} grows.', 'Missing end', 'The rover , moves.', 'The bikes without they lost 4 percent.', 'The passage says that Where the cactus grows, rain falls.'];
  bad.forEach(s => T.ok(Gr.lint(s).length > 0, 'lint rejects: ' + s));
  const good = ['The silverleaf cactus has an unusually long taproot.', 'Bees help the plant make seeds.', 'They let the plant collect water before it drains away.'];
  good.forEach(s => T.eq(Gr.lint(s).length, 0, 'lint accepts: ' + s + ' ' + Gr.lint(s).join(',')));
});

T.suite('every configuration builds and passes all checks (6 seeds each)', () => {
  let builds = 0, firstTry = 0, maxTries = 0;
  const byStruct = {};
  cidx.entries.forEach(e => {
    for (let s = 0; s < 6; s++) {
      let r;
      try { r = C.buildResponse(cidx, e.id, RNG.create('cfg' + s)); } catch (err) { T.ok(false, e.id + ': ' + err.message.slice(0, 300)); continue; }
      builds++; if (r.generated.tries === 1) firstTry++; maxTries = Math.max(maxTries, r.generated.tries);
      const errs = Ck.response(r, { kit: cidx.kits[e.kitId] });
      T.ok(!errs.length, e.id + ' recheck: ' + errs.join('; '));
      T.eq(r.topicId, e.topicId, 'response stays on its topic');
      byStruct[e.structure] = (byStruct[e.structure] || 0) + 1;
    }
  });
  out.configBuilds = { configurations: cidx.entries.length, builds, firstTryRate: firstTry / builds, maxTries, byStructure: byStruct };
});

T.suite('9,000+ generated challenges through the real modes (1,000 per mode x difficulty)', () => {
  const stats = { total: 0, correctLongest: 0, missingTotal: 0, positions: {}, kinds: {}, byModeLevel: {} };
  MODES.forEach(mode => LEVELS.forEach(level => {
    const g = new G.Generator(bundle, 'cmp|' + mode + '|' + level, { compose: lib });
    const exact = new Set(); let exactRepeats = 0, authoredRepeats = 0, generated = 0;
    for (let i = 0; i < 1000; i++) {
      const ch = g.next({ mode, level });
      stats.total++; if (ch.generated) generated++;
      gradeAll(ch);
      T.eq(ch.level, level, 'level honored'); T.eq(ch.mode, mode, 'mode honored');
      const k = exactKey(ch); if (exact.has(k)) { if (ch.generated) exactRepeats++; else authoredRepeats++; } exact.add(k);
      if (mode === 'missing') {
        stats.missingTotal++;
        const c = ch.options.find(o => o.id === ch.correctId);
        if (c.text.length === Math.max(...ch.options.map(o => o.text.length))) stats.correctLongest++;
        stats.positions[ch.correctId] = (stats.positions[ch.correctId] || 0) + 1;
        ch.options.forEach(o => { stats.kinds[o.kind] = (stats.kinds[o.kind] || 0) + 1; });
        T.eq(new Set(ch.options.map(o => o.text)).size, 4, 'four distinct options');
      }
    }
    T.eq(exactRepeats, 0, mode + '/' + level + ': no generated challenge repeats exactly in 1,000');
    T.ok(authoredRepeats / Math.max(1, 1000 - generated) < 0.10, mode + '/' + level + ': authored repeats stay within the existing 10% gate');
    stats.byModeLevel[mode + '/' + level] = { generated, authored: 1000 - generated, exactRepeatsGenerated: exactRepeats, exactRepeatsAuthored: authoredRepeats };
  }));
  const pos = Object.values(stats.positions); const exp = stats.missingTotal / 4;
  const chi2 = pos.reduce((a, o) => a + (o - exp) * (o - exp) / exp, 0);
  T.ok(chi2 < 16.27, 'answer position unbiased (chi2 ' + chi2.toFixed(2) + ', df 3, p>0.001)');
  T.ok(stats.correctLongest / stats.missingTotal < 0.35, 'correct option is not usually the longest (' + (100 * stats.correctLongest / stats.missingTotal).toFixed(1) + '%)');
  T.ok((stats.kinds.crossExp || 0) > 50 && (stats.kinds.nonAnswer || 0) > 50, 'new misconception distractors appear (crossExp ' + stats.kinds.crossExp + ', nonAnswer ' + stats.kinds.nonAnswer + ')');
  stats.chi2 = chi2; out.modeSweep = stats;
});

T.suite('all 23 topics x 3 difficulties: topic-specific session capacity', () => {
  const rows = [];
  topics.forEach(tid => LEVELS.forEach(level => {
    const topic = bundle.topics.find(t => t.id === tid);
    const pool = idx.compose.entries.filter(e => e.topicId === tid && e.level === level);
    const authored = bundle.models.filter(m => m.topicId === tid && m.level === level);
    let worst = { exact: 0, config: 0, consecStruct: 0, review: 0 }, minStructs = Infinity;
    const sessionSize = 20;
    for (let seed = 0; seed < 5; seed++) {
      const g = new G.Generator(bundle, 'topic|' + tid + '|' + level + '|' + seed, { compose: lib });
      const ex = new Set(), cfg = new Set(), structs = new Set(); let exact = 0, config = 0, consec = 0, review = 0, prevStruct = null;
      for (let i = 0; i < sessionSize; i++) {
        const ch = g.next({ mode: 'mixed', level, subject: topic.subject, topics: [tid] });
        T.eq(ch.topicId, tid, 'topic filter honored');
        const k = exactKey(ch); if (ex.has(k)) exact++; ex.add(k);
        if (cfg.has(ch.modelId)) config++; cfg.add(ch.modelId);
        const st = ch.structure || ('authored:' + ch.family);
        if (st === prevStruct) consec++; prevStruct = st; structs.add(st);
        if (ch.pool.review) review++;
      }
      worst.exact = Math.max(worst.exact, exact); worst.config = Math.max(worst.config, config); worst.consecStruct = Math.max(worst.consecStruct, consec); worst.review = Math.max(worst.review, review);
      minStructs = Math.min(minStructs, structs.size);
    }
    T.eq(worst.exact, 0, tid + '/' + level + ': no exact repeat in 20');
    T.eq(worst.config, 0, tid + '/' + level + ': no underlying configuration repeats in 20');
    T.eq(worst.consecStruct, 0, tid + '/' + level + ': no reasoning structure twice in a row');
    T.eq(worst.review, 0, tid + '/' + level + ': each distinct model is new before the topic enters review');
    const required = 20;
    T.ok(pool.length + authored.length >= required, tid + '/' + level + ': expected minimum distinct problem capacity');
    const structures = new Set(pool.map(e => e.structure)).size;
    T.ok(tid.startsWith('math-') ? structures === 0 : structures >= 7, tid + '/' + level + ': available reasoning structures match the topic library');
    rows.push({ topic: tid, subject: topic.subject, level, generated: pool.length, authored: authored.length, total: pool.length + authored.length, structures, minStructuresIn20: minStructs, exactRepeatsIn20: worst.exact, configRepeatsIn20: worst.config });
  }));
  out.topicLevel = rows;
});

T.suite('extended sessions (14, 20, 50, 100, 500) on single topics and All Topics', () => {
  const lengths = [14, 20, 50, 100, 500], res = [];
  const scopes = [{ name: 'All topics', sel: {} }, { name: 'Mathematics all topics', sel: { subject: 'Mathematics' } }, { name: 'Mathematics: Algebra', sel: { subject: 'Mathematics', topics: ['math-algebraic-expressions'] } }, { name: 'Desert cacti', sel: { subject: 'Plants and animals', topics: ['cactus'] } }, { name: 'Binary numbers', sel: { subject: 'Computer technology', topics: ['binary-numbers'] } }, { name: 'Mars rovers', sel: { subject: 'Space exploration', topics: ['mars-rovers'] } }];
  scopes.forEach(sc => ['all', 'beginner', 'advanced'].forEach(level => {
    for (let seed = 0; seed < 3; seed++) {
      const g = new G.Generator(bundle, 'ext|' + sc.name + '|' + level + '|' + seed, { compose: lib });
      const ex = new Set(), cfg = new Set(); let exact = 0, config = 0, consec = 0, prevStruct = null, prevModel = null, sameModelBack = 0;
      const marks = {};
      for (let i = 0; i < 500; i++) {
        const ch = g.next(Object.assign({ mode: 'mixed', level }, sc.sel));
        if (i < 120) gradeAll(ch);
        const k = exactKey(ch); if (ex.has(k)) exact++; ex.add(k);
        if (cfg.has(ch.modelId)) config++; cfg.add(ch.modelId);
        const st = ch.structure || ('authored:' + ch.family); if (st === prevStruct) consec++; prevStruct = st;
        if (ch.modelId === prevModel) sameModelBack++; prevModel = ch.modelId;
        T.ok(g.history.length <= G.HISTORY_MAX, 'history bounded');
        if (lengths.includes(i + 1)) marks[i + 1] = { exact, config, consec, distinctConfigs: cfg.size };
      }
      T.eq(marks[20].exact, 0, sc.name + '/' + level + ': no exact repeats in 20');
      T.eq(marks[50].exact, 0, sc.name + '/' + level + ': no exact repeats in 50');
      T.eq(marks[100].exact, 0, sc.name + '/' + level + ': no exact repeats in 100');
      T.eq(sameModelBack, 0, sc.name + '/' + level + ': never the same configuration twice in a row');
      res.push({ scope: sc.name, level, seed, marks, consecutiveSameStructure500: consec });
    }
  }));
  out.extended = res;
});

T.suite('determinism and surface variation', () => {
  const ids = cidx.entries.filter((e, i) => i % 17 === 0).map(e => e.id);
  ids.forEach(id => {
    const a = G.build(idx, { mode: 'missing', modelId: id, targetKey: 'E1', seed: 'd1' });
    const b = G.build(idx, { mode: 'missing', modelId: id, targetKey: 'E1', seed: 'd1' });
    T.eq(JSON.stringify(a), JSON.stringify(b), 'same seed gives identical challenge');
    const names = new Set(); for (let s = 0; s < 8; s++) names.add(G.build(idx, { mode: 'identify', modelId: id, targetKey: 'R', seed: 'v' + s }).surface.name);
    T.ok(names.size >= 2, id + ': surface names vary across seeds');
  });
});

T.suite('order-dependent evidence (causal chain) is enforced in every mode', () => {
  const chains = cidx.entries.filter(e => e.structure === 'process-chain');
  T.ok(chains.length >= 15, 'chain configurations exist for every compositional topic');
  chains.forEach(e => {
    const r = G.build(idx, { mode: 'rearrange', modelId: e.id, seed: 'dep' });
    T.ok(r.dependency && r.solution.alternate === null, 'no alternate order offered');
    const sw = ['R', 'A', 'C2', 'E2', 'C1', 'E1', 'S'];
    const g = G.grade(r, { order: sw });
    T.ok(!g.correct && g.analysis.primary.code === 'dependency' && /builds on/.test(g.feedback.notes.join(' ')), 'swapped order rejected with dependency feedback');
    T.ok(G.grade(r, { order: r.solution.order }).correct, 'dependent order accepted');
    ['C:1', 'E*', 'R'].forEach(k => { const i = G.build(idx, { mode: 'identify', modelId: e.id, targetKey: k, seed: 'dep' }); T.eq(i.sentences[2].id, 'C1', 'identify shows the first pair first'); });
    const m = G.build(idx, { mode: 'missing', modelId: e.id, targetKey: 'E2', seed: 'dep' }); T.eq(m.shown[2].id, 'C1', 'missing shows the first pair first');
  });
  // Independent pairs: both orders accepted.
  cidx.entries.filter(e => e.structure !== 'process-chain').slice(0, 300).forEach(e => {
    const r = G.build(idx, { mode: 'rearrange', modelId: e.id, seed: 'ind' });
    T.ok(G.grade(r, { order: ['R', 'A', 'C2', 'E2', 'C1', 'E1', 'S'] }).correct, 'independent pairs accept either order');
  });
});

T.suite('difficulty progression', () => {
  const m = {};
  LEVELS.forEach(level => {
    const g = new G.Generator(bundle, 'diff|' + level, { compose: lib });
    let words = 0, facts = 0, n = 0, inference = 0, multiCondition = 0, conclusionNotSimple = 0;
    const INFER = ['design-select-features', 'design-compare-settings', 'design-priority', 'design-tradeoff', 'design-unfair-test', 'design-competing', 'process-condition-loss', 'process-chain', 'process-bottleneck', 'process-rate-confound', 'observation-prediction', 'observation-competing', 'observation-pattern', 'design-two-tests', 'design-removal'];
    const MULTI = ['design-priority', 'design-tradeoff', 'design-unfair-test', 'design-competing', 'process-chain', 'process-bottleneck', 'process-rate-confound', 'observation-competing'];
    for (let i = 0; i < 600; i++) {
      const ch = g.next({ mode: 'identify', level }); if (!ch.generated) continue;
      n++; words += V.wordCount(ch.excerpt); facts += ch.excerpt.split(/[.?!]\s/).length;
      if (INFER.includes(ch.structure)) inference++;
      if (MULTI.includes(ch.structure)) multiCondition++;
      if (/\bnot\b|does not|would not|ruled out|better/.test(ch.info.A.text)) conclusionNotSimple++;
    }
    m[level] = { sampled: n, meanWords: words / n, meanSentences: facts / n, inferenceShare: inference / n, multiConditionShare: multiCondition / n, qualifiedClaimShare: conclusionNotSimple / n };
  });
  T.ok(m.beginner.inferenceShare < m.intermediate.inferenceShare && m.intermediate.inferenceShare <= m.advanced.inferenceShare, 'inference-requiring structures rise with difficulty');
  T.ok(m.beginner.multiConditionShare === 0 && m.intermediate.multiConditionShare === 0 && m.advanced.multiConditionShare > 0.7, 'multi-condition/competing reasoning is Advanced-only');
  T.ok(m.beginner.meanSentences < m.advanced.meanSentences, 'Advanced passages carry more facts to sort through');
  T.ok(m.beginner.qualifiedClaimShare < m.advanced.qualifiedClaimShare, 'Advanced claims are more often qualified or comparative');
  out.difficulty = m;
});

T.suite('topic and subject filters with generated content', () => {
  const g = new G.Generator(bundle, 'filters', { compose: lib });
  const av = g.availability({ subject: 'Earth science', topics: ['water-cycle'] });
  LEVELS.forEach(l => T.ok(av[l] >= 20, 'water-cycle ' + l + ' capacity ' + av[l]));
  for (let i = 0; i < 60; i++) { const c = g.next({ mode: 'mixed', level: 'all', subject: 'Earth science', topics: ['water-cycle'] }); T.eq(c.topicId, 'water-cycle', 'single topic honored'); }
  for (let i = 0; i < 60; i++) { const c = g.next({ mode: 'mixed', level: 'all', subject: 'all', topics: ['lightning', 'rust'] }); T.ok(['lightning', 'rust'].includes(c.topicId), 'multi-topic honored'); }
  let rejected = false; try { g.next({ mode: 'mixed', level: 'advanced', subject: 'Physics', topics: ['water-cycle'] }); } catch (e) { rejected = /No writing models/.test(e.message); }
  T.ok(rejected, 'cross-subject mismatch still rejected, never substituted');
  const long = new G.Generator(bundle, 'reach-all', { compose: lib }); const seen = new Set();
  for (let i = 0; i < 3000; i++) { const c = long.next({ mode: 'mixed', level: 'all' }); if (!c.generated) seen.add(c.modelId); }
  T.eq(seen.size, bundle.models.length, 'all authored models remain reachable in a long hybrid session');
});

T.suite('safety net: a configuration that cannot be built is quarantined, never shown as an error', () => {
  const g = new G.Generator(bundle, 'safety', { compose: lib });
  const bad = g.index.compose.entries.find(e => e.topicId === 'cactus' && e.level === 'beginner');
  const orig = C.buildResponse;
  C.buildResponse = function (ci, id) { if (id === bad.id) throw new Error('forced failure'); return orig.apply(this, arguments); };
  let ok = 0;
  try { for (let i = 0; i < 200; i++) { const c = g.next({ mode: 'mixed', level: 'beginner', subject: 'Plants and animals', topics: ['cactus'] }); T.ok(c.modelId !== bad.id, 'broken configuration never served'); ok++; } }
  catch (e) { T.ok(false, 'generator threw: ' + e.message); }
  finally { C.buildResponse = orig; }
  T.eq(ok, 200, '200 challenges served despite a broken configuration');
  T.ok(g.quarantine && g.quarantine[bad.id], 'broken configuration quarantined');
});

T.suite('legacy-subject generator output stays deterministic without the compositional library', () => {
  const legacyTopics = bundle.topics.filter(t => !t.id.startsWith('math-'));
  const legacyIds = new Set(legacyTopics.map(t => t.id));
  const legacyBundle = Object.assign({}, bundle, { topics: legacyTopics, models: bundle.models.filter(m => legacyIds.has(m.topicId)) });
  const plain = M.indexBundle(legacyBundle); const h = crypto.createHash('sha256'); let n = 0;
  for (const m of legacyBundle.models) for (const mode of MODES) for (const k of G.targetKeysFor(mode)) for (let s = 0; s < 3; s++) { h.update(JSON.stringify(G.build(plain, { mode, modelId: m.id, targetKey: k, seed: 'id' + s }))); n++; }
  for (const lv of ['all', 'beginner', 'advanced']) for (const mode of ['mixed', 'identify', 'rearrange', 'missing']) { const g = new G.Generator(legacyBundle, 'p' + lv + mode); for (let i = 0; i < 150; i++) { h.update(JSON.stringify(g.next({ mode, level: lv }))); n++; } }
  const expect = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'legacy-output-hash.txt'), 'utf8').trim();
  T.eq(n + ' ' + h.digest('hex'), expect, 'legacy-subject regression hash matches');
});

const sum = T.summary();
T.write('compose-results.json', Object.assign(out, { summary: sum }));
console.log('Compositional checks:', sum.totalChecks, 'failed:', sum.failedChecks);
sum.suites.forEach(s => console.log(' -', s.name, s.checks, 'checks', s.failed ? 'FAILED ' + s.failed : 'ok', s.sampleFailures.slice(0, 3).join(' | ').slice(0, 600)));
process.exit(sum.failedChecks ? 1 : 0);
