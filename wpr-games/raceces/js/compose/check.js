/* Checks for every generated response. Used by the engine (to reject and redraw a bad
   combination) and by the test suites. Automatic checks catch structural, grammatical and
   many semantic faults; they cannot prove that every sentence reads naturally, so the
   package also ships manual-review samples (see DIVERSITY_REPORT.md / samples/). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./grammar.js'));
  else { root.RACECES = root.RACECES || {}; root.RACECES.ComposeCheck = factory(root.RACECES.Grammar); }
})(typeof self !== 'undefined' ? self : this, function (G) {
  'use strict';

  var SLOTS = ['R', 'A', 'C1', 'E1', 'C2', 'E2', 'S'];
  // Classroom-safety exclusions (superset of the authored library's list in js/engine/validator.js).
  var BANNED = ['election', 'elections', 'president', 'senator', 'vote', 'voting', 'democrat', 'republican', 'political', 'politics',
    'war', 'religion', 'religious', 'church', 'sexual', 'sex', 'kill', 'kills', 'killed', 'murder', 'drug', 'drugs', 'alcohol', 'beer', 'wine',
    'crime', 'criminal', 'gun', 'guns', 'weapon', 'weapons', 'bomb', 'terror', 'terrorist', 'racism', 'racist', 'abuse', 'suicide', 'death',
    'dead', 'die', 'dies', 'died', 'blood', 'bloody', 'conflict', 'stupid', 'hate', 'ugly', 'idiot', 'naked', 'gamble', 'gambling', 'cigarette', 'smoking'];
  var STOP = ('the a an and or but if then of to in on at for with from by as is are was were be been being it its this that these those ' +
    'can could will would should may might must has have had do does did not no so than too very also into onto over under about after before ' +
    'while when where which who whom what why how each every both such some many most more less other another their there they them').split(' ');
  // Words a summary may use without counting as new information.
  var CONNECT = ('overall end altogether reasons together work works working helps help match matches make makes made thrive point points ' +
    'same conclusion idea supports support consistent benefit benefits best explanation result results ruled ruling fair test tests groups group ' +
    'would need needs needed large small cost costs value depends whether useful important much harder hints might feature features ' +
    'more than conditions condition matching place places two both clear evidence shows show explains explain step steps chain eventually ' +
    'later reason reasons pattern patterns process processes only partly fully stronger weaker claim prediction predictions observations ' +
    'observation fits fit better likely unlikely because without within cause causes caused change changes effect effects leads lead ' +
    'first second final through happen happens instead someday serious problem problems drawback drawbacks outweighs balance key ' +
    'way ways only differ keep keeps going needs rose rise rises fell fall falls away toward fixing fix earlier cannot blocked travels travel down until reaches reach reduce reduces decrease directly next before after depends depend able less losing lose loss give given amount keep kept equal slower faster speeds speed slows rate rates factor factors measured differ different difference differences linked link').split(' ');

  function words(s) { return String(s).toLowerCase().match(/[a-z0-9]+/g) || []; }
  function content(s) { return words(s).filter(function (w) { return w.length > 3 && STOP.indexOf(w) < 0; }); }
  // Light stemming so "drop/dropped/dropping" and "cool/cooled" count as the same word.
  function stem(w) { w = w.replace(/(ing|ed|es|s)$/, ''); if (/([b-df-hj-np-tv-z])\1$/.test(w)) w = w.slice(0, -1); return w.slice(0, 5); }
  function stems(s) { var o = {}; content(s).forEach(function (w) { o[stem(w)] = true; }); return o; }
  function numbers(s) { return String(s).replace(/(\d),(\d)/g, '$1$2').match(/\d+(\.\d+)?/g) || []; }
  var ATTRIB = ['source', 'passage', 'text', 'reading', 'excerpt', 'according', 'notes', 'states', 'mentions', 'explains', 'points', 'says', 'describes', 'reports', 'describe'];

  function overlap(a, bStems) {
    var aw = content(a).filter(function (w) { return ATTRIB.indexOf(w) < 0; });
    if (!aw.length) return 1;
    return aw.filter(function (w) { return bStems[stem(w)]; }).length / aw.length;
  }

  function response(resp, opts) {
    opts = opts || {};
    var e = [];
    var s = resp.sentences, d = resp.distractors;
    var all = SLOTS.map(function (k) { return s[k].text; });
    var dist = [d.rep[0], d.rep[1], d.offEv, d.offExp, d.bad, d.badRestate, d.sumNew, d.crossExp[0], d.crossExp[1], d.nonAnswer];

    // Grammar lint on every displayed sentence and every distractor.
    all.concat(dist).forEach(function (t) { G.lint(t).forEach(function (i) { e.push('grammar: ' + i + ' :: ' + t); }); });
    var q = resp.question;
    G.lint(q).forEach(function (i) { e.push('grammar(q): ' + i + ' :: ' + q); });
    if (q.slice(-1) !== '?') e.push('question must end with ?');
    resp.excerptFacts.forEach(function (f) { G.lint(f.text).forEach(function (i) { e.push('grammar(excerpt): ' + i + ' :: ' + f.text); }); });
    (resp.excerpt.match(/[^.?!]+[.?!]/g) || []).forEach(function (t) { G.lint(t.trim()).forEach(function (i) { e.push('grammar(lead): ' + i + ' :: ' + t.trim()); }); });

    // Structure: seven distinct sentences; distractors distinct from them and from each other.
    if (new Set(all).size !== 7) e.push('duplicate sentence in response');
    var seen = {};
    all.forEach(function (t) { seen[t] = true; });
    dist.forEach(function (t) { if (seen[t]) e.push('distractor duplicates another sentence: ' + t); seen[t] = true; });
    if (s.C1.tag === s.C2.tag) e.push('evidence tags not distinct');
    if (resp.pairs[1].factId === resp.pairs[2].factId) e.push('evidence facts not distinct');

    // Grounding: each evidence sentence is supported by its source fact, which is in the passage.
    [1, 2].forEach(function (k) {
      var c = s['C' + k];
      if (resp.excerpt.indexOf(c.source) < 0) e.push('C' + k + ' source fact missing from passage');
      var ov = overlap(c.text, stems(c.source));
      if (ov < 0.7) e.push('C' + k + ' not grounded in its source (' + Math.round(100 * ov) + '%)');
      numbers(c.text).forEach(function (n) { if (numbers(c.source).indexOf(n) < 0) e.push('C' + k + ' number ' + n + ' not in source'); });
      // An explanation must interpret, not restate, its evidence.
      var eo = overlap(s['E' + k].text, stems(c.text));
      if (eo > 0.85) e.push('E' + k + ' repeats its evidence (' + Math.round(100 * eo) + '% overlap)');
    });
    if (resp.excerpt.indexOf(resp.excerptFacts.filter(function (f) { return f.id === d.offFactId; }).map(function (f) { return f.text; })[0] || '\u0000') < 0) e.push('off-topic fact missing from passage');
    if (d.offFactId === resp.pairs[1].factId || d.offFactId === resp.pairs[2].factId) e.push('off-topic fact is also evidence');

    // Numbers in the response must come from the passage.
    var srcNums = numbers(resp.excerpt);
    all.concat([q]).forEach(function (t) { numbers(t).forEach(function (n) { if (srcNums.indexOf(n) < 0) e.push('number ' + n + ' not in passage :: ' + t); }); });

    // Summary adds no new information; the new-information distractor does.
    var known = {};
    [q, s.R.text, s.A.text, s.C1.text, s.E1.text, s.C2.text, s.E2.text].forEach(function (t) { Object.assign(known, stems(t)); });
    CONNECT.forEach(function (w) { known[stem(w)] = true; });
    var novel = content(s.S.text).filter(function (w) { return !known[stem(w)]; });
    if (novel.length) e.push('summary introduces new words: ' + novel.join(', ') + ' :: ' + s.S.text);
    var sumNovel = content(d.sumNew).filter(function (w) { return !known[stem(w)]; });
    if (!sumNovel.length) e.push('sumNew distractor adds no new information');

    // Unsupported claim must contain something the passage does not say.
    var srcStems = stems(resp.excerpt + ' ' + q);
    if (!content(d.bad).filter(function (w) { return !srcStems[stem(w)]; }).length) e.push('unsupported-claim distractor is fully supported by the passage');

    // Scenario consistency: only the drawn fictional name appears.
    if (opts.kit && opts.kit.names) {
      var name = resp.generated.surfaceName;
      var text = resp.excerpt + ' ' + all.join(' ') + ' ' + dist.join(' ');
      opts.kit.names.forEach(function (n) { if (n !== name && name.indexOf(n) < 0 && new RegExp('\\b' + n + '\\b').test(text)) e.push('foreign scenario name ' + n); });
      if (resp.excerpt.indexOf(name) < 0) e.push('scenario name missing from passage');
    }

    // Classroom safety.
    words(resp.excerpt + ' ' + q + ' ' + all.join(' ') + ' ' + dist.join(' ')).forEach(function (w) { if (BANNED.indexOf(w) >= 0) e.push('excluded term: ' + w); });

    // Passage length band for the level.
    var n = words(resp.excerpt).length, band = { beginner: [70, 130], intermediate: [90, 170], advanced: [110, 195] }[resp.level];
    if (n < band[0] || n > band[1]) e.push('passage ' + n + ' words outside ' + band.join('-'));
    return e;
  }

  return { response: response, BANNED: BANNED, content: content, stems: stems, overlap: overlap, numbers: numbers };
});
