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
  var HISTORY_MAX = 120;

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
    this.seenModels = []; // bounded by the authored content pool; supports honest review labels after history rolls over
  }

  Generator.prototype.restore = function (history, seenModels) {
    this.history = (history || []).slice(-HISTORY_MAX);
    var allowed = this.bundle.models.map(function (m) { return m.id; });
    var prior = Array.isArray(seenModels) ? seenModels : [];
    this.seenModels = Array.from(new Set(prior.concat(this.history.map(function (e) { return e.modelId; })).filter(function (id) { return allowed.indexOf(id) >= 0; })));
  };

  Generator.prototype.getSeenModels = function () { return this.seenModels.slice(); };

  function countIn(list, pred) { var n = 0; for (var i = 0; i < list.length; i++) if (pred(list[i])) n++; return n; }

  Generator.prototype._pickLeast = function (items, countFn, rng) {
    var best = null, bestScore = Infinity;
    items.forEach(function (it) {
      var s = countFn(it) + rng.next() * 0.01;
      if (s < bestScore) { bestScore = s; best = it; }
    });
    return best;
  };

  Generator.prototype.setSelection = function (selection) {
    selection = selection || {};
    var allowed = this.bundle.topics.map(function (t) { return t.id; });
    var topicIds = Array.isArray(selection.topics) ? selection.topics.filter(function (id) { return allowed.indexOf(id) >= 0; }) : null;
    this.selection = {
      subject: selection.subject && selection.subject !== 'all' ? selection.subject : 'all',
      topics: topicIds && topicIds.length ? topicIds : null
    };
    return this.selection;
  };

  Generator.prototype.availableModels = function (selection, level) {
    var pick = selection || this.selection || { subject: 'all', topics: null };
    var topicSet = pick.topics ? pick.topics : null;
    var topics = this.bundle.topics;
    var allowedTopics = topics.filter(function (t) {
      return (!topicSet || topicSet.indexOf(t.id) >= 0) && (!pick.subject || pick.subject === 'all' || t.subject === pick.subject);
    }).map(function (t) { return t.id; });
    var allowed = this.bundle.models.filter(function (m) {
      return allowedTopics.indexOf(m.topicId) >= 0 && (!level || level === 'all' || m.level === level);
    });
    return allowed;
  };

  Generator.prototype.availability = function (selection) {
    var self = this, counts = {};
    Structure.LEVELS.forEach(function (level) { counts[level] = self.availableModels(selection, level).length; });
    return counts;
  };

  /* opts: { mode, level, subject, topics }. Topic ids constrain the model pool without changing mode or scoring. */
  Generator.prototype.next = function (opts) {
    opts = opts || {};
    var selected = (opts.subject !== undefined || opts.topics !== undefined)
      ? this.setSelection({ subject: opts.subject, topics: opts.topics })
      : (this.selection || this.setSelection({}));
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
    var availableLevels = Structure.LEVELS.filter(function (l) { return this.availableModels(selected, l).length > 0; }, this);
    if (!availableLevels.length) throw new Error('No writing models match the selected content and difficulty. Broaden the topic selection or choose another difficulty.');
    if (level === 'all') {
      var recentLv = h.slice(-9);
      level = this._pickLeast(availableLevels, function (l) { return countIn(recentLv, function (e) { return e.level === l; }); }, rng);
    } else if (availableLevels.indexOf(level) < 0) {
      throw new Error('No ' + level + ' writing models match the selected content. Broaden the topic selection or choose another difficulty.');
    }

    // 3. Writing model: hard-exclude recent models, then penalize repeated topic / family / heavy use.
    var all = this.availableModels(selected, level);
    var seenModels = this.seenModels;
    var unseen = all.filter(function (m) { return seenModels.indexOf(m.id) < 0; });
    // Visit every eligible underlying problem before entering review. A filtered pool never
    // borrows a passage from an unrelated topic to hide exhaustion.
    var cands = unseen.length ? unseen : all;
    if (!unseen.length && mode === 'rearrange') {
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
    var wasUsed = seenModels.indexOf(model.id) >= 0;
    ch.pool = { models: all.length, unseenBefore: unseen.length, review: wasUsed, label: wasUsed ? 'Review practice' : 'New writing problem' };
    if (!wasUsed) this.seenModels.push(model.id);
    h.push({ mode: mode, level: level, modelId: model.id, topicId: model.topicId, passageId: ch.passageId, family: model.family, key: key, role: ch.role, signature: ch.signature });
    if (h.length > HISTORY_MAX) h.splice(0, h.length - HISTORY_MAX);
    return ch;
  };

  Generator.prototype.build = function (spec) { return build(this.index, spec); };

  function grade(ch, answer) { return MODE_IMPL[ch.mode].grade(ch, answer); }

  return { Generator: Generator, build: build, grade: grade, targetKeysFor: targetKeysFor, HISTORY_MAX: HISTORY_MAX, MODE_IMPL: MODE_IMPL };
});
