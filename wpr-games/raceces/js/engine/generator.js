/* Challenge generator: seeded, source-grounded, with bounded recent-history rotation. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./rng.js'), require('./structure.js'), require('./model.js'),
      require('./identify.js'), require('./rearrange.js'), require('./missing.js'));
  } else {
    root.RACECES = root.RACECES || {};
    var R = root.RACECES;
    R.Generator = factory(R.RNG, R.Structure, R.Model, R.Identify, R.Rearrange, R.Missing);
  }
})(typeof self !== 'undefined' ? self : this, function (RNG, Structure, Model, Identify, Rearrange, Missing) {
  'use strict';

  var MODE_IMPL = { identify: Identify, rearrange: Rearrange, missing: Missing };
  var HISTORY_MAX = 60;

  function targetKeysFor(mode) {
    if (mode === 'identify') return Identify.TARGETS;
    if (mode === 'missing') return Missing.SLOT_KEYS;
    return [null];
  }

  /* Deterministic single-challenge construction. Used by gameplay and by every test. */
  function build(index, spec) {
    var rng = RNG.create(spec.seed + '|' + spec.mode + '|' + spec.modelId + '|' + (spec.targetKey || ''));
    var resp = Model.buildResponse(index, spec.modelId, rng.fork('response'));
    var impl = MODE_IMPL[spec.mode];
    var o = {};
    if (spec.mode === 'identify') o.targetKey = spec.targetKey;
    if (spec.mode === 'missing') o.slot = spec.targetKey;
    var ch = impl.generate(resp, rng.fork('mode'), o);
    ch.id = spec.mode + ':' + spec.modelId + ':' + (spec.targetKey || '-') + ':' + spec.seed;
    ch.seed = spec.seed;
    return ch;
  }

  function Generator(bundle, seed) {
    this.index = Model.indexBundle(bundle);
    this.bundle = bundle;
    this.seed = String(seed === undefined ? 'raceces' : seed);
    this.n = 0;
    this.history = []; // bounded: {mode, level, modelId, topicId, family, key}
  }

  Generator.prototype.restore = function (history) {
    this.history = (history || []).slice(-HISTORY_MAX);
  };

  function countIn(list, pred) { var n = 0; for (var i = 0; i < list.length; i++) if (pred(list[i])) n++; return n; }

  Generator.prototype._pickLeast = function (items, countFn, rng) {
    var best = null, bestScore = Infinity;
    items.forEach(function (it) {
      var s = countFn(it) + rng.next() * 0.01;
      if (s < bestScore) { bestScore = s; best = it; }
    });
    return best;
  };

  /* opts: { mode: 'identify'|'rearrange'|'missing'|'mixed', level: 'beginner'|'intermediate'|'advanced'|'all' } */
  Generator.prototype.next = function (opts) {
    opts = opts || {};
    var rng = RNG.create(this.seed + '#' + this.n);
    this.n++;
    var h = this.history;

    // 1. Mode (Mixed Practice distributes across all three modes).
    var mode = opts.mode || 'mixed';
    if (mode === 'mixed') {
      var recentModes = h.slice(-9);
      mode = this._pickLeast(Structure.MODES, function (m) { return countIn(recentModes, function (e) { return e.mode === m; }); }, rng);
    }

    // 2. Level.
    var level = opts.level || 'all';
    if (level === 'all') {
      var recentLv = h.slice(-9);
      level = this._pickLeast(Structure.LEVELS, function (l) { return countIn(recentLv, function (e) { return e.level === l; }); }, rng);
    }

    // 3. Writing model: hard-exclude recent models, then penalize repeated topic / family / heavy use.
    var all = this.index.modelsByLevel[level] || [];
    var K = Math.max(0, Math.min(8, all.length - 2));
    var recentModels = h.slice(-K).map(function (e) { return e.modelId; });
    var cands = all.filter(function (m) { return recentModels.indexOf(m.id) < 0; });
    if (!cands.length) cands = all;
    if (mode === 'rearrange') {
      // Rearrange has one signature per writing model, so avoid models seen in this mode within the last 30 challenges.
      var seenRe = h.slice(-30).filter(function (e) { return e.mode === 'rearrange'; }).map(function (e) { return e.modelId; });
      var fresh = cands.filter(function (m) { return seenRe.indexOf(m.id) < 0; });
      if (fresh.length) cands = fresh;
    }
    var last3 = h.slice(-3), last2 = h.slice(-2);
    var model = this._pickLeast(cands, function (m) {
      return 3 * countIn(last3, function (e) { return e.family === m.family; }) +
             2 * countIn(last2, function (e) { return e.topicId === m.topicId; }) +
             0.4 * countIn(h, function (e) { return e.modelId === m.id; }) +
             0.3 * countIn(h, function (e) { return e.family === m.family; }) +
             0.15 * countIn(h, function (e) { return e.topicId === m.topicId; });
    }, rng);

    // 4. Target (role) — least recently used for this mode, never the same signature as a recent challenge.
    var keys = targetKeysFor(mode);
    var key = null;
    if (keys[0] !== null) {
      var recentSame = h.filter(function (e) { return e.mode === mode; });
      var recentSigs = h.slice(-30).map(function (e) { return e.mode + '|' + e.modelId + '|' + e.key; });
      var lastRole = recentSame.length ? recentSame[recentSame.length - 1].role : null;
      var pool = keys.filter(function (k) { return recentSigs.indexOf(mode + '|' + model.id + '|' + k) < 0; });
      if (!pool.length) pool = keys;
      var notSameRole = pool.filter(function (k) { return k.charAt(0) !== lastRole; });
      if (notSameRole.length) pool = notSameRole;
      key = this._pickLeast(pool, function (k) {
        var idx = -1;
        for (var i = recentSame.length - 1; i >= 0; i--) if (recentSame[i].key === k) { idx = recentSame.length - i; break; }
        // never used = 0 penalty; recently used = high penalty
        return idx < 0 ? 0 : 1 + 1 / idx;
      }, rng);
    }

    var ch = build(this.index, { mode: mode, modelId: model.id, targetKey: key, seed: this.seed + '#' + (this.n - 1) });
    h.push({ mode: mode, level: level, modelId: model.id, topicId: model.topicId, family: model.family, key: key, role: ch.role });
    if (h.length > HISTORY_MAX) h.splice(0, h.length - HISTORY_MAX);
    return ch;
  };

  Generator.prototype.build = function (spec) { return build(this.index, spec); };

  function grade(ch, answer) { return MODE_IMPL[ch.mode].grade(ch, answer); }

  return { Generator: Generator, build: build, grade: grade, targetKeysFor: targetKeysFor, HISTORY_MAX: HISTORY_MAX, MODE_IMPL: MODE_IMPL };
});
