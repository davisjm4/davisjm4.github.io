/* App shell: routing, challenge lifecycle, grading, feedback, and session tracking. */
(function (root) {
  'use strict';
  var R = root.RACECES, el = R.dom.el, announce = R.dom.announce, S = R.Structure;
  var PREF_KEY = 'raceces-writing-games:v2:settings';

  // Hosted production must never look healthy while silently using the smaller authored
  // catalogue. Local file-based development may still run the legacy authored-only build.
  var hosted = root.location && (root.location.protocol === 'http:' || root.location.protocol === 'https:');
  var composeReady = R.COMPOSE_LIBRARY && Array.isArray(R.COMPOSE_LIBRARY.kits) &&
    R.Compose && typeof R.Compose.index === 'function' && R.Grammar && R.Phrases &&
    R.ComposeCheck && R.StructuresDesign && R.StructuresProcess && R.StructuresObservation;
  if (hosted && !composeReady) {
    var main = document.getElementById('main');
    var stage = document.getElementById('stage');
    var toolbar = document.getElementById('toolbar');
    if (toolbar) toolbar.hidden = true;
    if (stage) {
      stage.textContent = '';
      var panel = document.createElement('section');
      panel.className = 'panel empty-state';
      var title = document.createElement('h2');
      title.textContent = 'Writing practice could not start.';
      var message = document.createElement('p');
      message.setAttribute('role', 'alert');
      message.textContent = 'The required compositional writing assets did not load. Refresh the page or try again later.';
      panel.appendChild(title); panel.appendChild(message); stage.appendChild(panel);
    }
    if (main) main.setAttribute('aria-busy', 'false');
    return;
  }

  var store = null;
  try { store = root.localStorage; store.setItem('__t', '1'); store.removeItem('__t'); } catch (e) { store = null; }

  var session = new R.Session.Session(store);
  var params = new URLSearchParams(root.location.search);
  var seed = params.get('seed') || ('s' + session.data.started);
  var gen = new R.Generator.Generator(R.CONTENT, seed, { compose: R.COMPOSE_LIBRARY || null });
  gen.n = session.data.totals.done;
  gen.restore(session.getRecent(), session.getSeenModels());
  var timer = new R.Session.ActiveTimer();

  var stage = document.getElementById('stage');
  var toolbar = document.getElementById('toolbar');
  var validLevels = ['all', 'beginner', 'intermediate', 'advanced'];
  var level = 'all', subject = 'all', topicIds = [];
  var subjects = R.CONTENT.subjects.slice();
  var topicById = {};
  R.CONTENT.topics.forEach(function (t) { topicById[t.id] = t; });
  try {
    var p = JSON.parse(store.getItem(PREF_KEY));
    if (!p) p = JSON.parse(store.getItem('raceces-writing-games:v1:prefs'));
    if (p && validLevels.indexOf(p.level) >= 0) level = p.level;
    if (p && subjects.indexOf(p.subject) >= 0) subject = p.subject;
    if (p && Array.isArray(p.topics)) topicIds = p.topics.filter(function (id) { return !!topicById[id]; });
  } catch (e) { /* default */ }
  // Explicit URL settings take precedence over preferences saved on this device.
  if (params.has('level') && validLevels.indexOf(params.get('level')) >= 0) level = params.get('level');
  if (params.has('subject')) subject = params.get('subject') === 'all' || subjects.indexOf(params.get('subject')) >= 0 ? params.get('subject') : 'all';
  if (params.has('topics')) topicIds = params.get('topics').split(',').filter(function (id) { return !!topicById[id]; });
  else if (params.has('subject') && !params.has('topics')) topicIds = [];
  if (subject !== 'all') topicIds = topicIds.filter(function (id) { return topicById[id] && topicById[id].subject === subject; });
  gen.setSelection({ subject: subject, topics: topicIds });
  var currentRoute = null, currentByRoute = {}, ctrl = null, current = null, graded = false;

  var subjectSelect = document.getElementById('subject-select');
  var topicOptions = document.getElementById('topic-options');
  var focusStatus = document.getElementById('focus-status');
  var shareStatus = document.getElementById('share-status');
  var shareButton = document.getElementById('share-focus');

  function savePreferences() {
    try { store.setItem(PREF_KEY, JSON.stringify({ level: level, subject: subject, topics: topicIds })); } catch (e) { /* storage unavailable */ }
  }
  function currentSelection() { return { subject: subject, topics: topicIds.length ? topicIds.slice() : null }; }
  function selectedTopics() {
    if (topicIds.length) return topicIds.map(function (id) { return topicById[id].title; });
    if (subject !== 'all') return R.CONTENT.topics.filter(function (t) { return t.subject === subject; }).map(function (t) { return t.title; });
    return [];
  }
  function focusLabel() {
    var chosen = selectedTopics();
    if (!chosen.length) return 'All topics';
    if (chosen.length <= 2) return chosen.join(' + ');
    return chosen.length + ' selected topics';
  }
  function populateSubjectSelect() {
    subjectSelect.textContent = '';
    [['all', 'All subjects']].concat(subjects.map(function (s) { return [s, s]; })).forEach(function (pair) {
      subjectSelect.appendChild(el('option', { value: pair[0], text: pair[1] }));
    });
    subjectSelect.value = subject;
  }
  function renderTopicOptions() {
    topicOptions.textContent = '';
    var visible = R.CONTENT.topics.filter(function (t) { return subject === 'all' || t.subject === subject; });
    visible.forEach(function (t) {
      var selected = topicIds.indexOf(t.id) >= 0;
      var counts = gen.availability({ subject: t.subject, topics: [t.id] });
      var count = R.Structure.LEVELS.map(function (l) { return R.Structure.LEVEL_LABEL[l].charAt(0) + ':' + counts[l]; }).join(' / ');
      var cb = el('input', { type: 'checkbox', value: t.id, checked: selected, 'aria-label': t.title + ', ' + count + ' distinct writing problems by level' });
      var label = el('label', { class: 'topic-option' }, [cb, el('span', { class: 'topic-name', text: t.title }), el('small', { class: 'topic-count', text: count })]);
      topicOptions.appendChild(label);
    });
    var generatedCount = gen.catalog.length - R.CONTENT.models.length;
    focusStatus.textContent = focusLabel() + ' selected. ' + R.CONTENT.models.length + ' authored writing models' +
      (generatedCount > 0 ? ' and ' + generatedCount + ' generated writing problems' : '') + ' in the library.';
    subjectSelect.value = subject;
    var availableForSelection = gen.availability(currentSelection());
    if (level !== 'all' && !availableForSelection[level]) {
      level = 'all'; savePreferences();
      focusStatus.textContent += ' The selected difficulty has no models in this focus, so All Levels is selected.';
    }
    Array.prototype.forEach.call(toolbar.querySelectorAll('input[name=level]'), function (radio) {
      var available = radio.value === 'all' ? R.Structure.LEVELS.some(function (l) { return gen.availability(currentSelection())[l] > 0; }) : gen.availability(currentSelection())[radio.value] > 0;
      radio.disabled = !available;
      var label = radio.parentNode;
      label.setAttribute('aria-disabled', available ? 'false' : 'true');
    });
  }
  function saveAndRefresh() {
    gen.setSelection(currentSelection());
    savePreferences(); renderTopicOptions(); currentByRoute = {};
    if (currentRoute && currentRoute !== 'summary') newChallenge(currentRoute);
  }
  function resetAllTopics() {
    subject = 'all'; topicIds = []; saveAndRefresh();
  }

  populateSubjectSelect(); renderTopicOptions(); savePreferences();

  subjectSelect.addEventListener('change', function () {
    subject = subjectSelect.value;
    topicIds = [];
    saveAndRefresh();
  });
  topicOptions.addEventListener('change', function (e) {
    if (!e.target || e.target.type !== 'checkbox') return;
    var id = e.target.value;
    if (e.target.checked && topicIds.indexOf(id) < 0) topicIds.push(id);
    if (!e.target.checked) topicIds = topicIds.filter(function (x) { return x !== id; });
    topicIds.sort(); saveAndRefresh();
  });
  document.getElementById('all-topics').addEventListener('click', resetAllTopics);

  function copyText(text) {
    function fallbackCopy() { return new Promise(function (resolve, reject) {
      var ta = el('textarea', { value: text, class: 'sr-only', 'aria-hidden': 'true' });
      ta.value = text;
      document.body.appendChild(ta); ta.select();
      try { if (document.execCommand('copy')) resolve(); else reject(new Error('Copy unavailable')); }
      catch (e) { reject(e); }
      document.body.removeChild(ta);
    }); }
    if (root.navigator.clipboard && root.navigator.clipboard.writeText) {
      return root.navigator.clipboard.writeText(text).catch(fallbackCopy);
    }
    return fallbackCopy();
  }
  shareButton.addEventListener('click', function () {
    var url = new URL(root.location.href);
    url.searchParams.set('subject', subject);
    url.searchParams.set('topics', topicIds.slice().sort().join(','));
    url.searchParams.set('level', level);
    if (!params.has('seed')) url.searchParams.delete('seed');
    url.hash = '#/' + (currentRoute === 'summary' || !currentRoute ? 'mixed' : currentRoute);
    copyText(url.toString()).then(function () { shareStatus.textContent = 'Activity link copied. It contains only practice settings.'; })
      .catch(function () { shareStatus.textContent = 'Copy was blocked. You can copy this link from the address bar after applying the settings.'; });
  });

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
    savePreferences();
    if (currentRoute !== 'summary') newChallenge(currentRoute);
  });

  function newChallenge(route) {
    var ch;
    try { ch = gen.next({ mode: route, level: level, subject: subject, topics: topicIds }); }
    catch (err) {
      current = null; currentByRoute[route] = null; stage.textContent = '';
      stage.appendChild(el('section', { class: 'panel empty-state' }, [
        el('h2', { text: 'No writing problems match this selection yet.' }),
        el('p', { text: err.message }),
        el('button', { type: 'button', class: 'btn secondary', text: 'Reset to All Topics', onclick: resetAllTopics })
      ]));
      return;
    }
    session.setRecent(gen.history, gen.getSeenModels());
    currentByRoute[route] = { ch: ch, graded: false };
    showChallenge(route);
  }

  function showChallenge(route) {
    var entry = currentByRoute[route];
    current = entry.ch; graded = entry.graded;
    stage.textContent = '';
    var ch = current;

    var contentLabel = (subject === 'all' ? '' : subject + ' · ') + focusLabel();
    var chips = el('div', { class: 'chips' }, [el('span', { text: S.MODE_LABEL[ch.mode] }), el('span', { text: S.LEVEL_LABEL[ch.level] }), el('span', { text: 'Content focus: ' + contentLabel }), el('span', { text: ch.title })]);
    var poolMessage = ch.pool && ch.pool.review
      ? 'Review practice: all ' + ch.pool.models + ' distinct writing problems in this selection have been used. You may continue reviewing or broaden the topic selection.'
      : 'New writing problem from a pool of ' + (ch.pool ? ch.pool.models : '?') + ' distinct writing problems in this selection.';
    var poolNote = el('p', { class: ch.pool && ch.pool.review ? 'pool-note review' : 'pool-note', text: poolMessage });
    if (ch.pool && ch.pool.review && (subject !== 'all' || topicIds.length)) {
      poolNote.appendChild(document.createTextNode(' '));
      poolNote.appendChild(el('button', { type: 'button', class: 'text-btn', text: 'Broaden to All Topics', onclick: resetAllTopics }));
    }
    var left = el('div', { class: 'source-col' }, [
      chips, poolNote,
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
        gen.history = []; gen.seenModels = []; gen.n = 0; currentByRoute = {};
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
    if (e === null) { newChallenge(r); return; }
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
