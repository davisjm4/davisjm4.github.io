/* Workplace Readiness Games - compositional procedural engine.
 *
 * A "kit" describes one workplace situation type for one skill as typed components:
 *   issues   - facts that can be true in the situation, each with the professional response it
 *              calls for, a priority tier, the tempting wrong response (shortcut) and feedback.
 *   process  - steps with dependency relations; optional steps are switched on by facts.
 *   doc      - document lines; any line may carry one deliberate defect.
 *   configs  - (numeric kits) number-driven decisions whose answer is calculated.
 *
 * buildCatalog() enumerates every valid scenario STATE of every kit ahead of time. Each state is a
 * "unit" with a reasoning signature that depends only on facts that change the decision (which
 * issues are active, which higher-priority constraint is already resolved, which steps the
 * process contains, which defect is present, which numeric constraint decides). Names, settings,
 * wording variants, irrelevant details and numbers that do not change the decision never change
 * the signature.
 *
 * renderUnit() turns a unit + seed + setting into a challenge with the same instance contract as
 * authored templates. The answer key is DERIVED from the state: the active issue with the lowest
 * tier is the decisive one; numeric answers are calculated; order keys come from the dependency
 * graph; find keys come from the one inserted defect.
 *
 * Deterministic, dependency-free, no Math.random, no network.
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var deps = isNode
    ? { rng: require('../core/rng.js'), text: require('../core/text.js'), expr: require('../core/expr.js'),
        order: require('../core/order.js'), schema: require('../data/schema.js') }
    : { rng: root.WRG.rng, text: root.WRG.text, expr: root.WRG.expr, order: root.WRG.order, schema: root.WRG.schema };
  var api = factory(deps);
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.compose = api; }
}(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  var RNG = deps.rng, T = deps.text, X = deps.expr, O = deps.order, S = deps.schema;
  var LEVELS = ['beginner', 'intermediate', 'advanced'];
  var MODE_CODE = { decision: 'D', nextstep: 'N', order: 'O', find: 'F' };
  var PEOPLE_ALIASES = ['coworker', 'coworker2', 'coworker3'];
  var FIND_SEGMENTS = { beginner: 4, intermediate: 5, advanced: 6 };

  /* ---------- small helpers ---------- */

  function arr(x) { return x === undefined || x === null ? [] : (Array.isArray(x) ? x : [x]); }
  function stripEnd(s) { return String(s).replace(/[\s.]+$/, ''); }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function capFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function byId(list) { var m = Object.create(null); list.forEach(function (x) { m[x.id] = x; }); return m; }
  function sortedIds(list) { return list.slice().sort(); }
  function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }
  function combos(list, k) {
    var out = [];
    (function rec(start, acc) {
      if (acc.length === k) { out.push(acc.slice()); return; }
      for (var i = start; i < list.length; i++) { acc.push(list[i]); rec(i + 1, acc); acc.pop(); }
    }(0, []));
    return out;
  }
  function slotEntry(raw, rng) {
    var v = Array.isArray(raw) ? rng.pick(raw) : raw;
    return typeof v === 'string' ? { text: v } : { text: v.text, plural: v.plural };
  }

  /* ---------- settings: which bundles can host a kit ---------- */

  function bundlesFor(kit, lib, ext) {
    var ctxIds = kit.contexts === 'any' || !kit.contexts ? lib.contexts.map(function (c) { return c.id; }) : kit.contexts;
    var need = arr(kit.requires), out = [];
    ctxIds.forEach(function (cid) {
      var ctx = lib.contextsById[cid]; if (!ctx) return;
      ctx.bundles.forEach(function (b) {
        var e = ext[b.id] || {};
        var ok = need.every(function (slot) { return e[slot] !== undefined; });
        var deny = (kit.excludeBundles || []).indexOf(b.id) !== -1;
        if (ok && !deny) out.push({ context: cid, bundle: b.id });
      });
    });
    return out;
  }

  /* ---------- STATE engine (decision / next step) ---------- */

  function issueMap(kit) { return byId(kit.issues || []); }

  function exclusive(kit, a, b) {
    return (kit.exclusive || []).some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); });
  }
  function compatible(kit, ids) {
    for (var i = 0; i < ids.length; i++) for (var j = i + 1; j < ids.length; j++) if (exclusive(kit, ids[i], ids[j])) return false;
    return true;
  }
  function distinctTiers(map, ids) {
    var seen = {};
    for (var i = 0; i < ids.length; i++) { var t = map[ids[i]].tier; if (seen[t]) return false; seen[t] = true; }
    return true;
  }
  function byTier(map, ids) { return ids.slice().sort(function (a, b) { return map[a].tier - map[b].tier; }); }

  /* Every valid state of a state kit. A state is { active:[ids by priority], resolved:[ids], level }.
   *   beginner      one active issue, or no issue and one prerequisite stated as satisfied
   *   intermediate  two active issues of different priority, or one active issue plus a
   *                 higher-priority constraint that is stated as already resolved
   *   advanced      three active issues of different priority, or two active issues plus a
   *                 resolved higher-priority constraint (three facts to combine, an acceptable
   *                 but lower-priority action, and pressure to take a shortcut)
   * Active issues must have different tiers so that priority is never a matter of taste. */
  function enumerateStates(kit) {
    var map = issueMap(kit), ids = (kit.issues || []).map(function (i) { return i.id; });
    var clearable = ids.filter(function (id) { return arr(map[id].clear).length > 0; });
    var out = [];
    function add(active, resolved, level) {
      if (!compatible(kit, active.concat(resolved))) return;
      if (!distinctTiers(map, active)) return;
      var act = byTier(map, active);
      if (resolved.length) {
        var bestTier = act.length ? map[act[0]].tier : Infinity;
        if (!resolved.every(function (r) { return map[r].tier < bestTier; })) return;
      }
      if (act.some(function (a) { return arr(map[a].onlyLevels).length && map[a].onlyLevels.indexOf(level) === -1; })) return;
      out.push({ active: act, resolved: sortedIds(resolved), level: level });
    }
    ids.forEach(function (i) { add([i], [], 'beginner'); });
    clearable.forEach(function (r) { add([], [r], 'beginner'); });
    combos(ids, 2).forEach(function (p) { add(p, [], 'intermediate'); });
    ids.forEach(function (b) { clearable.forEach(function (r) { if (r !== b) add([b], [r], 'intermediate'); }); });
    combos(ids, 3).forEach(function (t) { add(t, [], 'advanced'); });
    combos(ids, 2).forEach(function (p) {
      clearable.forEach(function (r) { if (p.indexOf(r) === -1) add(p, [r], 'advanced'); });
    });
    return out;
  }

  function principleOf(kit, issueId) { var i = issueMap(kit)[issueId]; return i.principle || (kit.id + '.' + i.id); }

  function stateSignature(kit, st) {
    var p = function (id) { return principleOf(kit, id); };
    if (!st.active.length) return kit.skill + '|state|clear:' + st.resolved.map(p).sort().join('+');
    return kit.skill + '|state|first:' + p(st.active[0]) +
      '|also:' + st.active.slice(1).map(p).sort().join('+') +
      '|resolved:' + st.resolved.map(p).sort().join('+');
  }

  /* The decisive issue: the active issue with the lowest tier. Pure function of the state. */
  function decisiveIssue(kit, st) { return st.active.length ? st.active[0] : null; }

  /* ---------- PROCESS engine (put the steps in order) ---------- */

  function closure(ids, rel) {
    var reach = {};
    ids.forEach(function (a) { reach[a] = {}; });
    rel.forEach(function (r) { if (reach[r[0]] && reach[r[1]] !== undefined) reach[r[0]][r[1]] = true; });
    ids.forEach(function (k) { ids.forEach(function (i) { if (reach[i][k]) ids.forEach(function (j) { if (reach[k][j]) reach[i][j] = true; }); }); });
    return reach;
  }

  function enumerateProcess(kit) {
    var p = kit.process; if (!p) return [];
    var all = p.steps.map(function (s) { return s.id; });
    var full = closure(all, p.rel);
    var core = p.steps.filter(function (s) { return s.core; }).map(function (s) { return s.id; });
    var opt = p.steps.filter(function (s) { return !s.core; }).map(function (s) { return s.id; });
    var out = [];
    for (var k = 0; k <= opt.length; k++) {
      combos(opt, k).forEach(function (pick) {
        var set = core.concat(pick);
        if (set.length < S.LIMITS.stepsMin || set.length > S.LIMITS.stepsMax) return;
        var rel = p.rel.filter(function (r) { return set.indexOf(r[0]) !== -1 && set.indexOf(r[1]) !== -1; });
        // every step must take part in a relation
        if (!set.every(function (id) { return rel.some(function (r) { return r[0] === id || r[1] === id; }); })) return;
        // no implied dependency may be lost by leaving a step out
        var sub = closure(set, rel);
        for (var i = 0; i < set.length; i++) for (var j = 0; j < set.length; j++) {
          if (i !== j && full[set[i]][set[j]] && !sub[set[i]][set[j]]) return;
        }
        var motivating = p.steps.filter(function (s) { return set.indexOf(s.id) !== -1 && s.issue; }).map(function (s) { return s.issue; });
        if (!compatible(kit, motivating)) return;
        var prec = rel.map(function (r) { return { before: r[0], after: r[1], why: r[2] }; });
        var valid = O.enumerateValid(set, prec);
        if (!valid.length) return;
        if (valid.length / factorial(set.length) > S.LIMITS.maxOrderValidFraction) return;
        var level = set.length === 3 ? 'beginner' : (set.length === 4 ? 'intermediate' : 'advanced');
        var steps = p.steps.filter(function (s) { return set.indexOf(s.id) !== -1; });
        if (steps.some(function (s) { return arr(s.levels).length && s.levels.indexOf(level) === -1; })) return;
        out.push({ steps: steps.map(function (s) { return s.id; }), level: level, validOrders: valid.length, relations: rel.length });
      });
    }
    return out;
  }

  /* ---------- DEFECT engine (find the problem) ---------- */

  function enumerateDefects(kit) {
    var d = kit.doc; if (!d) return [];
    var out = [];
    d.lines.forEach(function (line) {
      arr(line.bad).forEach(function (bad) {
        arr(bad.level).forEach(function (level) {
          out.push({ line: line.id, defect: bad.id, level: level, principle: bad.principle || (kit.id + '.' + bad.id) });
        });
      });
    });
    return out;
  }

  /* ---------- NUMERIC engine ---------- */

  function drawNumbers(kit, cfg, rng) {
    var vars = Object.assign({}, kit.vars || {}, cfg.vars || {});
    var derive = Object.assign({}, kit.derive || {}, cfg.derive || {});
    var cons = arr(kit.constraints).concat(arr(cfg.constraints));
    var names = Object.keys(vars);
    for (var attempt = 0; attempt < 3000; attempt++) {
      var scope = {};
      names.forEach(function (n) {
        var v = vars[n];
        if (v.type === 'choice') scope[n] = rng.pick(v.values);
        else { var step = v.step || 1; scope[n] = v.min + rng.int(Math.floor((v.max - v.min) / step) + 1) * step; }
      });
      Object.keys(derive).forEach(function (n) { scope[n] = X.evaluate(derive[n], scope); });
      if (cons.every(function (c) { return X.evaluate(c, scope); })) return scope;
    }
    throw new Error(kit.id + '/' + cfg.id + ': could not satisfy numeric constraints');
  }

  /* ---------- catalog ---------- */

  function unitId(kit, mode, tag) {
    return 'CX-' + kit.code + '-' + MODE_CODE[mode] + '-' + RNG.hashString(kit.id + '|' + mode + '|' + tag).toString(36);
  }
  function kebab(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120); }

  function buildCatalog(lib, cx) {
    var frameworks = byId(cx.frameworks || []);
    var ext = cx.slots || {};
    var kits = cx.kits || [];
    var units = [], families = [], famSeen = {};
    kits.forEach(function (kit) {
      var skill = lib.skillsById[kit.skill];
      if (!skill) throw new Error('kit ' + kit.id + ' has unknown skill ' + kit.skill);
      kit.code = kit.code || skill.code;
      var hosts = bundlesFor(kit, lib, ext);
      var contexts = []; hosts.forEach(function (h) { if (contexts.indexOf(h.context) === -1) contexts.push(h.context); });
      if (!famSeen[kit.family]) {
        famSeen[kit.family] = true;
        families.push({ id: kit.family, skill: kit.skill, name: kit.familyName || kit.family, composed: true });
      }
      var fw = frameworks[kit.framework] || {};
      var baseUnit = function (mode, level, tag, signature, extra) {
        var u = {
          id: unitId(kit, mode, tag), kind: 'composed', kitId: kit.id, skill: kit.skill, family: kit.family,
          framework: kit.framework, frameworkLetter: fw.letter || null, mode: mode, difficulty: level,
          contexts: contexts, hosts: hosts, signature: signature, pattern: kebab(tag), concepts: kit.concepts.slice()
        };
        Object.keys(extra).forEach(function (k) { u[k] = extra[k]; });
        return u;
      };
      if (kit.engine === 'numeric') {
        (kit.configs || []).forEach(function (cfg) {
          arr(cfg.mode || ['decision']).forEach(function (mode) {
            var sig = kit.skill + '|num|' + (cfg.principle || kit.id + '.' + cfg.id);
            units.push(baseUnit(mode, cfg.level, 'num-' + cfg.id, sig, {
              engine: 'numeric', spec: { config: cfg.id }, rule: cfg.rule || 'calculate-and-compare',
              metrics: { constraints: arr(cfg.metrics && cfg.metrics.constraints)[0] || arr(cfg.constraints).length + arr(kit.constraints).length,
                facts: (cfg.metrics && cfg.metrics.facts) || arr(cfg.facts).length + 1, branches: (cfg.options || cfg.lines || []).length, steps: (cfg.metrics && cfg.metrics.steps) || 1 }
            }));
          });
        });
        return;
      }
      var map = issueMap(kit);
      if (kit.issues && kit.issues.length) {
        enumerateStates(kit).forEach(function (st) {
          var tag = 'state-' + (st.active.join('+') || 'clear') + (st.resolved.length ? '~' + st.resolved.join('+') : '');
          var b = decisiveIssue(kit, st);
          var modes = arr(kit.stateModes || ['decision', 'nextstep']);
          modes.forEach(function (mode) {
            units.push(baseUnit(mode, st.level, tag, stateSignature(kit, st), {
              engine: 'state', spec: st,
              rule: b ? (map[b].rule || 'resolve-issue') : 'proceed-when-satisfied',
              metrics: { constraints: st.active.length + st.resolved.length, branches: st.active.length + 1,
                facts: st.active.length + st.resolved.length, priorities: st.active.length, steps: 1 }
            }));
          });
        });
      }
      enumerateProcess(kit).forEach(function (v) {
        var sig = kit.skill + '|order|' + kit.id + ':' + sortedIds(v.steps).join('+');
        units.push(baseUnit('order', v.level, 'order-' + v.steps.join('+'), sig, {
          engine: 'process', spec: v, rule: 'respect-dependencies',
          metrics: { constraints: v.relations, branches: v.validOrders, facts: v.steps.length, steps: v.steps.length }
        }));
      });
      enumerateDefects(kit).forEach(function (df) {
        var sig = kit.skill + '|find|' + df.principle;
        units.push(baseUnit('find', df.level, 'find-' + df.defect + '-' + df.level, sig, {
          engine: 'defect', spec: df, rule: 'find-the-defect',
          metrics: { constraints: 1, branches: FIND_SEGMENTS[df.level], facts: FIND_SEGMENTS[df.level], steps: 1 }
        }));
      });
    });
    var seenIds = {};
    units.forEach(function (u) { if (seenIds[u.id]) throw new Error('duplicate unit id ' + u.id); seenIds[u.id] = true; });
    return {
      frameworks: cx.frameworks || [], frameworksById: frameworks, kits: kits, kitsById: byId(kits), ext: ext,
      units: units, unitsById: byId(units), families: families
    };
  }

  /* ---------- rendering ---------- */

  function makeScope(kit, host, lib, ext, rng) {
    var bundle = lib.contextsById[host.context].bundles.filter(function (b) { return b.id === host.bundle; })[0];
    var scope = {};
    Object.keys(S.SLOTS).forEach(function (slot) { scope[slot] = slotEntry(bundle[slot], rng); });
    var e = ext[host.bundle] || {};
    Object.keys(e).forEach(function (slot) { scope[slot] = slotEntry(e[slot], rng); });
    var people = rng.shuffle(lib.people);
    PEOPLE_ALIASES.forEach(function (a, i) { scope[a] = people[i]; });
    return { scope: scope, bundle: bundle };
  }

  function pickText(v, rng) { var a = arr(v); return a.length ? rng.pick(a) : ''; }

  function framework(cat, kit) { return cat.frameworksById[kit.framework] || {}; }
  function fwText(cat, kit, key) {
    var k = kit.text && kit.text[key];
    if (k) return k;
    var f = framework(cat, kit);
    if (f.text && f.text[key]) return f.text[key];
    var d = (cat.frameworksById._defaults || {}).text || {};
    return d[key];
  }
  function firstReason(cat, kit, issue) {
    if (issue.first) return issue.first;
    if (kit.tiers && kit.tiers[issue.tier]) return kit.tiers[issue.tier];
    var f = framework(cat, kit);
    if (f.tiers && f.tiers[issue.tier]) return f.tiers[issue.tier];
    var d = cat.frameworksById._defaults || {};
    return (d.tiers && d.tiers[issue.tier]) || '';
  }
  function fill(tpl, vars) {
    return String(tpl).replace(/<([a-zA-Z]+)(\|cap)?>/g, function (m, k, cap) {
      if (!(k in vars)) throw new Error('feedback template is missing <' + k + '>');
      var v = String(vars[k]);
      return cap ? capFirst(v) : v;
    });
  }
  function words(s) { return T.wordCount(s); }
  function firstSentence(s) { var i = s.indexOf('. '); return i === -1 ? s : s.slice(0, i + 1); }

  /* Option candidates for a state. Every candidate's role is decided by the state:
   *   best        the action for the decisive (highest-priority) active issue
   *   acceptable  the action for another active issue: a real need, but not first
   *   distractor  a shortcut response (misconception), proceeding while an issue is active,
   *               repeating a step the scenario says is already done, or a kit-level wrong action */
  function stateOptions(cat, kit, st, mode, rng) {
    var map = issueMap(kit), b = decisiveIssue(kit, st), cands = [];
    var plan = mode === 'decision' && st.active.length >= 2;
    function sc(issue) { return arr(issue.shortcut); }
    if (!b) {
      cands.push({ k: 'proceed', role: 'best', text: kit.proceed.text, why: kit.proceed.why });
      st.resolved.forEach(function (r) {
        cands.push({ k: 'redo:' + r, role: 'distractor', text: map[r].action, pri: 1,
          why: fill(fwText(cat, kit, 'redundantClearWhy'), { done: map[r].done, short: map[r].short }),
          mis: fwText(cat, kit, 'redundantMis') });
      });
      arr(kit.generic).forEach(function (g, i) { cands.push({ k: 'generic:' + i, role: 'distractor', text: g.text, why: g.why, mis: g.mis, pri: 2 }); });
      arr(kit.overcaution).forEach(function (g, i) { cands.push({ k: 'over:' + i, role: 'distractor', text: g.text, why: g.why, mis: g.mis, pri: 2 }); });
      return choose(cands, rng, [1, 2, 2]);
    }
    var B = map[b], first = firstReason(cat, kit, B), others = st.active.slice(1).map(function (id) { return map[id]; });
    if (!plan) {
      var bestWhy = B.reason + (others.length && first ? ' ' + first : '');
      if (words(bestWhy) > S.LIMITS.feedbackWords) bestWhy = B.reason;
      cands.push({ k: 'act:' + b, role: 'best', text: B.action, why: bestWhy, requires: [b] });
      others.forEach(function (o) {
        var w = fill(fwText(cat, kit, 'acceptableWhy'), { other: o.short, first: B.short }) + (first ? ' ' + first : '');
        if (words(w) > S.LIMITS.feedbackWords) w = fill(fwText(cat, kit, 'acceptableWhy'), { other: o.short, first: B.short });
        cands.push({ k: 'act:' + o.id, role: 'acceptable', text: o.action, why: w, mis: fwText(cat, kit, 'orderMis'), pri: 1 });
      });
      sc(B).forEach(function (s, i) { cands.push({ k: 'sc:' + b + i, role: 'distractor', text: s.text, why: s.why, mis: s.mis, pri: i === 0 ? 0 : 2 }); });
      others.forEach(function (o) { sc(o).slice(0, 1).forEach(function (s, i) { cands.push({ k: 'sc:' + o.id + i, role: 'distractor', text: s.text, why: s.why, mis: s.mis, pri: 3 }); }); });
      st.resolved.forEach(function (r) {
        cands.push({ k: 'redo:' + r, role: 'distractor', text: map[r].action, pri: 1,
          why: fill(fwText(cat, kit, 'redundantWhy'), { done: map[r].done, first: B.short }), mis: fwText(cat, kit, 'redundantMis') });
      });
      if (!B.noProceed) cands.push({ k: 'proceed', role: 'distractor', text: kit.proceed.text, pri: 2,
        why: B.ignore || fill(fwText(cat, kit, 'ignoreWhy'), { short: B.short }), mis: fwText(cat, kit, 'proceedMis') });
      arr(kit.generic).forEach(function (g, i) { cands.push({ k: 'generic:' + i, role: 'distractor', text: g.text, why: g.why, mis: g.mis, pri: 3 }); });
      var want;
      if (st.level === 'beginner') want = [0, 2, 3];
      else if (st.level === 'intermediate') want = st.resolved.length ? [0, 1, 2] : [1, 0, 2];
      else want = st.resolved.length ? [1, 1, 0] : [1, 1, 0];
      return choose(cands, rng, want, st.level === 'advanced');
    }
    // plan options for Workplace Decisions with two or more active issues
    var A = others[0], pl = function (x, y) { return 'First, ' + lowerFirst(stripEnd(x)) + '. Then ' + lowerFirst(stripEnd(y)) + '.'; };
    var br = function (o) { return o.brief || o.action || o.text; };
    var bestPlanWhy = B.reason;
    if (first && words(B.reason + ' ' + first) <= S.LIMITS.feedbackWords) bestPlanWhy = B.reason + ' ' + first;
    cands.push({ k: 'plan:best', role: 'best', text: pl(br(B), br(A)), why: bestPlanWhy, requires: [b] });
    cands.push({ k: 'plan:reverse', role: 'acceptable', text: pl(br(A), br(B)), pri: 1, mis: fwText(cat, kit, 'orderMis'),
      why: fill(fwText(cat, kit, 'planReverseWhy'), { other: A.short, first: B.short }) + (first ? ' ' + first : '') });
    var bs = sc(B)[0], as = sc(A)[0];
    if (bs) cands.push({ k: 'plan:shortcut-first', role: 'distractor', text: pl(br(bs), br(A)), why: bs.why, mis: bs.mis, pri: 0 });
    if (as) cands.push({ k: 'plan:shortcut-second', role: 'distractor', text: pl(br(B), br(as)), pri: 2,
      why: fill(fwText(cat, kit, 'planSecondWhy'), { short: A.short }) + ' ' + as.why, mis: as.mis });
    st.resolved.forEach(function (r) {
      cands.push({ k: 'plan:redo', role: 'distractor', text: pl(br(map[r]), br(B)), pri: 1,
        why: fill(fwText(cat, kit, 'redundantWhy'), { done: map[r].done, first: B.short }), mis: fwText(cat, kit, 'redundantMis') });
    });
    cands.forEach(function (c) { if (words(c.why) > S.LIMITS.feedbackWords) c.why = firstSentence(c.why); });
    return choose(cands, rng, st.resolved.length ? [1, 0, 1] : [1, 0, 2], true);
  }

  /* choose(best + 3): `want` lists the preferred priority bucket of each distractor slot. */
  function choose(cands, rng, want, needAcceptable) {
    var best = cands.filter(function (c) { return c.role === 'best'; })[0];
    var rest = cands.filter(function (c) { return c.role !== 'best'; });
    var chosen = [best], used = {};
    used[best.k] = true;
    function take(pred) {
      var pool = rng.shuffle(rest.filter(function (c) { return !used[c.k] && pred(c); }));
      if (!pool.length) return false;
      used[pool[0].k] = true; chosen.push(pool[0]); return true;
    }
    if (needAcceptable) take(function (c) { return c.role === 'acceptable'; });
    want.forEach(function (p) {
      if (chosen.length >= S.LIMITS.optionCount) return;
      if (!take(function (c) { return c.pri === p; })) {
        for (var q = 0; q <= 3 && !take(function (c) { return c.pri === q; }); q++) { /* widen */ }
      }
    });
    while (chosen.length < S.LIMITS.optionCount && take(function () { return true; })) { /* fill */ }
    return chosen;
  }

  function assembleScenario(parts, cap, R) {
    // parts: [{text, optional, order}] - drop optional sentences (last first) until within the cap
    var keep = parts.slice();
    function render() { return keep.map(function (p) { return R(p.text); }).join(' ').replace(/\s{2,}/g, ' ').trim(); }
    var out = render();
    while (T.wordCount(out) > cap) {
      var idx = -1;
      for (var i = keep.length - 1; i >= 0; i--) if (keep[i].optional) { idx = i; break; }
      if (idx === -1) break;
      keep.splice(idx, 1); out = render();
    }
    return { text: out, used: keep };
  }

  function chooseHost(unit, opts, rng) {
    var hosts = unit.hosts;
    if (opts.contextId) hosts = hosts.filter(function (h) { return h.context === opts.contextId; });
    if (!hosts.length) throw new Error(unit.id + ' cannot render in context ' + opts.contextId);
    return rng.pick(hosts);
  }

  function shuffleAvoid(list, rng, isBest, avoid) {
    var out, tries = 0;
    do { out = rng.shuffle(list); tries++; }
    while (tries < 8 && avoid !== undefined && avoid !== null && out.findIndex(isBest) === avoid);
    return out;
  }

  function renderUnit(unit, cat, lib, opts) {
    opts = opts || {};
    var kit = cat.kitsById[unit.kitId];
    var seed = String(opts.seed === undefined ? 'default' : opts.seed);
    var rng = RNG.create(seed + '|' + unit.id);
    var host = chooseHost(unit, opts, rng);
    var ms = makeScope(kit, host, lib, cat.ext, rng);
    var scope = ms.scope, used = [];
    if (unit.engine === 'numeric') {
      var cfg = kit.configs.filter(function (c) { return c.id === unit.spec.config; })[0];
      var nums = drawNumbers(kit, cfg, rng);
      Object.keys(nums).forEach(function (k) { scope[k] = nums[k]; });
    }
    function R(str) { return T.render(str, scope, used); }
    var cap = S.LIMITS.scenarioWords[unit.difficulty] || 100;
    var c = {
      v: 1, templateId: unit.id, skill: unit.skill, family: unit.family, pattern: unit.pattern,
      reasoning: 'cx:' + unit.signature, category: lib.skillsById[unit.skill].category, mode: unit.mode,
      difficulty: unit.difficulty, concepts: unit.concepts.slice(), context: host.context, bundle: host.bundle,
      twist: null, facts: [], contradictions: (kit.exclusive || []).map(function (p) { return p.slice(); })
    };
    var cxMeta = { kit: kit.id, engine: unit.engine, framework: unit.framework, rule: unit.rule, signature: unit.signature,
      metrics: unit.metrics, statements: [], surface: [] };
    var fw = framework(cat, kit);

    if (unit.engine === 'state') {
      var st = unit.spec, map = issueMap(kit), parts = [];
      parts.push({ text: pickText(kit.setup, rng) });
      var factParts = [];
      st.active.forEach(function (id) { factParts.push({ text: pickText(map[id].fact, rng), stmt: 'fact:' + id }); });
      st.resolved.forEach(function (id) { factParts.push({ text: pickText(map[id].clear, rng), stmt: 'clear:' + id }); });
      factParts = rng.shuffle(factParts);
      factParts.forEach(function (p) { parts.push(p); });
      var pressure = arr(kit.pressure);
      if (pressure.length && st.active.length && (st.level === 'advanced' || (st.level === 'intermediate' && rng.chance(0.5)))) parts.push({ text: rng.pick(pressure), optional: true, surface: 'pressure' });
      if (arr(kit.detail).length && rng.chance(0.45)) parts.splice(1, 0, { text: rng.pick(kit.detail), optional: true, surface: 'detail' });
      var sc = assembleScenario(parts, cap, R);
      c.scenario = sc.text;
      sc.used.forEach(function (p) { if (p.stmt) cxMeta.statements.push({ id: p.stmt, text: R(p.text) }); if (p.surface) cxMeta.surface.push(p.surface); });
      c.facts = st.active.slice().concat(st.resolved.map(function (r) { return 'resolved:' + r; }));
      var plan = unit.mode === 'decision' && st.active.length >= 2;
      var prompts = (kit.prompts && kit.prompts[plan ? 'plan' : unit.mode]) || (fw.prompts && fw.prompts[plan ? 'plan' : unit.mode]) || [];
      c.prompt = R(pickText(prompts, rng));
      var b = decisiveIssue(kit, st);
      c.principle = R(b ? map[b].lesson : kit.proceed.lesson);
      var cands = stateOptions(cat, kit, st, unit.mode, rng);
      var ordered = shuffleAvoid(cands, rng, function (o) { return o.role === 'best'; }, opts.avoidBestIndex);
      var key = { bestId: null, options: {} };
      c.options = ordered.map(function (o, i) {
        var id = 'o' + (i + 1);
        key.options[id] = { role: o.role, why: R(o.why), misconception: o.role === 'best' ? null : R(o.mis), source: o.k };
        if (o.role === 'best') { key.bestId = id; c.bestRequires = (o.requires || []).slice(); }
        return { id: id, text: R(o.text) };
      });
      c.key = key;
      c.bestIndex = ordered.findIndex(function (o) { return o.role === 'best'; });
      cxMeta.state = { active: st.active.slice(), resolved: st.resolved.slice(), decisive: b, plan: plan };
    } else if (unit.engine === 'process') {
      var p = kit.process, set = unit.spec.steps, mapI = issueMap(kit), parts2 = [];
      parts2.push({ text: pickText(p.setup || kit.setup, rng) });
      var motivating = [];
      p.steps.forEach(function (s) { if (set.indexOf(s.id) !== -1 && s.issue && motivating.indexOf(s.issue) === -1) motivating.push(s.issue); });
      rng.shuffle(motivating).forEach(function (id) {
        var iss = mapI[id];
        var txt = pickText(arr(p.because && p.because[id]).length ? p.because[id] : iss.fact, rng);
        parts2.push({ text: txt, stmt: 'fact:' + id });
      });
      var sc2 = assembleScenario(parts2, cap, R);
      c.scenario = sc2.text;
      sc2.used.forEach(function (q) { if (q.stmt) cxMeta.statements.push({ id: q.stmt, text: R(q.text) }); });
      c.facts = motivating.slice();
      c.prompt = R(pickText((p.prompt) || (fw.prompts && fw.prompts.order) || ['Put these steps in a sensible order.'], rng));
      c.principle = R(p.lesson);
      var steps = p.steps.filter(function (s) { return set.indexOf(s.id) !== -1; }).map(function (s) { return { id: s.id, text: R(s.text) }; });
      var prec = p.rel.filter(function (r) { return set.indexOf(r[0]) !== -1 && set.indexOf(r[1]) !== -1; })
        .map(function (r) { return { before: r[0], after: r[1], why: R(r[2]) }; });
      var ids = steps.map(function (s) { return s.id; }), shuffled, n = 0;
      do { shuffled = rng.shuffle(steps); n++; } while (n < 60 && O.isValid(shuffled.map(function (s) { return s.id; }), ids, prec));
      c.steps = shuffled;
      c.key = { precedence: prec, example: O.solution(ids, prec) };
      cxMeta.process = { steps: set.slice(), validOrders: unit.spec.validOrders };
    } else if (unit.engine === 'defect') {
      var d = kit.doc, df = unit.spec, target = FIND_SEGMENTS[df.level];
      var host2 = d.lines.filter(function (l) { return l.id === df.line; })[0];
      var bad = arr(host2.bad).filter(function (x) { return x.id === df.defect; })[0];
      var need = [df.line].concat(arr(bad.needs));
      var optional = d.lines.filter(function (l) { return need.indexOf(l.id) === -1 && !arr(l.notWith).some(function (x) { return x === df.defect; }) && !arr(bad.notWith).some(function (x) { return x === l.id; }); });
      var extra = rng.shuffle(optional).slice(0, Math.max(0, target - need.length));
      var chosen = d.lines.filter(function (l) { return need.indexOf(l.id) !== -1 || extra.indexOf(l) !== -1; });
      if (chosen.length < S.LIMITS.segmentsMin) throw new Error(kit.id + ': not enough document lines for ' + df.defect);
      c.scenario = R(pickText(d.intro || kit.setup, rng));
      c.prompt = R(pickText(d.prompt || (fw.prompts && fw.prompts.find) || ['Which line contains the problem?'], rng));
      c.principle = R(bad.lesson || d.lesson);
      var segs = chosen.map(function (l) {
        var isBad = l.id === df.line;
        return { id: l.id, text: R(isBad ? bad.text : pickText(l.text, rng)), problem: isBad, note: R(isBad ? bad.why : l.fine) };
      });
      if (d.shuffle === true) segs = rng.shuffle(segs);
      c.doc = { type: d.type, title: R(pickText(d.title, rng)), segments: segs.map(function (s) { return { id: s.id, text: s.text }; }) };
      var ks = {};
      segs.forEach(function (s) { ks[s.id] = { problem: s.problem, note: s.note }; });
      c.key = { problemId: df.line, segments: ks };
      c.problemIndex = segs.findIndex(function (s) { return s.problem; });
      c.facts = ['defect:' + df.defect];
      cxMeta.defect = { line: df.line, defect: df.defect, segments: segs.length };
    } else if (unit.engine === 'numeric') {
      var cfg2 = kit.configs.filter(function (x) { return x.id === unit.spec.config; })[0];
      var parts3 = [{ text: pickText(cfg2.setup || kit.setup, rng) }];
      arr(cfg2.facts).forEach(function (f, i) { parts3.push({ text: Array.isArray(f) ? rng.pick(f) : f, stmt: 'num:' + i }); });
      if (arr(kit.detail).length && rng.chance(0.3)) parts3.push({ text: rng.pick(kit.detail), optional: true, surface: 'detail' });
      var sc3 = assembleScenario(parts3, cap, R);
      c.scenario = sc3.text;
      sc3.used.forEach(function (q) { if (q.stmt) cxMeta.statements.push({ id: q.stmt, text: R(q.text) }); });
      c.principle = R(cfg2.lesson);
      c.facts = ['config:' + cfg2.id];
      var numScope = {}; Object.keys(scope).forEach(function (k2) { if (typeof scope[k2] === 'number') numScope[k2] = scope[k2]; });
      cxMeta.numbers = numScope;
      if (unit.mode === 'find') {
        c.prompt = R(pickText(cfg2.prompt || (fw.prompts && fw.prompts.find), rng));
        var lines = cfg2.lines.map(function (l) {
          var isBad = l.bad === true;
          return { id: l.id, text: R(l.text), problem: isBad, note: R(isBad ? l.why : l.fine) };
        });
        c.doc = { type: cfg2.docType || 'note', title: R(pickText(cfg2.title, rng)), segments: lines.map(function (s) { return { id: s.id, text: s.text }; }) };
        var ks2 = {}, pid = null;
        lines.forEach(function (s) { ks2[s.id] = { problem: s.problem, note: s.note }; if (s.problem) pid = s.id; });
        c.key = { problemId: pid, segments: ks2 };
        c.problemIndex = lines.findIndex(function (s) { return s.problem; });
      } else {
        c.prompt = R(pickText(cfg2.prompt || (fw.prompts && fw.prompts[unit.mode]), rng));
        var opts2 = cfg2.options.map(function (o) {
          var ok = X.evaluate(o.ok, numScope);
          return { k: o.key, role: ok ? 'best' : (o.acceptable ? 'acceptable' : 'distractor'), text: o.text, why: o.why, mis: o.mis };
        });
        var nBest = opts2.filter(function (o) { return o.role === 'best'; }).length;
        if (nBest !== 1) throw new Error(kit.id + '/' + cfg2.id + ': numeric options produced ' + nBest + ' correct answers');
        var ordered2 = shuffleAvoid(opts2, rng, function (o) { return o.role === 'best'; }, opts.avoidBestIndex);
        var key2 = { bestId: null, options: {} };
        c.options = ordered2.map(function (o, i) {
          var id = 'o' + (i + 1);
          key2.options[id] = { role: o.role, why: R(o.why), misconception: o.role === 'best' ? null : R(o.mis), source: o.k };
          if (o.role === 'best') { key2.bestId = id; c.bestRequires = []; }
          return { id: id, text: R(o.text) };
        });
        c.key = key2;
        c.bestIndex = ordered2.findIndex(function (o) { return o.role === 'best'; });
      }
    }
    c.cx = cxMeta;
    c.maskValues = used.slice();
    c.id = 'x' + RNG.hashString(seed + '|' + unit.id + '|' + (opts.id || '')).toString(36);
    return c;
  }

  return {
    buildCatalog: buildCatalog, renderUnit: renderUnit, enumerateStates: enumerateStates, enumerateProcess: enumerateProcess,
    enumerateDefects: enumerateDefects, stateSignature: stateSignature, decisiveIssue: decisiveIssue, bundlesFor: bundlesFor,
    closure: closure, drawNumbers: drawNumbers, LEVELS: LEVELS, FIND_SEGMENTS: FIND_SEGMENTS, PEOPLE_ALIASES: PEOPLE_ALIASES
  };
}));
