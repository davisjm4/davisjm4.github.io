/* Mode 1: Identify the Parts. Select the sentence(s) serving a specified RACECES role. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'), require('./structure.js'), require('./feedback.js'));
  else { root.RACECES = root.RACECES || {}; root.RACECES.Identify = factory(root.RACECES.Model, root.RACECES.Structure, root.RACECES.Feedback); }
})(typeof self !== 'undefined' ? self : this, function (Model, Structure, Feedback) {
  'use strict';

  var TARGETS = ['R', 'A', 'S', 'C:1', 'C:2', 'E:1', 'E:2', 'C*', 'E*'];

  // First two prompts are plain; later prompts contrast neighboring roles (intermediate and advanced).
  var PROMPTS = {
    R: ['Select the sentence that restates the question as a statement.',
        'Which sentence turns the writing question into a statement without answering it?',
        'Select the sentence that introduces the topic by restating the question, not by making a claim.'],
    A: ['Select the sentence that answers the question.',
        'Which sentence makes the main claim that the rest of the response supports?',
        'Select the sentence that commits to an answer, rather than only repeating the topic.'],
    S: ['Select the sentence that summarizes the response.',
        'Which sentence reinforces the overall answer to finish the response?',
        'Select the sentence that wraps up the answer without adding anything new.'],
    C: ['Select the sentence that cites evidence from the source about {tag}.',
        'Which sentence presents the source\'s information about {tag}?',
        'Select the sentence that states what the source reports about {tag}, not the one that explains it.'],
    E: ['Select the explanation connected to the source\'s information about {tag}.',
        'Which sentence explains why the information about {tag} supports the answer?',
        'Select the sentence that interprets the information about {tag}, rather than repeating it.'],
    'C*': ['Select every sentence that cites evidence from the source.',
           'Select all sentences that present information taken from the source to support the answer.'],
    'E*': ['Select every sentence that explains how evidence supports the answer.',
           'Select all sentences that explain why the cited evidence matters.']
  };

  function roleOfKey(key) { return key.charAt(0); }

  function generate(resp, rng, opts) {
    opts = opts || {};
    var key = opts.targetKey || rng.pick(TARGETS);
    var pairOrder = opts.pairOrder || (rng.chance(0.5) ? [1, 2] : [2, 1]);
    var order = Model.orderFor(pairOrder);
    var role = roleOfKey(key);
    var multi = key.charAt(1) === '*';
    var pair = key.charAt(1) === ':' ? Number(key.charAt(2)) : null;

    var ids;
    if (multi) ids = order.filter(function (s) { return Structure.roleOfSlot(s) === role; });
    else if (pair) ids = [role + pair];
    else ids = [role];

    var promptKey = multi ? key : role;
    var variants = PROMPTS[promptKey];
    var advanced = resp.level !== 'beginner';
    var vi = advanced ? rng.int(variants.length) : rng.int(Math.min(2, variants.length));
    var tag = pair ? resp.pairs[pair].tag : '';
    var prompt = variants[vi].replace('{tag}', tag);

    var ch = Model.baseChallenge(resp, 'identify');
    ch.targetKey = key;
    ch.targetRole = role;
    ch.targetPair = pair;
    ch.multi = multi;
    ch.prompt = prompt;
    ch.pairOrder = pairOrder;
    ch.sentences = order.map(function (s) { return { id: s, text: resp.sentences[s].text }; });
    ch.solution = { ids: ids };
    ch.signature = 'identify|' + resp.modelId + '|' + key;
    ch.role = role;
    return ch;
  }

  function grade(ch, answer) {
    var sel = (answer && answer.selected) || [];
    var fb = Feedback.identify(ch, sel);
    return { correct: fb.correct, feedback: fb, role: ch.targetRole, category: fb.category };
  }

  return { TARGETS: TARGETS, PROMPTS: PROMPTS, generate: generate, grade: grade, roleOfKey: roleOfKey };
});
