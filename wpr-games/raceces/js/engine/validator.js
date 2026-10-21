/* Content validation (build time) and challenge validation (before display and in every test). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./structure.js'), require('./model.js'), require('./rng.js'),
      require('./identify.js'), require('./rearrange.js'), require('./missing.js'));
  } else {
    root.RACECES = root.RACECES || {};
    var R = root.RACECES;
    R.Validator = factory(R.Structure, R.Model, R.RNG, R.Identify, R.Rearrange, R.Missing);
  }
})(typeof self !== 'undefined' ? self : this, function (Structure, Model, RNG, Identify, Rearrange, Missing) {
  'use strict';

  var WORD_LIMITS = { beginner: [70, 130], intermediate: [90, 170], advanced: [110, 195] };
  var BANNED = ['election', 'elections', 'president', 'senator', 'vote', 'voting', 'democrat', 'republican', 'political', 'politics',
    'war', 'religion', 'religious', 'church', 'sexual', 'kill', 'murder', 'drug', 'drugs', 'alcohol', 'crime', 'criminal', 'gun', 'weapon',
    'terror', 'terrorist', 'racism', 'racist', 'abuse', 'suicide', 'death', 'dead', 'blood', 'conflict'];
  var STOP = ('the a an and or but if then of to in on at for with from by as is are was were be been being it its this that these those ' +
    'can could will would should may might must has have had do does did not no so than too very also into onto over under about after before ' +
    'while when where which who whom what why how each every both such some many most more less other another').split(' ');

  // Attribution words ("the passage notes that...") add no facts, so they are ignored when checking grounding.
  var ATTRIB = ['source', 'passage', 'text', 'reading', 'excerpt', 'according', 'notes', 'states', 'mentions', 'explains', 'points', 'says', 'describes', 'reports', 'describe'];
  function words(s) { return (s.toLowerCase().match(/[a-z0-9]+/g) || []); }
  function contentWords(s) { return words(s).filter(function (w) { return w.length > 3 && STOP.indexOf(w) < 0; }); }
  function numbersIn(s) { return (s.replace(/(\d),(\d)/g, '$1$2').match(/\d+/g) || []); }
  function stem(w) { return w.slice(0, 5); }
  function wordCount(s) { return words(s).length; }

  function validateContent(bundle) {
    var errors = [], warnings = [];
    var idx = Model.indexBundle(bundle);
    var families = {};
    bundle.topics.forEach(function (t) {
      ['id', 'subject', 'title', 'intro'].forEach(function (k) { if (!t[k]) errors.push(t.id + ': missing ' + k); });
      if (!t.facts || t.facts.length < 8) errors.push(t.id + ': needs at least 8 facts');
      var seen = {};
      (t.facts || []).forEach(function (f) {
        if (seen[f.id]) errors.push(t.id + ': duplicate fact id ' + f.id); seen[f.id] = true;
        ['id', 'text', 'ev', 'tag'].forEach(function (k) { if (!f[k]) errors.push(t.id + '/' + f.id + ': missing ' + k); });
        // Grounding: the evidence statement must be supported by its source fact.
        var srcStems = {}; contentWords(f.text).forEach(function (w) { srcStems[stem(w)] = true; });
        var evw = contentWords(f.ev).filter(function (w) { return ATTRIB.indexOf(w) < 0; });
        var hit = evw.filter(function (w) { return srcStems[stem(w)]; }).length;
        if (evw.length && hit / evw.length < 0.7) errors.push(t.id + '/' + f.id + ': evidence not grounded in source fact (overlap ' + Math.round(100 * hit / evw.length) + '%)');
        numbersIn(f.ev).forEach(function (n) { if (numbersIn(f.text).indexOf(n) < 0) errors.push(t.id + '/' + f.id + ': evidence number ' + n + ' not in source'); });
      });
    });

    var allSentences = {};
    bundle.models.forEach(function (m) {
      var t = idx.topicsById[m.topicId];
      var tag = m.id + ': ';
      ['id', 'family', 'level', 'q', 'restate', 'answer', 'sum', 'sumNew', 'bad', 'badRestate', 'off', 'offExp'].forEach(function (k) { if (!m[k]) errors.push(tag + 'missing ' + k); });
      if (Structure.LEVELS.indexOf(m.level) < 0) errors.push(tag + 'invalid level');
      if (!Array.isArray(m.ev) || m.ev.length !== 2 || m.ev[0] === m.ev[1]) errors.push(tag + 'needs two distinct evidence facts');
      if (!Array.isArray(m.exp) || m.exp.length !== 2) errors.push(tag + 'needs two explanations');
      if (!Array.isArray(m.rep) || m.rep.length !== 2) errors.push(tag + 'needs two repeat distractors');
      if (!t) { errors.push(tag + 'unknown topic'); return; }
      (m.ev || []).concat([m.off]).forEach(function (id) { if (!t.factsById[id]) errors.push(tag + 'unknown fact ' + id); });
      if ((m.ev || []).indexOf(m.off) >= 0) errors.push(tag + 'off-topic fact cannot also be evidence');
      families[m.family] = (families[m.family] || 0) + 1;

      var texts = [m.q, m.restate, m.answer, m.sum, m.sumNew, m.bad, m.badRestate, m.offExp].concat(m.exp || [], m.rep || []);
      var dedupe = {};
      texts.forEach(function (s) {
        var k = s.trim().toLowerCase();
        if (dedupe[k]) errors.push(tag + 'duplicate sentence: ' + s); dedupe[k] = true;
        if (/[{}]/.test(s)) errors.push(tag + 'placeholder in text: ' + s);
        if (!/[.?]$/.test(s)) errors.push(tag + 'sentence should end with punctuation: ' + s);
      });
      // No unsupported numbers in any model sentence.
      var srcNums = numbersIn(t.intro + ' ' + t.facts.map(function (f) { return f.text; }).join(' '));
      texts.forEach(function (s) { numbersIn(s).forEach(function (n) { if (srcNums.indexOf(n) < 0) errors.push(tag + 'number ' + n + ' not in source: ' + s); }); });
      // Neutral-content scan.
      texts.concat([t.intro], t.facts.map(function (f) { return f.text; })).forEach(function (s) {
        words(s).forEach(function (w) { if (BANNED.indexOf(w) >= 0) errors.push(tag + 'excluded term "' + w + '": ' + s); });
      });
      // Distinct summary vs new-info summary, off fact must differ in meaning from evidence.
      if (m.sumNew.toLowerCase().indexOf(m.sum.toLowerCase().slice(0, 20)) < 0 && wordCount(m.sumNew) < wordCount(m.sum)) warnings.push(tag + 'sumNew shorter than sum');
      // Sentence length sanity (reading load).
      texts.forEach(function (s) { if (wordCount(s) > 34) warnings.push(tag + 'long sentence (' + wordCount(s) + ' words): ' + s.slice(0, 50)); });
    });

    // Excerpt length per level over several seeds.
    var wc = { beginner: [], intermediate: [], advanced: [] };
    bundle.models.forEach(function (m) {
      for (var s = 0; s < 6; s++) {
        var r = Model.buildResponse(idx, m.id, RNG.create('wc' + s));
        var n = wordCount(r.excerpt);
        wc[m.level].push(n);
        var lim = WORD_LIMITS[m.level];
        if (n < lim[0] || n > lim[1]) errors.push(m.id + ': excerpt ' + n + ' words outside ' + lim.join('-') + ' for ' + m.level);
      }
    });
    if (Object.keys(families).length < 8) errors.push('Fewer than 8 reasoning families');
    return { errors: errors, warnings: warnings, wordCounts: wc, families: families };
  }

  function validateChallenge(ch) {
    var e = [];
    function bad(msg) { e.push(msg); }
    if (!ch || !ch.mode) return ['missing mode'];
    if (!ch.excerpt || wordCount(ch.excerpt) < 60) bad('excerpt too short');
    if (!ch.question || ch.question.slice(-1) !== '?') bad('question missing');
    if (!ch.prompt || /[{}]/.test(ch.prompt)) bad('prompt missing or has placeholder');
    var info = ch.info;
    Structure.SLOTS.forEach(function (s) { if (!info[s] || !info[s].text) bad('missing sentence ' + s); });
    var texts = Structure.SLOTS.map(function (s) { return info[s].text; });
    if (new Set(texts).size !== 7) bad('duplicate sentences in response');
    // Pair relationships.
    [1, 2].forEach(function (k) {
      if (info['C' + k].pair !== k || info['E' + k].pair !== k) bad('pair ids inconsistent');
      if (!info['C' + k].tag || info['C' + k].tag !== info['E' + k].tag) bad('pair tags inconsistent');
    });
    if (info.C1.tag === info.C2.tag) bad('two evidence statements are not distinct');

    if (ch.mode === 'identify') {
      var ids = ch.solution.ids;
      if (!ids.length) bad('identify: no solution');
      ids.forEach(function (id) { if (info[id].role !== ch.targetRole) bad('identify: target role mismatch'); });
      var allWithRole = Structure.SLOTS.filter(function (s) { return info[s].role === ch.targetRole; });
      if (ch.multi) {
        if (ids.length !== allWithRole.length) bad('identify: multi must accept every valid instance');
      } else {
        if (ids.length !== 1) bad('identify: single selection must have exactly one target');
        if (ch.targetPair && info[ids[0]].pair !== ch.targetPair) bad('identify: wrong pair');
        if (ch.targetPair && ch.prompt.indexOf(info[ids[0]].tag) < 0) bad('identify: prompt does not disambiguate pair');
        if (!ch.targetPair && allWithRole.length !== 1) bad('identify: ambiguous single target (' + ch.targetRole + ')');
      }
      if (ch.sentences.length !== 7) bad('identify: needs 7 sentences');
      if (!Identify.grade(ch, { selected: ids }).correct) bad('identify: solution does not grade correct');
    } else if (ch.mode === 'rearrange') {
      var ord = ch.items.map(function (i) { return i.id; });
      if (new Set(ord).size !== 7) bad('rearrange: items incomplete');
      if (Rearrange.analyze(ord, info, ch.dependency || null).valid) bad('rearrange: starts solved');
      ch.solution.order && [ch.solution.order, ch.solution.alternate].forEach(function (o) { if (o && !Rearrange.analyze(o, info, ch.dependency || null).valid) bad('rearrange: valid order rejected'); });
      if (ch.dependency) {
        // The swapped pair order must be rejected, and only because of the dependency.
        var f = ch.dependency.first, sw = ['R', 'A', 'C' + (3 - f), 'E' + (3 - f), 'C' + f, 'E' + f, 'S'];
        var an = Rearrange.analyze(sw, info, ch.dependency);
        if (an.valid || an.primary.code !== 'dependency') bad('rearrange: dependent pair order not enforced');
        if (ch.solution.alternate) bad('rearrange: dependent response must not offer an alternate order');
      }
      var c = ch.solution.order;
      var swapEs = c.slice(); swapEs[3] = 'E2'; swapEs[5] = 'E1';
      if (Rearrange.analyze(swapEs, info).valid) bad('rearrange: mismatched explanations accepted');
      var swapRA = c.slice(); swapRA[0] = 'A'; swapRA[1] = 'R';
      if (Rearrange.analyze(swapRA, info).valid) bad('rearrange: R/A swap accepted');
      var sEnd = c.slice(); sEnd[6] = c[5]; sEnd[5] = 'S';
      if (Rearrange.analyze(sEnd, info).valid) bad('rearrange: wrong summary position accepted');
    } else if (ch.mode === 'missing') {
      var gaps = ch.shown.filter(function (s) { return s.gap; });
      if (gaps.length !== 1) bad('missing: needs exactly one gap');
      if (ch.shown.length !== 7) bad('missing: needs 7 positions');
      if (ch.options.length !== 4) bad('missing: needs four options');
      var optTexts = ch.options.map(function (o) { return o.text; });
      if (new Set(optTexts).size !== 4) bad('missing: duplicate options');
      var shownTexts = ch.shown.filter(function (s) { return !s.gap; }).map(function (s) { return s.text; });
      optTexts.forEach(function (t) { if (shownTexts.indexOf(t) >= 0) bad('missing: option duplicates a visible sentence'); });
      var correct = ch.options.filter(function (o) { return o.id === ch.correctId; });
      if (correct.length !== 1) bad('missing: needs one correct option');
      else if (correct[0].text !== info[ch.missingSlot].text) bad('missing: correct option is not the missing sentence');
      // Context fit: the correct sentence's neighbors must satisfy the RACECES relationships.
      var pos = ch.shown.findIndex(function (s) { return s.gap; });
      var role = ch.missingRole;
      if (role === 'R' && pos !== 0) bad('missing: R gap not first');
      if (role === 'A' && pos !== 1) bad('missing: A gap not second');
      if (role === 'S' && pos !== 6) bad('missing: S gap not last');
      if (role === 'E' && (pos < 1 || ch.shown[pos - 1].id !== 'C' + ch.missingPair)) bad('missing: E gap not after its evidence');
      if (role === 'C' && (pos > 5 || ch.shown[pos + 1].id !== 'E' + ch.missingPair)) bad('missing: C gap not before its explanation');
      // Every distractor must fail for an understandable reason.
      ch.options.forEach(function (o) { if (o.id !== ch.correctId && !o.kind) bad('missing: distractor without a reason'); });
      // Grading sanity.
      if (!Missing.grade(ch, { optionId: ch.correctId }).correct) bad('missing: correct choice graded wrong');
      ch.options.forEach(function (o) { if (o.id !== ch.correctId && Missing.grade(ch, { optionId: o.id }).correct) bad('missing: distractor graded correct'); });
    }
    return e;
  }

  return { validateContent: validateContent, validateChallenge: validateChallenge, WORD_LIMITS: WORD_LIMITS, wordCount: wordCount, contentWords: contentWords, numbersIn: numbersIn };
});
