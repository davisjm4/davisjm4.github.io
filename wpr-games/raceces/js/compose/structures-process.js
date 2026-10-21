/* Reasoning structures that run on a PROCESS kit: ordered stages, each producing something
   the next stage uses, some requiring a condition; optional measured rate investigations. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./grammar.js'), require('./phrases.js'));
  else { root.RACECES = root.RACECES || {}; root.RACECES.StructuresProcess = factory(root.RACECES.Grammar, root.RACECES.Phrases); }
})(typeof self !== 'undefined' ? self : this, function (G, P) {
  'use strict';

  var FICTION = [
    'In this fictional example, {E} is {aDescr}.',
    'This passage describes {E}, an imaginary {descr}.',
    '{CapE} is a made-up {descr} used in this example.',
    'Imagine {aDescr} called {E}.'
  ];

  function context(kit, rng, level) {
    var c = { kit: kit };
    c.name = rng.pick(kit.names);
    c.Name = P.fill(kit.nameFmt || '{name}', { name: c.name });
    c.E = (kit.article ? kit.article + ' ' : '') + c.Name;
    c.CapE = G.cap(c.E);
    c.NamePl = c.Name;
    c.descr = kit.descr; c.aDescr = G.withArticle(kit.descr);
    var T = function (s) { return P.fill(s, { E: c.E, CapE: c.CapE }); };
    c.T = T;
    c.outcome = T(kit.outcome);
    c.at = T(kit.at || 'in {E}');
    c.At = G.cap(c.at);
    c.stages = kit.stages.map(function (s, i) {
      return { i: i, id: s.id, tag: T(s.tag), does: T(s.does), why: T(s.why), from: T(s.from), product: T(s.product), pl: !!s.pl,
        less: T(s.less), needs: s.needs || null, needWhy: T(s.needWhy || ''), boost: s.boost ? { clause: T(s.boost.clause), np: T(s.boost.np) } : null,
        text: G.finish(T(s.text)), cause: T(s.cause || ('What causes ' + s.product + ' to form in {E}?')) };
    });
    c.cond = function (id) {
      var cd = kit.conds[id]; if (!cd) throw new Error(kit.id + ': unknown condition ' + id);
      return { id: id, clause: T(cd.clause), absent: T(cd.absent), np: T(cd.np), tag: T(cd.tag || cd.np) };
    };
    c.stageFact = function (s) { return { id: 'stage:' + s.id, order: 10 + s.i, tag: s.tag, text: s.text }; };
    c.condFact = function (cd) { return { id: 'pcond:' + cd.id, order: 30, tag: cd.tag, text: G.finish(c.At + ', ' + cd.clause) }; };
    c.nonAnswer = function (r) { return T(r.pick(kit.nonAnswers)); };
    c.otherFocus = function (r) { return 'The question asks ' + T(r.pick(kit.otherFocus)) + '.'; };
    c.myth = function (r) { return T(r.pick(kit.myths)); };
    c.rate = function (rt, r) {
      var x1 = r.range(rt.factor.lo, rt.factor.lo + Math.floor((rt.factor.hi - rt.factor.lo) * 0.3));
      var x2 = r.range(x1 + Math.ceil((rt.factor.hi - rt.factor.lo) * 0.4), rt.factor.hi);
      var y1 = r.range(rt.result.lo, rt.result.lo + Math.floor((rt.result.hi - rt.result.lo) * 0.3));
      var y2 = r.range(y1 + Math.ceil((rt.result.hi - rt.result.lo) * 0.4), rt.result.hi);
      var res = function (x, y) { return P.fill(T(rt.result.clause), { x: x, y: y }); };
      return {
        setup: { id: 'rate:setup', order: 2, tag: 'how the investigation was set up', text: G.finish('In a hypothetical investigation, ' + T(rt.setup)) },
        result: { id: 'rate:result', order: 3, tag: 'the measured results', numbers: [x1, x2, y1, y2],
          text: G.finish(G.cap(res(x1, y1)) + ', but ' + res(x2, y2)) },
        confound: rt.confound ? { id: 'rate:confound', order: 4, tag: T(rt.confound.tag), text: G.finish(T(rt.confound.text)) } : null
      };
    };
    c.fillers = function () {
      var out = c.stages.map(c.stageFact);
      Object.keys(kit.conds).forEach(function (id) { out.push(c.condFact(c.cond(id))); });
      return out;
    };
    c.offPool = function () {
      return kit.off.map(function (o, i) { return { fact: { id: 'off:' + i, order: 60 + i, tag: T(o.tag), text: G.finish(T(o.text)) }, exp: G.finish(T(o.exp)), add: T(o.add) }; });
    };
    c.fiction = function (r) { return P.fill(r.pick(FICTION), { E: c.E, CapE: c.CapE, aDescr: c.aDescr, descr: c.descr }); };
    return c;
  }

  function beP(s) { return G.be(s.pl); }

  var S = [];

  // P1 — two consecutive steps explain a transformation (Beginner).
  S.push({
    id: 'process-sequence', kit: 'process', family: 'process', levels: ['beginner'],
    label: 'Explain a process from two consecutive steps',
    enumerate: function (kit) { var o = []; for (var i = 0; i + 1 < kit.stages.length; i++) o.push({ i: i }); return o; },
    build: function (kit, p, c, rng) {
      var a = c.stages[p.i], b = c.stages[p.i + 1];
      return {
        question: 'How does ' + a.from + ' become ' + b.product + ' ' + c.at + '?',
        restate: rng.pick(['The question asks how ' + a.from + ' turns into ' + b.product + ' ' + c.at + '.', c.At + ', ' + a.from + ' eventually becomes ' + b.product + '.']),
        answer: G.cap(a.from) + ' becomes ' + b.product + ' in two steps: ' + a.does + ', and then ' + b.does + '.',
        pairs: [
          { fact: c.stageFact(a), clauses: [a.why, 'without this step, there would be no ' + a.product + ' for the next step to use', 'this step produces ' + a.product + ', which is exactly what the next step needs'] },
          { fact: c.stageFact(b), clauses: [b.why, 'this second step is where ' + a.product + ' finally becomes ' + b.product, 'this step finishes the change by turning ' + a.product + ' into ' + b.product] }
        ],
        summary: rng.pick(P.SUM_OPEN) + a.from + ' becomes ' + b.product + ' because one step leads directly to the next.',
        bad: G.cap(a.from) + ' becomes ' + b.product + ' because ' + c.myth(rng) + '.',
        badRestate: c.otherFocus(rng), nonAnswer: c.nonAnswer(rng), offKind: 'kit'
      };
    }
  });

  // P0 — identify the two conditions a process depends on (Beginner).
  S.push({
    id: 'process-requirements', kit: 'process', family: 'function', levels: ['beginner'],
    label: 'Identify the conditions a process depends on',
    enumerate: function (kit) {
      var o = [], need = kit.stages.map(function (s, i) { return s.needs ? i : -1; }).filter(function (i) { return i >= 0; });
      for (var a = 0; a < need.length; a++) for (var b = a + 1; b < need.length; b++) o.push({ a: need[a], b: need[b] });
      return o;
    },
    build: function (kit, p, c, rng) {
      var sa = c.stages[p.a], sb = c.stages[p.b], ca = c.cond(sa.needs), cb = c.cond(sb.needs);
      return {
        question: 'What conditions does ' + c.outcome + ' depend on?',
        restate: rng.pick(['The question asks what ' + c.outcome + ' needs in order to keep going.', G.cap(c.outcome) + ' depends on certain conditions, and the question asks which ones.']),
        answer: G.cap(c.outcome) + ' depends on ' + ca.np + ' and ' + cb.np + ', because each one keeps a different step of the process going.',
        pairs: [
          { fact: c.condFact(ca), clauses: [sa.needWhy + ', so this condition keeps ' + sa.tag + ' going', 'this condition is what lets ' + sa.tag + ' happen', 'without ' + ca.np + ', ' + sa.tag + ' would stall'] },
          { fact: c.condFact(cb), clauses: [sb.needWhy + ', so this condition keeps ' + sb.tag + ' going', 'this second condition supports a different step, ' + sb.tag, 'without ' + cb.np + ', ' + sb.tag + ' would stall'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + c.outcome + ' needs both ' + ca.np + ' and ' + cb.np + ' to keep going.',
        bad: G.cap(c.outcome) + ' depends mainly on the fact that ' + c.myth(rng) + '.',
        badRestate: c.otherFocus(rng), nonAnswer: c.nonAnswer(rng), offKind: 'kit'
      };
    }
  });

  // P2 — what causes a stage: the material from the step before plus a required condition (Beginner).
  S.push({
    id: 'process-cause', kit: 'process', family: 'cause-effect', levels: ['beginner'],
    label: 'Identify two causes of a step',
    enumerate: function (kit) { var o = []; kit.stages.forEach(function (s, i) { if (i > 0 && s.needs) o.push({ k: i }); }); return o; },
    build: function (kit, p, c, rng) {
      var b = c.stages[p.k], a = c.stages[p.k - 1], cd = c.cond(b.needs);
      return {
        question: b.cause,
        restate: rng.pick(['The question asks what makes ' + b.tag + ' happen ' + c.at + '.', 'Something has to happen first before ' + b.tag + ' can take place ' + c.at + '.']),
        answer: G.cap(b.tag) + ' happens ' + c.at + ' because ' + a.product + ' ' + beP(a) + ' available and ' + cd.clause + '.',
        pairs: [
          { fact: c.stageFact(a), clauses: ['this step supplies the ' + a.product + ' that ' + b.tag + ' needs', 'without this earlier step, there would be nothing for ' + b.tag + ' to work with', a.why] },
          { fact: c.condFact(cd), clauses: [b.needWhy, 'this condition is what triggers ' + b.tag, 'without ' + cd.np + ', ' + b.tag + ' would not happen'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + b.tag + ' depends on both ' + a.product + ' and the condition that ' + cd.clause + '.',
        bad: G.cap(b.tag) + ' happens because ' + c.myth(rng) + '.',
        badRestate: c.otherFocus(rng), nonAnswer: c.nonAnswer(rng), offKind: 'kit'
      };
    }
  });

  // P3 — remove a required condition and trace the effect one step forward (Intermediate).
  S.push({
    id: 'process-condition-loss', kit: 'process', family: 'consequence', levels: ['intermediate'],
    label: 'Predict what happens when a required condition is missing',
    enumerate: function (kit) { var o = []; kit.stages.forEach(function (s, i) { if (s.needs && i + 1 < kit.stages.length) o.push({ k: i }); }); return o; },
    build: function (kit, p, c, rng) {
      var a = c.stages[p.k], b = c.stages[p.k + 1], cd = c.cond(a.needs);
      return {
        question: 'If ' + cd.absent + ', what is likely to happen to ' + c.outcome + '?',
        restate: rng.pick(['The question asks how ' + c.outcome + ' would change without ' + cd.np + '.', 'The question imagines what would happen to ' + c.outcome + ' without ' + cd.np + '.']),
        answer: G.cap(c.outcome) + ' would likely decrease, because ' + a.tag + ' needs ' + cd.np + ' and the steps after it depend on ' + a.product + '.',
        pairs: [
          { fact: c.stageFact(a), clauses: [a.needWhy + ', so ' + a.tag + ' would slow down without it', 'this step relies on ' + cd.np + ', so taking that away would leave ' + a.less, 'without ' + cd.np + ', this step could not produce much ' + a.product] },
          { fact: c.stageFact(b), clauses: ['since ' + b.tag + ' uses ' + a.product + ', having ' + a.less + ' would mean less ' + c.outcome + ' in the end', b.tag + ' cannot run at full speed with ' + a.less + ', so the drop would carry forward', 'this next step depends on ' + a.product + ', which is why the effect would not stop at the first step'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'without ' + cd.np + ', ' + c.outcome + ' would decrease because each step depends on the one before it.',
        bad: G.cap(c.outcome) + ' would increase, because ' + c.myth(rng) + '.',
        badRestate: c.otherFocus(rng), nonAnswer: c.nonAnswer(rng), offKind: 'kit'
      };
    }
  });

  // P4 — interpret measured rates under two conditions (Intermediate).
  S.push({
    id: 'process-rate', kit: 'process', family: 'numeric', levels: ['intermediate'],
    label: 'Interpret measurements of a rate',
    enumerate: function (kit) { return (kit.rates || []).map(function (r, i) { return { r: i }; }); },
    build: function (kit, p, c, rng) {
      var rt = kit.rates[p.r], st = c.stages.filter(function (s) { return s.id === rt.stage; })[0], m = c.rate(rt, rng);
      var claim = c.T(rt.claim);
      return {
        question: 'What does the investigation suggest about how ' + c.T(rt.factor.np) + ' affects ' + st.tag + '?',
        restate: rng.pick(['The question asks what the investigation shows about ' + c.T(rt.factor.np) + ' and ' + st.tag + '.', 'The investigation tested ' + c.T(rt.factor.np) + ' to learn about ' + st.tag + '.']),
        answer: 'The investigation suggests that ' + claim + '.',
        pairs: [
          { fact: m.result, clauses: ['the trial with more ' + c.T(rt.factor.short) + ' produced the larger result, which links ' + c.T(rt.factor.np) + ' to ' + st.tag,
            'the numbers rise together, so the change in ' + c.T(rt.factor.np) + ' went along with a change in ' + st.tag,
            'a gap that large between the two trials shows that ' + c.T(rt.factor.np) + ' made a measurable difference'] },
          { fact: c.stageFact(st), clauses: [c.T(rt.why), 'knowing how ' + st.tag + ' works explains why the numbers came out this way', 'the way this step works gives a reason for the pattern in the numbers'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'both the numbers and the way ' + st.tag + ' works support the idea that ' + claim + '.',
        bad: 'The investigation suggests that ' + c.myth(rng) + '.',
        badRestate: c.otherFocus(rng), nonAnswer: rng.pick(['The investigation used two trials.', 'The investigators recorded their measurements.']),
        required: [m.setup], offKind: 'kit'
      };
    }
  });

  // P5 — a causal chain with a genuine order dependency (Advanced). The second explanation
  // builds on the first ("Because that first step is blocked..."), so pair 1 must come first.
  S.push({
    id: 'process-chain', kit: 'process', family: 'cause-effect', levels: ['advanced'],
    label: 'Trace a chain of effects (order-dependent evidence)',
    enumerate: function (kit) { var o = []; kit.stages.forEach(function (s, i) { if (s.needs && i + 1 < kit.stages.length) o.push({ k: i }); }); return o; },
    build: function (kit, p, c, rng) {
      var a = c.stages[p.k], b = c.stages[p.k + 1], cd = c.cond(a.needs);
      return {
        question: 'If ' + cd.absent + ', why would ' + c.outcome + ' eventually drop, even though only ' + a.tag + ' is directly affected?',
        restate: rng.pick(['The question asks how a change to ' + a.tag + ' could end up affecting ' + c.outcome + '.', 'A change that directly affects only ' + a.tag + ' can still reach ' + c.outcome + ', and the question asks how.']),
        answer: G.cap(c.outcome) + ' would drop because the change blocks ' + a.tag + ', leaving ' + a.product + ' unavailable to the next step.',
        pairs: [
          { fact: c.stageFact(a), clauses: ['without ' + cd.np + ', this first step slows down, so ' + a.less + ' would be made', 'this step only works with ' + cd.np + ', so the missing condition would leave ' + a.less, a.needWhy + ', which means this step would fall short'] },
          { fact: c.stageFact(b), clauses: ['because that first step is blocked, this next step would receive ' + a.less + ', so ' + c.outcome + ' would fall as well', 'with that first step held back, ' + b.tag + ' would have ' + a.less + ' to work with, passing the problem along', 'since the first step can no longer supply enough ' + a.product + ', ' + b.tag + ' would slow down too'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'a problem at one step travels down the chain until it reaches ' + c.outcome + '.',
        bad: G.cap(c.outcome) + ' would drop because ' + c.myth(rng) + '.',
        badRestate: c.otherFocus(rng), nonAnswer: c.nonAnswer(rng), offKind: 'kit',
        dependency: { first: 1, reason: 'The second explanation refers back to the first step, so the evidence about ' + a.tag + ' must come first.' }
      };
    }
  });

  // P6 — evaluate a proposed fix when a later step is the bottleneck (Advanced).
  S.push({
    id: 'process-bottleneck', kit: 'process', family: 'problem-solution', levels: ['advanced'],
    label: 'Evaluate a proposed fix against the real bottleneck',
    enumerate: function (kit) {
      var o = [];
      kit.stages.forEach(function (s, k) { if (!s.needs) return; kit.stages.forEach(function (t, j) { if (j < k && t.boost) o.push({ k: k, j: j }); }); });
      return o;
    },
    build: function (kit, p, c, rng) {
      var blocked = c.stages[p.k], early = c.stages[p.j], cd = c.cond(blocked.needs);
      var problem = { id: 'problem', order: 5, tag: 'this year\u2019s change', text: G.finish('This year ' + c.at + ', ' + cd.absent + ', and ' + c.outcome + ' has dropped') };
      var proposal = { id: 'proposal', order: 6, tag: 'the suggested fix', text: G.finish('A student suggests that people ' + early.boost.clause) };
      return {
        question: 'Would ' + early.boost.np + ' bring back ' + c.outcome + '?',
        restate: rng.pick(['The question asks whether ' + early.boost.np + ' would solve the problem.', 'A fix has been suggested ' + c.at + ', and the question asks whether it would work.']),
        answer: G.cap(early.boost.np) + ' would probably not bring back ' + c.outcome + ', because the real problem is at a later step.',
        pairs: [
          { fact: problem, clauses: ['the lack of ' + cd.np + ' blocks ' + blocked.tag + ', which is the step that is actually failing', 'what changed this year affects ' + blocked.tag + ', not ' + early.tag, 'this shows where the trouble starts, since ' + blocked.tag + ' has lost the condition it needs'] },
          { fact: c.stageFact(blocked), clauses: ['since ' + blocked.tag + ' needs ' + cd.np + ', making more ' + early.product + ' would not help that step happen', 'an earlier step cannot make up for a later step that is blocked', 'adding more ' + early.product + ' does nothing if ' + blocked.tag + ' still cannot run'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'fixing an earlier step cannot help when a later step is the one that is blocked.',
        bad: G.cap(early.boost.np) + ' would bring back ' + c.outcome + ' because ' + c.myth(rng) + '.',
        badRestate: c.otherFocus(rng), nonAnswer: rng.pick(['Some people want ' + c.outcome + ' to return.', 'Some people have noticed the change.']),
        required: [proposal], exclude: ['pcond:' + cd.id], offKind: 'kit'
      };
    }
  });

  // P7 — a rate investigation with a second variable that also changed (Advanced).
  S.push({
    id: 'process-rate-confound', kit: 'process', family: 'evaluation', levels: ['advanced'],
    label: 'Evaluate a rate investigation with a confound',
    enumerate: function (kit) { var o = []; (kit.rates || []).forEach(function (r, i) { if (r.confound) o.push({ r: i }); }); return o; },
    build: function (kit, p, c, rng) {
      var rt = kit.rates[p.r], st = c.stages.filter(function (s) { return s.id === rt.stage; })[0], m = c.rate(rt, rng);
      var claim = c.T(rt.claim);
      return {
        question: 'Does the investigation prove that ' + claim + '?',
        restate: rng.pick(['The question asks whether this investigation is strong evidence about ' + c.T(rt.factor.np) + '.', 'The question asks how much this investigation can really show about ' + st.tag + '.']),
        answer: 'The investigation does not prove it by itself, because ' + c.T(rt.factor.np) + ' was not the only thing that changed.',
        pairs: [
          { fact: m.result, clauses: ['the numbers do differ, but a difference alone cannot show which change caused it', 'the second trial came out higher, yet that only shows the trials ended up different, not why', 'a measured gap shows that something mattered, but it does not say what'] },
          { fact: m.confound, clauses: [c.T(rt.confound.why) + ', so it could explain some or all of the difference', 'because a second condition also changed, the test cannot separate the two possible causes', 'this extra difference means the result cannot be credited to ' + c.T(rt.factor.np) + ' alone'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'the investigation hints that ' + claim + ', but a fair test would change only ' + c.T(rt.factor.np) + '.',
        bad: 'The investigation proves that ' + c.myth(rng) + '.',
        badRestate: c.otherFocus(rng), nonAnswer: rng.pick(['The investigation used two trials.', 'The investigators recorded their measurements.']),
        required: [m.setup], offKind: 'kit'
      };
    }
  });

  return { structures: S, context: context };
});
