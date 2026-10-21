/* Workplace Readiness Games - application controller.
 * Wires the generator, grader, session tracker, storage and UI together. */
(function (root) {
  'use strict';
  var W = root.WRG, doc = root.document, UI = W.ui, G = W.generator, GR = W.grader;
  var lib = W.library.create(W.content);
  var libCheck = W.validator.validateLibrary(lib);
  if (!libCheck.ok && root.console) root.console.error('Content library has errors:', libCheck.errors.slice(0, 5));

  var backend = null;
  try { backend = root.localStorage; } catch (e) { backend = null; }
  var store = W.storage.create(backend);
  var tracker = W.session.create(store.load());
  var gen = null, current = null, route = '';

  function makeSeed() {
    try {
      var a = new Uint32Array(2); root.crypto.getRandomValues(a);
      return a[0].toString(36) + a[1].toString(36);
    } catch (e) { return String(Date.now()) + Math.floor(Math.random() * 1e9).toString(36); }
  }
  function sameFilters(a, b) { return JSON.stringify(a || {}) === JSON.stringify(b || {}); }
  function save() { store.save(tracker.data); }

  /* Create (or resume) the challenge stream for the given filters. */
  function openStream(filters, fresh) {
    var d = tracker.data;
    var resume = !fresh && d.seed && sameFilters(d.filters, filters);
    var seed = resume ? d.seed : makeSeed();
    gen = G.createSession(lib, { seed: seed, filters: filters });
    var skip = resume ? d.index : 0;
    for (var i = 0; i < skip; i++) gen.next();
    d.seed = seed; d.filters = filters; d.index = skip;
    save();
  }

  function showNext() {
    try { current = gen.next(); }
    catch (e) { UI.clear(doc.getElementById('ticket-slot')).appendChild(UI.h('p', { class: 'notice', text: 'Could not build a challenge for these choices. Go back and try mixing modes or difficulty.' })); return; }
    UI.renderStatbar(tracker);
    UI.renderTicket(doc.getElementById('ticket-slot'), current, lib, {
      check: function (resp) {
        tracker.touch();
        var result = GR.grade(current, resp);
        if (result.ok) {
          tracker.record({ skill: current.skill, category: current.category, mode: current.mode, difficulty: current.difficulty }, result.correct);
          tracker.data.index = gen.index;
          save(); UI.renderStatbar(tracker);
        }
        return result;
      },
      next: function () { showNext(); }
    });
  }

  function startPractice(filters, fresh) {
    openStream(filters, fresh);
    go('#/practice', true);
  }

  /* ---------- routing ---------- */

  var views = { home: 'view-home', practice: 'view-practice', summary: 'view-summary' };
  function setView(name) {
    Object.keys(views).forEach(function (k) { doc.getElementById(views[k]).hidden = (k !== name); });
    doc.getElementById('nav-practice').toggleAttribute('aria-current', name === 'practice');
    doc.getElementById('nav-summary').toggleAttribute('aria-current', name === 'summary');
    ['nav-practice', 'nav-summary'].forEach(function (id) { var a = doc.getElementById(id); if (a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'page'); });
    var titles = { home: 'Workplace Readiness Games', practice: 'Practice · Workplace Readiness Games', summary: 'Session summary · Workplace Readiness Games' };
    doc.title = titles[name];
  }
  function go(hash, force) {
    if (root.location.hash === hash && !force) { render(); return; }
    root.location.hash = hash;
    if (force) render();
  }

  function refreshHome() {
    var has = tracker.data.stats.completed > 0 || tracker.data.index > 0;
    doc.getElementById('btn-continue').hidden = !(tracker.data.seed && tracker.data.index > 0);
    doc.getElementById('btn-home-summary').hidden = !has;
    checkOptions();
  }
  function checkOptions() {
    var f = UI.readOptions(), eligible = G.eligibleTemplates(lib, f), n = eligible.length;
    var note = doc.getElementById('options-note'), start = doc.getElementById('btn-start');
    if (!n) { note.textContent = 'No challenges match these choices. Try mixed modes or difficulty.'; start.disabled = true; }
    else {
      var patterns = new Set(eligible.map(function (t) { return t.family + ':' + t.pattern; })).size;
      note.textContent = patterns < 20
        ? n + ' authored challenges across ' + patterns + ' distinct reasoning patterns. This selection will repeat underlying ideas during a 20-question session; broaden the skill, mode, difficulty, or setting filters for more variety.'
        : n + ' authored challenges across ' + patterns + ' distinct reasoning patterns. The generator spaces those patterns across the first 20 questions when possible.';
      start.disabled = false;
    }
    return n;
  }

  function render() {
    var r = (root.location.hash || '#/').replace(/^#/, '') || '/';
    if (r === '/practice') {
      if (!gen) { var f = tracker.data.filters && tracker.data.seed ? tracker.data.filters : UI.readOptions(); openStream(f, false); }
      setView('practice');
      if (route !== '/practice' || !current) showNext();
      var q = doc.querySelector('#ticket-slot [role="radio"], #ticket-slot .grip'); if (q) q.focus();
    } else if (r === '/summary') {
      setView('summary');
      UI.renderSummary(tracker, lib, {
        continue: function () { if (tracker.data.seed) { go('#/practice'); } else { go('#/'); } },
        reset: function () { tracker.reset(null); store.clear(); gen = null; current = null; save(); go('#/', true); },
        practiceSkill: function (id) { startPractice({ skills: [id], category: null, modes: null, difficulty: 'mixed', context: null }, true); }
      });
      doc.getElementById('summary-title').focus();
    } else {
      setView('home'); refreshHome(); doc.getElementById('home-title').focus({ preventScroll: true });
    }
    route = r;
    root.scrollTo && root.scrollTo(0, 0);
  }

  function init() {
    UI.fillOptions(lib, tracker.data.filters);
    ['opt-skill', 'opt-mode', 'opt-difficulty', 'opt-context'].forEach(function (id) { doc.getElementById(id).addEventListener('change', checkOptions); });
    doc.getElementById('btn-start').addEventListener('click', function () {
      if (!checkOptions()) return;
      var f = UI.readOptions(); startPractice(f, false);
    });
    doc.getElementById('btn-continue').addEventListener('click', function () { startPractice(tracker.data.filters, false); });
    doc.getElementById('btn-home-summary').addEventListener('click', function () { go('#/summary'); });
    root.addEventListener('hashchange', render);
    ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) { root.addEventListener(ev, function () { tracker.touch(); }, { passive: true, capture: true }); });
    var ticks = 0;
    root.setInterval(function () {
      tracker.tick(!doc.hidden);
      if (++ticks % 5 === 0) save();
      if (route === '/practice' && doc.getElementById('statbar')) UI.renderStatbar(tracker);
    }, 1000);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) save(); });
    root.addEventListener('pagehide', save);
    render();
  }

  W.app = { lib: lib, tracker: tracker, store: store, startPractice: startPractice, state: function () { return { current: current, gen: gen, route: route }; } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
}(typeof self !== 'undefined' ? self : this));
