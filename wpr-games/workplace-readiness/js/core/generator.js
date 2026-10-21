/* Workplace Readiness Games - deterministic challenge generator.
 *
 * renderTemplate(): one validated template + a seed => one fully resolved challenge instance.
 * createSession():  a seeded stream of challenges with skill balancing, anti-repetition
 *                   (by reasoning family and underlying pattern, not by wording) and
 *                   automatic rejection of any instance that fails validation.
 *
 * No Math.random, no network, no AI: the same seed and filters always give the same stream.
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var deps = isNode
    ? { rng: require('./rng.js'), text: require('./text.js'), expr: require('./expr.js'), order: require('./order.js'),
        schema: require('../data/schema.js'), library: require('./library.js'), validator: require('./validator.js') }
    : { rng: root.WRG.rng, text: root.WRG.text, expr: root.WRG.expr, order: root.WRG.order,
        schema: root.WRG.schema, library: root.WRG.library, validator: root.WRG.validator };
  var api = factory(deps);
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.generator = api; }
}(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  var RNG = deps.rng, T = deps.text, X = deps.expr, O = deps.order, S = deps.schema, LIB = deps.library, V = deps.validator;

  /* ---------- helpers ---------- */

  function slotEntry(raw, rng) {
    var v = Array.isArray(raw) ? rng.pick(raw) : raw;
    return typeof v === 'string' ? { text: v } : { text: v.text, plural: v.plural };
  }

  function drawVars(t, rng) {
    var vars = t.vars || {}, names = Object.keys(vars);
    if (!names.length) return {};
    for (var attempt = 0; attempt < 80; attempt++) {
      var scope = {};
      names.forEach(function (n) {
        var v = vars[n];
        if (v.type === 'choice') scope[n] = rng.pick(v.values);
        else {
          var step = v.step || 1, slots = Math.floor((v.max - v.min) / step) + 1;
          scope[n] = v.min + rng.int(slots) * step;
        }
      });
      Object.keys(t.derive || {}).forEach(function (n) { scope[n] = X.evaluate(t.derive[n], scope); });
      var ok = (t.constraints || []).every(function (c) { return X.evaluate(c, scope); });
      if (ok) return scope;
    }
    throw new Error(t.id + ': could not satisfy numeric constraints');
  }

  function chooseTwist(t, baseFacts, rng) {
    var twists = t.twists || [];
    if (!twists.length || !rng.chance(0.5)) return null;
    var contra = t.contradictions || [];
    var ok = twists.filter(function (w) {
      var f = w.facts || [];
      if ((w.excludes || []).some(function (x) { return baseFacts.indexOf(x) !== -1; })) return false;
      return !contra.some(function (p) {
        return (f.indexOf(p[0]) !== -1 && baseFacts.indexOf(p[1]) !== -1) || (f.indexOf(p[1]) !== -1 && baseFacts.indexOf(p[0]) !== -1);
      });
    });
    return ok.length ? rng.pick(ok) : null;
  }

  function checkFactsClean(t, facts) {
    return !(t.contradictions || []).some(function (p) { return facts.indexOf(p[0]) !== -1 && facts.indexOf(p[1]) !== -1; });
  }

  /* ---------- rendering ---------- */

  /* opts: { seed, id, contextId?, bundleId?, avoidBestIndex? } */
  function renderTemplate(t, lib, opts) {
    opts = opts || {};
    var seed = String(opts.seed === undefined ? 'default' : opts.seed);
    var rng = RNG.create(seed + '|' + t.id);

    // context + coherent setting bundle
    var allowed = LIB.contextsFor(lib, t);
    if (opts.contextId && allowed.indexOf(opts.contextId) === -1) throw new Error(t.id + ' cannot render in context ' + opts.contextId);
    var contextId = opts.contextId || rng.pick(allowed);
    var ctx = lib.contextsById[contextId];
    var bundle = opts.bundleId ? ctx.bundles.filter(function (b) { return b.id === opts.bundleId; })[0] : rng.pick(ctx.bundles);
    if (!bundle) throw new Error('unknown bundle');

    // slots and people
    var scope = {}, used = [];
    var people = rng.shuffle(lib.people), pi = 0;
    Object.keys(t.slots || {}).forEach(function (alias) {
      var src = t.slots[alias];
      if (src === S.PERSON_SLOT) scope[alias] = people[pi++];
      else scope[alias] = slotEntry(bundle[src], rng);
    });
    var nums = drawVars(t, rng);
    Object.keys(nums).forEach(function (k) { scope[k] = nums[k]; });

    // twist (surface detail) and facts
    var baseFacts = (t.facts || []).slice();
    var twist = chooseTwist(t, baseFacts, rng);
    var facts = baseFacts.concat(twist ? (twist.facts || []) : []);
    if (!checkFactsClean(t, facts)) throw new Error(t.id + ': contradictory facts');

    function R(str) { return T.render(str, scope, used); }
    function composeScenario() {
      var base = t.scenario || '';
      var tw = twist ? twist.text : '';
      if (base.indexOf('[[twist]]') !== -1) base = base.replace('[[twist]]', tw ? (' ' + tw) : '');
      else if (tw) base = base + ' ' + tw;
      return R(base).replace(/\s{2,}/g, ' ').trim();
    }

    var c = {
      v: 1, templateId: t.id, skill: t.skill, family: t.family, pattern: t.pattern,
      reasoning: t.family + ':' + t.pattern,
      category: lib.skillsById[t.skill].category, mode: t.mode, difficulty: t.difficulty,
      concepts: t.concepts.slice(),
      context: contextId, bundle: bundle.id, twist: twist ? twist.id : null,
      facts: facts, contradictions: (t.contradictions || []).map(function (p) { return p.slice(); }),
      scenario: t.scenario ? composeScenario() : '',
      prompt: R(t.prompt), principle: R(t.principle)
    };

    if (t.mode === 'decision' || t.mode === 'nextstep') {
      var avoid = opts.avoidBestIndex;
      var shuffled, tries = 0;
      do {
        shuffled = rng.shuffle(t.options);
        tries++;
      } while (tries < 8 && avoid !== undefined && avoid !== null &&
               shuffled.findIndex(function (o) { return o.role === 'best'; }) === avoid);
      var key = { bestId: null, options: {} };
      c.options = shuffled.map(function (o, i) {
        var id = 'o' + (i + 1);
        key.options[id] = { role: o.role, why: R(o.why), misconception: o.misconception ? R(o.misconception) : null };
        if (o.role === 'best') { key.bestId = id; c.bestRequires = (o.requires || []).slice(); }
        return { id: id, text: R(o.text) };
      });
      c.key = key;
      c.bestIndex = shuffled.findIndex(function (o) { return o.role === 'best'; });
    } else if (t.mode === 'order') {
      var steps = t.steps.map(function (s) { return { id: s.id, text: R(s.text) }; });
      var prec = t.precedence.map(function (p) { return { before: p.before, after: p.after, why: R(p.why) }; });
      var ids = steps.map(function (s) { return s.id; });
      var shuffledSteps, n = 0;
      do { shuffledSteps = rng.shuffle(steps); n++; }
      while (n < 50 && O.isValid(shuffledSteps.map(function (s) { return s.id; }), ids, prec));
      c.steps = shuffledSteps;
      c.key = { precedence: prec, example: O.solution(ids, prec) };
    } else if (t.mode === 'find') {
      var segs = t.segments.map(function (s) { return { id: s.id, text: R(s.text), problem: s.problem === true, note: R(s.problem === true ? s.why : s.whyFine) }; });
      if (t.shuffleSegments === true) segs = rng.shuffle(segs);
      c.doc = { type: t.docType, title: t.docTitle ? R(t.docTitle) : '', segments: segs.map(function (s) { return { id: s.id, text: s.text }; }) };
      var ks = {}, problemId = null;
      segs.forEach(function (s) { ks[s.id] = { problem: s.problem, note: s.note }; if (s.problem) problemId = s.id; });
      c.key = { problemId: problemId, segments: ks };
      c.problemIndex = segs.findIndex(function (s) { return s.problem; });
    }

    // values inserted from setting bundles, names and numbers: masked when checking leakage
    c.maskValues = used.slice();
    c.id = 'c' + RNG.hashString(seed + '|' + t.id + '|' + (opts.id || '')).toString(36);
    return c;
  }

  /* ---------- eligibility ---------- */

  /* filters: { skills:[ids]|null, category:id|null, modes:[ids]|null, difficulty:'mixed'|level, context:id|null } */
  function eligibleTemplates(lib, filters) {
    var f = filters || {};
    var skillSet = null;
    if (f.skills && f.skills.length) skillSet = f.skills;
    else if (f.category) skillSet = lib.skills.filter(function (s) { return s.category === f.category; }).map(function (s) { return s.id; });
    return lib.templates.filter(function (t) {
      if (skillSet && skillSet.indexOf(t.skill) === -1) return false;
      if (f.modes && f.modes.length && f.modes.indexOf(t.mode) === -1) return false;
      if (f.difficulty && f.difficulty !== 'mixed' && t.difficulty !== f.difficulty) return false;
      if (f.context && LIB.contextsFor(lib, t).indexOf(f.context) === -1) return false;
      return true;
    });
  }

  /* ---------- session ---------- */

  function lastN(arr, n) { return n <= 0 ? [] : arr.slice(-n); }

  function lastIndexOf(arr, pred) {
    for (var i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
    return -1;
  }
  function ageOf(history, pred) { // challenges since last use; Infinity if never
    var i = lastIndexOf(history, pred);
    return i === -1 ? Infinity : history.length - 1 - i;
  }
  function ageWeight(age, cap) { return age === Infinity ? cap + 1 : 1 + Math.min(age, cap); }

  function createSession(lib, options) {
    options = options || {};
    var seed = String(options.seed === undefined ? 'session' : options.seed);
    var filters = options.filters || {};
    var eligible = eligibleTemplates(lib, filters);
    if (!eligible.length) throw new Error('No challenges match these filters.');
    var base = RNG.create(seed);
    var skillsAvail = lib.skillOrder.filter(function (id) { return eligible.some(function (t) { return t.skill === id; }); });
    var patternsAvail = {}, familiesAvail = {};
    eligible.forEach(function (t) { patternsAvail[t.family + ':' + t.pattern] = 1; familiesAvail[t.family] = 1; });
    // Keep a full twenty-question practice window free of an underlying
    // reasoning repeat whenever the selected pool contains that much variety.
    // Small filtered pools still fall back gracefully after every pattern has
    // been seen; generation remains continuous for review practice.
    var patternSpacing = Math.min(20, Object.keys(patternsAvail).length);
    var familySpacing = Math.min(5, Object.keys(familiesAvail).length - 1);

    var session = {
      seed: seed, filters: filters, index: 0, history: [], bag: [],
      stats: { generated: 0, rejected: 0, rejectionReasons: {} },
      eligibleCount: eligible.length,
      eligiblePatternCount: Object.keys(patternsAvail).length,
      eligibleFamilyCount: Object.keys(familiesAvail).length
    };

    function refillBag(rng) {
      var bag = rng.shuffle(skillsAvail);
      var last = session.history.length ? session.history[session.history.length - 1].skill : null;
      if (bag.length > 1 && bag[bag.length - 1] === last) { var t0 = bag[0]; bag[0] = bag[bag.length - 1]; bag[bag.length - 1] = t0; }
      session.bag = bag; // draw from the end
    }

    function pickMode(skillTemplates, rng) {
      var modes = {};
      skillTemplates.forEach(function (t) { modes[t.mode] = 1; });
      var recent = session.history.slice(-5);
      var items = Object.keys(modes).map(function (m) {
        var n = recent.filter(function (h) { return h.mode === m; }).length;
        var factor = n === 0 ? 1.5 : (n === 1 ? 1 : 0.4);
        return { weight: S.MODES[m].weight * factor, value: m };
      });
      return rng.weighted(items);
    }

    /* Soft spacing: prefer templates whose reasoning pattern and family were not used recently.
     * Applied BEFORE choosing a mode so a fresh template of a different mode is preferred over
     * repeating a recent one. Falls back gracefully when the filtered library is small. */
    function freshPool(skillTemplates) {
      var h = session.history;
      var pool = skillTemplates;
      var recentPat = lastN(h, patternSpacing).map(function (x) { return x.reasoning; });
      var byPattern = pool.filter(function (t) { return recentPat.indexOf(t.family + ':' + t.pattern) === -1; });
      if (byPattern.length) pool = byPattern;
      var recentFam = lastN(h, familySpacing).map(function (x) { return x.family; });
      var byFamily = pool.filter(function (t) { return recentFam.indexOf(t.family) === -1; });
      if (byFamily.length) pool = byFamily;
      return pool;
    }

    function pickTemplate(pool, mode, rng) {
      var h = session.history;
      var items = pool.filter(function (t) { return t.mode === mode; }).map(function (t) {
        return { weight: ageWeight(ageOf(h, function (x) { return x.templateId === t.id; }), 30), value: t };
      });
      return rng.weighted(items);
    }

    function pickContext(t, rng) {
      var allowed = LIB.contextsFor(lib, t);
      if (filters.context) return filters.context;
      var h = session.history;
      var items = allowed.map(function (id) { return { weight: ageWeight(ageOf(h, function (x) { return x.context === id; }), 12), value: id }; });
      return rng.weighted(items);
    }

    function chooseBagIndex(rejected) {
      var recentPat = lastN(session.history, patternSpacing).map(function (x) { return x.reasoning; });
      for (var i = session.bag.length - 1; i >= 0; i--) {
        var sid = session.bag[i];
        var fresh = eligible.some(function (t) { return t.skill === sid && !rejected[t.id] && recentPat.indexOf(t.family + ':' + t.pattern) === -1; });
        if (fresh) return i;
      }
      // A skill can be stranded in the current rotation even though a fresh
      // pattern remains in another skill already drawn this round. Rebuild
      // the bag from skills that still have an unseen pattern before allowing
      // any pattern repeat. This makes the spacing guarantee apply across the
      // whole filtered pool, not only to the remaining tail of the skill bag.
      var freshSkills = skillsAvail.filter(function (sid) {
        return eligible.some(function (t) { return t.skill === sid && !rejected[t.id] && recentPat.indexOf(t.family + ':' + t.pattern) === -1; });
      });
      if (freshSkills.length) {
        session.bag = RNG.create(seed + '|fresh-skills|' + session.index).shuffle(freshSkills);
        return session.bag.length - 1;
      }
      for (var j = session.bag.length - 1; j >= 0; j--) {
        var sid2 = session.bag[j];
        if (eligible.some(function (t) { return t.skill === sid2 && !rejected[t.id]; })) return j;
      }
      return -1;
    }

    session.next = function () {
      var idx = session.index;
      var lastReasons = [], rejected = {};
      for (var attempt = 0; attempt < 30; attempt++) {
        var rng = base.fork('c' + idx + 'r' + attempt);
        if (!session.bag.length) refillBag(rng);
        var bagIdx = chooseBagIndex(rejected);
        if (bagIdx < 0) break;
        var skillId = session.bag[bagIdx];
        var skillTemplates = eligible.filter(function (t) { return t.skill === skillId && !rejected[t.id]; });
        var pool = freshPool(skillTemplates);
        var mode = pickMode(pool, rng);
        var tpl = pickTemplate(pool, mode, rng);
        var contextId = pickContext(tpl, rng);
        var h = session.history;
        var lastBest = h.length ? h[h.length - 1].bestIndex : undefined;
        var challenge = null, problems = null;
        try {
          challenge = renderTemplate(tpl, lib, {
            seed: seed + '#' + idx + 'r' + attempt, id: String(idx), contextId: contextId,
            avoidBestIndex: lastBest === undefined ? null : lastBest
          });
          var res = V.validateChallenge(challenge, lib);
          if (!res.ok) problems = res.errors;
        } catch (e) { problems = [tpl.id + ': ' + e.message]; }
        if (problems) {
          session.stats.rejected++;
          problems.forEach(function (p) { session.stats.rejectionReasons[p] = (session.stats.rejectionReasons[p] || 0) + 1; });
          lastReasons = problems;
          rejected[tpl.id] = true;
          continue;
        }
        session.bag.splice(bagIdx, 1);
        challenge.index = idx;
        challenge.id = 'c' + idx + '-' + challenge.id;
        session.history.push({
          templateId: tpl.id, skill: tpl.skill, family: tpl.family, reasoning: challenge.reasoning,
          mode: tpl.mode, difficulty: tpl.difficulty, context: contextId,
          bestIndex: challenge.bestIndex === undefined ? null : challenge.bestIndex
        });
        session.index++;
        session.stats.generated++;
        return challenge;
      }
      throw new Error('Could not generate a valid challenge: ' + lastReasons.slice(0, 3).join('; '));
    };

    return session;
  }

  /* Convenience: a fixed number of challenges from a seed (used by audits and tests). */
  function generateMany(lib, count, options) {
    var s = createSession(lib, options), out = [];
    for (var i = 0; i < count; i++) out.push(s.next());
    return { challenges: out, session: s };
  }

  return { renderTemplate: renderTemplate, createSession: createSession, eligibleTemplates: eligibleTemplates, generateMany: generateMany };
}));
