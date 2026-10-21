/* Reasoning structures that run on an OBSERVATION kit: a phenomenon, a best-supported cause,
   a competing explanation, and observations that each play a declared role:
   onset (cause present with the effect), mechanism (how the cause produces the effect),
   reverse (effect fades when the cause is removed), against (contradicts the competing idea). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./grammar.js'), require('./phrases.js'));
  else { root.RACECES = root.RACECES || {}; root.RACECES.StructuresObservation = factory(root.RACECES.Grammar, root.RACECES.Phrases); }
})(typeof self !== 'undefined' ? self : this, function (G, P) {
  'use strict';

  var FICTION = [
    'This passage describes a fictional observation at {E}, {aDescr}.',
    'In this hypothetical example, {observer} studied {E}, {aDescr}.',
    '{CapE} is an imaginary {descr} used in this example.',
    'Imagine {aDescr} called {E}, where {observer} recorded what they saw.'
  ];

  function context(kit, rng) {
    var c = { kit: kit };
    c.name = rng.pick(kit.names);
    c.Name = P.fill(kit.nameFmt || '{name}', { name: c.name });
    c.E = (kit.article ? kit.article + ' ' : '') + c.Name;
    c.CapE = G.cap(c.E);
    c.descr = kit.descr; c.aDescr = G.withArticle(kit.descr);
    c.observer = rng.pick(kit.observers);
    var nums = {};
    var T = function (s) {
      return P.fill(s, { E: c.E, CapE: c.CapE, observer: c.observer }).replace(/\{n(\d)\}/g, function (m, d) { return nums[d]; });
    };
    c.T = T;
    c.drawNumbers = function (cs, r) {
      (cs.numbers || []).forEach(function (rg, i) { nums[i] = r.range(rg[0], rg[1]); });
      return Object.keys(nums).map(function (k) { return nums[k]; });
    };
    c.obs = function (cs, role) { return cs.obs.filter(function (o) { return o.role === role; }); };
    c.obsFact = function (cs, o) {
      return { id: 'obs:' + cs.id + ':' + o.id, order: 10 + cs.obs.indexOf(o), tag: T(o.tag), text: G.finish(T(o.text)) };
    };
    c.fillers = function () { return []; };
    c.caseFillers = function (cs) { return cs.obs.map(function (o) { return c.obsFact(cs, o); }); };
    c.offPool = function () {
      return kit.off.map(function (o, i) { return { fact: { id: 'off:' + i, order: 60 + i, tag: T(o.tag), text: G.finish(T(o.text)) }, exp: G.finish(T(o.exp)), add: T(o.add) }; });
    };
    c.nonAnswer = function (r) { return T(r.pick(kit.nonAnswers)); };
    c.otherFocus = function (r) { return 'The question asks ' + T(r.pick(kit.otherFocus)) + '.'; };
    c.fiction = function (r) { return P.fill(r.pick(FICTION), { E: c.E, CapE: c.CapE, aDescr: c.aDescr, descr: c.descr, observer: c.observer }); };
    return c;
  }

  function cs(kit, id) { return kit.cases.filter(function (x) { return x.id === id; })[0]; }
  function ob(k, id) { return k.obs.filter(function (o) { return o.id === id; })[0]; }
  function T3(c, o) { return o.exps.map(c.T); }

  var S = [];

  // O1 — two observations support a cause (Beginner).
  S.push({
    id: 'observation-cause', kit: 'observation', family: 'cause-effect', levels: ['beginner'],
    label: 'Use two observations to support a cause',
    enumerate: function (kit) {
      var o = [];
      kit.cases.forEach(function (k) {
        var on = k.obs.filter(function (x) { return x.role === 'onset'; }), me = k.obs.filter(function (x) { return x.role === 'mechanism'; });
        on.forEach(function (a) { me.forEach(function (b) { o.push({ c: k.id, a: a.id, b: b.id }); }); });
      });
      return o;
    },
    build: function (kit, p, c, rng) {
      var k = cs(kit, p.c), a = ob(k, p.a), b = ob(k, p.b);
      var nums = c.drawNumbers(k, rng);
      return {
        lead: [c.T(k.event)],
        question: c.T(k.q),
        restate: c.T(rng.pick(k.restate)),
        answer: c.T(k.answer),
        pairs: [{ fact: c.obsFact(k, a), clauses: T3(c, a) }, { fact: c.obsFact(k, b), clauses: T3(c, b) }],
        summary: rng.pick(P.SUM_OPEN) + c.T(k.sum),
        bad: c.T(k.myth), badRestate: c.otherFocus(rng), nonAnswer: c.nonAnswer(rng),
        fillers: c.caseFillers(k), numbers: nums, offKind: 'kit'
      };
    }
  });

  // O2 — onset and reversal together form a pattern (Intermediate).
  S.push({
    id: 'observation-pattern', kit: 'observation', family: 'pattern', levels: ['intermediate'],
    label: 'Connect an effect\u2019s appearance and disappearance to one cause',
    enumerate: function (kit) {
      var o = [];
      kit.cases.forEach(function (k) {
        k.obs.filter(function (x) { return x.role === 'onset'; }).forEach(function (a) {
          k.obs.filter(function (x) { return x.role === 'reverse'; }).forEach(function (b) { o.push({ c: k.id, a: a.id, b: b.id }); });
        });
      });
      return o;
    },
    build: function (kit, p, c, rng) {
      var k = cs(kit, p.c), a = ob(k, p.a), b = ob(k, p.b);
      var nums = c.drawNumbers(k, rng);
      return {
        lead: [c.T(k.event)],
        question: c.T(k.patternQ),
        restate: c.T(rng.pick(k.restate)),
        answer: c.T(k.patternA),
        pairs: [
          { fact: c.obsFact(k, a), clauses: T3(c, a) },
          { fact: c.obsFact(k, b), clauses: T3(c, b) }
        ],
        summary: rng.pick(P.SUM_OPEN) + c.T(k.patternSum),
        bad: c.T(k.myth), badRestate: c.otherFocus(rng), nonAnswer: c.nonAnswer(rng),
        fillers: c.caseFillers(k), numbers: nums, offKind: 'kit'
      };
    }
  });

  // O4 — check a prediction against the observations (Intermediate).
  S.push({
    id: 'observation-prediction', kit: 'observation', family: 'evaluation', levels: ['intermediate'],
    label: 'Check a prediction against observations',
    enumerate: function (kit) {
      var o = [];
      kit.cases.forEach(function (k) {
        if (!k.prediction) return;
        // Only observations that explicitly refute this prediction (predExps) are used for it.
        k.obs.filter(function (x) { return x.role === 'against' && x.predExps; }).forEach(function (a) {
          k.obs.filter(function (x) { return x.role === 'mechanism' || x.role === 'onset'; }).forEach(function (b) { o.push({ c: k.id, a: a.id, b: b.id }); });
        });
      });
      return o;
    },
    build: function (kit, p, c, rng) {
      var k = cs(kit, p.c), a = ob(k, p.a), b = ob(k, p.b);
      var nums = c.drawNumbers(k, rng);
      var pred = { id: 'prediction:' + k.id, order: 5, tag: 'the prediction', text: G.finish(c.T(k.prediction.text)) };
      return {
        lead: [c.T(k.event)],
        question: 'Do the observations support the prediction that ' + c.T(k.prediction.claim) + '?',
        restate: rng.pick(['The question asks whether the observations at ' + c.E + ' back up the prediction.', 'A prediction was made about ' + c.E + ', and the question asks whether the observations support it.']),
        answer: 'The observations do not support the prediction, because ' + c.T(k.prediction.whyNot) + ', and they point to ' + c.T(k.cause) + ' instead.',
        pairs: [
          { fact: c.obsFact(k, a), clauses: a.predExps.map(c.T) },
          { fact: c.obsFact(k, b), clauses: ['this points to ' + c.T(k.cause) + ' instead, which the prediction left out'].concat(T3(c, b).slice(0, 2)) }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'the observations point away from the prediction and toward ' + c.T(k.cause) + '.',
        bad: 'The observations prove the prediction, because ' + c.T(k.mythClause) + '.',
        badRestate: c.otherFocus(rng), nonAnswer: rng.pick(['A prediction was made before the observations.', c.T(k.observerNote)]),
        required: [pred], fillers: c.caseFillers(k), numbers: nums, offKind: 'kit'
      };
    }
  });

  // O3 — decide between competing explanations (Advanced).
  S.push({
    id: 'observation-competing', kit: 'observation', family: 'competing-explanations', levels: ['advanced'],
    label: 'Decide between competing explanations',
    enumerate: function (kit) {
      var o = [];
      kit.cases.forEach(function (k) {
        k.obs.filter(function (x) { return x.role !== 'against'; }).forEach(function (a) {
          k.obs.filter(function (x) { return x.role === 'against'; }).forEach(function (b) { o.push({ c: k.id, a: a.id, b: b.id }); });
        });
      });
      return o;
    },
    build: function (kit, p, c, rng) {
      var k = cs(kit, p.c), a = ob(k, p.a), b = ob(k, p.b);
      var nums = c.drawNumbers(k, rng);
      var alt = { id: 'alt:' + k.id, order: 6, tag: 'the other explanation', text: G.finish(c.T(k.altText)) };
      var opts = rng.chance(0.5) ? [c.T(k.cause), c.T(k.alt)] : [c.T(k.alt), c.T(k.cause)];
      return {
        lead: [c.T(k.event)],
        question: 'Which explanation do the observations support better: ' + opts[0] + ' or ' + opts[1] + '?',
        restate: rng.pick(['Two explanations have been offered for what happened at ' + c.E + ', and the question asks which fits the observations.', 'The question asks which of two explanations better accounts for what happened at ' + c.E + '.']),
        answer: 'The observations support ' + c.T(k.cause) + ' better, because they fit that explanation and rule out ' + c.T(k.alt) + '.',
        pairs: [
          { fact: c.obsFact(k, a), clauses: T3(c, a) },
          { fact: c.obsFact(k, b), clauses: T3(c, b) }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'with ' + c.T(k.alt) + ' ruled out, ' + c.T(k.cause) + ' is the explanation that fits the evidence.',
        bad: 'The observations support ' + c.T(k.alt) + ', because ' + c.T(k.mythClause) + '.',
        badRestate: c.otherFocus(rng), nonAnswer: rng.pick(['Two explanations were suggested for what happened.', c.T(k.observerNote)]),
        required: [alt], fillers: c.caseFillers(k), numbers: nums, offKind: 'kit'
      };
    }
  });

  return { structures: S, context: context };
});
