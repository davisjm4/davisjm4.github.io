/* Shared phrase pools for the compositional generator. Every pool entry is a complete
   grammatical frame; slots are filled with typed phrases, never with arbitrary words. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./grammar.js'));
  else { root.RACECES = root.RACECES || {}; root.RACECES.Phrases = factory(root.RACECES.Grammar); }
})(typeof self !== 'undefined' ? self : this, function (G) {
  'use strict';

  // Evidence attributions. An empty string means the evidence sentence states the source detail directly.
  var ATTRIB = {
    beginner: ['The passage states that ', 'According to the passage, ', 'The source explains that ', 'The passage says that '],
    intermediate: ['The passage reports that ', 'According to the source, ', 'The text notes that ', '', 'The passage explains that '],
    advanced: ['The source reports that ', '', '', 'The passage notes that ', 'According to the text, ']
  };

  // Explanation openers that wrap a full clause.
  var EXP_OPEN = {
    beginner: ['This shows that ', 'This means that ', 'Because of this, '],
    intermediate: ['This matters because ', 'That suggests ', 'As a result, ', ''],
    advanced: ['This matters because ', 'That detail suggests ', '', 'Taken together with the claim, this shows that ']
  };

  // Repetition (not explanation) openers for the Explain-gap distractor.
  var REPEAT_OPEN = ['In other words, ', 'Put simply, ', 'Again, '];

  var SUM_OPEN = ['Overall, ', 'In the end, ', 'Altogether, ', 'For these reasons, '];

  // Fictional-content cues. Rotated so passages do not all begin with the same phrase.
  var FICTION_DESIGN = [
    'In this fictional example, {E} is {aDescr} that {live} {home}.',
    'This passage describes {E}, an invented {descr} that {live} {home}.',
    '{CapE} is a made-up {descr} that {live} {home}.',
    'Imagine {aDescr} called {E} that {live} {home}.'
  ];

  function attrib(level, rng) { return rng.pick(ATTRIB[level] || ATTRIB.beginner); }

  /* Turn a source sentence into an evidence sentence with a level-appropriate attribution. */
  function evidence(text, level, rng, forced, proper) {
    var a = forced !== undefined ? forced : attrib(level, rng);
    if (!a) return G.finish(text);
    return G.finish(a + G.lowerFirst(G.stripEnd(text), proper));
  }

  // Clauses that already open with a connector or a pointing word take no extra opener,
  // which prevents "Because of this, because of..." and "This means that this...".
  var SELF_OPENING = /^(because|since|with|if|once|when|while|as|without|removing|knowing|getting|the job|this|that|these|those|it|they|one|a gap|there)\b/i;
  function wrapExp(clause, level, rng, forced, proper) {
    var pickO = rng.pick(EXP_OPEN[level] || EXP_OPEN.beginner);
    var o = forced !== undefined ? forced : (SELF_OPENING.test(clause.trim()) ? '' : pickO);
    return G.finish(o + (o ? G.lowerFirst(G.stripEnd(clause), proper) : G.stripEnd(clause)));
  }

  function repeat(text, rng, proper) { return G.finish(rng.pick(REPEAT_OPEN) + G.lowerFirst(G.stripEnd(text), proper)); }

  /* Fill {slots} in a kit string from a context object. Unknown slots are left in place so the
     lint pass rejects the sentence instead of silently printing a blank. */
  function fill(str, ctx) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) { return ctx[k] !== undefined ? ctx[k] : m; });
  }

  return { ATTRIB: ATTRIB, EXP_OPEN: EXP_OPEN, REPEAT_OPEN: REPEAT_OPEN, SUM_OPEN: SUM_OPEN, FICTION_DESIGN: FICTION_DESIGN,
    attrib: attrib, evidence: evidence, wrapExp: wrapExp, repeat: repeat, fill: fill };
});
