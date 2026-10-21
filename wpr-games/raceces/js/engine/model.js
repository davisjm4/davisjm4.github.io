/* Builds a validated RACECES response model from a topic + writing model definition.
   Every sentence carries a role, stable id, text, relationships, and evidence-source reference. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./rng.js'), require('./structure.js'));
  else { root.RACECES = root.RACECES || {}; root.RACECES.Model = factory(root.RACECES.RNG, root.RACECES.Structure); }
})(typeof self !== 'undefined' ? self : this, function (RNG, Structure) {
  'use strict';

  // Leave room for real passage variation even at the highest level. Required evidence and
  // off-topic distractor facts are always included; the remaining slots vary the source excerpt.
  var FACT_COUNT = { beginner: 5, intermediate: 7, advanced: 7 };

  function indexBundle(bundle) {
    var topicsById = {}, modelsById = {}, modelsByLevel = { beginner: [], intermediate: [], advanced: [] };
    bundle.topics.forEach(function (t) {
      var byId = {};
      t.facts.forEach(function (f) { byId[f.id] = f; });
      t.factsById = byId;
      topicsById[t.id] = t;
    });
    bundle.models.forEach(function (m) {
      modelsById[m.id] = m;
      (modelsByLevel[m.level] = modelsByLevel[m.level] || []).push(m);
    });
    return { bundle: bundle, topicsById: topicsById, modelsById: modelsById, modelsByLevel: modelsByLevel };
  }

  function buildResponse(index, modelId, rng) {
    var m = index.modelsById[modelId];
    if (!m) throw new Error('Unknown writing model: ' + modelId);
    var topic = index.topicsById[m.topicId];
    var facts = topic.factsById;
    var need = [m.ev[0], m.ev[1], m.off];
    var total = FACT_COUNT[m.level] || 6;
    var fillers = rng.shuffle(topic.facts.map(function (f) { return f.id; }).filter(function (id) { return need.indexOf(id) < 0; }));
    var ids = need.concat(fillers.slice(0, Math.max(0, total - need.length)));
    // Select facts with the seed, but retain the topic author's source order so a generated
    // excerpt does not read like an arbitrarily shuffled list of facts.
    ids = topic.facts.map(function (f) { return f.id; }).filter(function (id) { return ids.indexOf(id) >= 0; });
    var excerptFacts = ids.map(function (id) { return { id: id, text: facts[id].text }; });
    var excerpt = topic.intro + ' ' + excerptFacts.map(function (f) { return f.text; }).join(' ');
    // Some compact source sets need one more sentence to meet the established Advanced
    // passage floor. Add an on-topic fact only when needed, preserving concise variation elsewhere.
    if (m.level === 'advanced' && excerpt.trim().split(/\s+/).length < 110 && fillers.length > ids.length - need.length) {
      ids.push(fillers[ids.length - need.length]);
      ids = topic.facts.map(function (f) { return f.id; }).filter(function (id) { return ids.indexOf(id) >= 0; });
      excerptFacts = ids.map(function (id) { return { id: id, text: facts[id].text }; });
      excerpt = topic.intro + ' ' + excerptFacts.map(function (f) { return f.text; }).join(' ');
    }

    function sent(slot, text, extra) {
      var o = { uid: modelId + '#' + slot, id: slot, slot: slot, role: Structure.roleOfSlot(slot), pair: Structure.pairOfSlot(slot), text: text };
      for (var k in extra) o[k] = extra[k];
      return o;
    }
    var f1 = facts[m.ev[0]], f2 = facts[m.ev[1]], fo = facts[m.off];
    var sentences = {
      R: sent('R', m.restate, {}),
      A: sent('A', m.answer, {}),
      C1: sent('C1', f1.ev, { factId: f1.id, tag: f1.tag, source: f1.text }),
      E1: sent('E1', m.exp[0], { explains: 'C1', tag: f1.tag }),
      C2: sent('C2', f2.ev, { factId: f2.id, tag: f2.tag, source: f2.text }),
      E2: sent('E2', m.exp[1], { explains: 'C2', tag: f2.tag }),
      S: sent('S', m.sum, {})
    };
    return {
      modelId: m.id, topicId: topic.id, subject: topic.subject, title: topic.title,
      passageId: topic.id + '|' + ids.slice().sort().join(','),
      family: m.family, level: m.level,
      question: m.q, excerpt: excerpt, excerptFacts: excerptFacts,
      sentences: sentences,
      pairs: {
        1: { c: 'C1', e: 'E1', tag: f1.tag, factId: f1.id },
        2: { c: 'C2', e: 'E2', tag: f2.tag, factId: f2.id }
      },
      dependency: m.dependency || null, // explicit logical ordering dependency, if any (none authored)
      distractors: {
        rep: m.rep, offEv: fo.ev, offTag: fo.tag, offFactId: fo.id, offExp: m.offExp,
        bad: m.bad, badRestate: m.badRestate, sumNew: m.sumNew
      }
    };
  }

  // Display order for a given pair order ([1,2] or [2,1]).
  function orderFor(pairOrder) {
    var a = pairOrder[0], b = pairOrder[1];
    return ['R', 'A', 'C' + a, 'E' + a, 'C' + b, 'E' + b, 'S'];
  }

  function infoFor(resp) {
    var info = {};
    Structure.SLOTS.forEach(function (s) {
      var x = resp.sentences[s];
      info[s] = { id: s, role: x.role, pair: x.pair, tag: x.tag || null, text: x.text };
    });
    return info;
  }

  function baseChallenge(resp, mode) {
    return {
      mode: mode, level: resp.level, modelId: resp.modelId, topicId: resp.topicId, subject: resp.subject,
      family: resp.family, question: resp.question, excerpt: resp.excerpt, passageId: resp.passageId, info: infoFor(resp)
    };
  }

  return { indexBundle: indexBundle, buildResponse: buildResponse, orderFor: orderFor, infoFor: infoFor, baseChallenge: baseChallenge, FACT_COUNT: FACT_COUNT };
});
