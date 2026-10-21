/* Feedback text builders. They explain the RACECES principle and the likely misconception. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./structure.js'));
  else { root.RACECES = root.RACECES || {}; root.RACECES.Feedback = factory(root.RACECES.Structure); }
})(typeof self !== 'undefined' ? self : this, function (Structure) {
  'use strict';

  var DESC_ACTUAL = {
    R: 'restates the question', A: 'states the answer', C: 'cites evidence by saying what the source reports',
    E: 'explains evidence by saying why it matters', S: 'summarizes the response'
  };
  var DESC_NEED = {
    R: 'turns the question into a statement without answering it',
    A: 'makes the claim that answers the question',
    C: 'presents information from the source',
    E: 'says how or why the evidence supports the answer',
    S: 'wraps up the response by reinforcing the overall answer'
  };

  function tagText(tag) { return 'the information about ' + tag; }

  // ---------- Identify the Parts ----------
  function identify(ch, selected) {
    var info = ch.info, sel = selected.slice(), want = ch.solution.ids;
    var selSet = {}; sel.forEach(function (id) { selSet[id] = true; });
    var wantSet = {}; want.forEach(function (id) { wantSet[id] = true; });
    var hits = want.filter(function (id) { return selSet[id]; });
    var wrong = sel.filter(function (id) { return !wantSet[id]; });
    var correct = hits.length === want.length && wrong.length === 0;
    var notes = [];
    var category = null;

    if (!correct) {
      if (ch.multi && hits.length > 0 && hits.length < want.length && wrong.length === 0) {
        notes.push('You found ' + hits.length + ' of ' + want.length + '. More than one sentence plays this role in the response.');
      } else if (ch.multi && hits.length > 0) {
        notes.push('You found ' + hits.length + ' of ' + want.length + ', but also chose a sentence that plays a different role.');
      }
      wrong.forEach(function (id) {
        var s = info[id];
        var n;
        if (s.role === ch.targetRole && !ch.multi) {
          var wantInfo = info[want[0]];
          n = 'That sentence is also a ' + Structure.LABEL[s.role].toLowerCase() + ' sentence, but it belongs to ' + tagText(s.tag) + '. This question is about ' + tagText(wantInfo.tag) + '.';
          category = category || 'wrong-pair';
        } else {
          n = 'The sentence you chose ' + DESC_ACTUAL[s.role] + '. The sentence you need ' + DESC_NEED[ch.targetRole] + '.';
          category = category || Structure.confusionCategory(ch.targetRole, s.role) || 'other';
        }
        notes.push(n);
      });
      if (sel.length === 0) notes.push('Select at least one sentence before checking.');
      if (ch.multi && wrong.length === 0 && hits.length < want.length && !notes.length) notes.push('Look again for every sentence that plays this role.');
      if (!category && !correct) category = 'other';
    }
    return {
      correct: correct,
      headline: correct ? 'Correct.' : 'Not quite.',
      principle: Structure.PURPOSE[ch.targetRole],
      notes: notes,
      showIds: want,
      category: category,
      partial: ch.multi ? hits.length + '/' + want.length : null
    };
  }

  // ---------- Rearrange the Response ----------
  function rearrange(ch, order, analysis) {
    if (analysis.valid) {
      var firstPair = ch.info[order[2]].pair;
      var notes = [];
      if (ch.dependency) {
        notes.push('Each explanation follows the evidence it explains. In this response the order of the pairs also matters, because the explanation about ' + ch.info[order[4]].tag + ' builds on the evidence about ' + ch.info[order[2]].tag + '.');
      } else if (firstPair !== ch.defaultPairOrder[0]) {
        notes.push('You placed ' + tagText(ch.info[order[2]].tag) + ' first. That works too: the two evidence and explanation pairs can go in either order as long as each explanation follows its own evidence.');
      } else {
        notes.push('Each explanation follows the evidence it explains, and the two pairs can also be swapped without changing the structure.');
      }
      return { correct: true, headline: 'Correct.', principle: Structure.PURPOSE.E, notes: notes, category: null, role: null, issue: null };
    }
    var p = analysis.primary, msg, principleRole, cat = 'other';
    if (p.code === 'restate-first') {
      principleRole = 'R';
      if (p.found === 'A') { msg = 'The response should begin by restating the question. The answer comes after the topic has been introduced.'; cat = 'restate-vs-answer'; }
      else if (p.found === 'S') { msg = 'The summary belongs at the end. The response should open by restating the question.'; cat = 'other'; }
      else { msg = 'Begin with the restatement of the question, before any evidence or explanation.'; cat = 'other'; }
    } else if (p.code === 'answer-second') {
      principleRole = 'A';
      if (p.found === 'C') { msg = 'State the answer before the supporting evidence. The reader needs the claim first, then the proof.'; cat = 'other'; }
      else if (p.found === 'E') { msg = 'An explanation cannot come before the answer. State the claim, then support it.'; cat = 'other'; }
      else { msg = 'After restating the question, the next sentence should give the answer.'; cat = 'restate-vs-answer'; }
    } else if (p.code === 'summary-last') {
      principleRole = 'S';
      msg = 'The summary should be the last sentence. It reinforces the answer after both pairs of evidence and explanation are finished.';
      cat = p.found === 'C' ? 'summary-vs-evidence' : 'other';
      if (p.found === 'C') msg = 'An evidence sentence cannot be the ending. The response should finish with a summary that reinforces the answer without adding new information.';
    } else if (p.code === 'pairing') {
      var a = p.first, b = p.second;
      if (a.role === 'E') {
        principleRole = 'E'; cat = 'evidence-vs-explanation';
        msg = 'The explanation about ' + a.tag + ' needs to follow the evidence about ' + a.tag + ', not come before it.';
      } else if (b.role === 'C') {
        principleRole = 'E'; cat = 'evidence-vs-explanation';
        msg = 'The evidence about ' + a.tag + ' needs its own explanation right after it, before the next piece of evidence begins.';
      } else {
        principleRole = 'E'; cat = 'wrong-pair';
        msg = 'The explanation about ' + b.tag + ' does not go with the evidence about ' + a.tag + '. Each explanation must come right after the evidence it explains.';
      }
    } else if (p.code === 'dependency') {
      principleRole = 'E'; cat = 'other';
      msg = 'Each explanation follows its evidence, but in this response the order of the pairs matters: the explanation about ' + p.found.tag + ' builds on the evidence about ' + p.first.tag + ', so that evidence has to come first.';
    } else {
      principleRole = 'R'; msg = 'Use all seven sentences, each one exactly once.';
    }
    return { correct: false, headline: 'Not quite.', principle: Structure.PURPOSE[principleRole], notes: [msg], category: cat, role: principleRole, issue: p.code };
  }

  // ---------- Choose the Missing Piece ----------
  function missingKind(ch, opt) {
    var tr = ch.missingRole, L = Structure.LABEL[tr];
    var tag = ch.missingTag;
    switch (opt.kind) {
      case 'repeat':
        return 'That sentence repeats the evidence instead of explaining it. An explanation says why the evidence supports the answer.';
      case 'offExp':
        if (tr === 'E') return 'That sentence explains a different detail from the source, not ' + tagText(tag) + '. An explanation has to connect to the evidence right next to it.';
        return 'That sentence explains a different detail from the source. This gap needs a sentence that works as ' + L + '.';
      case 'offFact':
        if (tr === 'C') return 'That detail does appear in the source, but it does not support this answer. Evidence has to be relevant to the claim.';
        return 'That sentence reports a detail from the source, which is evidence. This gap needs a sentence that works as ' + L + '.';
      case 'unsupported':
        return 'The source does not back up that claim. A response should only claim what the source supports.';
      case 'summaryLike':
        if (tr === 'S') return 'That sentence reinforces the answer but also adds a new detail. A summary should not introduce new information.';
        return 'That sentence works like a summary, which belongs at the end. This gap needs a sentence that works as ' + L + '.';
      case 'wrongFocus':
        if (tr === 'R') return 'That sentence is about a different focus than the writing question. A restatement has to match the question that was asked.';
        return 'That sentence reads like a restatement of a different idea. It does not do the job of ' + L + ' here.';
      case 'crossExp':
        return 'That sentence explains a different piece of evidence in this response, not ' + tagText(tag) + '. An explanation has to connect to the evidence right before it.';
      case 'nonAnswer':
        return 'That sentence is true, but it does not answer the question. An answer has to make a clear claim that responds to what was asked.';
      default:
        return 'That sentence does not do the job this gap needs.';
    }
  }

  function categorizeOption(ch, opt) {
    var tr = ch.missingRole;
    if (opt.kind === 'unsupported') return 'relevance';
    if (opt.kind === 'summaryLike' && tr === 'S') return 'summary-vs-evidence';
    if (opt.kind === 'offExp' && tr === 'E') return 'wrong-pair';
    if (opt.kind === 'offFact' && tr === 'C') return 'relevance';
    if (opt.kind === 'crossExp') return 'wrong-pair';
    if (opt.kind === 'nonAnswer') return 'restate-vs-answer';
    return Structure.confusionCategory(tr, opt.plays) || 'other';
  }

  function missing(ch, optionId) {
    var opt = ch.options.filter(function (o) { return o.id === optionId; })[0];
    var correct = !!opt && opt.id === ch.correctId;
    var notes = [];
    var category = null;
    if (!correct && opt) {
      notes.push(missingKind(ch, opt));
      category = categorizeOption(ch, opt);
    }
    if (!correct) {
      var right = ch.options.filter(function (o) { return o.id === ch.correctId; })[0];
      notes.push(ch.whyCorrect);
    } else {
      notes.push(ch.whyCorrect);
    }
    return {
      correct: correct,
      headline: correct ? 'Correct.' : 'Not quite.',
      principle: Structure.PURPOSE[ch.missingRole],
      notes: notes,
      category: category
    };
  }

  return { identify: identify, rearrange: rearrange, missing: missing, categorizeOption: categorizeOption, tagText: tagText };
});
