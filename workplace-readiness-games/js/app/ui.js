/* Workplace Readiness Games - interface rendering.
 * All dynamic text is inserted with textContent, never innerHTML, so authored content can't inject markup.
 * Interaction patterns: radio groups with roving focus and arrow/number keys (choices and find-the-problem),
 * and an ordering list with drag handles plus tap-able Move up / Move down buttons. */
(function (root) {
  'use strict';
  var W = root.WRG, S = W.schema, SESSION = W.session;
  var doc = root.document;

  function h(tag, attrs) {
    var el = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    function add(c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) { c.forEach(add); return; }
      el.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
    }
    for (var i = 2; i < arguments.length; i++) add(arguments[i]);
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function pct(c, n) { return n ? Math.round(100 * c / n) : 0; }
  function announce(msg) { var el = doc.getElementById('sr-status'); if (el) { el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 20); } }

  /* ---------- home options ---------- */

  function option(value, label) { var o = doc.createElement('option'); o.value = value; o.textContent = label; return o; }

  function fillOptions(lib, filters) {
    var skill = doc.getElementById('opt-skill'), mode = doc.getElementById('opt-mode'),
        diff = doc.getElementById('opt-difficulty'), ctx = doc.getElementById('opt-context');
    [skill, mode, diff, ctx].forEach(clear);
    var g = doc.createElement('optgroup'); g.label = 'Mixed practice';
    g.appendChild(option('mixed', 'All 22 skills (mixed practice)')); skill.appendChild(g);
    var gc = doc.createElement('optgroup'); gc.label = 'A skill category';
    Object.keys(S.CATEGORIES).forEach(function (id) { gc.appendChild(option('cat:' + id, S.CATEGORIES[id].label)); });
    skill.appendChild(gc);
    Object.keys(S.CATEGORIES).forEach(function (cid) {
      var gs = doc.createElement('optgroup'); gs.label = S.CATEGORIES[cid].label;
      lib.skills.filter(function (s) { return s.category === cid; }).sort(function (a, b) { return a.number - b.number; })
        .forEach(function (s) { gs.appendChild(option('skill:' + s.id, s.number + '. ' + s.name)); });
      skill.appendChild(gs);
    });
    mode.appendChild(option('mixed', 'Mixed modes'));
    Object.keys(S.MODES).forEach(function (m) { mode.appendChild(option(m, S.MODES[m].label)); });
    diff.appendChild(option('mixed', 'Mixed difficulty'));
    S.DIFFICULTIES.forEach(function (d) { diff.appendChild(option(d, S.DIFFICULTY_LABELS[d])); });
    ctx.appendChild(option('', 'Any setting'));
    Object.keys(S.CONTEXTS).forEach(function (c) { ctx.appendChild(option(c, S.CONTEXTS[c])); });
    var f = filters || {};
    skill.value = f.skills && f.skills.length ? 'skill:' + f.skills[0] : (f.category ? 'cat:' + f.category : 'mixed');
    mode.value = f.modes && f.modes.length ? f.modes[0] : 'mixed';
    diff.value = f.difficulty && f.difficulty !== 'mixed' ? f.difficulty : 'mixed';
    ctx.value = f.context || '';
  }

  function readOptions() {
    var s = doc.getElementById('opt-skill').value, m = doc.getElementById('opt-mode').value,
        d = doc.getElementById('opt-difficulty').value, c = doc.getElementById('opt-context').value;
    var f = { skills: null, category: null, modes: null, difficulty: d || 'mixed', context: c || null };
    if (s.indexOf('skill:') === 0) f.skills = [s.slice(6)];
    else if (s.indexOf('cat:') === 0) f.category = s.slice(4);
    if (m && m !== 'mixed') f.modes = [m];
    return f;
  }

  /* ---------- stat bar ---------- */

  function renderStatbar(tracker) {
    var bar = clear(doc.getElementById('statbar')), s = tracker.data.stats, acc = tracker.accuracy();
    function stat(value, label) { return h('span', { class: 'stat' }, h('b', { text: String(value) }), h('span', { text: label })); }
    bar.appendChild(stat(s.completed, 'done'));
    bar.appendChild(stat(s.correct, 'right first try'));
    bar.appendChild(stat(acc === null ? '–' : pct(s.correct, s.completed) + '%', 'accuracy'));
    bar.appendChild(stat(tracker.formatTime(), 'active time'));
    var dots = h('span', { class: 'dots', role: 'img', 'aria-label': s.recent.length ? 'Last ' + s.recent.length + ' results: ' + s.recent.reduce(function (a, b) { return a + b; }, 0) + ' right' : 'No results yet' });
    s.recent.forEach(function (r) { dots.appendChild(h('span', { class: 'dot ' + (r ? 'ok' : 'miss') })); });
    bar.appendChild(dots);
  }

  /* ---------- radio group (choices and find-the-problem) ---------- */

  function radioGroup(items, opts) {
    var list = h('div', { class: 'choices', role: 'radiogroup', 'aria-labelledby': opts.labelledBy });
    var buttons = [], selected = null, locked = false, onChange = opts.onChange || function () {};
    function select(i, focus) {
      if (locked) return;
      selected = i;
      buttons.forEach(function (b, j) { b.setAttribute('aria-checked', j === i ? 'true' : 'false'); b.tabIndex = (j === i || (i === null && j === 0)) ? 0 : -1; });
      if (focus) buttons[i].focus();
      onChange(items[i].id);
    }
    items.forEach(function (it, i) {
      var kids = [];
      if (opts.letters) kids.push(h('span', { class: 'key', 'aria-hidden': 'true', text: String.fromCharCode(65 + i) }));
      kids.push(h('span', { class: 'label', text: it.text }));
      var b = h('button', { type: 'button', class: 'choice', role: 'radio', 'aria-checked': 'false', tabindex: i === 0 ? '0' : '-1', 'data-id': it.id,
        onclick: function () { select(i, false); },
        onkeydown: function (e) {
          var n = buttons.length, k = e.key, to = null;
          if (k === 'ArrowDown' || k === 'ArrowRight') to = (i + 1) % n;
          else if (k === 'ArrowUp' || k === 'ArrowLeft') to = (i + n - 1) % n;
          else if (/^[1-9]$/.test(k) && +k <= n) to = +k - 1;
          else if (opts.letters && /^[a-d]$/i.test(k) && k.toLowerCase().charCodeAt(0) - 97 < n) to = k.toLowerCase().charCodeAt(0) - 97;
          if (to !== null) { e.preventDefault(); select(to, true); }
        } }, kids);
      buttons.push(b); list.appendChild(b);
    });
    return { el: list, buttons: buttons, selectedId: function () { return selected === null ? null : items[selected].id; },
      lock: function () { locked = true; buttons.forEach(function (b) { b.disabled = true; }); } };
  }

  /* ---------- ordering list ---------- */

  function orderList(steps, onChange) {
    var ol = h('ol', { class: 'steps', 'aria-label': 'Steps to put in order' });
    var byId = {}, locked = false;
    function ids() { return Array.prototype.map.call(ol.children, function (li) { return li.getAttribute('data-id'); }); }
    function refresh() {
      var kids = Array.prototype.slice.call(ol.children);
      kids.forEach(function (li, i) {
        li.querySelector('.up').disabled = locked || i === 0;
        li.querySelector('.down').disabled = locked || i === kids.length - 1;
      });
      onChange(ids());
    }
    function moveTo(li, index, keepFocus) {
      var kids = Array.prototype.slice.call(ol.children), cur = kids.indexOf(li);
      if (index < 0 || index >= kids.length || index === cur) return;
      ol.removeChild(li);
      if (index >= ol.children.length) ol.appendChild(li); else ol.insertBefore(li, ol.children[index]);
      refresh();
      if (keepFocus) keepFocus.focus();
      announce(li.querySelector('.text').textContent + ' moved to position ' + (index + 1) + ' of ' + kids.length);
    }
    steps.forEach(function (s) {
      var li = h('li', { class: 'step', 'data-id': s.id });
      var up = h('button', { type: 'button', class: 'iconbtn up', 'aria-label': 'Move up: ' + s.text, text: '▲' });
      var down = h('button', { type: 'button', class: 'iconbtn down', 'aria-label': 'Move down: ' + s.text, text: '▼' });
      var grip = h('button', { type: 'button', class: 'iconbtn grip', 'aria-label': 'Drag to reorder: ' + s.text + '. Or use the arrow keys.', text: '⋮⋮' });
      up.addEventListener('click', function () { var i = Array.prototype.indexOf.call(ol.children, li); moveTo(li, i - 1, up.disabled ? null : up); });
      down.addEventListener('click', function () { var i = Array.prototype.indexOf.call(ol.children, li); moveTo(li, i + 1, down.disabled ? null : down); });
      grip.addEventListener('keydown', function (e) {
        var i = Array.prototype.indexOf.call(ol.children, li);
        if (e.key === 'ArrowUp') { e.preventDefault(); moveTo(li, i - 1, grip); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); moveTo(li, i + 1, grip); }
      });
      // pointer drag (mouse, touch and pen). Listeners live on the document: moving the row in the DOM
      // releases pointer capture in Chromium, so capture cannot be relied on mid-drag.
      grip.addEventListener('pointerdown', function (e) {
        if (locked) return;
        e.preventDefault();
        li.classList.add('dragging');
        function move(ev) {
          var kids = Array.prototype.slice.call(ol.children).filter(function (k) { return k !== li; }), target = kids.length;
          for (var i = 0; i < kids.length; i++) { var r = kids[i].getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { target = i; break; } }
          var cur = Array.prototype.indexOf.call(ol.children, li);
          if (target !== cur) { ol.removeChild(li); if (target >= ol.children.length) ol.appendChild(li); else ol.insertBefore(li, ol.children[target]); refresh(); }
        }
        function end() {
          li.classList.remove('dragging');
          doc.removeEventListener('pointermove', move); doc.removeEventListener('pointerup', end); doc.removeEventListener('pointercancel', end);
          announce(li.querySelector('.text').textContent + ' is now position ' + (Array.prototype.indexOf.call(ol.children, li) + 1) + ' of ' + ol.children.length);
        }
        doc.addEventListener('pointermove', move); doc.addEventListener('pointerup', end); doc.addEventListener('pointercancel', end);
      });
      li.appendChild(h('span', { class: 'text', text: s.text }));
      li.appendChild(h('span', { class: 'controls' }, grip, up, down));
      byId[s.id] = li; ol.appendChild(li);
    });
    refresh();
    return { el: ol, ids: ids, byId: byId, lock: function () { locked = true; refresh(); Array.prototype.forEach.call(ol.querySelectorAll('button'), function (b) { b.disabled = true; }); } };
  }

  /* ---------- the work ticket ---------- */

  function feedbackBlock(result) {
    var f = result.feedback, box = h('section', { class: 'feedback ' + (result.correct ? 'ok' : 'miss'), 'aria-label': 'Feedback' });
    box.appendChild(h('h3', { tabindex: '-1', id: 'feedback-title', text: f.headline }));
    f.lines.forEach(function (l) {
      if (l.kind === 'principle') box.appendChild(h('p', { class: 'principle' }, h('b', { text: 'Takeaway: ' }), l.text));
      else if (l.kind === 'selected') box.appendChild(h('p', { class: 'you', text: l.text }));
      else if (l.kind === 'note') box.appendChild(h('p', { class: 'fine', text: l.text }));
      else {
        box.appendChild(h('p', { text: l.text }));
        if (l.items) box.appendChild(h('ol', { class: 'example' }, l.items.map(function (t) { return h('li', { text: t }); })));
      }
    });
    return box;
  }

  /* handlers: { check(response) -> result, next() } */
  function renderTicket(slot, c, lib, handlers) {
    clear(slot);
    var skill = lib.skillsById[c.skill], mode = S.MODES[c.mode];
    var ticket = h('article', { class: 'ticket', 'aria-labelledby': 'q' });
    ticket.appendChild(h('p', { class: 'ticket-meta' },
      h('span', { class: 'mode', text: mode.label }), h('span', { text: skill.name }),
      h('span', { text: S.DIFFICULTY_LABELS[c.difficulty] }), h('span', { text: S.CONTEXTS[c.context] })));
    if (c.scenario) ticket.appendChild(h('p', { class: 'scenario', text: c.scenario }));
    var body, getResponse, ready = function () { return true; }, controls = null, checkBtn;
    var question = h('h2', { class: 'question', id: 'q', text: c.prompt });
    function updateReady() { checkBtn.disabled = !ready(); }

    if (c.mode === 'decision' || c.mode === 'nextstep') {
      ticket.appendChild(question);
      var rg = radioGroup(c.options, { labelledBy: 'q', letters: true, onChange: function () { updateReady(); } });
      body = rg.el; controls = rg;
      ready = function () { return rg.selectedId() !== null; };
      getResponse = function () { return { optionId: rg.selectedId() }; };
      ticket.appendChild(body);
    } else if (c.mode === 'find') {
      ticket.appendChild(question);
      var wrap = h('div', { class: 'doc ' + c.doc.type });
      if (c.doc.title) wrap.appendChild(h('p', { class: 'doc-title', text: c.doc.title }));
      var fg = radioGroup(c.doc.segments, { labelledBy: 'q', letters: false, onChange: function () { updateReady(); } });
      wrap.appendChild(fg.el); controls = fg;
      ready = function () { return fg.selectedId() !== null; };
      getResponse = function () { return { segmentId: fg.selectedId() }; };
      ticket.appendChild(wrap);
    } else {
      ticket.appendChild(question);
      var ol = orderList(c.steps, function () {});
      controls = ol;
      getResponse = function () { return { order: ol.ids() }; };
      ticket.appendChild(ol.el);
      ticket.appendChild(h('p', { class: 'hint', text: 'Drag the handle, or use the up and down buttons. Any order that respects the dependencies counts.' }));
    }

    var actions = h('div', { class: 'actions' });
    checkBtn = h('button', { type: 'button', class: 'btn primary', id: 'btn-check', text: c.mode === 'order' ? 'Check order' : 'Check answer' });
    actions.appendChild(checkBtn); ticket.appendChild(actions);
    checkBtn.disabled = !ready();

    checkBtn.addEventListener('click', function () {
      if (checkBtn.disabled) return;
      var resp = getResponse(), result = handlers.check(resp);
      if (!result || !result.ok) return;
      controls.lock();
      reveal(c, result, controls, resp);
      var fb = feedbackBlock(result);
      ticket.insertBefore(fb, actions);
      clear(actions);
      var next = h('button', { type: 'button', class: 'btn primary', id: 'btn-next', text: 'Next challenge', onclick: function () { handlers.next(); } });
      actions.appendChild(next);
      announce(result.feedback.headline + '. ' + result.feedback.lines[0].text);
      var t = doc.getElementById('feedback-title'); if (t) t.focus();
    });
    // Enter on a selected option checks the answer
    ticket.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('role') === 'radio' && !checkBtn.disabled && doc.getElementById('btn-check')) { e.preventDefault(); checkBtn.click(); }
    });
    slot.appendChild(ticket);
    var first = ticket.querySelector('[role="radio"], .grip');
    if (first && handlers.focus !== false) first.focus({ preventScroll: false });
    return ticket;
  }

  function tag(btn, cls, text) {
    btn.classList.add(cls);
    btn.appendChild(h('span', { class: 'tag', text: text }));
  }
  function reveal(c, result, controls, resp) {
    if (c.mode === 'decision' || c.mode === 'nextstep') {
      controls.buttons.forEach(function (b) {
        var id = b.getAttribute('data-id');
        if (id === c.key.bestId) tag(b, 'is-best', 'Best answer');
        else if (id === resp.optionId) tag(b, 'is-mine', 'Your choice');
      });
    } else if (c.mode === 'find') {
      controls.buttons.forEach(function (b) {
        var id = b.getAttribute('data-id');
        if (id === c.key.problemId) tag(b, 'is-best', 'The problem');
        else if (id === resp.segmentId) tag(b, 'is-mine', 'Your choice');
      });
    } else {
      var bad = {}; (result.violations || []).forEach(function (v) { bad[v.before] = bad[v.after] = true; });
      Object.keys(controls.byId).forEach(function (id) { controls.byId[id].classList.add(bad[id] ? 'is-bad' : 'is-ok'); });
    }
  }

  /* ---------- summary ---------- */

  function tile(value, label) { return h('div', { class: 'tile' }, h('b', { text: String(value) }), h('span', { text: label })); }
  function scoreRows(map, order, labelOf) {
    var ul = h('ul', { class: 'rows' });
    order.forEach(function (id) {
      var e = map[id]; if (!e) return;
      var p = pct(e.c, e.n);
      ul.appendChild(h('li', { class: 'row' },
        h('span', { class: 'name', text: labelOf(id) }),
        h('span', { class: 'score', text: e.c + ' of ' + e.n + ' · ' + p + '%' }),
        h('span', { class: 'bar', role: 'img', 'aria-label': p + ' percent' }, h('i', { class: p < 70 ? 'low' : '', style: 'width:' + p + '%' }))));
    });
    return ul;
  }

  /* handlers: { continue(), reset(), practiceSkill(id) } */
  function renderSummary(tracker, lib, handlers) {
    var body = clear(doc.getElementById('summary-body')), st = tracker.data.stats;
    body.appendChild(h('p', { class: 'fine', text: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) + ' · This device only' }));
    if (!st.completed) {
      body.appendChild(h('p', { text: 'No challenges completed yet. Answer a few and your results will appear here.' }));
      body.appendChild(h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn primary', id: 'sum-continue', text: 'Start practice', onclick: handlers.continue })));
      return;
    }
    var acc = pct(st.correct, st.completed);
    body.appendChild(h('div', { class: 'tiles' },
      tile(st.completed, 'challenges completed'), tile(st.firstAttemptCorrect, 'right on the first attempt'),
      tile(st.incorrect, 'missed'), tile(acc + '%', 'overall accuracy'), tile(tracker.formatTime(), 'active practice time')));
    if (st.completed < 10) body.appendChild(h('p', { class: 'fine', text: 'Based on ' + st.completed + ' challenge' + (st.completed === 1 ? '' : 's') + ' so far. Results become more reliable with more practice.' }));

    var weak = tracker.weakSkills();
    var focus = h('div', { class: 'group focus' }, h('h2', { text: 'Areas needing more practice' }));
    if (weak.length) {
      var ul = h('ul');
      weak.slice(0, 5).forEach(function (w) {
        ul.appendChild(h('li', null, h('span', { text: lib.skillsById[w.skill].name + ' (' + w.c + ' of ' + w.n + ')' }),
          h('button', { type: 'button', class: 'btn', 'data-skill': w.skill, text: 'Practice this skill', onclick: function () { handlers.practiceSkill(w.skill); } })));
      });
      focus.appendChild(ul);
    } else {
      focus.appendChild(h('p', { text: st.completed < 5 ? 'Complete a few more challenges to see which skills need attention.' : 'No skill is below 70% yet. Keep mixing skills to find any gaps.' }));
    }
    body.appendChild(focus);

    var skillOrder = lib.skillOrder.filter(function (id) { return st.bySkill[id]; });
    var g1 = h('div', { class: 'group' }, h('h2', { text: 'By Workplace Readiness Skill' }), scoreRows(st.bySkill, skillOrder, function (id) { return lib.skillsById[id].number + '. ' + lib.skillsById[id].name; }));
    var untried = lib.skillOrder.length - skillOrder.length;
    if (untried) g1.appendChild(h('p', { class: 'fine', text: untried + ' of 22 skills not practiced yet in this session.' }));
    body.appendChild(g1);
    body.appendChild(h('div', { class: 'group' }, h('h2', { text: 'By category' }), scoreRows(st.byCategory, Object.keys(S.CATEGORIES), function (id) { return S.CATEGORIES[id].label; })));
    body.appendChild(h('div', { class: 'group' }, h('h2', { text: 'By practice mode' }), scoreRows(st.byMode, Object.keys(S.MODES), function (id) { return S.MODES[id].label; })));

    var confirmSlot = h('div', { id: 'confirm-slot' });
    body.appendChild(h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn primary', id: 'sum-continue', text: 'Continue practice', onclick: handlers.continue }),
      h('button', { type: 'button', class: 'btn quiet', id: 'sum-reset', text: 'Reset session', onclick: function () {
        clear(confirmSlot);
        var yes = h('button', { type: 'button', class: 'btn warn', id: 'reset-yes', text: 'Yes, reset my results', onclick: function () { handlers.reset(); } });
        var no = h('button', { type: 'button', class: 'btn', id: 'reset-no', text: 'Cancel', onclick: function () { clear(confirmSlot); doc.getElementById('sum-reset').focus(); } });
        confirmSlot.appendChild(h('div', { class: 'confirm', role: 'alertdialog', 'aria-labelledby': 'confirm-h' },
          h('h3', { id: 'confirm-h', text: 'Reset this session?' }),
          h('p', { text: 'This clears your results and practice time on this device. It cannot be undone.' }),
          h('div', { class: 'actions' }, yes, no)));
        no.focus();
      } })));
    body.appendChild(confirmSlot);
  }

  W.ui = { h: h, clear: clear, fillOptions: fillOptions, readOptions: readOptions, renderStatbar: renderStatbar,
           renderTicket: renderTicket, renderSummary: renderSummary, announce: announce };
}(typeof self !== 'undefined' ? self : this));
