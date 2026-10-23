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
    var evidenceIds = [m.ev[0], m.ev[1]];
    var total = m.factCount || FACT_COUNT[m.level] || 6;
    var fillers = rng.shuffle(topic.facts.map(function (f) { return f.id; }).filter(function (id) { return need.indexOf(id) < 0; }));
    var selected = need.concat(fillers.slice(0, Math.max(0, total - need.length)));
    function ordered(list) {
      return topic.facts.map(function (f) { return f.id; }).filter(function (id) { return list.indexOf(id) >= 0; });
    }
    function passage(list) {
      var rows = ordered(list).map(function (id) {
        var item = facts[id];
        return { id: id, text: topic.subject === 'Mathematics' && evidenceIds.indexOf(id) >= 0 && item.ev ? item.ev : item.text };
      });
      return { rows: rows, excerpt: topic.intro + ' ' + rows.map(function (f) { return f.text; }).join(' ') };
    }
    // Worked examples expand the two cited mathematics facts. Adjust only optional
    // context facts to keep each passage inside the established difficulty band.
    var limits = { beginner: [70, 130], intermediate: [90, 170], advanced: [110, 195] };
    var limit = limits[m.level] || [70, 195];
    function wordCount(text) { return (text.toLowerCase().match(/[a-z0-9]+/g) || []).length; }
    var assembled = passage(selected);
    while (wordCount(assembled.excerpt) > limit[1] && selected.length > need.length) {
      selected.pop(); assembled = passage(selected);
    }
    while (wordCount(assembled.excerpt) < limit[0] && selected.length < need.length + fillers.length) {
      selected.push(fillers[selected.length - need.length]); assembled = passage(selected);
    }
    var ids = ordered(selected);
    var excerptFacts = assembled.rows;
    var excerpt = assembled.excerpt;

    function sent(slot, text, extra) {
      var o = { uid: modelId + '#' + slot, id: slot, slot: slot, role: Structure.roleOfSlot(slot), pair: Structure.pairOfSlot(slot), text: text };
      for (var k in extra) o[k] = extra[k];
      return o;
    }
    var f1 = facts[m.ev[0]], f2 = facts[m.ev[1]], fo = facts[m.off];
    var sentences = {
      R: sent('R', m.restate, {}),
      A: sent('A', m.answer, {}),
      C1: sent('C1', f1.ev, { factId: f1.id, tag: f1.tag, source: topic.subject === 'Mathematics' && f1.ev ? f1.ev : f1.text }),
      E1: sent('E1', m.exp[0], { explains: 'C1', tag: f1.tag }),
      C2: sent('C2', f2.ev, { factId: f2.id, tag: f2.tag, source: topic.subject === 'Mathematics' && f2.ev ? f2.ev : f2.text }),
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
