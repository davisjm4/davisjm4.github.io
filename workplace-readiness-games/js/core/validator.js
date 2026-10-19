/* Workplace Readiness Games - content validation.
 *
 * Three levels:
 *   validateTemplate(t, lib)   authoring-time structure and instructional-design rules
 *   validateChallenge(c, lib)  every generated instance, before a student can see it
 *   validateLibrary(lib)       cross-template integrity (ids, contexts, people, families, skills)
 *
 * Each returns { ok, errors:[], warnings:[] }. Errors reject content; warnings feed the audit.
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var deps = isNode
    ? { schema: require('../data/schema.js'), text: require('./text.js'), order: require('./order.js'),
        expr: require('./expr.js'), grader: require('./grader.js') }
    : { schema: root.WRG.schema, text: root.WRG.text, order: root.WRG.order, expr: root.WRG.expr, grader: root.WRG.grader };
  var api = factory(deps);
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.validator = api; }
}(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';

  var S = deps.schema, T = deps.text, O = deps.order, X = deps.expr, G = deps.grader;
  var L = S.LIMITS;
  var STOP = ('a an the and or but of to in on at for with from by is are was were be been it its this that these those ' +
    'you your yours they their them he she his her we our i me my not no do does did can could should would will ' +
    'has have had as if then than so up out into over after before about just also very more most some any each').split(' ');

  function Report() { this.errors = []; this.warnings = []; }
  Report.prototype.err = function (m) { this.errors.push(m); };
  Report.prototype.warn = function (m) { this.warnings.push(m); };
  Report.prototype.done = function () { return { ok: this.errors.length === 0, errors: this.errors, warnings: this.warnings }; };

  function isStr(x) { return typeof x === 'string' && x.trim().length > 0; }
  function isArr(x) { return Array.isArray(x); }
  function dupes(list) {
    var seen = Object.create(null), d = [];
    list.forEach(function (x) { if (seen[x]) d.push(x); seen[x] = true; });
    return d;
  }
  function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }
  function contentWords(str, mask) {
    var s = String(str).toLowerCase();
    (mask || []).forEach(function (m) { if (m) s = s.split(String(m).toLowerCase()).join(' § '); });
    return T.words(s).filter(function (w) { return w !== '§' && STOP.indexOf(w) === -1 && w.length > 2; });
  }
  function ngrams(str, n, mask) {
    var s = String(str).toLowerCase();
    (mask || []).forEach(function (m) { if (m) s = s.split(String(m).toLowerCase()).join(' § '); });
    var w = T.words(s), out = [];
    for (var i = 0; i + n <= w.length; i++) {
      var g = w.slice(i, i + n);
      if (g.indexOf('§') === -1) out.push(g.join(' '));
    }
    return out;
  }

  /* ---------- template level ---------- */

  function templateStrings(t) {
    var out = [];
    function add(label, s) { if (typeof s === 'string') out.push({ label: label, text: s }); }
    add('scenario', t.scenario); add('prompt', t.prompt); add('principle', t.principle); add('docTitle', t.docTitle);
    (t.twists || []).forEach(function (w, i) { add('twists[' + i + '].text', w.text); });
    (t.options || []).forEach(function (o, i) {
      add('options[' + i + '].text', o.text); add('options[' + i + '].why', o.why); add('options[' + i + '].misconception', o.misconception);
    });
    (t.steps || []).forEach(function (s, i) { add('steps[' + i + '].text', s.text); });
    (t.precedence || []).forEach(function (p, i) { add('precedence[' + i + '].why', p.why); });
    (t.segments || []).forEach(function (s, i) { add('segments[' + i + '].text', s.text); add('segments[' + i + '].why', s.why); add('segments[' + i + '].whyFine', s.whyFine); });
    return out;
  }

  function validateTemplate(t, lib) {
    var R = new Report();
    var where = (t && t.id) || '(no id)';
    function E(m) { R.err(where + ': ' + m); }
    function W(m) { R.warn(where + ': ' + m); }
    if (!t || typeof t !== 'object') { R.err('template is not an object'); return R.done(); }

    var skill = lib.skillsById[t.skill];
    var mode = S.MODES[t.mode];
    if (!skill) E('unknown skill "' + t.skill + '"');
    if (!mode) E('unknown mode "' + t.mode + '"');
    if (S.DIFFICULTIES.indexOf(t.difficulty) === -1) E('invalid difficulty "' + t.difficulty + '"');
    if (!isStr(t.id) || !/^[A-Z]{3}-[DNOF]-\d{3}$/.test(t.id)) E('id must look like INT-D-001');
    else {
      if (skill && t.id.slice(0, 3) !== skill.code) E('id prefix does not match skill code ' + skill.code);
      if (mode && t.id.charAt(4) !== mode.code) E('id mode letter does not match mode ' + mode.code);
    }
    var fam = lib.familiesById[t.family];
    if (!fam) E('unknown reasoning family "' + t.family + '"');
    else if (fam.skill !== t.skill) E('family "' + t.family + '" belongs to skill "' + fam.skill + '"');
    if (!isStr(t.pattern) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.pattern)) E('pattern must be a kebab-case id for the underlying reasoning problem');

    if (!isArr(t.concepts) || !t.concepts.length) E('concepts must list at least one standards concept');
    else t.concepts.forEach(function (c) {
      if (!lib.conceptIds[c]) E('unknown concept "' + c + '"');
      else if (lib.conceptIds[c] !== t.skill) E('concept "' + c + '" belongs to another skill');
    });

    if (t.contexts !== 'any') {
      if (!isArr(t.contexts) || !t.contexts.length) E('contexts must be "any" or a non-empty array');
      else t.contexts.forEach(function (c) { if (!lib.contextsById[c]) E('unknown context "' + c + '"'); });
    }

    // slot aliases
    var aliases = Object.create(null);
    var slots = t.slots || {};
    Object.keys(slots).forEach(function (alias) {
      var src = slots[alias];
      if (!/^[a-z][A-Za-z0-9]*$/.test(alias)) E('slot alias "' + alias + '" must start lower-case, letters/digits only');
      if (src !== S.PERSON_SLOT && !S.SLOTS[src]) E('slot "' + alias + '" uses unknown source "' + src + '"');
      aliases[alias] = src;
    });

    // numeric vars
    var scopeNames = Object.keys(aliases);
    var numeric = Object.create(null);
    var vars = t.vars || {};
    Object.keys(vars).forEach(function (name) {
      var v = vars[name];
      if (v && v.type === 'int') {
        if (!(Number.isInteger(v.min) && Number.isInteger(v.max) && v.min <= v.max)) E('var "' + name + '" needs integer min <= max');
      } else if (v && v.type === 'choice') {
        if (!isArr(v.values) || !v.values.length || !v.values.every(function (x) { return typeof x === 'number'; })) E('var "' + name + '" choice needs numeric values');
      } else E('var "' + name + '" has invalid type');
      numeric[name] = 1; scopeNames.push(name);
    });
    var sample = {};
    Object.keys(vars).forEach(function (n) { var v = vars[n]; sample[n] = v.type === 'int' ? v.min : (v.values && v.values[0]); });
    Object.keys(t.derive || {}).forEach(function (name) {
      try { sample[name] = X.evaluate(t.derive[name], sample); numeric[name] = 1; scopeNames.push(name); }
      catch (e) { E('derive "' + name + '": ' + e.message); }
    });
    (t.constraints || []).forEach(function (c) { try { X.parse(c); } catch (e) { E('constraint "' + c + '": ' + e.message); } });

    // tokens
    var known = Object.create(null);
    scopeNames.forEach(function (n) { known[n] = true; });
    templateStrings(t).forEach(function (s) {
      T.tokens(s.text).forEach(function (tok) {
        var base = tok.name.charAt(0).toLowerCase() + tok.name.slice(1);
        if (!known[base]) { E(s.label + ': token ' + tok.raw + ' is not declared in slots/vars/derive'); return; }
        if (tok.filter && T.FILTERS.indexOf(tok.filter) === -1) E(s.label + ': unknown filter in ' + tok.raw);
        if (tok.prop) {
          var p = tok.prop.charAt(0).toLowerCase() + tok.prop.slice(1);
          if (aliases[base] === S.PERSON_SLOT) { if (S.PRONOUN_KEYS.indexOf(p) === -1) E(s.label + ': bad pronoun property in ' + tok.raw); }
          else if (aliases[base] && p === 'plural') { if (!S.SLOTS[aliases[base]].plural) E(s.label + ': slot "' + aliases[base] + '" has no plural'); }
          else E(s.label + ': property not allowed in ' + tok.raw);
        }
        if (numeric[base] && tok.prop) E(s.label + ': numeric token cannot take a property in ' + tok.raw);
        if (numeric[base] && !tok.filter) W(s.label + ': numeric token ' + tok.raw + ' has no format filter');
      });
    });

    // twists / facts
    var facts = isArr(t.facts) ? t.facts : [];
    if (!isArr(t.facts) || !t.facts.length) E('facts must list the key scenario facts this template always asserts');
    var twistIds = [];
    (t.twists || []).forEach(function (w, i) {
      if (!isStr(w.id)) E('twists[' + i + '] needs an id'); else twistIds.push(w.id);
      if (!isStr(w.text)) E('twists[' + i + '] needs text');
    });
    dupes(twistIds).forEach(function (d) { E('duplicate twist id ' + d); });
    (t.contradictions || []).forEach(function (pair) { if (!isArr(pair) || pair.length !== 2) E('contradictions must be pairs of fact ids'); });

    // review metadata
    if (!t.review || t.review.status !== 'approved') E('review.status must be "approved" after an instructional audit');
    else {
      if (!isStr(t.review.notes)) E('review.notes must record what the audit confirmed');
      if (S.REVIEW_REQUIRED_SKILLS.indexOf(t.skill) !== -1) {
        if (!isArr(t.review.checks) || t.review.checks.indexOf('no-jurisdiction-claims') === -1) E('sensitive skill requires review.checks to include "no-jurisdiction-claims"');
        if (t.review.checks && t.review.checks.indexOf('policy-stated-in-scenario') === -1 && t.review.policyNotNeeded !== true) E('sensitive skill requires "policy-stated-in-scenario" in review.checks, or review.policyNotNeeded:true');
      }
    }

    // text-level rules
    templateStrings(t).forEach(function (s) {
      if (/\b(the|a|an)\s+\{[A-Za-z]+(\.[A-Za-z]+)?\|(the|a)\}/i.test(s.text)) E(s.label + ': double determiner (a filter |a or |the already adds the article)');
      if (/\{[A-Za-z]+\.[Ss]ubj\}/.test(s.text)) E(s.label + ': avoid subject pronouns (.subj); verb agreement breaks for "they". Use the name instead.');
    });
    if (!isStr(t.prompt)) E('prompt is required');
    if (!isStr(t.principle)) E('principle (transferable takeaway) is required');
    else if (T.wordCount(t.principle) > L.feedbackWords) E('principle is over ' + L.feedbackWords + ' words');
    templateStrings(t).forEach(function (s) {
      S.LEGAL_CLAIM_PATTERNS.forEach(function (re) {
        if (re.test(s.text) && !(t.review && t.review.legalClaimsVerified === true)) E(s.label + ': legal/mandatory-law claim needs review.legalClaimsVerified:true and a stated source in review.notes');
      });
    });
    [t.scenario, t.prompt].forEach(function (txt) {
      var low = String(txt || '').toLowerCase();
      S.SCENARIO_LEAK_PHRASES.forEach(function (p) { if (low.indexOf(p) !== -1) E('scenario/prompt contains answer-leaking phrase "' + p + '"'); });
    });

    if (mode) {
      if (t.mode === 'decision' || t.mode === 'nextstep') validateChoiceTemplate(t, E, W, facts);
      else if (t.mode === 'order') validateOrderTemplate(t, E, W);
      else if (t.mode === 'find') validateFindTemplate(t, E, W);
    }
    if (t.mode !== 'find' && !isStr(t.scenario)) E('scenario is required');
    return R.done();
  }

  function validateChoiceTemplate(t, E, W, facts) {
    var opts = t.options;
    if (!isArr(opts) || opts.length !== L.optionCount) { E('exactly ' + L.optionCount + ' options required'); return; }
    var roles = { best: 0, acceptable: 0, distractor: 0 };
    var ids = [];
    opts.forEach(function (o, i) {
      var tag = 'options[' + i + ']';
      if (!isStr(o.id)) E(tag + ' needs an id'); else ids.push(o.id);
      if (!(o.role in roles)) { E(tag + ' has invalid role'); return; }
      roles[o.role]++;
      if (!isStr(o.text)) E(tag + ' needs text');
      if (!isStr(o.why)) E(tag + ' needs a "why" explanation');
      else if (T.wordCount(o.why) > L.feedbackWords) E(tag + ' why is over ' + L.feedbackWords + ' words');
      if (o.role !== 'best' && !isStr(o.misconception)) E(tag + ' needs a "misconception" (the faulty reasoning that makes it tempting)');
      var wc = T.wordCount(o.text || '');
      if (wc < L.optionWordsMin) E(tag + ' is too short (' + wc + ' words) to be a plausible option');
      if (wc > L.optionWordsMax) E(tag + ' is over ' + L.optionWordsMax + ' words');
      if (o.role !== 'best') {
        var low = String(o.text).toLowerCase();
        S.ABSURD_OPTION_WORDS.forEach(function (w) { if (low.indexOf(w) !== -1) E(tag + ' contains absurd-option wording "' + w + '"'); });
      }
      (o.requires || []).forEach(function (f) { if (facts.indexOf(f) === -1) E(tag + ' requires fact "' + f + '" that the base scenario does not assert'); });
    });
    dupes(ids).forEach(function (d) { E('duplicate option id ' + d); });
    if (roles.best !== 1) E('exactly one option must have role "best" (found ' + roles.best + ')');
    if (t.difficulty === 'advanced' && roles.acceptable < 1) E('advanced templates must include an "acceptable but not best" option');
    var texts = opts.map(function (o) { return T.normalize(o.text || ''); });
    dupes(texts).forEach(function () { E('duplicate option text'); });
    var best = opts.filter(function (o) { return o.role === 'best'; })[0];
    if (best) {
      var bw = T.wordCount(best.text), maxOther = 0;
      opts.forEach(function (o) { if (o !== best) maxOther = Math.max(maxOther, T.wordCount(o.text || '')); });
      if (bw > maxOther * L.bestLongestRatio) E('best option is conspicuously the longest (' + bw + ' words vs ' + maxOther + ')');
      if (best.role === 'best' && best.misconception) W('best option should not carry a misconception');
    }
    if (t.mode === 'nextstep') {
      if (!isStr(t.timing)) E('nextstep templates need a "timing" note explaining why sequence/priority matters');
      if (!/\b(first|next|right now|immediately|before)\b/i.test(t.prompt || '')) E('nextstep prompt must emphasise sequence or timing (first / next / right now / immediately / before)');
    }
  }

  function validateOrderTemplate(t, E, W) {
    var steps = t.steps, prec = t.precedence;
    if (!isArr(steps) || steps.length < L.stepsMin || steps.length > L.stepsMax) { E('order needs ' + L.stepsMin + '-' + L.stepsMax + ' steps'); return; }
    var ids = steps.map(function (s) { return s.id; });
    steps.forEach(function (s, i) { if (!isStr(s.id) || !isStr(s.text)) E('steps[' + i + '] needs id and text'); });
    dupes(ids).forEach(function (d) { E('duplicate step id ' + d); });
    dupes(steps.map(function (s) { return T.normalize(s.text || ''); })).forEach(function () { E('duplicate step text'); });
    if (!isArr(prec) || !prec.length) { E('order needs precedence relations'); return; }
    var seen = Object.create(null), inRel = Object.create(null);
    prec.forEach(function (p, i) {
      if (ids.indexOf(p.before) === -1 || ids.indexOf(p.after) === -1) { E('precedence[' + i + '] references unknown step'); return; }
      if (p.before === p.after) E('precedence[' + i + '] relates a step to itself');
      if (!isStr(p.why)) E('precedence[' + i + '] needs a "why"');
      else if (T.wordCount(p.why) > L.feedbackWords) E('precedence[' + i + '] why is over ' + L.feedbackWords + ' words');
      var key = p.before + '>' + p.after;
      if (seen[key]) E('duplicate precedence ' + key); seen[key] = true;
      inRel[p.before] = inRel[p.after] = true;
    });
    ids.forEach(function (id) { if (!inRel[id]) E('step "' + id + '" is not part of any precedence relation (no meaningful required position)'); });
    var valid = O.enumerateValid(ids, prec);
    if (!valid.length) { E('precedence relations contain a cycle'); return; }
    var frac = valid.length / factorial(ids.length);
    if (frac > L.maxOrderValidFraction) E('too many valid orders (' + valid.length + ' of ' + factorial(ids.length) + '): the sequence is not meaningfully constrained');
    if (valid.length > 1) {
      // Alternates must be intentional and defensible: authors acknowledge them.
      if (t.alternatesReviewed !== true) E('more than one valid order exists; set alternatesReviewed:true after confirming each alternate is professionally sound');
    }
  }

  var DOC_TYPES = ['email', 'chat', 'procedure', 'schedule', 'post', 'note'];
  function validateFindTemplate(t, E, W) {
    if (DOC_TYPES.indexOf(t.docType) === -1) E('docType must be one of ' + DOC_TYPES.join(', '));
    var segs = t.segments;
    if (!isArr(segs) || segs.length < L.segmentsMin || segs.length > L.segmentsMax) { E('find needs ' + L.segmentsMin + '-' + L.segmentsMax + ' segments'); return; }
    var problems = 0;
    segs.forEach(function (s, i) {
      if (!isStr(s.id) || !isStr(s.text)) E('segments[' + i + '] needs id and text');
      if (s.problem === true) {
        problems++;
        if (!isStr(s.why)) E('segments[' + i + '] (problem) needs "why"');
        else if (T.wordCount(s.why) > L.feedbackWords) E('segments[' + i + '] why is over ' + L.feedbackWords + ' words');
      } else {
        if (!isStr(s.whyFine)) E('segments[' + i + '] needs "whyFine" explaining why it is acceptable');
        else if (T.wordCount(s.whyFine) > L.feedbackWords) E('segments[' + i + '] whyFine is over ' + L.feedbackWords + ' words');
      }
    });
    if (problems !== 1) E('exactly one segment must be the problem (found ' + problems + ')');
    dupes(segs.map(function (s) { return s.id; })).forEach(function (d) { E('duplicate segment id ' + d); });
    dupes(segs.map(function (s) { return T.normalize(s.text || ''); })).forEach(function () { E('duplicate segment text'); });
    if (t.shuffleSegments === true && t.docType !== 'procedure' && t.docType !== 'note') E('shuffleSegments is only valid for order-independent docTypes (procedure, note)');
    if (!isStr(t.docTitle)) W('docTitle helps students orient (e.g. "Message from the help desk")');
  }

  /* ---------- instance level ---------- */

  function allText(c) {
    var out = [c.scenario, c.prompt, c.principle];
    if (c.doc) { out.push(c.doc.title); c.doc.segments.forEach(function (s) { out.push(s.text); }); }
    (c.options || []).forEach(function (o) { out.push(o.text); });
    (c.steps || []).forEach(function (s) { out.push(s.text); });
    if (c.key) {
      if (c.key.options) Object.keys(c.key.options).forEach(function (k) { out.push(c.key.options[k].why, c.key.options[k].misconception); });
      if (c.key.precedence) c.key.precedence.forEach(function (p) { out.push(p.why); });
      if (c.key.segments) Object.keys(c.key.segments).forEach(function (k) { out.push(c.key.segments[k].note); });
    }
    return out.filter(function (x) { return x !== undefined && x !== null; });
  }

  function validateChallenge(c, lib) {
    var R = new Report();
    var where = (c && c.id) || '(no id)';
    function E(m) { R.err(where + ': ' + m); }
    function W(m) { R.warn(where + ': ' + m); }
    if (!c || typeof c !== 'object') { R.err('challenge is not an object'); return R.done(); }

    if (!lib.skillsById[c.skill]) E('invalid skill id');
    if (!S.MODES[c.mode]) E('invalid mode');
    if (S.DIFFICULTIES.indexOf(c.difficulty) === -1) E('invalid difficulty');
    var fam = lib.familiesById[c.family];
    if (!fam) E('invalid reasoning family'); else if (fam.skill !== c.skill) E('family does not belong to skill');
    var tpl = lib.templatesById[c.templateId];
    if (!tpl) E('unknown template'); else if (tpl.family !== c.family || tpl.skill !== c.skill || tpl.mode !== c.mode) E('instance does not match its template');
    if (!isStr(c.scenario) && c.mode !== 'find') E('missing scenario');
    if (!isStr(c.prompt)) E('missing prompt');
    if (!isStr(c.principle)) E('missing principle');
    if (!c.key) { E('missing answer key'); return R.done(); }

    allText(c).forEach(function (s) {
      if (/[{}]/.test(s)) E('unresolved token in text: "' + s.slice(0, 60) + '"');
      if (/\bundefined\b|\bNaN\b|\bnull\b|\[object/.test(s)) E('bad value leaked into text: "' + s.slice(0, 60) + '"');
      if (/\s{2,}/.test(s)) W('double space in text: "' + s.slice(0, 60) + '"');
      var rep = /\b([a-z]+)\s+\1\b/i.exec(s);
      if (rep && ['had', 'that'].indexOf(rep[1].toLowerCase()) === -1) E('repeated word "' + rep[1] + ' ' + rep[1] + '" in text: "' + s.slice(0, 60) + '"');
    });

    var scenarioWords = T.wordCount((c.scenario || '') + ' ' + (c.doc ? c.doc.segments.map(function (s) { return s.text; }).join(' ') : ''));
    var cap = L.scenarioWords[c.difficulty] || 100;
    if (c.mode !== 'find' && scenarioWords > cap) E('scenario is ' + scenarioWords + ' words (limit ' + cap + ' for ' + c.difficulty + ')');

    // fact consistency
    var facts = c.facts || [];
    (c.contradictions || []).forEach(function (p) { if (facts.indexOf(p[0]) !== -1 && facts.indexOf(p[1]) !== -1) E('contradictory scenario facts: ' + p.join(' vs ')); });

    if (c.mode === 'decision' || c.mode === 'nextstep') validateChoiceInstance(c, E, W, facts);
    else if (c.mode === 'order') validateOrderInstance(c, E, W);
    else if (c.mode === 'find') validateFindInstance(c, E, W);

    // completable through the UI: the key must grade as correct, and every wrong path as incorrect
    if (R.errors.length === 0) {
      var ok = G.grade(c, G.solve(c));
      if (!ok.ok || !ok.correct) E('the answer key does not grade as correct');
      var wrongs = G.wrongResponses(c);
      if (!wrongs.length) E('no incorrect response exists');
      wrongs.slice(0, 40).forEach(function (w) { var g = G.grade(c, w); if (!g.ok || g.correct) E('an incorrect response graded as correct'); });
    }
    return R.done();
  }

  function validateChoiceInstance(c, E, W, facts) {
    var opts = c.options;
    if (!isArr(opts) || opts.length !== L.optionCount) { E('wrong number of options'); return; }
    var ids = opts.map(function (o) { return o.id; });
    dupes(ids).forEach(function () { E('duplicate option ids'); });
    dupes(opts.map(function (o) { return T.normalize(o.text); })).forEach(function () { E('duplicate option text'); });
    var keyOpts = c.key.options || {};
    if (!keyOpts[c.key.bestId]) { E('bestId not among options'); return; }
    var bests = 0;
    opts.forEach(function (o) {
      var k = keyOpts[o.id];
      if (!k) { E('option missing key entry'); return; }
      if (k.role === 'best') bests++;
      if (!isStr(k.why)) E('option missing feedback');
      if (k.role !== 'best' && !isStr(k.misconception)) E('wrong option missing misconception');
    });
    if (bests !== 1) E('exactly one best answer required (found ' + bests + ')');
    if (keyOpts[c.key.bestId].role !== 'best') E('bestId does not point at the best option');
    var bestWhy = keyOpts[c.key.bestId].why;
    opts.forEach(function (o) { if (o.id !== c.key.bestId && keyOpts[o.id] && keyOpts[o.id].why === bestWhy) E('wrong option reuses the best answer feedback'); });

    var bestText = opts.filter(function (o) { return o.id === c.key.bestId; })[0].text;
    var mask = c.maskValues || [];
    // answer leakage: a verbatim 5-word run from the best option inside the scenario
    var scenGrams = ngrams(c.scenario, 5, mask);
    ngrams(bestText, 5, mask).forEach(function (g) { if (scenGrams.indexOf(g) !== -1) E('scenario leaks the best answer ("' + g + '")'); });
    // softer leakage signal: lexical overlap of best option with scenario compared to distractors
    var scen = contentWords(c.scenario, mask);
    function overlap(txt) {
      var w = contentWords(txt, mask); if (!w.length) return 0;
      var hit = w.filter(function (x) { return scen.indexOf(x) !== -1; }).length;
      return hit / w.length;
    }
    var ob = overlap(bestText), maxOther = 0;
    opts.forEach(function (o) { if (o.id !== c.key.bestId) maxOther = Math.max(maxOther, overlap(o.text)); });
    if (ob >= 0.5 && ob - maxOther >= 0.3) W('best option echoes the scenario wording far more than distractors (' + ob.toFixed(2) + ' vs ' + maxOther.toFixed(2) + ')');

    var bw = T.wordCount(bestText);
    opts.forEach(function (o) {
      var wc = T.wordCount(o.text);
      if (o.id !== c.key.bestId) {
        if (wc < L.optionWordsMin) E('distractor too short to be plausible');
        if (wc < bw * 0.4) W('distractor much shorter than best answer');
        var low = o.text.toLowerCase();
        S.ABSURD_OPTION_WORDS.forEach(function (w) { if (low.indexOf(w) !== -1) E('distractor contains absurd wording "' + w + '"'); });
      }
    });
    var requires = (lookupRequires(c) || []);
    requires.forEach(function (f) { if (facts.indexOf(f) === -1) E('best answer depends on fact "' + f + '" that the scenario does not state'); });
  }
  function lookupRequires(c) { return c.bestRequires; }

  function validateOrderInstance(c, E, W) {
    var steps = c.steps;
    if (!isArr(steps) || steps.length < L.stepsMin || steps.length > L.stepsMax) { E('wrong number of steps'); return; }
    var ids = steps.map(function (s) { return s.id; });
    dupes(ids).forEach(function () { E('duplicate step ids'); });
    var prec = c.key.precedence;
    if (!isArr(prec) || !prec.length) { E('missing precedence'); return; }
    var valid = O.enumerateValid(ids, prec);
    if (!valid.length) { E('precedence has no valid order'); return; }
    if (valid.length / factorial(ids.length) > L.maxOrderValidFraction) E('ordering is not meaningfully constrained');
    if (!O.isValid(c.key.example, ids, prec)) E('example order violates precedence');
    if (O.isValid(ids, ids, prec)) E('initial order is already a valid answer');
    // answer leakage: the scenario must not narrate the steps (several steps echoed => the sequence is given away)
    var mask = c.maskValues || [], scen = contentWords(c.scenario || '', mask), mentioned = 0;
    steps.forEach(function (s) {
      var w = contentWords(s.text, mask).filter(function (x) { return x.length > 3; });
      var hit = w.filter(function (x) { return scen.indexOf(x) !== -1; }).length;
      if (hit >= 2) mentioned++;
    });
    if (mentioned >= 3) E('scenario enumerates the steps and gives the sequence away');
    var sg = ngrams(c.scenario || '', 4, mask);
    steps.forEach(function (s) { ngrams(s.text, 4, mask).forEach(function (g) { if (sg.indexOf(g) !== -1) E('scenario repeats step wording ("' + g + '")'); }); });
  }

  function validateFindInstance(c, E, W) {
    var d = c.doc;
    if (!d || !isArr(d.segments) || d.segments.length < L.segmentsMin) { E('document has too few segments'); return; }
    var ids = d.segments.map(function (s) { return s.id; });
    dupes(ids).forEach(function () { E('duplicate segment ids'); });
    dupes(d.segments.map(function (s) { return T.normalize(s.text); })).forEach(function () { E('duplicate segment text'); });
    if (ids.indexOf(c.key.problemId) === -1) E('problem segment missing');
    ids.forEach(function (id) { if (!c.key.segments[id] || !isStr(c.key.segments[id].note)) E('segment missing feedback note'); });
    var problems = ids.filter(function (id) { return c.key.segments[id] && c.key.segments[id].problem === true; });
    if (problems.length !== 1) E('exactly one problem segment required (found ' + problems.length + ')');
  }

  /* ---------- library level ---------- */

  function validateLibrary(lib, opts) {
    opts = opts || {};
    var R = new Report();
    function E(m) { R.err(m); }
    function W(m) { R.warn(m); }

    // skills & concepts
    lib.skills.forEach(function (s) {
      if (!S.CATEGORIES[s.category]) E('skill ' + s.id + ' has invalid category');
      var ids = s.concepts.map(function (c) { return c.id; });
      dupes(ids).forEach(function (d) { E('duplicate concept id ' + d); });
      ids.forEach(function (id) { if (id.indexOf(s.id + ':') !== 0) E('concept ' + id + ' must be prefixed with "' + s.id + ':"'); });
    });
    if (lib.skills.length !== 22) E('expected 22 skills, found ' + lib.skills.length);
    dupes(lib.skills.map(function (s) { return s.code; })).forEach(function (d) { E('duplicate skill code ' + d); });
    dupes(lib.skills.map(function (s) { return s.number; })).forEach(function (d) { E('duplicate skill number ' + d); });

    // families
    dupes(lib.families.map(function (f) { return f.id; })).forEach(function (d) { E('duplicate family id ' + d); });
    lib.families.forEach(function (f) {
      if (!lib.skillsById[f.skill]) E('family ' + f.id + ' has unknown skill');
      else if (f.id.indexOf(f.skill + '.') !== 0) E('family id ' + f.id + ' must start with "' + f.skill + '."');
    });

    // people
    dupes(lib.people.map(function (p) { return p.name; })).forEach(function (d) { E('duplicate person name ' + d); });
    lib.people.forEach(function (p) { S.PRONOUN_KEYS.forEach(function (k) { if (!isStr(p[k])) E('person ' + p.name + ' missing ' + k); }); });
    if (lib.people.length < 12) E('people pool too small');

    // contexts
    lib.contexts.forEach(function (ctx) {
      if (!S.CONTEXTS[ctx.id]) E('context id ' + ctx.id + ' is not an approved career context');
      if (!ctx.bundles || !ctx.bundles.length) E('context ' + ctx.id + ' has no bundles');
      (ctx.bundles || []).forEach(function (b) {
        Object.keys(S.SLOTS).forEach(function (slot) {
          var def = S.SLOTS[slot], v = b[slot];
          if (v === undefined) { E(ctx.id + '/' + b.id + ' missing slot ' + slot); return; }
          (isArr(v) ? v : [v]).forEach(function (item) {
            var txt = typeof item === 'string' ? item : item && item.text;
            if (!isStr(txt)) { E(ctx.id + '/' + b.id + ' slot ' + slot + ' has an empty entry'); return; }
            if (def.form === 'bare' && /^(a|an|the)\s/i.test(txt)) E(ctx.id + '/' + b.id + ' slot ' + slot + ' must be a bare noun (no article): "' + txt + '"');
            if (def.plural && !(item && typeof item === 'object' && isStr(item.plural))) E(ctx.id + '/' + b.id + ' slot ' + slot + ' needs a plural form');
          });
        });
      });
    });

    // templates
    dupes(lib.templates.map(function (t) { return t.id; })).forEach(function (d) { E('duplicate template id ' + d); });
    lib.templates.forEach(function (t) {
      var r = validateTemplate(t, lib);
      r.errors.forEach(E); r.warnings.forEach(W);
    });
    lib.families.forEach(function (f) {
      var n = lib.templates.filter(function (t) { return t.family === f.id; }).length;
      if (n === 0) W('family ' + f.id + ' has no templates');
    });
    // Authoring bias guard: the best answer must not be the unique longest option in most templates.
    var choice = lib.templates.filter(function (t) { return t.options && t.options.length === L.optionCount; });
    if (choice.length >= 12) {
      var longest = choice.filter(function (t) {
        var w = t.options.map(function (o) { return T.wordCount(o.text); });
        var b = w[t.options.findIndex(function (o) { return o.role === 'best'; })], mx = Math.max.apply(null, w);
        return b === mx && w.filter(function (x) { return x === b; }).length === 1;
      }).length;
      var share = longest / choice.length;
      if (share > 0.4) E('best answer is the unique longest option in ' + Math.round(share * 100) + '% of choice templates (limit 40%)');
      else if (share > 0.3) W('best answer is the unique longest option in ' + Math.round(share * 100) + '% of choice templates');
    }
    if (opts.requireAllSkills) {
      lib.skills.forEach(function (s) { if (!lib.templatesBySkill[s.id].length) E('skill ' + s.id + ' has no templates'); });
    }
    return R.done();
  }

  return { validateTemplate: validateTemplate, validateChallenge: validateChallenge, validateLibrary: validateLibrary };
}));
