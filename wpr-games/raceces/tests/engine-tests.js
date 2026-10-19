const fs = require('fs');
const path = require('path');
const T = require('./lib.js');
const G = require('../js/engine/generator.js');
const M = require('../js/engine/model.js');
const V = require('../js/engine/validator.js');
const RNG = require('../js/engine/rng.js');
const Struct = require('../js/engine/structure.js');
const Rearr = require('../js/engine/rearrange.js');
const Sess = require('../js/engine/session.js');
const bundle = require('../js/data/content-bundle.js');
const idx = M.indexBundle(bundle);

function perms(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  arr.forEach((x, i) => perms(arr.slice(0, i).concat(arr.slice(i + 1))).forEach(p => out.push([x].concat(p))));
  return out;
}

function runEngineTests() {
  const extra = { rotation: null };

  T.suite('content', () => {
    const r = V.validateContent(bundle);
    T.ok(r.errors.length === 0, 'content errors: ' + r.errors.slice(0, 5).join(' | '));
    T.ok(bundle.models.length >= 30, 'at least 30 writing models');
    T.ok(bundle.families.length >= 8, 'at least 8 reasoning families');
    Struct.LEVELS.forEach(l => T.ok(bundle.models.filter(m => m.level === l).length >= 10, 'at least 10 models at ' + l));
    bundle.models.forEach(m => {
      const t = idx.topicsById[m.topicId];
      m.ev.forEach(fid => T.ok(t.factsById[fid], m.id + ' evidence fact exists'));
      T.ok(m.ev[0] !== m.ev[1], m.id + ' has two distinct evidence facts');
    });
  });

  T.suite('determinism', () => {
    bundle.models.forEach(m => {
      ['identify', 'rearrange', 'missing'].forEach(mode => {
        const k = G.targetKeysFor(mode)[0];
        const a = G.build(idx, { mode, modelId: m.id, targetKey: k, seed: 'det' });
        const b = G.build(idx, { mode, modelId: m.id, targetKey: k, seed: 'det' });
        T.ok(JSON.stringify(a) === JSON.stringify(b), m.id + '/' + mode + ' same seed gives identical challenge');
      });
    });
    const g1 = new G.Generator(bundle, 'abc'), g2 = new G.Generator(bundle, 'abc'), g3 = new G.Generator(bundle, 'xyz');
    let same = true, diff = false;
    for (let i = 0; i < 80; i++) {
      const a = g1.next({ mode: 'mixed', level: 'all' }), b = g2.next({ mode: 'mixed', level: 'all' }), c = g3.next({ mode: 'mixed', level: 'all' });
      if (JSON.stringify(a) !== JSON.stringify(b)) same = false;
      if (a.id !== c.id) diff = true;
    }
    T.ok(same, 'generators with the same seed produce the same sequence');
    T.ok(diff, 'different seeds produce different sequences');
    // Different seeds must vary more than just shuffle order: option sets and prompts vary across seeds.
    const prompts = new Set(), orders = new Set();
    for (let s = 0; s < 60; s++) {
      prompts.add(G.build(idx, { mode: 'identify', modelId: 'honeybees-m1', targetKey: 'E:1', seed: 's' + s }).prompt);
      orders.add(G.build(idx, { mode: 'rearrange', modelId: 'honeybees-m1', targetKey: null, seed: 's' + s }).items.map(i => i.id).join());
    }
    T.ok(prompts.size >= 2, 'prompt wording varies by seed');
    T.ok(orders.size >= 20, 'starting orders vary by seed');
  });

  T.suite('source grounding', () => {
    bundle.models.forEach(m => {
      for (let s = 0; s < 5; s++) {
        const resp = M.buildResponse(idx, m.id, RNG.create('g' + s));
        ['C1', 'C2'].forEach(c => {
          const sent = resp.sentences[c];
          T.ok(sent.factId && sent.source, m.id + ' ' + c + ' keeps its source-fact reference');
          T.ok(resp.excerpt.indexOf(sent.source) >= 0, m.id + ' ' + c + ' source fact is in the excerpt');
        });
        T.ok(resp.excerpt.indexOf(idx.topicsById[m.topicId].factsById[m.off].text) >= 0, m.id + ' off-topic fact is in the excerpt');
        T.ok(resp.sentences.E1.explains === 'C1' && resp.sentences.E2.explains === 'C2', m.id + ' explanations keep their evidence link');
        const n = V.wordCount(resp.excerpt);
        T.ok(n >= V.WORD_LIMITS[m.level][0] && n <= V.WORD_LIMITS[m.level][1], m.id + ' excerpt length in range');
      }
    });
  });

  T.suite('rearrange grader (exhaustive)', () => {
    const c = Struct.canonicalOrders();
    bundle.models.forEach(m => {
      const ch = G.build(idx, { mode: 'rearrange', modelId: m.id, targetKey: null, seed: 'perm' });
      let valid = 0;
      perms(Struct.SLOTS).forEach(p => {
        const got = Rearr.analyze(p, ch.info).valid;
        // Independent oracle: exactly the two pair-swapped canonical orders are valid.
        const want = p.join() === c[0].join() || p.join() === c[1].join();
        if (got) valid++;
        if (got !== want) T.ok(false, m.id + ' grader disagrees with oracle on ' + p.join());
      });
      T.eq(valid, 2, m.id + ' number of accepted permutations out of 5040');
    });
    T.ok(true, 'exhaustive permutation check complete');
  });

  T.suite('rearrange feedback', () => {
    const ch = G.build(idx, { mode: 'rearrange', modelId: 'solar-panels-m1', targetKey: null, seed: 'fb' });
    const c = ch.solution.order;
    const cases = {
      'E before its C': ['R', 'A', 'E1', 'C1', 'C2', 'E2', 'S'],
      'mismatched explanation': ['R', 'A', 'C1', 'E2', 'C2', 'E1', 'S'],
      'two evidence in a row': ['R', 'A', 'C1', 'C2', 'E1', 'E2', 'S'],
      'summary in the middle': ['R', 'A', 'C1', 'E1', 'S', 'C2', 'E2'],
      'answer first': ['A', 'R', 'C1', 'E1', 'C2', 'E2', 'S'],
      'evidence before answer': ['R', 'C1', 'A', 'E1', 'C2', 'E2', 'S'],
      'evidence as ending': ['R', 'A', 'C1', 'E1', 'E2', 'S', 'C2']
    };
    Object.keys(cases).forEach(k => {
      const r = G.grade(ch, { order: cases[k] });
      T.ok(!r.correct, k + ' must be rejected');
      const msg = r.feedback.notes.join(' ');
      T.ok(msg.length > 40, k + ' has a specific explanation');
      T.ok(!/\b(sentence|position)\s*\d/i.test(msg), k + ' never says "sentence 4 belongs in position 6"');
      T.ok(r.feedback.principle.length > 20, k + ' states the RACECES principle');
    });
    const mm = G.grade(ch, { order: cases['mismatched explanation'] }).feedback.notes.join(' ');
    T.ok(mm.indexOf(ch.info.E2.tag) >= 0 && mm.indexOf(ch.info.C1.tag) >= 0, 'pairing feedback names the information involved');
    const ok2 = G.grade(ch, { order: ch.solution.alternate });
    T.ok(ok2.correct && /either order|also be swapped|works too/i.test(ok2.feedback.notes.join(' ')), 'valid swapped order is marked correct with explanation');
    T.ok(!G.grade(ch, { order: c.slice(0, 6) }).correct, 'incomplete order rejected');
    T.ok(!G.grade(ch, { order: c.slice(0, 6).concat(['R']) }).correct, 'duplicate sentence rejected');
  });

  T.suite('identify rules', () => {
    bundle.models.forEach(m => {
      G.targetKeysFor('identify').forEach(k => {
        const ch = G.build(idx, { mode: 'identify', modelId: m.id, targetKey: k, seed: 'id' });
        if (k === 'C*' || k === 'E*') {
          T.eq(ch.solution.ids.length, 2, m.id + ' ' + k + ' accepts both instances');
          T.ok(ch.multi, m.id + ' ' + k + ' is multi-select');
        } else T.ok(!ch.multi && ch.solution.ids.length === 1, m.id + ' ' + k + ' single selection has one target');
        // Both pair orders are valid displays; the answer never depends on display order.
        [[1, 2], [2, 1]].forEach(po => {
          const r = require('../js/engine/identify.js').generate(M.buildResponse(idx, m.id, RNG.create('x')), RNG.create('y'), { targetKey: k, pairOrder: po });
          T.ok(G.grade(r, { selected: r.solution.ids }).correct, m.id + ' ' + k + ' pair order ' + po + ' grades');
        });
      });
    });
  });

  T.suite('missing piece rules', () => {
    const pos = {}, kinds = {};
    bundle.models.forEach(m => {
      G.targetKeysFor('missing').forEach(k => {
        for (let s = 0; s < 6; s++) {
          const ch = G.build(idx, { mode: 'missing', modelId: m.id, targetKey: k, seed: 'ms' + s });
          T.eq(ch.options.length, 4, 'four options');
          T.eq(ch.options.filter(o => o.id === ch.correctId).length, 1, 'one best answer');
          T.eq(ch.shown.filter(x => x.gap).length, 1, 'exactly one gap');
          pos[ch.correctId] = (pos[ch.correctId] || 0) + 1;
          ch.options.forEach(o => { kinds[o.kind] = (kinds[o.kind] || 0) + 1; });
          if (ch.level === 'beginner') T.ok(ch.roleHint, 'beginner shows the missing role');
          else T.ok(!ch.roleHint, 'intermediate/advanced hide the role');
        }
      });
    });
    const total = Object.values(pos).reduce((a, b) => a + b, 0);
    Object.keys(pos).forEach(k => T.ok(pos[k] / total > 0.2 && pos[k] / total < 0.3, 'correct answer position ' + k + ' is balanced (' + Math.round(100 * pos[k] / total) + '%)'));
    ['repeat', 'offExp', 'offFact', 'unsupported', 'summaryLike', 'wrongFocus'].forEach(k => T.ok(kinds[k] > 0, 'distractor type used: ' + k));
    extra.distractorKinds = kinds;
  });

  T.suite('rotation and repetition control', () => {
    const modeCounts = {}, levelCounts = {}, roleCounts = {}, familyCounts = {};
    const g = new G.Generator(bundle, 'rotation');
    const log = [], lastSeen = {}, gaps = [];
    let sameModelBack2 = 0, sameSigIn30 = 0, sameTopicBack1 = 0;
    for (let i = 0; i < 900; i++) {
      const ch = g.next({ mode: 'mixed', level: 'all' });
      log.push(ch);
      modeCounts[ch.mode] = (modeCounts[ch.mode] || 0) + 1;
      levelCounts[ch.level] = (levelCounts[ch.level] || 0) + 1;
      familyCounts[ch.family] = (familyCounts[ch.family] || 0) + 1;
      if (ch.role) roleCounts[ch.role] = (roleCounts[ch.role] || 0) + 1;
      if (i >= 1 && log[i - 1].modelId === ch.modelId) sameModelBack2++;
      if (i >= 2 && log[i - 2].modelId === ch.modelId) sameModelBack2++;
      if (i >= 1 && log[i - 1].topicId === ch.topicId) sameTopicBack1++;
      for (let j = Math.max(0, i - 30); j < i; j++) if (log[j].signature === ch.signature) { sameSigIn30++; break; }
      if (lastSeen[ch.modelId] !== undefined) gaps.push(i - lastSeen[ch.modelId]);
      lastSeen[ch.modelId] = i;
      T.ok(g.history.length <= G.HISTORY_MAX, 'history stays bounded');
    }
    T.eq(sameModelBack2, 0, 'no writing model repeats within the last two challenges');
    T.eq(sameSigIn30, 0, 'no identical semantic signature within 30 challenges');
    T.ok(sameTopicBack1 / 900 < 0.15, 'topics rarely repeat back-to-back (' + sameTopicBack1 + ')');
    Struct.MODES.forEach(m => T.ok(modeCounts[m] / 900 > 0.30 && modeCounts[m] / 900 < 0.37, 'mixed practice mode share ' + m + ' = ' + Math.round(100 * modeCounts[m] / 9) + '%'));
    Struct.LEVELS.forEach(l => T.ok(levelCounts[l] / 900 > 0.30 && levelCounts[l] / 900 < 0.37, 'level share ' + l));
    Struct.ROLES.forEach(r => T.ok(roleCounts[r] > 60, 'role ' + r + ' is practiced regularly (' + roleCounts[r] + ')'));
    bundle.families.forEach(f => T.ok(familyCounts[f] / 900 >= 0.08, 'family ' + f + ' has at least an 8% share (' + Math.round(familyCounts[f] / 9) + '%)'));
    const minGap = Math.min.apply(null, gaps), avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    T.ok(minGap >= 3, 'minimum gap between repeats of a writing model is at least 3 (got ' + minGap + ')');
    // Restoring history continues rotation without an immediate repeat.
    const g2 = new G.Generator(bundle, 'rotation2'); const a = g2.next({ mode: 'identify', level: 'beginner' });
    const g3 = new G.Generator(bundle, 'rotation2b'); g3.restore(g2.history);
    const b = g3.next({ mode: 'identify', level: 'beginner' });
    T.ok(a.modelId !== b.modelId, 'restored history prevents immediate repetition');
    extra.rotation = { challenges: 900, modeCounts, levelCounts, roleCounts, familyCounts, minGap, avgGap: Math.round(avgGap * 10) / 10, sameModelBack2, sameSigIn30, sameTopicBack1 };
  });

  T.suite('level filters', () => {
    Struct.LEVELS.forEach(l => {
      const g = new G.Generator(bundle, 'lv' + l);
      for (let i = 0; i < 60; i++) T.eq(g.next({ mode: 'mixed', level: l }).level, l, 'level filter honored');
    });
    ['identify', 'rearrange', 'missing'].forEach(mode => {
      const g = new G.Generator(bundle, 'm' + mode);
      for (let i = 0; i < 40; i++) T.eq(g.next({ mode, level: 'all' }).mode, mode, 'mode filter honored');
    });
  });

  T.suite('session tracking', () => {
    const mem = {}; const storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
    let t = 1000; const now = () => t;
    const s = new Sess.Session(storage, now);
    s.record({ mode: 'identify', level: 'beginner', role: 'E', correct: true, ms: 12000 });
    s.record({ mode: 'identify', level: 'beginner', role: 'E', correct: false, ms: 9000, category: 'evidence-vs-explanation' });
    s.record({ mode: 'rearrange', level: 'advanced', role: 'R', correct: false, ms: 20000, category: 'restate-vs-answer' });
    s.record({ mode: 'missing', level: 'intermediate', role: 'S', correct: false, ms: 5000, category: 'summary-vs-evidence' });
    const st = s.stats();
    T.eq(st.done, 4, 'done'); T.eq(st.correct, 1, 'correct'); T.eq(st.accuracy, 25, 'accuracy');
    T.eq(st.modes.identify.pct, 50, 'identify accuracy'); T.eq(st.roles.E.pct, 50, 'role accuracy');
    T.eq(st.activeMs, 46000, 'active time');
    T.ok(st.errors.some(e => e.key === 'evidence-vs-explanation'), 'error category tracked');
    const s2 = new Sess.Session(storage, now);
    T.eq(s2.stats().done, 4, 'persists across reloads');
    T.ok(Object.keys(mem).every(k => k.indexOf('raceces-writing-games') === 0), 'uses its own storage namespace');
    T.ok(!/name|email/i.test(Object.values(mem).join('')), 'collects no names or emails');
    s2.reset();
    T.eq(s2.stats().done, 0, 'reset clears stats'); T.eq(Object.keys(mem).length, 0, 'reset clears storage');
    // Long-session stability.
    const s3 = new Sess.Session(storage, now);
    for (let i = 0; i < 6000; i++) s3.record({ mode: Struct.MODES[i % 3], level: Struct.LEVELS[i % 3], role: Struct.ROLES[i % 5], correct: i % 4 !== 0, ms: 15000, category: i % 4 === 0 ? 'other' : null });
    T.eq(s3.stats().done, 6000, 'long session totals');
    T.ok(s3.data.attempts.length <= Sess.MAX_ATTEMPTS, 'attempt log is bounded');
    T.ok(JSON.stringify(s3.data).length < 60000, 'stored session stays small');
    T.eq(s3.stats().accuracy, 75, 'long session accuracy');
    // Corrupt storage never breaks the app.
    mem['raceces-writing-games:v1:session'] = '{not json';
    T.eq(new Sess.Session(storage, now).stats().done, 0, 'corrupt storage falls back to empty session');
    // Active timer.
    let c = 0; const clock = () => c;
    const at = new Sess.ActiveTimer(clock, 30000);
    c = 10000; T.eq(at.elapsed(), 10000, 'timer counts recent activity');
    c = 100000; T.eq(at.elapsed(), 30000, 'timer stops counting after idling');
    at.touch(); c = 110000; T.eq(at.elapsed(), 40000, 'timer resumes after interaction');
    at.setVisible(false); c = 120000; at.setVisible(true); T.eq(at.elapsed(), 40000 + 0, 'hidden time is not counted');
    // Separate storage from the other sites.
    T.ok(Sess.KEY.indexOf('workplace') < 0 && Sess.KEY.indexOf('cs-games') < 0, 'does not share keys with other game sites');
  });

  T.suite('static safety checks', () => {
    const files = [];
    (function walk(d) { fs.readdirSync(d).forEach(f => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); }); })(path.join(__dirname, '..', 'js'));
    files.forEach(f => {
      const src = fs.readFileSync(f, 'utf8');
      const rel = path.relative(path.join(__dirname, '..'), f);
      if (f.indexOf('content-bundle') < 0) {
        T.ok(!/Math\.random/.test(src), rel + ' has no Math.random');
        T.ok(!/\beval\s*\(|new Function\s*\(/.test(src), rel + ' has no eval');
        T.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(src), rel + ' makes no network calls');
        T.ok(!/https?:\/\//.test(src), rel + ' references no external URLs');
      }
    });
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    T.ok(!/<script[^>]+src="https?:/.test(html) && !/<link[^>]+href="https?:/.test(html), 'index.html loads no external resources');
    T.ok(/lang="en"/.test(html), 'html has a language');
  });


  T.suite('color contrast (WCAG)', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
    const v = {}; css.replace(/--([a-z0-9]+):\s*(#[0-9a-fA-F]{6})/g, (m, k, c) => { v[k] = c; });
    const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const pairs = [
      ['text', 'bg', 4.5], ['text', 'panel', 4.5], ['text', 'panel2', 4.5], ['text2', 'bg', 4.5], ['text2', 'panel', 4.5], ['text2', 'panel2', 4.5],
      ['gold', 'panel', 4.5], ['gold', 'bg', 4.5], ['teal', 'panel', 3], ['border', 'bg', 1.5],
      ['#05211e', 'teal', 4.5], ['#2b0e07', 'coral', 4.5], ['#1a1405', 'gold', 4.5],
      ['#07131c', 'r', 4.5], ['#07131c', 'a', 4.5], ['#07131c', 'c', 4.5], ['#07131c', 'e', 4.5], ['#07131c', 's', 4.5],
      ['gold', 'panel2', 3]
    ];
    const out = [];
    pairs.forEach(([a, b, min]) => {
      const A = a.charAt(0) === '#' ? a : v[a], B = b.charAt(0) === '#' ? b : v[b];
      const r = ratio(A, B); out.push({ fg: a, bg: b, ratio: Math.round(r * 100) / 100, min });
      T.ok(r >= min, a + ' on ' + b + ' contrast ' + r.toFixed(2) + ' >= ' + min);
    });
    extra.contrast = out;
  });

  return extra;
}
module.exports = { runEngineTests };
if (require.main === module) {
  runEngineTests();
  const s = T.summary(); console.log(JSON.stringify(s, null, 1)); process.exit(s.failedChecks ? 1 : 0);
}
