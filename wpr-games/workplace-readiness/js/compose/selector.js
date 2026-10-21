/* Workplace Readiness Games - hybrid selection engine.
 *
 * Combines the 140 authored templates with the compositional catalog into one pool of
 * "units". Every unit has a reasoning signature:
 *   authored  family:pattern                     (exactly as before)
 *   composed  cx:<skill>|<engine>|<decisive facts> (only facts that change the decision)
 *
 * createSession() keeps every guarantee of js/core/generator.js createSession():
 *   - seeded and deterministic; challenge n never changes when others are requested
 *   - every filter honoured (skills, category, modes, difficulty, context)
 *   - shuffled skill bag, so each skill appears once before any repeats
 *   - no reasoning signature repeats inside a window of min(20, eligible signatures)
 *   - family spacing min(5, families - 1), mode weighting with damping of recent modes
 *   - the correct-answer position avoids repeating the previous position
 *   - every instance is validated before it is shown; failures are rejected and replaced
 * and adds:
 *   - unused signatures are always preferred over used ones (then least recently used)
 *   - bounded history (last 400 challenges plus a last-seen map per signature)
 *   - O(eligible) work per challenge, no rejection loops beyond 30 attempts
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var deps = isNode
    ? { rng: require('../core/rng.js'), schema: require('../data/schema.js'), library: require('../core/library.js'),
        generator: require('../core/generator.js'), validator: require('../core/validator.js'), engine: require('./engine.js'),
        check: require('./check.js') }
    : { rng: root.WRG.rng, schema: root.WRG.schema, library: root.WRG.library, generator: root.WRG.generator,
        validator: root.WRG.validator, engine: root.WRG.compose, check: root.WRG.composeCheck };
  var api = factory(deps);
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.selector = api; }
}(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  var RNG = deps.rng, S = deps.schema, LIB = deps.library, G = deps.generator, V = deps.validator, E = deps.engine, K = deps.check;
  var HISTORY_LIMIT = 400;
  var AUTHORED_WEIGHT = 3;   // hand-reviewed authored patterns are favoured within a fresh pool

  /* ---------- hybrid library ---------- */

  /* lib: library.create(content). cx: { frameworks, slots, kits } (compose bundle). */
  function createHybrid(lib, cx) {
    var cat = E.buildCatalog(lib, cx || { frameworks: [], slots: {}, kits: [] });
    var h = Object.create(lib);
    h.base = lib;
    h.catalog = cat;
    h.families = lib.families.concat(cat.families);
    h.familiesById = Object.create(null);
    h.families.forEach(function (f) { h.familiesById[f.id] = f; });
    h.templatesById = Object.create(null);
    Object.keys(lib.templatesById).forEach(function (k) { h.templatesById[k] = lib.templatesById[k]; });
    var authored = lib.templates.map(function (t) {
      return { id: t.id, kind: 'authored', skill: t.skill, family: t.family, mode: t.mode, difficulty: t.difficulty,
        contexts: LIB.contextsFor(lib, t), signature: t.family + ':' + t.pattern, template: t };
    });
    cat.units.forEach(function (u) {
      h.templatesById[u.id] = { id: u.id, skill: u.skill, family: u.family, mode: u.mode, difficulty: u.difficulty, composed: true };
    });
    h.units = authored.concat(cat.units);
    h.unitsById = Object.create(null);
    h.units.forEach(function (u) { h.unitsById[u.id] = u; });
    return h;
  }

  function reasoningOf(u) { return u.kind === 'authored' ? u.signature : 'cx:' + u.signature; }

  /* filters: { skills, category, modes, difficulty, context } (same shape as generator.js) */
  function eligibleUnits(h, filters, opts) {
    var f = filters || {}, o = opts || {};
    var skillSet = null;
    if (f.skills && f.skills.length) skillSet = f.skills;
    else if (f.category) skillSet = h.skills.filter(function (s) { return s.category === f.category; }).map(function (s) { return s.id; });
    return h.units.filter(function (u) {
      if (o.authoredOnly && u.kind !== 'authored') return false;
      if (o.composedOnly && u.kind !== 'composed') return false;
      if (skillSet && skillSet.indexOf(u.skill) === -1) return false;
      if (f.modes && f.modes.length && f.modes.indexOf(u.mode) === -1) return false;
      if (f.difficulty && f.difficulty !== 'mixed' && u.difficulty !== f.difficulty) return false;
      if (f.context && u.contexts.indexOf(f.context) === -1) return false;
      return true;
    });
  }

  /* Capacity of a selection: distinct reasoning signatures, split by source. Authored and composed
   * signatures never overlap (different namespaces), so the total is a plain sum. */
  function capacity(h, filters) {
    var units = eligibleUnits(h, filters);
    var all = {}, au = {}, cx = {}, fam = {};
    units.forEach(function (u) {
      var r = reasoningOf(u); all[r] = 1; fam[u.family] = 1;
      if (u.kind === 'authored') au[r] = 1; else cx[r] = 1;
    });
    return { units: units.length, signatures: Object.keys(all).length, authoredPatterns: Object.keys(au).length,
      composedConfigurations: Object.keys(cx).length, families: Object.keys(fam).length };
  }

  /* ---------- rendering ---------- */

  function renderUnit(h, u, opts) {
    if (u.kind === 'authored') return G.renderTemplate(u.template, h.base, opts);
    return E.renderUnit(u, h.catalog, h.base, opts);
  }

  function validate(h, c) {
    var r = V.validateChallenge(c, h);
    if (!r.ok) return r.errors;
    if (c.cx) {
      var k = K.checkInstance(c, h);
      if (k.length) return k;
    }
    return null;
  }

  /* ---------- session ---------- */

  function createSession(h, options) {
    options = options || {};
    var seed = String(options.seed === undefined ? 'session' : options.seed);
    var filters = options.filters || {};
    var eligible = eligibleUnits(h, filters);
    if (!eligible.length) throw new Error('No challenges match these filters.');
    var base = RNG.create(seed);
    var skillsAvail = h.skillOrder.filter(function (id) { return eligible.some(function (u) { return u.skill === id; }); });
    var bySkill = {}, sigs = {}, fams = {};
    eligible.forEach(function (u) {
      (bySkill[u.skill] = bySkill[u.skill] || []).push(u);
      sigs[reasoningOf(u)] = 1; fams[u.family] = 1;
    });
    var nSig = Object.keys(sigs).length, nFam = Object.keys(fams).length;
    var sigSpacing = Math.min(20, nSig);
    var famSpacing = Math.min(5, nFam - 1);

    var lastSig = Object.create(null), lastUnit = Object.create(null), lastCtx = Object.create(null);
    var recent = [];  // bounded history of {reasoning, family, mode, skill, bestIndex}
    var session = {
      seed: seed, filters: filters, index: 0, history: recent, bag: [],
      stats: { generated: 0, rejected: 0, rejectionReasons: {} },
      eligibleCount: eligible.length, eligiblePatternCount: nSig, eligibleFamilyCount: nFam,
      capacity: capacity(h, filters)
    };

    function age(map, key) { return map[key] === undefined ? Infinity : session.index - map[key]; }
    function recentSigs(n) { var out = {}; recent.slice(-n).forEach(function (x) { out[x.reasoning] = 1; }); return out; }
    function hasFresh(skillId, rejected, block) {
      return (bySkill[skillId] || []).some(function (u) { return !rejected[u.id] && !block[reasoningOf(u)]; });
    }

    function refillBag(rng) {
      var bag = rng.shuffle(skillsAvail);
      var last = recent.length ? recent[recent.length - 1].skill : null;
      if (bag.length > 1 && bag[bag.length - 1] === last) { var t0 = bag[0]; bag[0] = bag[bag.length - 1]; bag[bag.length - 1] = t0; }
      session.bag = bag;
    }

    function chooseBagIndex(rejected) {
      var block = recentSigs(sigSpacing);
      for (var i = session.bag.length - 1; i >= 0; i--) if (hasFresh(session.bag[i], rejected, block)) return i;
      var freshSkills = skillsAvail.filter(function (sid) { return hasFresh(sid, rejected, block); });
      if (freshSkills.length) {
        session.bag = RNG.create(seed + '|fresh-skills|' + session.index).shuffle(freshSkills);
        return session.bag.length - 1;
      }
      for (var j = session.bag.length - 1; j >= 0; j--) {
        if ((bySkill[session.bag[j]] || []).some(function (u) { return !rejected[u.id]; })) return j;
      }
      return -1;
    }

    /* Prefer: signature not in the spacing window -> never-used signature -> family not recent. */
    function freshPool(units) {
      var pool = units;
      var block = recentSigs(sigSpacing);
      var a = pool.filter(function (u) { return !block[reasoningOf(u)]; });
      if (a.length) pool = a;
      var unused = pool.filter(function (u) { return lastSig[reasoningOf(u)] === undefined; });
      if (unused.length) pool = unused;
      var famBlock = {}; recent.slice(-famSpacing).forEach(function (x) { famBlock[x.family] = 1; });
      var b = pool.filter(function (u) { return !famBlock[u.family]; });
      if (b.length) pool = b;
      return pool;
    }

    function pickMode(pool, rng) {
      var modes = {};
      pool.forEach(function (u) { modes[u.mode] = 1; });
      var last5 = recent.slice(-5);
      var items = Object.keys(modes).map(function (m) {
        var n = last5.filter(function (x) { return x.mode === m; }).length;
        var factor = n === 0 ? 1.5 : (n === 1 ? 1 : 0.4);
        return { weight: S.MODES[m].weight * factor, value: m };
      });
      return rng.weighted(items);
    }

    function pickUnit(pool, mode, rng) {
      var items = pool.filter(function (u) { return u.mode === mode; }).map(function (u) {
        var sa = age(lastSig, reasoningOf(u)), ua = age(lastUnit, u.id);
        var w = (sa === Infinity ? 60 : 1 + Math.min(sa, 60)) * (ua === Infinity ? 2 : 1);
        if (u.kind === 'authored') w *= AUTHORED_WEIGHT;
        return { weight: w, value: u };
      });
      return rng.weighted(items);
    }

    function pickContext(u, rng) {
      if (filters.context) return filters.context;
      var items = u.contexts.map(function (id) {
        var a = age(lastCtx, id);
        return { weight: a === Infinity ? 13 : 1 + Math.min(a, 12), value: id };
      });
      return rng.weighted(items);
    }

    session.next = function () {
      var idx = session.index, lastReasons = [], rejected = {};
      for (var attempt = 0; attempt < 30; attempt++) {
        var rng = base.fork('c' + idx + 'r' + attempt);
        if (!session.bag.length) refillBag(rng);
        var bagIdx = chooseBagIndex(rejected);
        if (bagIdx < 0) break;
        var skillId = session.bag[bagIdx];
        var units = (bySkill[skillId] || []).filter(function (u) { return !rejected[u.id]; });
        var pool = freshPool(units);
        var mode = pickMode(pool, rng);
        var u = pickUnit(pool, mode, rng);
        var ctx = pickContext(u, rng);
        var lastBest = recent.length ? recent[recent.length - 1].bestIndex : null;
        var c = null, problems = null;
        try {
          c = renderUnit(h, u, { seed: seed + '#' + idx + 'r' + attempt, id: String(idx), contextId: ctx,
            avoidBestIndex: lastBest === undefined ? null : lastBest });
          problems = validate(h, c);
        } catch (e) { problems = [u.id + ': ' + e.message]; }
        if (problems) {
          session.stats.rejected++;
          problems.forEach(function (p) { session.stats.rejectionReasons[p] = (session.stats.rejectionReasons[p] || 0) + 1; });
          lastReasons = problems; rejected[u.id] = true;
          continue;
        }
        session.bag.splice(bagIdx, 1);
        c.index = idx;
        c.id = 'c' + idx + '-' + c.id;
        c.source = u.kind;
        var r = reasoningOf(u);
        lastSig[r] = idx; lastUnit[u.id] = idx; lastCtx[ctx] = idx;
        recent.push({ templateId: u.id, skill: u.skill, family: u.family, reasoning: r, mode: u.mode,
          difficulty: u.difficulty, context: ctx, source: u.kind,
          bestIndex: c.bestIndex === undefined ? null : c.bestIndex });
        if (recent.length > HISTORY_LIMIT) recent.shift();
        session.index++;
        session.stats.generated++;
        return c;
      }
      throw new Error('Could not generate a valid challenge: ' + lastReasons.slice(0, 3).join('; '));
    };
    return session;
  }

  function generateMany(h, count, options) {
    var s = createSession(h, options), out = [];
    for (var i = 0; i < count; i++) out.push(s.next());
    return { challenges: out, session: s };
  }

  return { createHybrid: createHybrid, eligibleUnits: eligibleUnits, capacity: capacity, renderUnit: renderUnit,
    createSession: createSession, generateMany: generateMany, reasoningOf: reasoningOf, validate: validate,
    HISTORY_LIMIT: HISTORY_LIMIT };
}));
