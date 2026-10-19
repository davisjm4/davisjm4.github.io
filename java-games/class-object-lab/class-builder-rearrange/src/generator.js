/* Challenge generator: class model + canonical solution + controlled shuffle (initial layout).
   generateChallenge(seed, difficulty, opts) is pure and seeded. createGenerator() adds recent-history tracking. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./rng.js'), require('./concepts.js'), require('./java-model.js'), require('./arrangement.js'), require('./validator.js'));
  } else {
    var C = root.CBR = root.CBR || {};
    C.generator = factory(C.rng, C.concepts, C.javaModel, C.arrangement, C.validator);
  }
})(typeof self !== 'undefined' ? self : this, function (rngLib, conceptLib, jm, A, V) {
  'use strict';

  var DIFFICULTIES = {
    beginner:     { label: 'Beginner',     fields: 1, blockMoves: [2, 2], stmtMoves: [1, 2] },
    intermediate: { label: 'Intermediate', fields: 2, blockMoves: [3, 4], stmtMoves: [3, 4] },
    advanced:     { label: 'Advanced',     fields: 3, blockMoves: [5, 7], stmtMoves: [6, 8] }
  };

  function typeSeq(fields) { return fields.map(function (f) { return f.type; }).join(','); }
  function fieldSetKey(className, fields) { return className + ':' + fields.map(function (f) { return f.name; }).sort().join(','); }

  /* ---------- choose class + fields ---------- */
  function chooseConcept(rng, n, opts) {
    var avoidClasses = opts.avoidClasses || [];
    var avoidSets = opts.avoidFieldSets || [];
    var avoidSeqs = opts.avoidTypeSeqs || [];
    var pool = conceptLib.CONCEPTS.filter(function (c) { return avoidClasses.indexOf(c.className) === -1; });
    if (!pool.length) pool = conceptLib.CONCEPTS;
    var best = null;
    for (var attempt = 0; attempt < 40; attempt++) {
      var concept = rng.pick(pool);
      var chosen = rng.sample(concept.fields, n);
      if (rng.chance(0.7)) chosen.sort(function (a, b) { return concept.fields.indexOf(a) - concept.fields.indexOf(b); });
      var seqOk = avoidSeqs.indexOf(typeSeq(chosen)) === -1;
      var setOk = avoidSets.indexOf(fieldSetKey(concept.className, chosen)) === -1;
      var names = chosen.map(function (f) { return f.name; });
      var unique = names.every(function (nm, i) { return names.indexOf(nm) === i; });
      if (!unique) continue;
      if (!best) best = { concept: concept, fields: chosen };
      if (seqOk && setOk) return { concept: concept, fields: chosen };
    }
    return best;
  }

  /* ---------- ids: opaque so the DOM never reveals the original position ---------- */
  function makeIdFactory(rng, n) {
    var pools = { b: rng.shuffle(range(1, 3 * n + 2)), s: rng.shuffle(range(1, 3 * n + 1)) };
    return function (prefix) { return prefix + pools[prefix].pop(); };
  }
  function range(a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; }

  /* ---------- controlled shuffle ---------- */
  function bodyBlocks(arr) { return A.allBlocks(arr).filter(function (b) { return !!b.body; }); }
  function holds(block, sem, model) { return V.expectedBody(block, model).indexOf(sem) !== -1; }

  function makeInitial(canonical, model, params, rng) {
    var arr = A.clone(canonical);
    var clamp = function (r, max) { return Math.min(rng.int(r[0], r[1]), max); };

    /* 1. move some class-level blocks into a wrong section */
    var blocks = A.allBlocks(arr);
    var k = clamp(params.blockMoves, blocks.length);
    var chosen = rng.sample(blocks.map(function (b) { return b.id; }), k);
    chosen.forEach(function (id) {
      var loc = A.findBlock(arr, id);
      var others = [0, 1, 2].filter(function (s) { return s !== loc.section; });
      var to = rng.pick(others);
      arr.sections[loc.section].splice(loc.index, 1);
      arr.sections[to].splice(rng.int(0, arr.sections[to].length), 0, loc.block);
    });

    /* 2. move some statements into bodies that do not own them (swaps and single moves) */
    var stmts = A.allStmts(arr);
    var remaining = clamp(params.stmtMoves, stmts.length);
    var moved = {};
    var guard = 0;
    while (remaining > 0 && guard++ < 200) {
      var free = A.allStmts(arr).filter(function (s) { return !moved[s.id]; });
      if (!free.length) break;
      var s = rng.pick(free);
      var sLoc = A.findStmt(arr, s.id);
      var swapped = false;
      if (remaining >= 2 && rng.chance(0.6)) {
        var partners = free.filter(function (t) {
          if (t.id === s.id) return false;
          var tLoc = A.findStmt(arr, t.id);
          return tLoc.block.id !== sLoc.block.id && !holds(tLoc.block, s.sem, model) && !holds(sLoc.block, t.sem, model);
        });
        if (partners.length) {
          var t = rng.pick(partners);
          var tLoc = A.findStmt(arr, t.id);
          var sBlock = sLoc.block, tBlock = tLoc.block;
          sBlock.body.splice(sLoc.index, 1, t);
          tBlock.body.splice(tLoc.index, 1, s);
          moved[s.id] = moved[t.id] = true;
          remaining -= 2; swapped = true;
        }
      }
      if (!swapped) {
        var targets = bodyBlocks(arr).filter(function (b) { return b.id !== sLoc.block.id && !holds(b, s.sem, model); });
        if (!targets.length) { moved[s.id] = true; continue; }
        var tb = rng.pick(targets);
        sLoc.block.body.splice(sLoc.index, 1);
        tb.body.splice(rng.int(0, tb.body.length), 0, s);
        moved[s.id] = true;
        remaining -= 1;
      }
    }

    /* 3. shuffle ordering inside sections and bodies (never changes semantics) */
    arr.sections = arr.sections.map(function (sec) { return rng.shuffle(sec); });
    A.allBlocks(arr).forEach(function (b) { if (b.body) b.body = rng.shuffle(b.body); });
    return arr;
  }

  /* ---------- challenge ---------- */
  function generateChallenge(seed, difficulty, opts) {
    opts = opts || {};
    var params = DIFFICULTIES[difficulty];
    if (!params) throw new Error('Unknown difficulty: ' + difficulty);
    var rng = rngLib.create(seed + '|' + difficulty);
    var n = params.fields;
    var pick = chooseConcept(rng, n, opts);
    var model = jm.buildModel(pick.concept.className, pick.fields, rng);
    var nextId = makeIdFactory(rng, n);
    var canonical = jm.canonicalArrangement(model, nextId);

    var initial = null;
    for (var tries = 0; tries < 25; tries++) {
      initial = makeInitial(canonical, model, params, rng);
      if (!V.validate(initial, model).solved) break;
    }

    var mc = V.misplacedCounts(initial, model);
    return {
      id: 'cbr-' + difficulty + '-' + seed,
      seed: String(seed),
      difficulty: difficulty,
      fieldCount: n,
      model: model,
      canonical: canonical,
      initial: initial,
      sample: { construction: jm.sampleConstruction(model, 'A'), toString: jm.expectedToString(model, 'A') },
      metrics: { misplacedBlocks: mc.blocks, misplacedStatements: mc.statements },
      keys: {
        fieldSet: fieldSetKey(model.className, model.fields),
        typeSeq: typeSeq(model.fields),
        layout: A.signature(initial)
      }
    };
  }

  /* ---------- history-aware generator for gameplay ---------- */
  function createGenerator(options) {
    options = options || {};
    var base = options.seed != null ? String(options.seed) : String(Date.now()) + ':' + Math.floor(Math.random() * 1e9);
    var counter = 0;
    var history = [];   // recent challenges (most recent last)
    var HISTORY = options.historySize || 20;

    function tail(n, pick) { return history.slice(-n).map(pick); }

    function next(difficulty) {
      var best = null;
      for (var attempt = 0; attempt < 30; attempt++) {
        var ch = generateChallenge(base + ':' + (counter++), difficulty, {
          avoidClasses: tail(6, function (h) { return h.model.className; }),
          avoidFieldSets: tail(HISTORY, function (h) { return h.keys.fieldSet; }),
          avoidTypeSeqs: tail(3, function (h) { return h.keys.typeSeq; })
        });
        var layoutSeen = history.some(function (h) { return h.keys.layout === ch.keys.layout && h.model.className === ch.model.className; });
        var setSeen = tail(HISTORY, function (h) { return h.keys.fieldSet; }).indexOf(ch.keys.fieldSet) !== -1;
        var classSeen = tail(6, function (h) { return h.model.className; }).indexOf(ch.model.className) !== -1;
        if (!layoutSeen && !setSeen && !classSeen) { best = ch; break; }
        if (!best) best = ch;
      }
      history.push(best);
      if (history.length > 200) history.shift();
      return best;
    }
    return { next: next, history: function () { return history.slice(); }, seed: base };
  }

  return { DIFFICULTIES: DIFFICULTIES, generateChallenge: generateChallenge, createGenerator: createGenerator, makeInitial: makeInitial };
});
