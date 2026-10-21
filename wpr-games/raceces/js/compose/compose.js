/* Compositional writing-problem engine.
   A configuration (reasoning structure + the evidence relationships it uses) is a stable
   "virtual writing model". Each build of a configuration varies only surface details
   (fictional names, numbers, wording, passage filler) and produces the same response
   object as js/engine/model.js, so Identify, Rearrange and Missing grade it unchanged. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../engine/rng.js'), require('../engine/structure.js'), require('./grammar.js'), require('./phrases.js'),
      require('./structures-design.js'), require('./structures-process.js'), require('./structures-observation.js'), require('./check.js'));
  } else {
    var R = root.RACECES = root.RACECES || {};
    R.Compose = factory(R.RNG, R.Structure, R.Grammar, R.Phrases, R.StructuresDesign, R.StructuresProcess, R.StructuresObservation, R.ComposeCheck);
  }
})(typeof self !== 'undefined' ? self : this, function (RNG, Structure, G, P, SD, SP, SO, Check) {
  'use strict';

  var STRUCTURES = [].concat(SD.structures, SP.structures, SO.structures);
  var STRUCT_BY_ID = {};
  STRUCTURES.forEach(function (s) { STRUCT_BY_ID[s.id] = s; });

  // Passage length bands match the authored library (js/engine/validator.js WORD_LIMITS).
  var WORDS = { beginner: [70, 130], intermediate: [90, 170], advanced: [110, 195] };
  var FACT_TARGET = { beginner: 5, intermediate: 6, advanced: 7 };
  var MAX_TRIES = 8;

  function wc(s) { return (String(s).toLowerCase().match(/[a-z0-9]+/g) || []).length; }

  function paramKey(p) { return Object.keys(p).sort().map(function (k) { return k + '=' + p[k]; }).join(','); }

  /* Build the catalogue: one entry per meaningfully distinct configuration. */
  function index(library, bundle) {
    var topics = {};
    (bundle && bundle.topics || []).forEach(function (t) { topics[t.id] = t; });
    var kits = {}, entries = [], byId = {};
    library.kits.forEach(function (kit) {
      kits[kit.id] = kit;
      STRUCTURES.filter(function (s) { return s.kit === kit.type; }).forEach(function (s) {
        s.enumerate(kit).forEach(function (p) {
          s.levels.forEach(function (level) {
            var id = 'g:' + kit.id + ':' + s.id + ':' + level + ':' + paramKey(p);
            var e = { id: id, generated: true, topicId: kit.topicId, level: level, family: s.family, structure: s.id, kitId: kit.id, kitType: kit.type, params: p };
            entries.push(e); byId[id] = e;
          });
        });
      });
    });
    return { library: library, kits: kits, entries: entries, byId: byId, topics: topics };
  }

  // ---------------------------------------------------------------------------
  // Context: surface choices and typed fact builders for one build.
  function fillCtx(kit, rng) {
    var ctx = { kit: kit };
    var name = rng.pick(kit.names);
    var fmt = kit.nameFmt || '{name} {kind}';
    ctx.name = name;
    ctx.Name = P.fill(fmt, { name: name, kind: kit.kind });
    ctx.E = (kit.noArticle ? '' : 'the ') + ctx.Name;
    ctx.CapE = G.cap(ctx.E);
    ctx.NamePl = P.fill(kit.namePlFmt || '{name} {kindPl}', { name: name, kindPl: kit.kindPl });
    return ctx;
  }

  function designCtx(kit, rng, level) {
    var c = fillCtx(kit, rng);
    c.m = kit.member; c.mThe = 'the ' + kit.member; c.mPl = kit.memberPl;
    c.descr = kit.descr; c.aDescr = G.withArticle(kit.descr);
    c.live = kit.live; c.liveVerb = kit.liveVerb || kit.live.split(' ')[0]; c.home = kit.home;
    c.goal = kit.goal; c.goal3 = G.s3(kit.goal);
    var T = function (s) { return P.fill(s, { E: c.E, CapE: c.CapE, mPl: c.mPl, mThe: c.mThe, NamePl: c.NamePl }); };
    c.T = T;
    c.many = function (s) { return kit.manyFmt ? P.fill(T(kit.manyFmt), { s: s.np }) : c.CapE + ' ' + c.live + ' many places, including ' + s.np + '.'; };
    c.cond = function (id) {
      var cd = kit.conds[id]; if (!cd) throw new Error(kit.id + ': unknown condition ' + id);
      return { id: id, clause: T(cd.clause), absent: T(cd.absent), np: T(cd.np), risk: T(cd.risk || ''), tag: T(cd.tag || cd.np) };
    };
    c.setting = function (id) { return kit.settings.filter(function (s) { return s.id === id; })[0]; };
    c.nonAnswer = function (r) { return T(r.pick(kit.nonAnswers)); };
    c.fillK = function (s, f) { return P.fill(T(s), { F: f.the, Fs: f.short }); };
    var fi = {};
    kit.features.forEach(function (f, i) { fi[f.id] = i; });
    // Three self-contained frames, rotated per build so a passage does not repeat one opener.
    var frameShift = rng.int(3);
    c.featureFact = function (f) {
      var k = (fi[f.id] + frameShift) % 3, t;
      if (k === 0) t = c.CapE + ' has ' + f.np + ', which ' + G.agree(f.mech, f.pl);
      else if (k === 1) t = G.cap(f.the) + ' of ' + c.E + ' ' + G.agree(f.mech, f.pl);
      else t = 'One feature of ' + c.E + ' is ' + f.np + ', which ' + G.agree(f.mech, f.pl);
      return { id: 'feat:' + f.id, order: 10 + fi[f.id], tag: f.the, text: G.finish(t) };
    };
    c.costFact = function (f) {
      return { id: 'cost:' + f.id, order: 20 + fi[f.id], tag: 'the drawback of ' + f.the, dependsOn: 'feat:' + f.id,
        text: G.finish(G.cap(f.the) + ' ' + G.has(f.pl) + ' a drawback: ' + T(f.cost.clause)) };
    };
    c.homeCondFact = function (cd) {
      return { id: 'cond:' + cd.id, order: 30, tag: cd.tag, text: G.finish('Where ' + c.E + ' ' + c.liveVerb + ', ' + cd.clause) };
    };
    c.settingFact = function (s, present, absent) {
      var t = G.cap(s.at) + ', ' + G.list(present.map(function (x) { return x.clause; }));
      if (!present.length) t = G.cap(s.at) + ', ' + G.list(absent.map(function (x) { return x.absent; }));
      else if (absent && absent.length) t += ', but ' + G.list(absent.map(function (x) { return x.absent; }));
      return { id: 'set:' + s.id + ':' + present.map(function (x) { return x.id; }).join('+') + '-' + (absent || []).map(function (x) { return x.id; }).join('+'),
        order: 31, tag: 'the conditions in ' + s.the, text: G.finish(t) };
    };
    c.test = function (f, r, which) {
      var m = f.metric, span = m.hi - m.lo;
      var good = r.range(m.lo, m.lo + Math.floor(span * 0.35));
      var bad = r.range(good + Math.ceil(span * 0.35), m.hi);
      var withV = m.better === 'lower' ? good : bad, withoutV = m.better === 'lower' ? bad : good;
      var amount = function (v) { return (m.prefix || '') + v + ' ' + m.unit; };
      var res = 'the ' + c.mPl + ' with ' + f.the + ' ' + m.past + ' ' + (m.avg === false ? '' : 'an average of ') + amount(withV) + (m.what ? ' ' + m.what : '') +
        ', while the ' + c.mPl + ' without ' + G.them(f) + ' ' + m.past + ' ' + amount(withoutV);
      var base = which === 'second' ? 5 : 2;
      var testTag = which === 'second' ? 'the second test\u2019s results' : which === 'first' ? 'the first test\u2019s results' : 'the test results';
      var intro = which ? 'Researchers ran two hypothetical tests with ' + c.NamePl + '.' : 'In a hypothetical test, researchers compared two groups of ' + c.NamePl + '.';
      var design = which === 'second'
        ? { id: 'test2:design', order: base - 1, tag: 'how the second test was set up', text: G.finish('A second test a year later used two new groups set up the same way') }
        : { id: 'test:design', order: base - 1, tag: 'how the test was set up', text: G.finish((which === 'first' ? 'In the first test, one group had ' : 'One group had ') + f.bare + ', and the other group did not') };
      var result = { id: which === 'second' ? 'test2:result' : 'test:result', order: base, tag: testTag, numbers: [withV, withoutV],
        text: G.finish((which === 'second' ? 'In the second test, ' : '') + res) };
      return { intro: intro, design: design, result: result, values: [withV, withoutV] };
    };
    c.confoundFact = function (f, k) { return { id: 'conf:' + k.id, order: 7, tag: c.fillK(k.tag, f), text: G.finish(c.fillK(k.clause, f)) }; };
    c.ruleOutFact = function (f, k) { return { id: 'rule:' + k.id, order: 9, tag: c.fillK(k.ruleTag, f), text: G.finish(c.fillK(k.ruleOut, f)) }; };
    c.altFact = function (f, k) { return { id: 'alt:' + k.id, order: 8, tag: 'the other suggested explanation', text: G.finish('Some people suggested that ' + c.fillK(k.alt, f) + ' caused the difference instead') }; };
    c.fillers = function () {
      var out = kit.features.map(c.featureFact);
      kit.features.filter(function (f) { return f.cost; }).forEach(function (f) { out.push(c.costFact(f)); });
      return out;
    };
    c.offPool = function () {
      return kit.off.map(function (o, i) { return { fact: { id: 'off:' + i, order: 60 + i, tag: T(o.tag), text: G.finish(T(o.text)) }, exp: G.finish(T(o.exp)), add: T(o.add) }; });
    };
    c.fiction = function (r) {
      return P.fill(r.pick(P.FICTION_DESIGN), { E: c.E, CapE: c.CapE, aDescr: c.aDescr, descr: c.descr, live: c.live, home: c.home });
    };
    return c;
  }

  var CTX = { design: designCtx, process: SP.context, observation: SO.context };

  // ---------------------------------------------------------------------------
  function pickTwo(n, rng) { var a = rng.int(n), b = rng.int(n - 1); if (b >= a) b++; return [a, b]; }

  function assemble(entry, kit, out, c, rng, topic) {
    var level = entry.level;
    // Readability: after the introduction names the scenario, passage facts refer to it by a
    // short reference ("the lab") instead of repeating a long proper name in every sentence.
    // Evidence sentences are built from the shortened facts, so grounding is unaffected.
    if (kit.ref && c.E.length > kit.ref.length + 4) {
      var shortFact = function (f) { return f ? Object.assign({}, f, { text: f.text.split(c.CapE).join(G.cap(kit.ref)).split(c.E).join(kit.ref) }) : f; };
      out = Object.assign({}, out, {
        pairs: out.pairs.map(function (p) { return Object.assign({}, p, { fact: shortFact(p.fact) }); }),
        required: (out.required || []).map(shortFact),
        fillers: out.fillers ? out.fillers.map(shortFact) : null,
        off: out.off ? Object.assign({}, out.off, { fact: shortFact(out.off.fact) }) : null
      });
      var fillers0 = c.fillers, offPool0 = c.offPool;
      c = Object.assign({}, c, {
        fillers: function () { return fillers0().map(shortFact); },
        offPool: function () { return offPool0().map(function (o) { return Object.assign({}, o, { fact: shortFact(o.fact) }); }); }
      });
    }
    var proper = [c.Name].concat(kit.proper || []);
    var pr = out.pairs.map(function (p) {
      var ij = pickTwo(p.clauses.length, rng);
      return {
        fact: p.fact,
        C: p.fact.ev ? p.fact.ev : P.evidence(p.fact.text, level, rng, undefined, proper),
        E: P.wrapExp(p.clauses[ij[0]], level, rng, undefined, proper),
        alt: P.wrapExp(p.clauses[ij[1]], level, rng, undefined, proper),
        rep: P.repeat(p.fact.text, rng, proper)
      };
    });
    var off = out.off || rng.pick(c.offPool());

    // Excerpt: lead + required facts + off-topic fact + fillers, in the kit's natural order.
    var lead = [c.fiction(rng)].concat(out.lead || []).map(function (s) { return G.finish(s); });
    var need = [pr[0].fact, pr[1].fact, off.fact].concat(out.required || []);
    var have = {}; need.forEach(function (f) { have[f.id] = true; });
    var usedText = {}; need.forEach(function (f) { usedText[f.text] = true; });
    // Fillers: the structure's or kit's own facts, plus neutral background sentences and any
    // off-topic details not chosen as this response's off-topic distractor.
    var background = (kit.background || []).map(function (b, i) { var f = { id: 'bg:' + i, order: 50 + i, tag: 'background', text: G.finish(c.T(b)) }; return typeof shortFact === 'function' ? shortFact(f) : f; });
    var spareOff = c.offPool().map(function (o) { return o.fact; }).filter(function (f) { return f.id !== off.fact.id; });
    var pool = rng.shuffle((out.fillers || c.fillers()).concat(background, spareOff).filter(function (f) { return !have[f.id] && !usedText[f.text] && !(out.exclude || []).some(function (x) { return x === f.id; }); }));
    var facts = need.slice();
    var lim = WORDS[level];
    var words = function (fs) { return wc(lead.join(' ') + ' ' + fs.map(function (f) { return f.text; }).join(' ')); };
    // A filler that only makes sense after another fact (a drawback after its feature) waits for it.
    var present = function (id) { return facts.some(function (f) { return f.id === id; }); };
    var guard = 0;
    while (pool.length && guard++ < 50 && (facts.length < FACT_TARGET[level] || words(facts) < lim[0])) {
      var nf = pool.shift();
      if (nf.dependsOn && !present(nf.dependsOn)) { if (pool.some(function (x) { return x.id === nf.dependsOn; })) pool.push(nf); continue; }
      if (words(facts.concat([nf])) <= lim[1]) facts.push(nf);
    }
    facts.sort(function (a, b) { return a.order - b.order || (a.id < b.id ? -1 : 1); });
    var excerpt = lead.concat(facts.map(function (f) { return f.text; })).join(' ');

    function sent(slot, text, extra) {
      var o = { uid: entry.id + '#' + slot, id: slot, slot: slot, role: Structure.roleOfSlot(slot), pair: Structure.pairOfSlot(slot), text: text };
      for (var k in extra) o[k] = extra[k];
      return o;
    }
    var sentences = {
      R: sent('R', G.finish(out.restate)),
      A: sent('A', G.finish(out.answer)),
      C1: sent('C1', pr[0].C, { factId: pr[0].fact.id, tag: pr[0].fact.tag, source: pr[0].fact.text }),
      E1: sent('E1', pr[0].E, { explains: 'C1', tag: pr[0].fact.tag }),
      C2: sent('C2', pr[1].C, { factId: pr[1].fact.id, tag: pr[1].fact.tag, source: pr[1].fact.text }),
      E2: sent('E2', pr[1].E, { explains: 'C2', tag: pr[1].fact.tag }),
      S: sent('S', G.finish(out.summary))
    };
    return {
      modelId: entry.id, topicId: entry.topicId, subject: topic ? topic.subject : kit.subject, title: topic ? topic.title : kit.topicId,
      passageId: entry.id + '|' + c.name + '|' + facts.map(function (f) { return f.id; }).sort().join(','),
      family: entry.family, level: level,
      question: G.finish(out.question, '?'), excerpt: excerpt,
      excerptFacts: facts.map(function (f) { return { id: f.id, text: f.text }; }),
      sentences: sentences,
      pairs: {
        1: { c: 'C1', e: 'E1', tag: pr[0].fact.tag, factId: pr[0].fact.id },
        2: { c: 'C2', e: 'E2', tag: pr[1].fact.tag, factId: pr[1].fact.id }
      },
      dependency: out.dependency || null,
      distractors: {
        rep: [pr[0].rep, pr[1].rep],
        offEv: P.evidence(off.fact.text, level, rng, undefined, proper), offTag: off.fact.tag, offFactId: off.fact.id, offExp: off.exp,
        bad: G.finish(out.bad), badRestate: G.finish(out.badRestate), sumNew: G.finish(G.stripEnd(out.summary) + ', and ' + off.add),
        crossExp: [pr[1].alt, pr[0].alt], nonAnswer: G.finish(out.nonAnswer)
      },
      generated: {
        structure: entry.structure, kitId: entry.kitId, kitType: entry.kitType, params: entry.params,
        surfaceName: c.name, numbers: (out.numbers || []).concat(need.reduce(function (a, f) { return a.concat(f.numbers || []); }, [])),
        offId: off.fact.id
      }
    };
  }

  /* Build one response for a configuration. A combination that fails grammar or semantic
     checks is rejected and rebuilt with a different surface draw. */
  function buildResponse(cidx, entryId, rng) {
    var entry = cidx.byId[entryId];
    if (!entry) throw new Error('Unknown generated configuration: ' + entryId);
    var kit = cidx.kits[entry.kitId], st = STRUCT_BY_ID[entry.structure], topic = cidx.topics[entry.topicId];
    var lastErr = null;
    for (var t = 0; t < MAX_TRIES; t++) {
      var r = t === 0 ? rng : rng.fork('retry' + t);
      var c = CTX[kit.type](kit, r, entry.level);
      var out = st.build(kit, entry.params, c, r);
      var resp = assemble(entry, kit, out, c, r, topic);
      var errs = Check.response(resp, { kit: kit });
      if (!errs.length) { resp.generated.tries = t + 1; return resp; }
      lastErr = errs;
    }
    throw new Error('Could not build a valid response for ' + entryId + ': ' + lastErr.join('; '));
  }

  return { index: index, buildResponse: buildResponse, STRUCTURES: STRUCTURES, STRUCT_BY_ID: STRUCT_BY_ID, WORDS: WORDS, paramKey: paramKey, designCtx: designCtx };
});
