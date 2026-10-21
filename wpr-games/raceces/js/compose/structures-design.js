/* Reasoning structures that run on a DESIGN kit: an entity whose features serve a purpose,
   settings that present conditions, measurable outcomes, costs, and possible confounds.
   Each structure enumerates its meaningfully distinct configurations (params) and builds a
   complete R-A-C-E-C-E-S response plus misconception distractors for one configuration. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./grammar.js'), require('./phrases.js'));
  else { root.RACECES = root.RACECES || {}; root.RACECES.StructuresDesign = factory(root.RACECES.Grammar, root.RACECES.Phrases); }
})(typeof self !== 'undefined' ? self : this, function (G, P) {
  'use strict';

  function feat(kit, id) { return kit.features.filter(function (f) { return f.id === id; })[0]; }
  function featFor(kit, condId) { return kit.features.filter(function (f) { return f.cond === condId; })[0]; }
  function pairs(arr) { var out = []; for (var i = 0; i < arr.length; i++) for (var j = i + 1; j < arr.length; j++) out.push([arr[i], arr[j]]); return out; }
  function cost(f) { return f.cost || null; }

  // ---- Shared phrase builders (feature-aware agreement) ----
  function lets(f) { return G.agree('let', f.pl); }
  function helps(f) { return G.agree('help', f.pl); }
  function isv(f) { return G.be(f.pl); }
  function hasv(f) { return G.has(f.pl); }
  function This(f) { return G.dem(f.pl) + ' ' + f.short; }
  function better(m) { return m.better === 'lower' ? 'lower' : 'higher'; }

  /* Explanation clauses that connect a feature's mechanism to its benefit. Distinct wordings
     are needed so the engine can draw an Explain distractor that is not a visible sentence. */
  function benefitClauses(f, c, link) {
    return [
      This(f) + ' ' + lets(f) + ' ' + c.mThe + ' ' + f.benefit + ', ' + link,
      'because of ' + f.the + ', ' + c.mThe + ' can ' + f.benefit + ', ' + link,
      'with ' + f.the + ', ' + c.mThe + ' is able to ' + f.benefit + ', ' + link
    ];
  }
  function myth(c, rng) { return rng.pick(c.kit.myths); }
  function otherFocus(c, rng) {
    var g = rng.pick(c.kit.otherGoals);
    return rng.pick(['The question is about how ' + c.E + ' is able to ' + g + '.', c.CapE + ' is able to ' + g + '.', 'The response explains how ' + c.E + ' manages to ' + g + '.']);
  }

  var S = [];

  // D1 — two features, one function (Beginner).
  S.push({
    id: 'design-function', kit: 'design', family: 'function', levels: ['beginner'],
    label: 'Explain how two features serve one purpose',
    enumerate: function (kit) { return pairs(kit.features.map(function (f) { return f.id; })).map(function (p) { return { fa: p[0], fb: p[1] }; }); },
    build: function (kit, p, c, rng) {
      var fa = feat(kit, p.fa), fb = feat(kit, p.fb);
      var link = function (f) { return 'which matters wherever ' + c.cond(f.cond).clause; };
      return {
        question: 'How is ' + c.E + ' able to ' + c.goal + '?',
        restate: rng.pick([c.CapE + ' is able to ' + c.goal + '.', 'The question is about how ' + c.E + ' manages to ' + c.goal + '.']),
        answer: rng.pick([
          c.CapE + ' can ' + c.goal + ' because it is able to ' + fa.benefit + ' and ' + fb.benefit + '.',
          'Two features help ' + c.E + ' ' + c.goal + ': ' + fa.the + ' ' + lets(fa) + ' it ' + fa.benefit + ', and ' + fb.the + ' ' + lets(fb) + ' it ' + fb.benefit + '.'
        ]),
        pairs: [
          { fact: c.featureFact(fa), clauses: benefitClauses(fa, c, link(fa)) },
          { fact: c.featureFact(fb), clauses: benefitClauses(fb, c, link(fb)) }
        ],
        summary: rng.pick(P.SUM_OPEN) + fa.the + ' and ' + fb.the + ' work together to help ' + c.E + ' ' + c.goal + '.',
        bad: c.CapE + ' can ' + c.goal + ' because it is able to ' + myth(c, rng) + '.',
        badRestate: otherFocus(c, rng),
        nonAnswer: c.nonAnswer(rng),
        required: [], offKind: 'kit'
      };
    }
  });

  // D12 — one feature: mechanism plus the condition that makes it matter (Beginner).
  S.push({
    id: 'design-feature-need', kit: 'design', family: 'cause-effect', levels: ['beginner'],
    label: 'Explain why one feature matters under a condition',
    enumerate: function (kit) { return kit.features.map(function (f) { return { f: f.id }; }); },
    build: function (kit, p, c, rng) {
      var f = feat(kit, p.f), cd = c.cond(f.cond);
      return {
        question: 'How ' + G.agree('do', f.pl) + ' ' + f.the + ' help ' + c.E + '?',
        restate: rng.pick([G.cap(f.the) + ' ' + G.agree('play', f.pl) + ' a part in how ' + c.E + ' ' + c.goal3 + '.', 'The question asks what ' + f.the + ' ' + G.agree('do', f.pl) + ' for ' + c.E + '.']),
        answer: G.cap(f.the) + ' ' + helps(f) + ' ' + c.E + ' ' + f.benefit + ', which is important because ' + cd.clause + '.',
        pairs: [
          { fact: c.featureFact(f), clauses: [
            This(f) + ' ' + lets(f) + ' ' + c.mThe + ' ' + f.benefit,
            'because ' + f.the + ' ' + G.agree(f.mech, f.pl) + ', ' + c.mThe + ' can ' + f.benefit,
            'the job of ' + f.the + ' is to let ' + c.mThe + ' ' + f.benefit] },
          { fact: c.homeCondFact(cd), clauses: [
            cd.risk + ', so ' + f.the + ' ' + G.agree('make', f.pl) + ' a real difference',
            'since ' + cd.clause + ', ' + c.mThe + ' would face a serious problem without ' + f.the,
            'a place where ' + cd.clause + ' is exactly where a feature like ' + f.the + ' pays off'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + f.the + ' ' + helps(f) + ' ' + c.E + ' ' + f.benefit + ' in a place where ' + cd.clause + '.',
        bad: G.cap(f.the) + ' ' + helps(f) + ' ' + c.E + ' ' + myth(c, rng) + '.',
        badRestate: otherFocus(c, rng),
        nonAnswer: c.nonAnswer(rng),
        required: [], offKind: 'kit'
      };
    }
  });

  // D2 — a setting presents two conditions; two features match them (Beginner).
  S.push({
    id: 'design-setting-fit', kit: 'design', family: 'adaptation', levels: ['beginner'],
    label: 'Match features to the conditions of a setting',
    enumerate: function (kit) { return kit.settings.map(function (s) { return { s: s.id }; }); },
    build: function (kit, p, c, rng) {
      var s = c.setting(p.s), ca = c.cond(s.has[0]), cb = c.cond(s.has[1]);
      var fa = featFor(kit, s.has[0]), fb = featFor(kit, s.has[1]);
      var link = function (cd) { return 'which is what it needs ' + s.at + ', where ' + cd.clause; };
      var answer = c.CapE + ' is a good fit for ' + s.the + ' because it has a way to handle both ' + ca.np + ' and ' + cb.np + '.';
      return {
        lead: [c.CapE + ' ' + c.liveVerb + ' ' + s.at + ', where ' + ca.clause + ' and ' + cb.clause + '.'],
        question: 'Why is ' + c.E + ' a good fit for ' + s.the + '?',
        restate: rng.pick([c.CapE + ' is a good fit for ' + s.the + '.', 'The question asks why ' + c.E + ' fits ' + s.the + '.']),
        answer: answer,
        pairs: [
          { fact: c.featureFact(fa), clauses: benefitClauses(fa, c, link(ca)) },
          { fact: c.featureFact(fb), clauses: benefitClauses(fb, c, link(cb)) }
        ],
        summary: rng.pick(P.SUM_OPEN) + G.lowerFirst(c.E + ' is a good fit for ' + s.the, [c.Name]) + '.',
        bad: c.CapE + ' is a good fit for ' + s.the + ' because it is able to ' + myth(c, rng) + '.',
        badRestate: otherFocus(c, rng),
        nonAnswer: c.nonAnswer(rng),
        required: [], offKind: 'kit'
      };
    }
  });

  // D3 — a controlled test of one feature, read with its mechanism (Beginner).
  S.push({
    id: 'design-test-result', kit: 'design', family: 'numeric', levels: ['beginner'],
    label: 'Interpret a simple test result',
    enumerate: function (kit) { return kit.features.filter(function (f) { return f.metric; }).map(function (f) { return { f: f.id }; }); },
    build: function (kit, p, c, rng) {
      var f = feat(kit, p.f), m = f.metric, t = c.test(f, rng);
      return {
        lead: [t.intro],
        question: 'What does the test suggest about ' + f.the + '?',
        restate: rng.pick(['The researchers\u2019 test looked at what ' + f.the + ' ' + G.agree('do', f.pl) + ' for ' + c.E + '.', 'The question asks what the test shows about ' + f.the + '.']),
        answer: 'The test suggests that ' + f.the + ' ' + helps(f) + ' ' + c.E + ' ' + f.benefit + '.',
        pairs: [
          { fact: t.result, clauses: [
            'the group with ' + f.the + ' had ' + m.cmp + ', which shows that the feature made a measurable difference',
            'the group with ' + f.the + ' clearly did better on ' + m.np + ', so the feature changed the outcome',
            'a gap that large between the two groups points to ' + f.the + ' as the reason for the difference'] },
          { fact: c.featureFact(f), clauses: [
            'this gives a reason for the result, since ' + f.the + ' ' + lets(f) + ' ' + c.mThe + ' ' + f.benefit,
            'knowing how ' + f.the + ' ' + G.agree('work', f.pl) + ' explains why the group that had ' + G.it(f) + ' did better',
            'the way ' + f.the + ' ' + G.agree('work', f.pl) + ' matches the result, because ' + G.it(f) + ' ' + lets(f) + ' ' + c.mThe + ' ' + f.benefit] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'the test supports the idea that ' + f.the + ' ' + helps(f) + ' ' + c.E + ' ' + f.benefit + '.',
        bad: 'The test suggests that ' + f.the + ' ' + lets(f) + ' ' + c.E + ' ' + myth(c, rng) + '.',
        badRestate: otherFocus(c, rng),
        nonAnswer: rng.pick(['The test compared two groups of ' + c.NamePl + '.', 'The researchers measured ' + m.np + ' in both groups.']),
        required: [t.design], offKind: 'kit'
      };
    }
  });

  // D2i — choose the two relevant features out of several for a setting (Intermediate).
  S.push({
    id: 'design-select-features', kit: 'design', family: 'evaluation', levels: ['intermediate'],
    label: 'Select the relevant features from several plausible ones',
    enumerate: function (kit) { return kit.settings.map(function (s) { return { s: s.id }; }); },
    build: function (kit, p, c, rng) {
      var s = c.setting(p.s), ca = c.cond(s.has[0]), cb = c.cond(s.has[1]);
      var fa = featFor(kit, s.has[0]), fb = featFor(kit, s.has[1]);
      var lacks = s.lacks.filter(function (id) { return featFor(kit, id); });
      var decoy = featFor(kit, rng.pick(lacks));
      var dc = c.cond(decoy.cond);
      var link = function (cd) { return 'which fits ' + s.the + ' because ' + cd.clause + ' there'; };
      return {
        lead: [c.many(s), c.settingFact(s, [ca, cb], [dc]).text],
        question: 'Which two features of ' + c.E + ' matter most ' + s.at + ', and why?',
        restate: rng.pick(['The question asks which features of ' + c.E + ' are most useful ' + s.at + '.', 'Some features of ' + c.E + ' are more useful ' + s.at + ' than others.']),
        answer: G.cap(s.at) + ', ' + fa.the + ' and ' + fb.the + ' matter most, because they deal with the conditions that are actually present there.',
        pairs: [
          { fact: c.featureFact(fa), clauses: benefitClauses(fa, c, link(ca)) },
          { fact: c.featureFact(fb), clauses: benefitClauses(fb, c, link(cb)) }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'the conditions ' + s.at + ' make ' + fa.the + ' and ' + fb.the + ' the most useful features for ' + c.E + '.',
        bad: G.cap(s.at) + ', ' + c.E + ' mostly depends on being able to ' + myth(c, rng) + '.',
        badRestate: otherFocus(c, rng),
        nonAnswer: rng.pick([c.CapE + ' has several different features.', 'Every feature of ' + c.E + ' is useful somewhere.']),
        required: [], off: { fact: c.featureFact(decoy), exp: G.finish(rng.pick(benefitClauses(decoy, c, 'which would matter only where ' + dc.clause))), add: 'it also has ' + decoy.np, tag: decoy.the }
      };
    }
  });

  // D4 — consequence of losing a feature (Intermediate).
  S.push({
    id: 'design-removal', kit: 'design', family: 'consequence', levels: ['intermediate'],
    label: 'Predict the consequence of removing a feature',
    enumerate: function (kit) { return kit.features.map(function (f) { return { f: f.id }; }); },
    build: function (kit, p, c, rng) {
      var f = feat(kit, p.f), cd = c.cond(f.cond);
      return {
        question: 'What would most likely happen to ' + c.E + ' if it no longer had ' + f.the + '?',
        restate: rng.pick(['The question asks what ' + c.E + ' would face without ' + f.the + '.', 'The question imagines ' + c.E + ' without ' + f.the + '.']),
        answer: 'Without ' + f.the + ', ' + c.E + ' could no longer ' + f.benefit + ' as well, which would be a real problem in a place where ' + cd.clause + '.',
        pairs: [
          { fact: c.featureFact(f), clauses: [
            'if ' + f.the + ' ' + (f.pl ? 'were' : 'were') + ' gone, nothing would ' + f.mech + ', so ' + c.mThe + ' could not ' + f.benefit + ' as well',
            'removing ' + f.the + ' would remove the very thing that lets ' + c.mThe + ' ' + f.benefit,
            c.mThe + ' depends on ' + f.the + ' to ' + f.benefit + ', so losing ' + G.it(f) + ' would take that ability away'] },
          { fact: c.homeCondFact(cd), clauses: [
            cd.risk + ', so losing ' + f.the + ' would leave ' + c.mThe + ' facing a serious problem',
            'the problem ' + f.the + ' ' + G.agree('solve', f.pl) + ' would not go away, because ' + cd.clause,
            'since ' + cd.clause + ', the loss would cause trouble right away instead of someday'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'losing ' + f.the + ' would make it much harder for ' + c.E + ' to ' + f.benefit + '.',
        bad: 'Without ' + f.the + ', ' + c.E + ' would simply begin to ' + myth(c, rng) + ' instead.',
        badRestate: otherFocus(c, rng),
        nonAnswer: rng.pick([c.CapE + ' would still be ' + c.aDescr + '.', 'Some features of ' + c.E + ' are larger than others.']),
        required: [], offKind: 'kit'
      };
    }
  });

  // D9 — the same result in two separate tests forms a pattern (Intermediate).
  S.push({
    id: 'design-two-tests', kit: 'design', family: 'pattern', levels: ['intermediate'],
    label: 'Identify a pattern across two tests',
    enumerate: function (kit) { return kit.features.filter(function (f) { return f.metric; }).map(function (f) { return { f: f.id }; }); },
    build: function (kit, p, c, rng) {
      var f = feat(kit, p.f), m = f.metric;
      var t1 = c.test(f, rng, 'first'), t2 = c.test(f, rng, 'second');
      return {
        lead: [t1.intro],
        question: 'What pattern do the two tests show about ' + f.the + '?',
        restate: rng.pick(['The passage describes two separate tests of ' + f.the + '.', 'The question asks what the two tests have in common about ' + f.the + '.']),
        answer: 'In both tests, the ' + c.mPl + ' with ' + f.the + ' had ' + m.cmp + ', so the benefit of the feature was repeated, not a one-time result.',
        pairs: [
          { fact: t1.result, clauses: [
            'the first test gives one clear case where ' + f.the + ' made a difference',
            'one test on its own shows that the group with ' + f.the + ' did better',
            'this result is the first half of the pattern, since the group with ' + f.the + ' came out ahead'] },
          { fact: t2.result, clauses: [
            'because the same result appeared again, the first result was probably not an accident',
            'getting a matching result a second time makes the link to ' + f.the + ' much more convincing',
            'the second test repeats the outcome, which turns one result into a pattern'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'two matching results point to a consistent benefit of ' + f.the + '.',
        bad: 'Both tests show that ' + f.the + ' ' + lets(f) + ' ' + c.E + ' ' + myth(c, rng) + '.',
        badRestate: otherFocus(c, rng),
        nonAnswer: rng.pick(['The two tests were done at different times.', 'The researchers used ' + c.NamePl + ' in both tests.']),
        required: [t1.design, t2.design], offKind: 'kit'
      };
    }
  });

  // D13 — identify one benefit and one drawback of a feature (Intermediate).
  S.push({
    id: 'design-benefit-drawback', kit: 'design', family: 'tradeoff', levels: ['intermediate'],
    label: 'Identify a benefit and a drawback',
    enumerate: function (kit) { return kit.features.filter(cost).map(function (f) { return { f: f.id }; }); },
    build: function (kit, p, c, rng) {
      var f = feat(kit, p.f), k = c.cond(f.cost.cond);
      return {
        question: 'What is one benefit and one drawback of ' + f.the + ' for ' + c.E + '?',
        restate: rng.pick(['The question asks about the good and bad sides of ' + f.the + '.', G.cap(f.the) + ' ' + hasv(f) + ' more than one effect on ' + c.E + '.']),
        answer: G.cap(f.the) + ' ' + helps(f) + ' ' + c.E + ' ' + f.benefit + ', but ' + G.it(f) + ' ' + G.agree('come', f.pl) + ' with a cost when ' + k.clause + '.',
        pairs: [
          { fact: c.featureFact(f), clauses: [
            'that is the benefit, because it lets ' + c.mThe + ' ' + f.benefit,
            'this is the useful side of ' + f.the + ', since ' + c.mThe + ' can ' + f.benefit,
            G.it(f) + ' ' + G.agree('give', f.pl) + ' ' + c.mThe + ' an advantage by letting it ' + f.benefit] },
          { fact: c.costFact(f), clauses: [
            'that is the drawback, because the same feature costs ' + c.mThe + ' something when ' + k.clause,
            'this shows the downside of ' + f.the + ', which appears when ' + k.clause,
            'the feature is not free, and its price is paid when ' + k.clause] }
        ],
        summary: rng.pick(P.SUM_OPEN) + f.the + ' ' + isv(f) + ' useful to ' + c.E + ', but ' + G.its(f) + ' value depends on whether ' + k.clause + '.',
        bad: G.cap(f.the) + ' ' + helps(f) + ' ' + c.E + ' ' + myth(c, rng) + ' and has no drawback at all.',
        badRestate: otherFocus(c, rng),
        nonAnswer: rng.pick([G.cap(f.the) + ' ' + isv(f) + ' one of several features of ' + c.E + '.', 'Every feature has some effect on ' + c.E + '.']),
        required: [], offKind: 'kit'
      };
    }
  });

  // D14 — where would one feature be more useful? Compare two settings (Intermediate).
  S.push({
    id: 'design-compare-settings', kit: 'design', family: 'comparison', levels: ['intermediate'],
    label: 'Compare one feature across two settings',
    enumerate: function (kit) {
      var out = [];
      kit.features.forEach(function (f) {
        kit.settings.forEach(function (sy) {
          if (sy.has.indexOf(f.cond) < 0) return;
          kit.settings.forEach(function (sn) { if (sn !== sy && sn.lacks.indexOf(f.cond) >= 0) out.push({ f: f.id, sy: sy.id, sn: sn.id }); });
        });
      });
      return out;
    },
    build: function (kit, p, c, rng) {
      var f = feat(kit, p.f), sy = c.setting(p.sy), sn = c.setting(p.sn), cd = c.cond(f.cond);
      var order = rng.chance(0.5) ? [sy, sn] : [sn, sy];
      return {
        question: 'Would ' + f.the + ' be more useful to ' + c.E + ' ' + order[0].at + ' or ' + order[1].at + '?',
        restate: rng.pick(['The question compares how useful ' + f.the + ' would be in two different places.', G.cap(f.the) + ' could help ' + c.E + ' in some places more than others, and the question compares two of them.']),
        answer: G.cap(f.the) + ' would be more useful ' + sy.at + ', because the problem ' + G.it(f) + ' ' + G.agree('solve', f.pl) + ' is present there but not ' + sn.at + '.',
        pairs: [
          { fact: c.settingFact(sy, [cd], []), clauses: [
            'because ' + cd.clause + ' ' + sy.at + ', ' + f.the + ' would get used often there',
            c.mThe + ' needs to ' + f.benefit + ' in a place like this, which is exactly what ' + f.the + ' ' + G.agree('do', f.pl),
            'this condition is the one ' + f.the + ' ' + G.agree('handle', f.pl) + ', so the feature pays off in this place'] },
          { fact: c.settingFact(sn, [], [cd]), clauses: [
            'since ' + cd.absent + ' ' + sn.at + ', ' + f.the + ' would have little work to do there',
            'without that problem ' + sn.at + ', the benefit of ' + f.the + ' would rarely be needed',
            'the condition that makes ' + f.the + ' valuable is missing ' + sn.at] }
        ],
        summary: rng.pick(P.SUM_OPEN) + f.the + ' would help ' + c.E + ' more ' + sy.at + ' than ' + sn.at + '.',
        bad: G.cap(f.the) + ' would be more useful ' + sn.at + ', because ' + G.it(f) + ' ' + lets(f) + ' ' + c.E + ' ' + myth(c, rng) + '.',
        badRestate: otherFocus(c, rng),
        nonAnswer: rng.pick([c.CapE + ' can be found in both places.', G.cap(f.the) + ' ' + isv(f) + ' one of the features of ' + c.E + '.']),
        required: [c.featureFact(f)], offKind: 'kit'
      };
    }
  });

  // D5 — which feature matters more under a specific setting's conditions (Advanced).
  S.push({
    id: 'design-priority', kit: 'design', family: 'comparison', levels: ['advanced'],
    label: 'Weigh two features against a setting\u2019s conditions',
    enumerate: function (kit) {
      var out = [];
      kit.settings.forEach(function (s) {
        s.has.forEach(function (h) {
          s.lacks.forEach(function (l) {
            if (featFor(kit, h) && featFor(kit, l)) out.push({ s: s.id, fa: featFor(kit, h).id, fb: featFor(kit, l).id });
          });
        });
      });
      return out;
    },
    build: function (kit, p, c, rng) {
      var s = c.setting(p.s), fa = feat(kit, p.fa), fb = feat(kit, p.fb), ca = c.cond(fa.cond), cb = c.cond(fb.cond);
      var sf = c.settingFact(s, [ca], [cb]);
      var order = rng.chance(0.5) ? [fa, fb] : [fb, fa];
      return {
        lead: [c.many(s)],
        question: G.cap(s.at) + ', which would matter more for ' + c.E + ': ' + order[0].the + ' or ' + order[1].the + '?',
        restate: rng.pick(['The question compares how much ' + fa.the + ' and ' + fb.the + ' would matter ' + s.at + '.', 'Both ' + fa.the + ' and ' + fb.the + ' could help ' + c.E + ', but the question asks about ' + s.the + ' in particular.']),
        answer: G.cap(s.at) + ', ' + fa.the + ' would matter more, because the problem ' + G.it(fa) + ' ' + G.agree('solve', fa.pl) + ' is present there and the problem ' + fb.the + ' ' + G.agree('solve', fb.pl) + ' is not.',
        pairs: [
          { fact: c.featureFact(fa), clauses: [
            G.cap(fa.the) + ' ' + lets(fa) + ' ' + c.mThe + ' ' + fa.benefit + ', a benefit that pays off wherever ' + ca.clause,
            'this feature is valuable where ' + ca.clause + ', because it lets ' + c.mThe + ' ' + fa.benefit,
            'the benefit of ' + fa.the + ' depends on ' + ca.np + ', which makes it useful only where that problem exists'] },
          { fact: sf, clauses: [
            'since ' + cb.absent + ' ' + s.at + ', the benefit of ' + fb.the + ' would rarely be needed there',
            'the conditions there call for ' + fa.the + ' but give ' + fb.the + ' little work to do',
            'one problem is present ' + s.at + ' and the other is missing, so only one feature would be used often'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'the conditions ' + s.at + ' make ' + fa.the + ' more important than ' + fb.the + ' for ' + c.E + '.',
        bad: G.cap(s.at) + ', ' + fb.the + ' would matter more, because ' + G.it(fb) + ' ' + lets(fb) + ' ' + c.E + ' ' + myth(c, rng) + '.',
        badRestate: otherFocus(c, rng),
        nonAnswer: rng.pick(['Both ' + fa.the + ' and ' + fb.the + ' are features of ' + c.E + '.', 'Different features help ' + c.E + ' in different ways.']),
        required: [c.featureFact(fb)], offKind: 'kit'
      };
    }
  });

  // D6 — is a feature worth its drawback in a setting? (Advanced)
  S.push({
    id: 'design-tradeoff', kit: 'design', family: 'tradeoff', levels: ['advanced'],
    label: 'Decide whether a benefit outweighs a drawback',
    enumerate: function (kit) {
      var out = [];
      kit.features.filter(cost).forEach(function (f) {
        kit.settings.forEach(function (s) {
          if (s.has.indexOf(f.cond) >= 0 && s.lacks.indexOf(f.cost.cond) >= 0) out.push({ f: f.id, s: s.id });
        });
      });
      return out;
    },
    build: function (kit, p, c, rng) {
      var f = feat(kit, p.f), s = c.setting(p.s), cd = c.cond(f.cond), k = c.cond(f.cost.cond);
      return {
        lead: [c.many(s)],
        question: 'Is ' + f.the + ' worth ' + G.its(f) + ' drawback for ' + c.E + ' ' + s.at + '?',
        restate: rng.pick(['The question asks whether the benefit of ' + f.the + ' outweighs ' + G.its(f) + ' drawback ' + s.at + '.', G.cap(f.the) + ' ' + hasv(f) + ' a benefit and a drawback, and the question asks how they balance ' + s.at + '.']),
        answer: G.cap(s.at) + ', ' + f.the + ' ' + isv(f) + ' worth ' + G.its(f) + ' drawback, because ' + G.its(f) + ' benefit is needed there while ' + G.its(f) + ' drawback hardly matters.',
        pairs: [
          { fact: c.settingFact(s, [cd], [k]), clauses: [
            'because ' + cd.clause + ' ' + s.at + ', ' + c.mThe + ' really needs ' + f.the + ' to ' + f.benefit,
            'the conditions there make the benefit large, since ' + f.the + ' ' + lets(f) + ' ' + c.mThe + ' ' + f.benefit,
            'this means the benefit of ' + f.the + ' gets used often ' + s.at] },
          { fact: c.costFact(f), clauses: [
            'that drawback mainly matters when ' + k.clause + ', which is not the case ' + s.at,
            'the cost only becomes serious when ' + k.clause + ', so ' + s.the + ' keeps it small',
            'this drawback depends on ' + k.np + ', and ' + s.the + ' does not have that condition'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'the conditions ' + s.at + ' make the benefit of ' + f.the + ' large and ' + G.its(f) + ' cost small.',
        bad: G.cap(s.at) + ', ' + f.the + ' ' + isv(f) + ' worth it because ' + G.it(f) + ' ' + lets(f) + ' ' + c.E + ' ' + myth(c, rng) + '.',
        badRestate: otherFocus(c, rng),
        nonAnswer: rng.pick(['Every feature of ' + c.E + ' has some kind of cost.', G.cap(f.the) + ' ' + isv(f) + ' one of the features of ' + c.E + '.']),
        required: [c.featureFact(f)], offKind: 'kit'
      };
    }
  });

  // D7 — an unfair test: a measured difference with a confound (Advanced).
  S.push({
    id: 'design-unfair-test', kit: 'design', family: 'evaluation', levels: ['advanced'],
    label: 'Evaluate whether a flawed test proves a claim',
    enumerate: function (kit) {
      var out = [];
      kit.features.filter(function (f) { return f.metric; }).forEach(function (f) { kit.confounds.forEach(function (k, i) { out.push({ f: f.id, k: i }); }); });
      return out;
    },
    build: function (kit, p, c, rng) {
      var f = feat(kit, p.f), m = f.metric, k = kit.confounds[p.k], t = c.test(f, rng);
      var cf = c.confoundFact(f, k);
      return {
        lead: [t.intro],
        question: 'Does the test prove that ' + f.the + ' ' + helps(f) + ' ' + c.E + ' ' + f.benefit + '?',
        restate: rng.pick(['The question asks whether this test is strong evidence about ' + f.the + '.', 'The question asks how much this test can really show about ' + f.the + '.']),
        answer: 'The test does not prove it by itself, because the two groups differed in more than one way.',
        pairs: [
          { fact: t.result, clauses: [
            'the difference in ' + m.np + ' is real, but a result alone cannot show which difference between the groups caused it',
            'the group with ' + f.the + ' did better, yet that only proves the groups ended up different, not why',
            'a measured gap shows that something mattered, but it does not say what'] },
          { fact: cf, clauses: [
            'because ' + c.fillK(k.why, f) + ', the better result cannot be credited to ' + f.the + ' alone',
            'this second difference could explain some or all of the result, since ' + c.fillK(k.why, f),
            'with ' + c.fillK(k.np, f) + ' also changing, the test cannot separate the two possible causes'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'the test hints that ' + f.the + ' might help, but a fair test would need groups that differ in only one way.',
        bad: 'The test proves that ' + f.the + ' ' + lets(f) + ' ' + c.E + ' ' + myth(c, rng) + '.',
        badRestate: otherFocus(c, rng),
        nonAnswer: rng.pick(['The researchers measured ' + m.np + ' for both groups.', 'The test used two groups of ' + c.NamePl + '.']),
        required: [t.design], offKind: 'kit'
      };
    }
  });

  // D8 — two competing explanations, one ruled out by a control (Advanced).
  S.push({
    id: 'design-competing', kit: 'design', family: 'competing-explanations', levels: ['advanced'],
    label: 'Resolve competing explanations with a control',
    enumerate: function (kit) {
      var out = [];
      kit.features.filter(function (f) { return f.metric; }).forEach(function (f) { kit.confounds.forEach(function (k, i) { out.push({ f: f.id, k: i }); }); });
      return out;
    },
    build: function (kit, p, c, rng) {
      var f = feat(kit, p.f), m = f.metric, k = kit.confounds[p.k], t = c.test(f, rng);
      var rule = c.ruleOutFact(f, k), alt = c.altFact(f, k);
      var alts = rng.chance(0.5) ? [f.the, c.fillK(k.alt, f)] : [c.fillK(k.alt, f), f.the];
      return {
        lead: [t.intro],
        question: 'Which explanation for the test result does the evidence support better: ' + alts[0] + ' or ' + alts[1] + '?',
        restate: rng.pick(['The question asks which of two explanations better accounts for the test result.', 'Two explanations have been offered for the test result, and the question asks which one fits the evidence.']),
        answer: 'The evidence supports ' + f.the + ' as the better explanation, because the other explanation is ruled out.',
        pairs: [
          { fact: t.result, clauses: [
            'the group with ' + f.the + ' had ' + m.cmp + ', so something about that group made a real difference',
            'there is a real result to explain, because the group with ' + f.the + ' came out ahead',
            'the gap between the groups is what both explanations are trying to account for'] },
          { fact: rule, clauses: [
            'this rules out ' + c.fillK(k.alt, f) + ', since that cannot explain a difference between groups that were treated alike',
            'because the groups matched in this way, ' + c.fillK(k.alt, f) + ' cannot be the reason one group did better',
            'once ' + c.fillK(k.alt, f) + ' is ruled out, ' + f.the + ' is the difference left to explain the result'] }
        ],
        summary: rng.pick(P.SUM_OPEN) + 'with ' + c.fillK(k.alt, f) + ' ruled out, ' + f.the + ' is the best explanation for the result.',
        bad: 'The evidence shows that the result came from ' + c.E + ' being able to ' + myth(c, rng) + '.',
        badRestate: otherFocus(c, rng),
        nonAnswer: rng.pick(['Two different explanations were suggested for the result.', 'The researchers measured ' + m.np + ' for both groups.']),
        required: [t.design, alt], offKind: 'kit'
      };
    }
  });

  return { structures: S, feat: feat, featFor: featFor };
});
