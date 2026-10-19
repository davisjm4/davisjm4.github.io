/* String Lab — deterministic, seedable procedural challenge generator.
 *
 *   generateChallenge({ seed, mode, difficulty, family? })   pure: same input -> identical challenge
 *   createSession({ seed, mode, difficulty })                 endless practice with anti-repetition memory
 *
 * A "reasoning family" (see families-*.js) is a parameterised program-builder, not a question bank.
 * Each build() draws words, positions, search targets, operands, variable names and statement sequences
 * from a seeded RNG. Every draft is then ASSEMBLED and VALIDATED here:
 *   - the program must evaluate with real Java semantics (no out-of-range index, no invalid substring bounds, ...)
 *   - its measured difficulty (difficulty.js) must equal the requested difficulty
 *   - no statement may be dead code
 *   - distractors must be unique, valid, and realistic
 * Drafts that fail are discarded and rebuilt from a fresh sub-stream (still deterministic).
 */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});
  var J = SL.J, E = SL.Evaluator, D = SL.Distractors, DF = SL.Difficulty, H = SL.GenHelpers, Rng = SL.Rng;

  var VERSION = '1.0.0';
  var MODES = [
    { id: 'predict', label: 'Predict the Output', short: 'Predict' },
    { id: 'index', label: 'Find the Index', short: 'Index' },
    { id: 'expr', label: 'Complete the Expression', short: 'Complete' },
    { id: 'trace', label: 'Trace String Operations', short: 'Trace' }
  ];
  var SKILLS = ['Concatenation', 'Length', 'Character Indexing', 'Substrings', 'Searching', 'String Immutability', 'Multi-Step String Tracing'];
  var LEVELS = DF.LEVELS;

  function familiesFor(mode, lvl) {
    return H.families.filter(function (f) { return f.mode === mode && f.levels.indexOf(lvl) >= 0; });
  }
  function familyById(id) {
    for (var i = 0; i < H.families.length; i++) if (H.families[i].id === id) return H.families[i];
    return null;
  }

  /** Every untagged non-print statement must matter: removing it changes the result or breaks the program. */
  function noDeadStatements(stmts, output) {
    for (var i = 0; i < stmts.length; i++) {
      var s = stmts[i];
      if (s.tag || s.s === 'print') continue;
      var cut = stmts.filter(function (_, j) { return j !== i; });
      var res = E.evaluate(cut);
      if (res.ok && res.output === output) return false;
    }
    return true;
  }

  function signatures(fam, lvl, stmts, prompt) {
    var map = {}, n = 0;
    stmts.forEach(function (s) { if (s.name && !(s.name in map)) map[s.name] = 'v' + (n++); });
    var lines = J.render.program(J.rename(stmts, map));
    var shape = lines.map(function (l) { return l.replace(/"[^"]*"/g, '"S"').replace(/'.'/g, "'C'"); }).join(';');
    var p = prompt || '';
    Object.keys(map).forEach(function (old) { p = p.replace(new RegExp('\\b' + old + '\\b', 'g'), map[old]); });
    return { shape: fam.id + '|' + lvl + '|' + shape, exact: fam.id + '|' + lvl + '|' + lines.join(';') + '|' + p };
  }

  /** At least one distractor must be a realistic misconception, not just a nearby value. */
  function hasRealMisconception(fin) {
    return fin.choices.some(function (c) { return !c.correct && c.misc && c.misc !== 'near'; });
  }

  function assemble(fam, draft, lvl, r, seed) {
    var base = {
      id: fam.id + ':' + lvl + ':' + seed, seed: seed, mode: fam.mode, difficulty: lvl, family: fam.id, familyLabel: fam.label,
      skill: fam.skill, rule: fam.rule, version: VERSION
    };
    var res, metrics, fin, o, probes;
    if (draft.type === 'output') {
      res = E.evaluate(draft.stmts, { events: true });
      if (!res.ok) return null;
      o = res.output;
      if (o === null || o === '' || o !== o.trim() || o.length > 40) return null;
      metrics = DF.analyze(draft.stmts, res, 0);
      if (DF.classify(metrics) !== lvl) return null;
      if (!noDeadStatements(draft.stmts, o)) return null;
      var cands = D.variantCandidates(draft.stmts, o).concat(draft.extra || []).concat(D.nearCandidates(o, /^-?\d+$/.test(o)));
      fin = D.finalize(o, cands, r, { kind: 'output' });
      if (!fin || !hasRealMisconception(fin)) return null;
      var sig = signatures(fam, lvl, draft.stmts, '');
      return Object.assign(base, {
        code: J.render.program(draft.stmts), prompt: fam.mode === 'trace' ? 'What is printed when this code runs?' : 'What does this code print?',
        goal: null, choices: fin.choices, correctIndex: fin.correctIndex, answer: o, metrics: metrics, signature: sig,
        traceStmts: draft.stmts, probes: [{ label: 'program', code: J.render.program(draft.stmts), expect: o, kind: 'correct' }]
      });
    }
    // custom drafts (Modes B and C)
    res = E.evaluate(draft.analysis, { events: true });
    if (!res.ok) return null;
    metrics = DF.analyze(draft.analysis, res, draft.twists || 0);
    if (DF.classify(metrics) !== lvl) return null;
    if (!noDeadStatements(draft.analysis, res.output)) return null;
    fin = D.finalize(draft.answer, draft.candidates, r, { kind: draft.choiceKind });
    if (!fin || !hasRealMisconception(fin)) return null;
    var chosen = {};
    fin.choices.forEach(function (c) { chosen[c.text] = c; });
    probes = [];
    for (var i = 0; i < draft.probes.length; i++) {
      var p = draft.probes[i];
      if (p.text !== null && !chosen[p.text]) continue;
      var pr = E.evaluate(p.stmts);
      if (!pr.ok || pr.output !== p.expect) return null;
      if (p.kind === 'distractor' && p.text === draft.answer) return null;
      if (chosen[p.text]) chosen[p.text].result = p.expect;
      probes.push({ label: p.text === null ? 'support' : p.text, code: J.render.program(p.stmts), expect: p.expect, kind: p.kind });
    }
    var correctProbe = probes.filter(function (p) { return p.kind === 'correct'; });
    if (correctProbe.length !== 1) return null;
    var tr = draft.probes.filter(function (p) { return p.kind === 'correct'; })[0].stmts;
    var sig2 = signatures(fam, lvl, draft.analysis, draft.prompt);
    return Object.assign(base, {
      code: J.render.program(draft.stmts), prompt: draft.prompt, goal: draft.goal || null, choices: fin.choices, correctIndex: fin.correctIndex,
      answer: draft.answer, metrics: metrics, signature: sig2, traceStmts: tr, probes: probes, kindDetail: draft.kind, meta: draft.meta || {}
    });
  }

  function generateChallenge(opts) {
    var lvl = opts.difficulty, seed = opts.seed;
    if (LEVELS.indexOf(lvl) < 0) throw new Error('bad difficulty ' + lvl);
    var pool = familiesFor(opts.mode, lvl);
    if (!pool.length) throw new Error('no families for ' + opts.mode + '/' + lvl);
    var rng = new Rng(String(seed) + '|' + opts.mode + '|' + lvl);
    var fam = opts.family ? familyById(opts.family) : rng.fork('family').weighted(pool, function (f) { return f.weight || 1; });
    if (!fam || fam.levels.indexOf(lvl) < 0 || fam.mode !== opts.mode) throw new Error('family mismatch');
    for (var attempt = 0; attempt < 120; attempt++) {
      var r = rng.fork('try' + attempt);
      var draft = fam.build(r, lvl);
      if (!draft) continue;
      var ch = assemble(fam, draft, lvl, r.fork('assemble'), seed);
      if (ch) { ch.attempts = attempt + 1; return ch; }
    }
    throw new Error('generator could not build ' + fam.id + ' @ ' + lvl + ' for seed ' + seed);
  }

  /** Endless practice with memory: avoids repeating families, shapes and exact questions. */
  function createSession(opts) {
    var master = new Rng('session|' + (opts.seed === undefined ? 1 : opts.seed));
    var settings = { mode: opts.mode || 'mixed', difficulty: opts.difficulty || 'beginner' };
    var history = [], seenExact = {};
    var RECENT_SHAPES = 4;

    function pickMode() {
      if (settings.mode !== 'mixed') return settings.mode;
      var lastMode = history.length ? history[history.length - 1].mode : null;
      var pool = MODES.map(function (m) { return m.id; }).filter(function (m) { return m !== lastMode; });
      return master.pick(pool);
    }
    function next() {
      var mode = pickMode(), lvl = settings.difficulty, pool = familiesFor(mode, lvl);
      var sameCtx = history.filter(function (h) { return h.mode === mode && h.difficulty === lvl; });
      var avoidN = Math.min(3, Math.max(0, pool.length - 1));
      var recentFam = sameCtx.slice(-avoidN).map(function (h) { return h.family; });
      var shapeWindow = Math.min(RECENT_SHAPES, Math.max(1, pool.length - 1));
      var recentShapes = history.slice(-shapeWindow).map(function (h) { return h.signature.shape; });
      var last = null;
      for (var t = 0; t < 30; t++) {
        var cands = pool.filter(function (f) { return recentFam.indexOf(f.id) < 0; });
        var fam = master.weighted(cands.length ? cands : pool, function (f) { return f.weight || 1; });
        var seed = master.int(1, 2147483646);
        var ch;
        try { ch = generateChallenge({ seed: seed, mode: mode, difficulty: lvl, family: fam.id }); } catch (e) { continue; }
        last = ch;
        if (seenExact[ch.signature.exact]) continue;
        if (recentShapes.indexOf(ch.signature.shape) >= 0 && t < 25) continue;
        break;
      }
      if (!last) throw new Error('session generator failed');
      seenExact[last.signature.exact] = true;
      history.push({ mode: last.mode, difficulty: last.difficulty, family: last.family, signature: last.signature });
      return last;
    }
    return {
      next: next,
      setMode: function (m) { settings.mode = m; },
      setDifficulty: function (d) { settings.difficulty = d; },
      settings: function () { return { mode: settings.mode, difficulty: settings.difficulty }; },
      history: function () { return history.slice(); }
    };
  }

  SL.Generator = {
    VERSION: VERSION, MODES: MODES, SKILLS: SKILLS, LEVELS: LEVELS,
    generateChallenge: generateChallenge, createSession: createSession,
    families: function () { return H.families.slice(); }, familiesFor: familiesFor, familyById: familyById
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
