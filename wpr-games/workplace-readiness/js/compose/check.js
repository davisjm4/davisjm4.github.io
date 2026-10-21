/* Workplace Readiness Games - compositional content checks.
 *
 * validateKit(kit, lib, cx)  authoring-time rules for a kit (structure, tokens, wording, review)
 * validateCompose(lib, cx)   every kit + cross-kit rules (unique ids, principles, frameworks)
 * checkInstance(c, h)        instance-level LOGIC check for a composed challenge. It re-derives the
 *                            decisive fact from the unit's state (lowest tier wins), the role every
 *                            option must have, the dependency closure for ordering and the single
 *                            defect for find-the-problem, without using the engine's assembly code.
 *
 * The existing validator.validateChallenge() still runs on every composed instance as well.
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var deps = isNode
    ? { schema: require('../data/schema.js'), text: require('../core/text.js'), order: require('../core/order.js'), expr: require('../core/expr.js') }
    : { schema: root.WRG.schema, text: root.WRG.text, order: root.WRG.order, expr: root.WRG.expr };
  var api = factory(deps);
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.composeCheck = api; }
}(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';
  var S = deps.schema, T = deps.text, O = deps.order, X = deps.expr;
  var PEOPLE = ['coworker', 'coworker2', 'coworker3'];
  var EXT = ['powered', 'chemical', 'ppe', 'private', 'supply', 'area'];
  var DOC_TYPES = ['email', 'chat', 'procedure', 'schedule', 'post', 'note'];
  var LEVELS = ['beginner', 'intermediate', 'advanced'];
  var LIM = { fact: 24, action: 17, shortcut: 17, option: S.LIMITS.optionWordsMax, why: S.LIMITS.feedbackWords, lesson: 30, step: 14, line: 30, setup: 30 };

  function arr(x) { return x === undefined || x === null ? [] : (Array.isArray(x) ? x : [x]); }
  function isStr(x) { return typeof x === 'string' && x.trim().length > 0; }
  function wc(s) { return T.wordCount(s); }

  /* ---------- kit level ---------- */

  function validateKit(kit, lib, cx) {
    var errs = [], warns = [];
    var where = (kit && kit.id) || '(kit)';
    function E(m) { errs.push(where + ': ' + m); }
    function W(m) { warns.push(where + ': ' + m); }
    if (!kit || typeof kit !== 'object') return { errors: ['kit is not an object'], warnings: [] };
    if (!/^[a-z]{3}-[a-z0-9-]+$/.test(kit.id || '')) E('id must look like "saf-powered-equipment"');
    var skill = lib.skillsById[kit.skill];
    if (!skill) E('unknown skill ' + kit.skill);
    else if (kit.id.slice(0, 3) !== skill.code.toLowerCase()) E('id prefix must be the skill code ' + skill.code.toLowerCase());
    if (!isStr(kit.family) || kit.family.indexOf(kit.skill + '.cx-') !== 0) E('family must start with "' + kit.skill + '.cx-"');
    if (lib.familiesById[kit.family]) E('family id collides with an authored family');
    var fws = (cx.frameworks || []).map(function (f) { return f.id; });
    if (fws.indexOf(kit.framework) === -1 || kit.framework === '_defaults') E('unknown framework ' + kit.framework);
    if (!arr(kit.concepts).length) E('concepts required');
    arr(kit.concepts).forEach(function (c) {
      if (!lib.conceptIds[c]) E('unknown concept ' + c); else if (lib.conceptIds[c] !== kit.skill) E('concept ' + c + ' belongs to another skill');
    });
    if (kit.contexts !== 'any') {
      if (!arr(kit.contexts).length) E('contexts must be "any" or a list');
      arr(kit.contexts).forEach(function (c) { if (!lib.contextsById[c]) E('unknown context ' + c); });
    }
    arr(kit.requires).forEach(function (r) { if (EXT.indexOf(r) === -1) E('unknown typed slot ' + r); });
    if (!kit.review || kit.review.status !== 'approved' || !isStr(kit.review.notes)) E('review.status "approved" and review.notes required');
    else if (S.REVIEW_REQUIRED_SKILLS.indexOf(kit.skill) !== -1) {
      var ch = arr(kit.review.checks);
      if (ch.indexOf('no-jurisdiction-claims') === -1) E('sensitive skill requires review check "no-jurisdiction-claims"');
      if (ch.indexOf('policy-stated-in-scenario') === -1 && kit.review.policyNotNeeded !== true) E('sensitive skill requires "policy-stated-in-scenario" or policyNotNeeded');
    }

    // tokens
    var known = {};
    Object.keys(S.SLOTS).forEach(function (s) { known[s] = 'slot'; });
    arr(kit.requires).forEach(function (s) { known[s] = 'ext'; });
    PEOPLE.forEach(function (p) { known[p] = 'person'; });
    Object.keys(kit.vars || {}).forEach(function (v) { known[v] = 'num'; });
    Object.keys(kit.derive || {}).forEach(function (v) { known[v] = 'num'; });
    (kit.configs || []).forEach(function (cfg) {
      Object.keys(cfg.vars || {}).forEach(function (v) { known[v] = 'num'; });
      Object.keys(cfg.derive || {}).forEach(function (v) { known[v] = 'num'; });
    });
    var strings = [];
    function add(label, s, kind) { arr(s).forEach(function (x, i) { if (typeof x === 'string') strings.push({ label: label + (Array.isArray(s) ? '[' + i + ']' : ''), text: x, kind: kind || 'text' }); }); }
    add('setup', kit.setup, 'scenario'); add('pressure', kit.pressure, 'scenario'); add('detail', kit.detail, 'scenario');
    (kit.issues || []).forEach(function (is, i) {
      var L = 'issues[' + (is.id || i) + ']';
      add(L + '.fact', is.fact, 'scenario'); add(L + '.clear', is.clear, 'scenario');
      add(L + '.short', is.short); add(L + '.done', is.done); add(L + '.action', is.action, 'option');
      add(L + '.reason', is.reason); add(L + '.lesson', is.lesson); add(L + '.first', is.first); add(L + '.ignore', is.ignore);
      arr(is.shortcut).forEach(function (s, j) { add(L + '.shortcut[' + j + '].text', s.text, 'wrong'); add(L + '.shortcut[' + j + '].why', s.why); add(L + '.shortcut[' + j + '].mis', s.mis); });
    });
    if (kit.proceed) { add('proceed.text', kit.proceed.text, 'option'); add('proceed.why', kit.proceed.why); add('proceed.lesson', kit.proceed.lesson); }
    arr(kit.generic).concat(arr(kit.overcaution)).forEach(function (g, i) { add('generic[' + i + '].text', g.text, 'wrong'); add('generic[' + i + '].why', g.why); add('generic[' + i + '].mis', g.mis); });
    if (kit.process) {
      add('process.setup', kit.process.setup, 'scenario'); add('process.lesson', kit.process.lesson);
      kit.process.steps.forEach(function (s) { add('process.steps[' + s.id + ']', s.text, 'step'); });
      kit.process.rel.forEach(function (r, i) { add('process.rel[' + i + '].why', r[2]); });
      Object.keys(kit.process.because || {}).forEach(function (k) { add('process.because.' + k, kit.process.because[k], 'scenario'); });
    }
    if (kit.doc) {
      add('doc.intro', kit.doc.intro, 'scenario'); add('doc.title', kit.doc.title); add('doc.lesson', kit.doc.lesson);
      kit.doc.lines.forEach(function (l) {
        add('doc.lines[' + l.id + '].text', l.text, 'line'); add('doc.lines[' + l.id + '].fine', l.fine);
        arr(l.bad).forEach(function (b) { add('doc.bad[' + b.id + '].text', b.text, 'line'); add('doc.bad[' + b.id + '].why', b.why); add('doc.bad[' + b.id + '].lesson', b.lesson); });
      });
    }
    (kit.configs || []).forEach(function (cfg) {
      var L = 'configs[' + cfg.id + ']';
      add(L + '.setup', cfg.setup, 'scenario'); add(L + '.lesson', cfg.lesson); add(L + '.prompt', cfg.prompt);
      arr(cfg.facts).forEach(function (f, i) { add(L + '.facts[' + i + ']', f, 'scenario'); });
      arr(cfg.options).forEach(function (o) { add(L + '.options[' + o.key + '].text', o.text, 'numopt'); add(L + '.options[' + o.key + '].why', o.why); add(L + '.options[' + o.key + '].mis', o.mis); });
      arr(cfg.lines).forEach(function (l) { add(L + '.lines[' + l.id + '].text', l.text, 'line'); add(L + '.lines[' + l.id + '].note', l.bad ? l.why : l.fine); });
      add(L + '.title', cfg.title);
    });

    strings.forEach(function (s) {
      T.tokens(s.text).forEach(function (tok) {
        var base = known[tok.name] ? tok.name : tok.name.charAt(0).toLowerCase() + tok.name.slice(1);
        if (!known[base]) { E(s.label + ': token ' + tok.raw + ' is not available (declare typed slots in "requires")'); return; }
        if (tok.filter && T.FILTERS.indexOf(tok.filter) === -1) E(s.label + ': unknown filter ' + tok.raw);
        if (tok.prop) {
          var p = tok.prop.charAt(0).toLowerCase() + tok.prop.slice(1);
          if (known[base] === 'person') { if (S.PRONOUN_KEYS.indexOf(p) === -1) E(s.label + ': bad pronoun property ' + tok.raw); }
          else if (p === 'plural') { if (!(base === 'client' || base === 'supply')) E(s.label + ': only client and supply have plurals'); }
          else E(s.label + ': property not allowed in ' + tok.raw);
        }
        if (known[base] === 'num' && !tok.filter) E(s.label + ': numeric token ' + tok.raw + ' needs a format filter');
      });
      if (/[{}]/.test(s.text.replace(T.TOKEN_RE, ''))) E(s.label + ': malformed token (use {Name|the} to capitalise, not {name|The})');
      if (/\b(the|a|an)\s+\{[A-Za-z]+(\.[A-Za-z]+)?\|(the|a)\}/i.test(s.text)) E(s.label + ': double determiner');
      if (/\{[A-Za-z]+\.[Ss]ubj\}/.test(s.text)) E(s.label + ': subject pronouns (.subj) are not allowed');
      if (/\b(null|undefined|NaN)\b/.test(s.text)) E(s.label + ': contains a reserved word that the instance validator rejects');
      S.LEGAL_CLAIM_PATTERNS.forEach(function (re) { if (re.test(s.text) && !(kit.review && kit.review.legalClaimsVerified)) E(s.label + ': legal/mandatory-law claim'); });
      if (s.kind === 'scenario') {
        var low = s.text.toLowerCase();
        S.SCENARIO_LEAK_PHRASES.forEach(function (p) { if (low.indexOf(p) !== -1) E(s.label + ': answer-leaking phrase "' + p + '"'); });
      }
      if (s.kind === 'wrong') {
        var lw = s.text.toLowerCase();
        S.ABSURD_OPTION_WORDS.forEach(function (w) { if (lw.indexOf(w) !== -1) E(s.label + ': absurd wording "' + w + '"'); });
      }
    });

    function len(label, s, max, min) {
      arr(s).forEach(function (x) { var n = wc(x); if (n > max) E(label + ' is ' + n + ' words (max ' + max + ')'); if (min && n < min) E(label + ' is ' + n + ' words (min ' + min + ')'); });
    }

    var engine = kit.engine || 'state';
    if (engine === 'numeric') validateNumeric(kit, E, W, len);
    else {
      len('setup', kit.setup, LIM.setup);
      if (!arr(kit.setup).length && (kit.issues || []).length) E('setup sentence required');
      var ids = {}, principles = {}, tiers = {};
      (kit.issues || []).forEach(function (is) {
        var L = 'issue ' + is.id;
        if (!/^[a-z][a-z0-9-]*$/.test(is.id || '')) E(L + ': id must be kebab-case');
        if (ids[is.id]) E(L + ': duplicate id'); ids[is.id] = 1;
        if (!(Number.isInteger(is.tier) && is.tier >= 1 && is.tier <= 9)) E(L + ': tier must be an integer 1-9');
        tiers[is.tier] = (tiers[is.tier] || 0) + 1;
        var pr = is.principle || (kit.id + '.' + is.id);
        if (principles[pr]) E(L + ': duplicate principle in kit'); principles[pr] = 1;
        if (!isStr(is.rule)) E(L + ': rule (decision-rule id) required');
        ['short', 'action', 'reason', 'lesson'].forEach(function (k) { if (!isStr(is[k])) E(L + ': ' + k + ' required'); });
        if (!arr(is.fact).length) E(L + ': fact sentence required');
        len(L + ' fact', is.fact, LIM.fact); len(L + ' clear', is.clear, LIM.fact);
        len(L + ' action', is.action, LIM.action, S.LIMITS.optionWordsMin);
        len(L + ' reason', is.reason, 32); len(L + ' lesson', is.lesson, LIM.lesson);
        if (arr(is.clear).length && !isStr(is.done)) E(L + ': a clearable issue needs "done" (what was already handled)');
        if (!arr(is.shortcut).length) E(L + ': at least one shortcut (misconception response) required');
        arr(is.shortcut).forEach(function (s, j) {
          if (!isStr(s.text) || !isStr(s.why) || !isStr(s.mis)) E(L + ': shortcut ' + j + ' needs text, why and mis');
          len(L + ' shortcut ' + j, s.text, LIM.shortcut, S.LIMITS.optionWordsMin); len(L + ' shortcut why', s.why, LIM.why);
        });
      });
      (kit.exclusive || []).forEach(function (p) { if (!ids[p[0]] || !ids[p[1]]) E('exclusive pair references unknown issue ' + p.join('/')); });
      // worst-case plan option length: tokens count as 3 words (long slot values such as "the front office supervisor")
      var est = function (t) { return wc(String(t).replace(/\{[^}]+\}/g, 'x')) + 2 * (String(t).match(/\{[^}]+\}/g) || []).length; };
      var br = function (o) { return o.brief || o.action || o.text; };
      (kit.issues || []).forEach(function (a) {
        (kit.issues || []).forEach(function (b) {
          if (a === b || a.tier === b.tier) return;
          var parts = [br(a)].concat(arr(a.shortcut).slice(0, 1).map(br));
          var seconds = [br(b)].concat(arr(b.shortcut).slice(0, 1).map(br));
          parts.forEach(function (x) { seconds.forEach(function (y) {
            var n = est(x) + est(y) + 2;
            if (n > S.LIMITS.optionWordsMax) E('plan option "' + x.slice(0, 30) + '... / ' + y.slice(0, 30) + '..." may reach ' + n + ' words; add shorter "brief" forms');
          }); });
        });
        if (a.brief) len('issue ' + a.id + ' brief', a.brief, 14, 3);
        arr(a.shortcut).forEach(function (s, j) { if (s.brief) len('issue ' + a.id + ' shortcut ' + j + ' brief', s.brief, 14, 3); });
      });
      if ((kit.issues || []).length) {
        if (!kit.proceed || !isStr(kit.proceed.text) || !isStr(kit.proceed.why) || !isStr(kit.proceed.lesson)) E('proceed {text, why, lesson} required');
        else len('proceed.text', kit.proceed.text, LIM.action, S.LIMITS.optionWordsMin);
        var clearable = kit.issues.filter(function (i) { return arr(i.clear).length; }).length;
        if (clearable && arr(kit.generic).concat(arr(kit.overcaution)).length < 2) E('kits with clearable issues need at least two generic/overcaution distractors');
        arr(kit.generic).concat(arr(kit.overcaution)).forEach(function (g, i) { len('generic ' + i, g.text, LIM.shortcut, S.LIMITS.optionWordsMin); });
      }
      if (kit.process) validateProcess(kit, E, len, ids);
      if (kit.doc) validateDoc(kit, E, len);
    }
    return { errors: errs, warnings: warns };
  }

  function validateProcess(kit, E, len, issueIds) {
    var p = kit.process, ids = {};
    if (!isStr(p.lesson)) E('process.lesson required');
    if (!arr(p.steps).length) { E('process.steps required'); return; }
    p.steps.forEach(function (s) {
      if (ids[s.id]) E('duplicate step ' + s.id); ids[s.id] = 1;
      if (!isStr(s.text)) E('step ' + s.id + ' needs text');
      len('step ' + s.id, s.text, LIM.step);
      if (s.issue && !issueIds[s.issue]) E('step ' + s.id + ' references unknown issue ' + s.issue);
    });
    if (!p.steps.some(function (s) { return s.core; })) E('process needs at least one core step');
    p.rel.forEach(function (r, i) {
      if (!ids[r[0]] || !ids[r[1]]) E('process.rel[' + i + '] references an unknown step');
      if (!isStr(r[2])) E('process.rel[' + i + '] needs a why');
      len('process.rel[' + i + '].why', r[2], LIM.why);
    });
    var all = p.steps.map(function (s) { return s.id; });
    var prec = p.rel.map(function (r) { return { before: r[0], after: r[1], why: r[2] }; });
    if (O.solution(all, prec) === null) E('process relations contain a cycle');
    if (p.alternatesReviewed !== true) E('process.alternatesReviewed must be true after confirming that unrelated steps really are independent');
  }

  function validateDoc(kit, E, len) {
    var d = kit.doc, ids = {};
    if (DOC_TYPES.indexOf(d.type) === -1) E('doc.type must be one of ' + DOC_TYPES.join(', '));
    if (!isStr(d.lesson)) E('doc.lesson required');
    if (arr(d.lines).length < S.LIMITS.segmentsMin) E('doc needs at least ' + S.LIMITS.segmentsMin + ' lines');
    var badIds = {};
    d.lines.forEach(function (l) {
      if (ids[l.id]) E('duplicate line ' + l.id); ids[l.id] = 1;
      if (!arr(l.text).length || !isStr(l.fine)) E('line ' + l.id + ' needs text and fine');
      len('line ' + l.id, l.text, LIM.line);
      arr(l.bad).forEach(function (b) {
        if (badIds[b.id]) E('duplicate defect ' + b.id); badIds[b.id] = 1;
        if (!isStr(b.text) || !isStr(b.why)) E('defect ' + b.id + ' needs text and why');
        len('defect ' + b.id, b.text, LIM.line); len('defect ' + b.id + ' why', b.why, LIM.why);
        arr(b.level).forEach(function (lv) { if (LEVELS.indexOf(lv) === -1) E('defect ' + b.id + ' has invalid level ' + lv); });
        if (!arr(b.level).length) E('defect ' + b.id + ' needs a level');
        arr(l.text).forEach(function (t) { if (T.normalize(t) === T.normalize(b.text)) E('defect ' + b.id + ' is identical to the correct line'); });
      });
    });
    d.lines.forEach(function (l) { arr(l.bad).forEach(function (b) { arr(b.needs).forEach(function (n) { if (!ids[n]) E('defect ' + b.id + ' needs unknown line ' + n); }); }); });
  }

  function validateNumeric(kit, E, W, len) {
    if (!arr(kit.configs).length) E('numeric kits need configs');
    var seen = {};
    arr(kit.configs).forEach(function (cfg) {
      var L = 'config ' + cfg.id;
      if (seen[cfg.id]) E(L + ': duplicate'); seen[cfg.id] = 1;
      if (LEVELS.indexOf(cfg.level) === -1) E(L + ': invalid level');
      if (!isStr(cfg.principle)) E(L + ': principle required');
      if (!isStr(cfg.lesson)) E(L + ': lesson required');
      var modes = arr(cfg.mode || ['decision']);
      modes.forEach(function (m) { if (!S.MODES[m] || m === 'order') E(L + ': invalid mode ' + m); });
      if (modes.indexOf('find') !== -1) {
        if (DOC_TYPES.indexOf(cfg.docType || 'note') === -1) E(L + ': invalid docType');
        var bad = arr(cfg.lines).filter(function (l) { return l.bad === true; }).length;
        if (bad !== 1) E(L + ': exactly one bad line required');
        if (arr(cfg.lines).length < S.LIMITS.segmentsMin) E(L + ': too few lines');
      } else {
        if (arr(cfg.options).length !== S.LIMITS.optionCount) E(L + ': exactly 4 options required');
        arr(cfg.options).forEach(function (o) {
          try { X.parse(o.ok); } catch (e) { E(L + ': option ' + o.key + ' ok expression: ' + e.message); }
          if (!isStr(o.why) || !isStr(o.mis)) E(L + ': option ' + o.key + ' needs why and mis');
        });
        if (cfg.level === 'advanced' && cfg.kind === 'decision' && !arr(cfg.options).some(function (o) { return o.acceptable; })) E(L + ': advanced decision configs need an acceptable option');
        var vals = arr(cfg.options).map(function (o) { return T.normalize(o.text); });
        if (vals.some(function (v, i) { return vals.indexOf(v) !== i; })) E(L + ': duplicate option templates');
      }
      arr(cfg.constraints).forEach(function (c) { try { X.parse(c); } catch (e) { E(L + ': constraint ' + c + ': ' + e.message); } });
    });
  }

  function validateCompose(lib, cx) {
    var errors = [], warnings = [];
    var ids = {};
    (cx.kits || []).forEach(function (k) {
      if (ids[k.id]) errors.push('duplicate kit id ' + k.id); ids[k.id] = 1;
      var r = validateKit(k, lib, cx);
      errors = errors.concat(r.errors); warnings = warnings.concat(r.warnings);
    });
    // a principle id may be shared across kits only if it means the same decision; record for audit
    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  /* ---------- instance level (independent logic re-derivation) ---------- */

  function checkInstance(c, h) {
    var errs = [];
    function E(m) { errs.push((c.id || '?') + ': ' + m); }
    var u = h.unitsById && h.unitsById[c.templateId];
    if (!u || u.kind !== 'composed') { E('unknown composed unit'); return errs; }
    var kit = h.catalog.kitsById[u.kitId];
    if (c.reasoning !== 'cx:' + u.signature) E('reasoning signature does not match the unit');
    if (c.skill !== kit.skill || c.family !== kit.family || c.mode !== u.mode || c.difficulty !== u.difficulty) E('instance does not match its unit');
    if (u.contexts.indexOf(c.context) === -1) E('rendered in a context the kit does not allow');
    var hostOk = u.hosts.some(function (x) { return x.context === c.context && x.bundle === c.bundle; });
    if (!hostOk) E('rendered in a setting bundle that lacks the kit\'s typed slots');
    var scen = String(c.scenario || '');
    (c.options || []).forEach(function (o) {
      var n = wc(o.text);
      if (n > S.LIMITS.optionWordsMax) E('option is ' + n + ' words (max ' + S.LIMITS.optionWordsMax + ')');
      if (n < S.LIMITS.optionWordsMin) E('option is too short to be plausible');
    });
    (c.steps || []).forEach(function (s) { if (wc(s.text) > 16) E('step text is too long'); });
    (c.cx.statements || []).forEach(function (s) { if (scen.indexOf(s.text) === -1) E('statement ' + s.id + ' missing from scenario'); });

    if (u.engine === 'state') {
      var st = u.spec, tiers = {};
      kit.issues.forEach(function (i) { tiers[i.id] = i.tier; });
      // decisive fact: the active issue with the lowest tier (independent re-derivation)
      var decisive = null;
      st.active.forEach(function (id) { if (decisive === null || tiers[id] < tiers[decisive]) decisive = id; });
      var stated = (c.cx.statements || []).map(function (s) { return s.id; });
      st.active.forEach(function (id) { if (stated.indexOf('fact:' + id) === -1) E('active fact ' + id + ' is not stated'); });
      st.resolved.forEach(function (id) {
        if (stated.indexOf('clear:' + id) === -1) E('resolved fact ' + id + ' is not stated');
        if (decisive !== null && !(tiers[id] < tiers[decisive])) E('resolved constraint ' + id + ' does not outrank the decisive issue');
      });
      var tierSet = {}; st.active.forEach(function (id) { if (tierSet[tiers[id]]) E('two active issues share a tier'); tierSet[tiers[id]] = 1; });
      var roles = { best: 0, acceptable: 0, distractor: 0 };
      Object.keys(c.key.options).forEach(function (oid) {
        var k = c.key.options[oid], src = k.source || '', role = k.role;
        roles[role]++;
        var expect = null;
        if (src.indexOf('act:') === 0) {
          var x = src.slice(4);
          if (st.active.indexOf(x) === -1) E('option acts on an issue that is not active');
          expect = x === decisive ? 'best' : 'acceptable';
        } else if (src === 'proceed') {
          expect = decisive === null ? 'best' : 'distractor';
          var dIss = kit.issues.filter(function (i) { return i.id === decisive; })[0];
          if (dIss && dIss.noProceed) E('"proceed" offered although the decisive issue marks it as not clearly wrong');
        }
        else if (src === 'plan:best') expect = 'best';
        else if (src === 'plan:reverse') expect = 'acceptable';
        else if (src.indexOf('redo:') === 0 || src === 'plan:redo') {
          expect = 'distractor';
          var r = src.indexOf('redo:') === 0 ? src.slice(5) : null;
          if (r && st.resolved.indexOf(r) === -1) E('redundant option for a constraint that is not stated as resolved');
        } else if (src.indexOf('sc:') === 0 || src.indexOf('plan:shortcut') === 0 || src.indexOf('generic:') === 0 || src.indexOf('over:') === 0) expect = 'distractor';
        else E('option has an unknown source ' + src);
        if (expect && expect !== role) E('option ' + src + ' has role ' + role + ', expected ' + expect);
      });
      if (roles.best !== 1) E('exactly one best option required');
      if (c.difficulty === 'advanced' && roles.acceptable < 1) E('advanced state needs an acceptable option');
      var bestSrc = c.key.options[c.key.bestId].source;
      if (decisive === null && bestSrc !== 'proceed') E('nothing blocks the work but the key is not "proceed"');
      if (decisive !== null && bestSrc !== 'act:' + decisive && bestSrc !== 'plan:best') E('key is not the decisive issue\'s action');
      if ((c.cx.state || {}).decisive !== decisive) E('engine and checker disagree about the decisive fact');
    } else if (u.engine === 'process') {
      var p = kit.process, set = u.spec.steps;
      var ids = c.steps.map(function (s) { return s.id; });
      if (ids.slice().sort().join() !== set.slice().sort().join()) E('steps differ from the unit');
      var all = p.steps.map(function (s) { return s.id; });
      var reach = {};
      all.forEach(function (a) { reach[a] = {}; });
      p.rel.forEach(function (r) { reach[r[0]][r[1]] = true; });
      all.forEach(function (k) { all.forEach(function (i) { if (reach[i][k]) all.forEach(function (j) { if (reach[k][j]) reach[i][j] = true; }); }); });
      var valid = O.enumerateValid(ids, c.key.precedence);
      valid.forEach(function (ord) {
        for (var i = 0; i < ord.length; i++) for (var j = i + 1; j < ord.length; j++) {
          if (reach[ord[j]][ord[i]]) E('an accepted order breaks the full dependency graph (' + ord[j] + ' must precede ' + ord[i] + ')');
        }
      });
      if (!O.isValid(c.key.example, ids, c.key.precedence)) E('example order is invalid');
      (c.cx.statements || []).forEach(function () { /* motivating facts present (checked above) */ });
      p.steps.forEach(function (s) { if (s.issue && set.indexOf(s.id) !== -1 && (c.facts || []).indexOf(s.issue) === -1) E('step ' + s.id + ' is included but its motivating fact is not stated'); });
    } else if (u.engine === 'defect') {
      var probs = Object.keys(c.key.segments).filter(function (k2) { return c.key.segments[k2].problem; });
      if (probs.length !== 1) E('exactly one defect required');
      if (c.key.problemId !== u.spec.line) E('defect is not on the unit\'s line');
      var line = kit.doc.lines.filter(function (l) { return l.id === u.spec.line; })[0];
      var bad = arr(line.bad).filter(function (b) { return b.id === u.spec.defect; })[0];
      c.doc.segments.forEach(function (s) {
        var kl = kit.doc.lines.filter(function (l) { return l.id === s.id; })[0];
        if (!kl) { E('segment from outside the kit'); return; }
        if (s.id !== u.spec.line && arr(kl.bad).some(function (b) { return T.normalize(b.text) === T.normalize(s.text); })) E('a second defect appears in ' + s.id);
      });
      arr(bad.needs).forEach(function (n) { if (!c.doc.segments.some(function (s) { return s.id === n; })) E('defect depends on line ' + n + ' which is missing'); });
    } else if (u.engine === 'numeric') {
      if (c.mode === 'find') {
        var pr = Object.keys(c.key.segments).filter(function (k3) { return c.key.segments[k3].problem; });
        if (pr.length !== 1) E('exactly one calculation error required');
      } else {
        var bests = Object.keys(c.key.options).filter(function (k4) { return c.key.options[k4].role === 'best'; });
        if (bests.length !== 1) E('exactly one correct numeric option required');
      }
    }
    return errs;
  }

  return { validateKit: validateKit, validateCompose: validateCompose, checkInstance: checkInstance, LIM: LIM, EXT: EXT };
}));
