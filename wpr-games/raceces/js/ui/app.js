/* App shell: routing, challenge lifecycle, grading, feedback, and session tracking. */
(function (root) {
  'use strict';
  var R = root.RACECES, el = R.dom.el, announce = R.dom.announce, S = R.Structure;
  var PREF_KEY = 'raceces-writing-games:v1:prefs';

  var store = null;
  try { store = root.localStorage; store.setItem('__t', '1'); store.removeItem('__t'); } catch (e) { store = null; }

  var session = new R.Session.Session(store);
  var params = new URLSearchParams(root.location.search);
  var seed = params.get('seed') || ('s' + session.data.started);
  var gen = new R.Generator.Generator(R.CONTENT, seed);
  gen.n = session.data.totals.done;
  gen.restore(session.getRecent());
  var timer = new R.Session.ActiveTimer();

  var stage = document.getElementById('stage');
  var toolbar = document.getElementById('toolbar');
  var level = 'all';
  try { var p = JSON.parse(store.getItem(PREF_KEY)); if (p && ['all', 'beginner', 'intermediate', 'advanced'].indexOf(p.level) >= 0) level = p.level; } catch (e) { /* default */ }
  var currentRoute = null, currentByRoute = {}, ctrl = null, current = null, graded = false;

  ['pointerdown', 'keydown', 'touchstart', 'input'].forEach(function (ev) { document.addEventListener(ev, function () { timer.touch(); }, { passive: true }); });
  document.addEventListener('visibilitychange', function () { timer.setVisible(document.visibilityState === 'visible'); });

  function routeFromHash() {
    var h = (root.location.hash || '').replace(/^#\/?/, '');
    return ['mixed', 'identify', 'rearrange', 'missing', 'summary'].indexOf(h) >= 0 ? h : 'mixed';
  }

  function setNav(route) {
    Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) {
      if (a.getAttribute('data-route') === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function syncLevelRadios() {
    Array.prototype.forEach.call(toolbar.querySelectorAll('input[name=level]'), function (r) { r.checked = r.value === level; });
  }
  toolbar.addEventListener('change', function (e) {
    if (e.target.name !== 'level') return;
    level = e.target.value;
    try { store.setItem(PREF_KEY, JSON.stringify({ level: level })); } catch (err) { /* ignore */ }
    if (currentRoute !== 'summary') newChallenge(currentRoute);
  });

  function newChallenge(route) {
    var ch = gen.next({ mode: route, level: level });
    session.setRecent(gen.history);
    currentByRoute[route] = { ch: ch, graded: false };
    showChallenge(route);
  }

  function showChallenge(route) {
    var entry = currentByRoute[route];
    current = entry.ch; graded = entry.graded;
    stage.textContent = '';
    var ch = current;

    var chips = el('div', { class: 'chips' }, [el('span', { text: S.MODE_LABEL[ch.mode] }), el('span', { text: S.LEVEL_LABEL[ch.level] }), el('span', { text: ch.subject })]);
    var left = el('div', { class: 'source-col' }, [
      chips,
      el('section', { class: 'panel', 'aria-labelledby': 'src-h' }, [el('h2', { id: 'src-h', text: 'Source' }), el('p', { class: 'passage', text: ch.excerpt })]),
      el('section', { class: 'panel', 'aria-labelledby': 'q-h' }, [el('h2', { id: 'q-h', text: 'Writing question' }), el('p', { class: 'question', text: ch.question })])
    ]);
    var work = el('div', { class: 'panel work', 'aria-label': 'Task' });
    var checkBtn = el('button', { type: 'button', class: 'btn', id: 'check-btn', disabled: true }, ['Check Answer']);
    var nextBtn = el('button', { type: 'button', class: 'btn', id: 'next-btn', hidden: true }, ['Next Challenge']);
    var actions = el('div', { class: 'actions sticky' }, [checkBtn, nextBtn]);
    var fbHost = el('div', { id: 'fb-host' });
    var right = el('div', { class: 'work-col' }, [work, actions, fbHost]);
    stage.appendChild(el('article', { class: 'task' }, [left, right]));

    var api = { changed: function () { if (!graded) checkBtn.disabled = !ctrl.hasAnswer(); } };
    var ui = ch.mode === 'identify' ? R.identifyUI : ch.mode === 'rearrange' ? R.rearrangeUI : R.missingUI;
    ctrl = ui.mount(work, ch, api);
    timer.start();
    if (!entry.graded) checkBtn.disabled = !ctrl.hasAnswer();
    else checkBtn.disabled = true;

    checkBtn.addEventListener('click', function () {
      if (graded) return;
      var answer = ctrl.getAnswer();
      var result = R.Generator.grade(ch, answer);
      graded = true; entry.graded = true;
      session.record({ mode: ch.mode, level: ch.level, role: result.role, correct: result.correct, ms: timer.elapsed(), category: result.category, modelId: ch.modelId, family: ch.family });
      var extra = ctrl.reveal(result);
      checkBtn.hidden = true; nextBtn.hidden = false;
      renderFeedback(fbHost, result.feedback, extra);
      announce((result.correct ? 'Correct. ' : 'Not quite. ') + result.feedback.notes.join(' '));
      var fb = fbHost.firstChild; if (fb) fb.focus();
    });
    nextBtn.addEventListener('click', function () { newChallenge(route); window.scrollTo(0, 0); var w = stage.querySelector('.sent, .opt input'); });
  }

  function renderFeedback(host, fb, extra) {
    host.textContent = '';
    var box = el('section', { class: 'feedback ' + (fb.correct ? 'ok' : 'no'), tabindex: '-1', 'aria-labelledby': 'fb-h' }, [
      el('h3', { id: 'fb-h', text: fb.headline })
    ]);
    fb.notes.forEach(function (n) { box.appendChild(el('p', { text: n })); });
    if (extra) box.appendChild(extra);
    box.appendChild(el('p', { class: 'principle', text: fb.principle }));
    host.appendChild(box);
  }

  function renderSummary() {
    stage.textContent = '';
    R.summaryUI.render(stage, session, {
      start: function () { root.location.hash = '#/mixed'; },
      reset: function () {
        session.reset();
        gen.history = []; gen.n = 0; currentByRoute = {};
        renderSummary(); announce('Session reset.');
        var h = stage.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
      }
    });
  }

  function route() {
    var r = routeFromHash();
    currentRoute = r;
    setNav(r);
    if (r === 'summary') { toolbar.hidden = true; renderSummary(); return; }
    toolbar.hidden = false; syncLevelRadios();
    var e = currentByRoute[r];
    if (e && !e.graded) showChallenge(r); else newChallenge(r);
  }
  root.addEventListener('hashchange', function () { route(); var m = document.getElementById('main'); m.focus(); });

  R.app = {
    current: function () { return current; },
    session: session, generator: gen, seed: seed,
    isGraded: function () { return graded; }
  };
  route();
})(typeof self !== 'undefined' ? self : this);
