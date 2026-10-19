/* UI + movement controls for Class Builder: Rearrange.
   Movement: (1) pointer drag (mouse/pen anywhere on a piece, touch from the grip), (2) tap/click to pick up,
   then tap/click a "Place here" slot, (3) keyboard: Enter/Space to pick up, Arrow keys to choose a slot, Enter to place. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./generator.js'), require('./arrangement.js'), require('./validator.js'), require('./java-model.js'), require('./feedback.js'), require('./session.js'));
  else { var C = root.CBR = root.CBR || {}; C.ui = factory(C.generator, C.arrangement, C.validator, C.javaModel, C.feedback, C.session); }
})(typeof self !== 'undefined' ? self : this, function (Gen, A, V, jm, FB, Session) {
  'use strict';

  var SECTION_TITLES = ['Instance Variables', 'Constructor', 'Methods'];

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v === false || v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }

  /* ---------- tiny Java highlighter (DOM nodes only, no innerHTML) ---------- */
  var TOKEN = /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)')|\b(public|private|void|return|this|class|new)\b|\b(String|int|double|boolean|char)\b/g;
  function highlight(text) {
    var frag = document.createDocumentFragment(), last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var cls = m[1] || m[2] ? 'cbr-str' : m[3] ? 'cbr-kw' : 'cbr-ty';
      var span = h('span', { class: cls });
      if (m[1] || m[2]) {
        m[0].split(/(\\.)/).forEach(function (part) {
          if (!part) return;
          if (/^\\./.test(part)) span.appendChild(h('span', { class: 'cbr-esc', text: part }));
          else span.appendChild(document.createTextNode(part));
        });
      } else span.textContent = m[0];
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }
  function codeLine(text, cls) { var d = h('div', { class: 'cbr-line' + (cls ? ' ' + cls : '') }); d.appendChild(highlight(text)); return d; }
  function fixedLine(text, cls) { var d = h('div', { class: 'cbr-fixed ' + (cls || '') }); d.appendChild(highlight(text)); return d; }

  function mount(container, options) {
    options = options || {};
    var generator = Gen.createGenerator({ seed: options.seed });
    var tracker = new Session.Tracker({ storage: options.storage, adapter: options.adapter, storageKey: options.storageKey });
    var state = null;
    var drag = null, suppressClick = false;

    /* ---------- skeleton ---------- */
    var els = {};
    container.classList.add('cbr');
    container.textContent = '';
    els.levels = h('div', { class: 'cbr-levels', role: 'group', 'aria-label': 'Difficulty' });
    Object.keys(Gen.DIFFICULTIES).forEach(function (key) {
      var d = Gen.DIFFICULTIES[key];
      var b = h('button', { type: 'button', class: 'cbr-level', 'data-level': key, text: d.label + ' · ' + d.fields + (d.fields === 1 ? ' field' : ' fields') });
      b.addEventListener('click', function () { setDifficulty(key); });
      els.levels.appendChild(b);
    });
    els.stats = h('div', { class: 'cbr-stats', 'aria-label': 'Session so far' });
    els.task = h('p', { class: 'cbr-task' });
    els.moveBar = h('div', { class: 'cbr-movebar', role: 'status' });
    els.editor = h('div', { class: 'cbr-editor', role: 'group', 'aria-label': 'Java class editor' });
    els.btn = {};
    var actions = h('div', { class: 'cbr-actions' });
    [['check', 'Check', 'primary'], ['hint', 'Hint'], ['undo', 'Undo'], ['reset', 'Reset'], ['reveal', 'Show answer'], ['next', 'Next challenge']].forEach(function (a) {
      var b = h('button', { type: 'button', class: 'cbr-btn' + (a[2] ? ' cbr-' + a[2] : ''), 'data-action': a[0], text: a[1] });
      b.addEventListener('click', function () { actionsMap[a[0]](); });
      els.btn[a[0]] = b; actions.appendChild(b);
    });
    els.confirm = h('div', { class: 'cbr-confirm', hidden: true, role: 'alertdialog', 'aria-label': 'Confirm showing the answer' });
    els.feedback = h('div', { class: 'cbr-feedback', 'aria-live': 'polite' });
    els.result = h('div', { class: 'cbr-result', hidden: true });
    els.live = h('div', { class: 'cbr-sr', 'aria-live': 'assertive' });
    var top = h('div', { class: 'cbr-top' }, [h('div', { class: 'cbr-titlebar' }, [h('h2', { class: 'cbr-title', text: 'Class Builder: Rearrange' }), els.stats]), els.levels]);
    [top, els.task, els.moveBar, els.editor, actions, els.confirm, els.feedback, els.result, els.live].forEach(function (n) { container.appendChild(n); });

    /* ---------- helpers ---------- */
    function announce(msg) { els.live.textContent = ''; setTimeout(function () { els.live.textContent = msg; }, 20); }
    function playing() { return state.status === 'playing'; }
    function describe(item) {
      if (item.body === undefined && item.kind === 'field') return 'declaration of ' + item.field;
      if (item.kind === 'ctor') return 'constructor';
      if (item.kind === 'getter' || item.kind === 'setter' || item.kind === 'tostring') return FB.methodName(item);
      return 'statement ' + item.lines[0].trim();
    }
    function selectedItem() {
      if (!state.selected) return null;
      if (state.selected.type === 'block') { var b = A.findBlock(state.arr, state.selected.id); return b && b.block; }
      var s = A.findStmt(state.arr, state.selected.id); return s && s.stmt;
    }
    function push() { state.undo.push(A.clone(state.arr)); if (state.undo.length > 60) state.undo.shift(); }

    /* ---------- challenge lifecycle ---------- */
    function newChallenge(difficulty, seed) {
      var ch = seed != null ? Gen.generateChallenge(seed, difficulty) : generator.next(difficulty);
      state = { challenge: ch, arr: A.clone(ch.initial), undo: [], selected: null, status: 'playing', hintLevel: 0, flagged: [], feedback: null, checks: 0, focusId: null, revealedConfirm: false, difficulty: difficulty };
      tracker.beginChallenge(ch);
      els.result.hidden = true; els.confirm.hidden = true;
      render();
      announce('New ' + Gen.DIFFICULTIES[difficulty].label + ' challenge: the ' + ch.model.className + ' class.');
    }
    function setDifficulty(key) {
      if (state && key === state.difficulty) return;
      if (state && state.status === 'playing') tracker.recordSkip();
      newChallenge(key);
    }

    /* ---------- actions ---------- */
    var actionsMap = {
      check: function () {
        if (!playing()) return;
        var res = V.validate(state.arr, state.challenge.model);
        state.selected = null; state.checks++;
        var outcome = tracker.recordCheck(res.solved);
        if (res.solved) {
          state.status = 'solved'; state.outcome = outcome; state.flagged = [];
          state.feedback = { kind: 'ok', text: outcome === 'first' ? 'Correct on the first check. Every piece is in the right place.' : 'Correct after ' + state.checks + ' checks. Every piece is in the right place.' };
          announce(state.feedback.text);
        } else {
          state.flagged = res.primary.ids || [];
          var p = res.placement, inPlace = p.blocksPlaced + p.stmtsPlaced, total = p.blocksTotal + p.stmtsTotal;
          state.feedback = { kind: 'bad', text: FB.messageFor(res.primary), progress: inPlace + ' of ' + total + ' pieces are in an acceptable place.' };
          announce(state.feedback.text);
        }
        render();
      },
      hint: function () {
        if (!playing()) return;
        var res = V.validate(state.arr, state.challenge.model);
        state.hintLevel = Math.min(2, state.hintLevel + 1);
        tracker.recordHint();
        state.feedback = { kind: 'hint', text: FB.hintFor(res.primary, state.hintLevel, function (id) { var l = A.findBlock(state.arr, id); return l && l.block; }), more: state.hintLevel < 2 };
        render(); announce(state.feedback.text);
      },
      undo: function () {
        if (!playing() || !state.undo.length) return;
        state.arr = state.undo.pop(); state.selected = null; state.flagged = []; render(); announce('Undid the last move.');
      },
      reset: function () {
        if (!playing()) return;
        push(); state.arr = A.clone(state.challenge.initial); state.selected = null; state.flagged = []; state.feedback = { kind: 'info', text: 'Challenge reset to its starting layout.' };
        render(); announce('Challenge reset.');
      },
      reveal: function () {
        if (!playing()) return;
        showConfirm();
      },
      next: function () {
        if (playing()) tracker.recordSkip();
        newChallenge(state.difficulty);
        container.scrollIntoView && container.scrollIntoView({ block: 'start', behavior: 'auto' });
      }
    };
    function showConfirm() {
      els.confirm.hidden = false; els.confirm.textContent = '';
      var yes = h('button', { type: 'button', class: 'cbr-btn cbr-danger', 'data-action': 'reveal-confirm', text: 'Show the answer' });
      var no = h('button', { type: 'button', class: 'cbr-btn', 'data-action': 'reveal-cancel', text: 'Keep working' });
      yes.addEventListener('click', function () {
        els.confirm.hidden = true;
        tracker.recordReveal();
        state.arr = A.clone(state.challenge.canonical); state.selected = null; state.flagged = []; state.status = 'revealed';
        state.feedback = { kind: 'revealed', text: 'Answer revealed. This challenge is recorded as revealed, not as solved on your own.' };
        render(); announce(state.feedback.text);
      });
      no.addEventListener('click', function () { els.confirm.hidden = true; els.btn.reveal.focus(); });
      els.confirm.appendChild(h('p', { text: 'Showing the answer ends this challenge. It will be recorded as revealed rather than solved on your own.' }));
      els.confirm.appendChild(h('div', { class: 'cbr-confirm-row' }, [yes, no]));
      no.focus();
    }

    /* ---------- rendering ---------- */
    function render() {
      var ch = state.challenge, m = ch.model;
      els.levels.querySelectorAll('.cbr-level').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-level') === state.difficulty)); });
      els.task.textContent = 'Every piece of the ' + m.className + ' class is already in the editor, but several are in the wrong place. Rearrange them into the right sections and method bodies.';
      renderStats();
      renderMoveBar();
      renderEditor();
      renderButtons();
      renderFeedback();
      renderResult();
      if (state.focusId) {
        var f = els.editor.querySelector('[data-id="' + state.focusId + '"]');
        if (f) f.focus({ preventScroll: false });
        state.focusId = null;
      }
    }
    function fmtTime(sec) { var mm = Math.floor(sec / 60), ss = sec % 60; return mm + ':' + (ss < 10 ? '0' : '') + ss; }
    function renderStats() {
      var s = tracker.summary();
      els.stats.textContent = '';
      [['Attempted', s.attempted, 'attempted'], ['First check', s.firstAttemptCorrect, 'first'], ['After retries', s.correctAfterRetries, 'retry'], ['Revealed', s.revealed, 'revealed'], ['Skipped', s.skipped, 'skipped'], ['Checks', s.checks, 'checks'], ['Time', fmtTime(s.activeSeconds), 'time']].forEach(function (p) {
        els.stats.appendChild(h('span', { class: 'cbr-stat', 'data-stat': p[2] }, [h('b', { text: String(p[1]) }), ' ' + p[0]]));
      });
    }
    function renderMoveBar() {
      els.moveBar.textContent = '';
      els.moveBar.classList.toggle('is-active', !!state.selected);
      if (!state.selected) { els.moveBar.appendChild(h('span', { class: 'cbr-hintline', text: playing() ? 'Drag a piece to move it, or tap a piece and then tap a Place here slot. With a keyboard: Enter to pick up, arrow keys to choose a slot, Enter to place.' : 'This challenge is finished.' })); return; }
      var item = selectedItem();
      els.moveBar.appendChild(h('span', { class: 'cbr-moving', text: 'Moving ' + (item ? describe(item) : '') + '. Choose a Place here slot.' }));
      var cancel = h('button', { type: 'button', class: 'cbr-btn cbr-small', 'data-action': 'cancel-move', text: 'Cancel' });
      cancel.addEventListener('click', function () { cancelSelection(true); });
      els.moveBar.appendChild(cancel);
    }

    function slot(zoneId, index, label) {
      var b = h('button', { type: 'button', class: 'cbr-slot', 'data-slot-zone': zoneId, 'data-slot-index': String(index), 'aria-label': label });
      b.appendChild(h('span', { text: 'Place here' }));
      b.addEventListener('click', function (e) { e.stopPropagation(); place(zoneId, index); });
      return b;
    }
    function zoneWithItems(zoneId, items, renderItem, isValidTarget, selfId, ctxLabel) {
      var zone = h('div', { class: 'cbr-zone', 'data-zone': zoneId });
      if (!items.length) zone.classList.add('is-empty');
      var selPos = -1;
      items.forEach(function (it, i) { if (it.id === selfId) selPos = i; });
      items.forEach(function (it, i) {
        if (isValidTarget && !(selPos >= 0 && (i === selPos || i === selPos + 1))) zone.appendChild(slot(zoneId, i, 'Move here, ' + (i === 0 ? 'at the start of ' : 'before ' + describe(it) + ' in ') + ctxLabel));
        zone.appendChild(renderItem(it));
      });
      if (isValidTarget && !(selPos >= 0 && selPos === items.length - 1)) zone.appendChild(slot(zoneId, items.length, 'Move here, ' + (items.length ? 'after ' + describe(items[items.length - 1]) + ' in ' : 'into ') + ctxLabel));
      return zone;
    }

    function renderEditor() {
      var m = state.challenge.model, sel = state.selected, ro = !playing();
      els.editor.textContent = '';
      els.editor.classList.toggle('is-readonly', ro);
      els.editor.appendChild(fixedLine('public class ' + m.className + ' {', 'cbr-classdecl'));
      state.arr.sections.forEach(function (sec, si) {
        var secEl = h('div', { class: 'cbr-section cbr-section-' + (si + 1), 'data-section': String(si) });
        secEl.appendChild(fixedLine(jm.SECTION_COMMENTS[si], 'cbr-comment'));
        var validBlock = sel && sel.type === 'block';
        var zone = zoneWithItems('section:' + si, sec, function (b) { return renderBlock(b); }, validBlock, validBlock ? sel.id : null, 'Section ' + (si + 1) + ' ' + SECTION_TITLES[si]);
        secEl.appendChild(zone);
        els.editor.appendChild(secEl);
      });
      els.editor.appendChild(fixedLine('}', 'cbr-classend'));
    }

    function grip() { return h('span', { class: 'cbr-grip', 'aria-hidden': 'true', text: '⠿' }); }
    function handleAttrs(id, type, label) {
      var isSel = state.selected && state.selected.id === id;
      return { class: 'cbr-handle', role: 'button', tabindex: playing() ? '0' : '-1', 'data-id': id, 'data-type': type, 'aria-pressed': String(!!isSel), 'aria-label': label + (playing() ? '. Press Enter to pick up and move.' : ''), 'aria-disabled': playing() ? false : 'true' };
    }
    function renderBlock(b) {
      var selected = state.selected && state.selected.id === b.id;
      var flagged = state.flagged.indexOf(b.id) !== -1;
      if (b.kind === 'field') {
        var a = handleAttrs(b.id, 'block', 'Instance variable declaration, ' + b.lines[0]);
        a.class += ' cbr-item cbr-block cbr-field' + (selected ? ' is-selected' : '') + (flagged ? ' is-flagged' : '');
        var el = h('div', a, [grip()]);
        el.appendChild(codeLine(b.lines[0]));
        return el;
      }
      var wrap = h('div', { class: 'cbr-item cbr-block cbr-method cbr-' + b.kind + (selected ? ' is-selected' : '') + (flagged ? ' is-flagged' : ''), 'data-block': b.id });
      var ha = handleAttrs(b.id, 'block', 'Method block, ' + b.header.replace(/\{$/, '').trim());
      ha.class += ' cbr-method-head';
      var head = h('div', ha, [grip()]);
      head.appendChild(codeLine(b.header));
      wrap.appendChild(head);
      var validStmt = state.selected && state.selected.type === 'stmt';
      var body = zoneWithItems('body:' + b.id, b.body, renderStmt, validStmt, validStmt ? state.selected.id : null, 'the body of ' + (b.kind === 'ctor' ? 'the constructor' : FB.methodName(b)));
      body.classList.add('cbr-body');
      wrap.appendChild(body);
      wrap.appendChild(h('div', { class: 'cbr-close', text: '}' }));
      return wrap;
    }
    function renderStmt(st) {
      var selected = state.selected && state.selected.id === st.id;
      var a = handleAttrs(st.id, 'stmt', 'Statement, ' + st.lines.map(function (l) { return l.trim(); }).join(' '));
      a.class += ' cbr-item cbr-stmt' + (selected ? ' is-selected' : '') + (state.flagged.indexOf(st.id) !== -1 ? ' is-flagged' : '');
      var el = h('div', a, [grip()]);
      var code = h('div', { class: 'cbr-stmt-code' });
      st.lines.forEach(function (ln) { code.appendChild(codeLine(ln)); });
      el.appendChild(code);
      return el;
    }

    function renderButtons() {
      var p = playing();
      els.btn.check.disabled = !p; els.btn.hint.disabled = !p; els.btn.reset.disabled = !p; els.btn.reveal.disabled = !p;
      els.btn.undo.disabled = !p || !state.undo.length;
      els.btn.next.classList.toggle('cbr-primary', !p);
      els.btn.next.textContent = p ? 'Skip to next challenge' : 'Next challenge';
    }
    function renderFeedback() {
      els.feedback.textContent = '';
      els.feedback.className = 'cbr-feedback';
      if (!state.feedback) return;
      els.feedback.classList.add('is-' + state.feedback.kind);
      els.feedback.appendChild(h('p', { class: 'cbr-fb-main', text: state.feedback.text }));
      if (state.feedback.progress) els.feedback.appendChild(h('p', { class: 'cbr-fb-sub', text: state.feedback.progress }));
      if (state.feedback.more) els.feedback.appendChild(h('p', { class: 'cbr-fb-sub', text: 'Press Hint again for a more specific clue.' }));
    }
    function renderResult() {
      if (playing()) { els.result.hidden = true; return; }
      var ch = state.challenge, revealed = state.status === 'revealed';
      els.result.hidden = false; els.result.textContent = '';
      els.result.className = 'cbr-result ' + (revealed ? 'is-revealed' : 'is-solved');
      els.result.appendChild(h('h3', { text: revealed ? 'Answer revealed' : (state.outcome === 'first' ? 'Solved on your first check' : 'Solved after retries') }));
      if (revealed) els.result.appendChild(h('p', { class: 'cbr-badge', text: 'Revealed, not completed independently' }));
      var ul = h('ul', { class: 'cbr-explain' });
      FB.explanation(ch).forEach(function (t) { ul.appendChild(h('li', { text: t })); });
      els.result.appendChild(ul);
      els.result.appendChild(h('p', { class: 'cbr-sample-label', text: ch.sample.construction + '.toString() produces:' }));
      els.result.appendChild(h('pre', { class: 'cbr-sample', text: ch.sample.toString }));
      var det = h('details', { class: 'cbr-assembled' }, [h('summary', { text: 'Show the finished Java file' })]);
      var pre = h('pre', { class: 'cbr-code' }); pre.textContent = jm.renderArrangement(ch.model, state.arr);
      det.appendChild(pre);
      els.result.appendChild(det);
    }

    /* ---------- selection & placement (tap / keyboard) ---------- */
    function select(type, id, viaKeyboard) {
      if (!playing()) return;
      if (state.selected && state.selected.id === id) { cancelSelection(true); return; }
      state.selected = { type: type, id: id }; state.flagged = [];
      render();
      var item = selectedItem();
      announce('Picked up ' + (item ? describe(item) : 'piece') + '. Use arrow keys to choose a Place here slot, Enter to place, Escape to cancel.');
      if (viaKeyboard) {
        var first = els.editor.querySelector('.cbr-slot');
        if (first) first.focus();
      }
    }
    function cancelSelection(refocus) {
      var id = state.selected && state.selected.id;
      state.selected = null; render();
      if (refocus && id) { var f = els.editor.querySelector('[data-id="' + id + '"]'); if (f) f.focus(); }
    }
    function place(zoneId, index) {
      if (!state.selected) return;
      var sel = state.selected, next = null, parts = zoneId.split(':');
      if (sel.type === 'block' && parts[0] === 'section') next = A.moveBlock(state.arr, sel.id, parseInt(parts[1], 10), index);
      else if (sel.type === 'stmt' && parts[0] === 'body') next = A.moveStmt(state.arr, sel.id, parts[1], index);
      if (!next) return;
      push(); state.arr = next; state.selected = null; state.flagged = []; state.feedback = null; state.focusId = sel.id;
      var item = (sel.type === 'block' ? A.findBlock(next, sel.id).block : A.findStmt(next, sel.id).stmt);
      tracker.touch();
      render();
      announce('Moved ' + describe(item) + '.');
    }

    /* ---------- events: click / keyboard ---------- */
    els.editor.addEventListener('click', function (e) {
      if (suppressClick) { suppressClick = false; return; }
      var hd = e.target.closest('.cbr-handle');
      if (!hd || !playing()) return;
      select(hd.getAttribute('data-type'), hd.getAttribute('data-id'), false);
    });
    els.editor.addEventListener('keydown', function (e) {
      var hd = e.target.closest('.cbr-handle'), sl = e.target.closest('.cbr-slot');
      if (e.key === 'Escape' && state.selected) { e.preventDefault(); cancelSelection(true); return; }
      if (hd && playing() && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(hd.getAttribute('data-type'), hd.getAttribute('data-id'), true); return; }
      if (state.selected && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        var slots = Array.prototype.slice.call(els.editor.querySelectorAll('.cbr-slot'));
        if (!slots.length) return;
        e.preventDefault();
        var i = sl ? slots.indexOf(sl) : (e.key === 'ArrowDown' ? -1 : slots.length);
        i = e.key === 'ArrowDown' ? Math.min(slots.length - 1, i + 1) : Math.max(0, i - 1);
        slots[i].focus();
      }
    });

    /* ---------- events: pointer drag ---------- */
    els.editor.addEventListener('pointerdown', function (e) {
      if (!playing() || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var hd = e.target.closest('.cbr-handle');
      if (!hd) return;
      if (e.pointerType === 'touch' && !e.target.closest('.cbr-grip')) return;   // touch: drag by grip only so the page can still scroll
      drag = { id: hd.getAttribute('data-id'), type: hd.getAttribute('data-type'), handle: hd, x0: e.clientX, y0: e.clientY, started: false, pid: e.pointerId, ghost: null, marker: null, target: null, lastX: e.clientX, lastY: e.clientY, timer: null };
    });
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);

    function targetAt(x, y) {
      var el = document.elementFromPoint(x, y);
      if (!el) return null;
      var zone;
      if (drag.type === 'block') {
        zone = el.closest('[data-zone^="section:"]');
        if (!zone) { var sec = el.closest('.cbr-section'); zone = sec && sec.querySelector('[data-zone^="section:"]'); }
      } else {
        zone = el.closest('[data-zone^="body:"]');
        if (!zone) { var meth = el.closest('.cbr-method'); zone = meth && meth.querySelector(':scope > [data-zone^="body:"]'); }
      }
      if (!zone) return null;
      var kids = Array.prototype.slice.call(zone.querySelectorAll(':scope > .cbr-item'));
      var idx = 0;
      kids.forEach(function (k) { var r = k.getBoundingClientRect(); if (r.top + r.height / 2 < y) idx++; });
      return { zone: zone, id: zone.getAttribute('data-zone'), index: idx, kids: kids };
    }
    function startDrag() {
      drag.started = true;
      var item = drag.type === 'block' ? A.findBlock(state.arr, drag.id).block : A.findStmt(state.arr, drag.id).stmt;
      var text = item.header ? item.header + ' ...' : item.lines.join('\n');
      drag.ghost = h('div', { class: 'cbr-ghost', text: text });
      document.body.appendChild(drag.ghost);
      drag.marker = h('div', { class: 'cbr-insert' });
      drag.handle.closest('.cbr-item').classList.add('is-dragging');
      document.body.classList.add('cbr-dragging');
      try { drag.handle.setPointerCapture(drag.pid); } catch (err) { /* not capturable: fine */ }
      state.selected = null;
      drag.timer = setInterval(function () { // auto-scroll near viewport edges
        if (drag.lastY < 70) window.scrollBy(0, -14); else if (drag.lastY > window.innerHeight - 70) window.scrollBy(0, 14);
      }, 16);
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      drag.lastX = e.clientX; drag.lastY = e.clientY;
      if (!drag.started) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6) return;
        startDrag();
      }
      e.preventDefault();
      drag.ghost.style.transform = 'translate(' + (e.clientX + 12) + 'px,' + (e.clientY + 12) + 'px)';
      var t = targetAt(e.clientX, e.clientY);
      document.querySelectorAll('.cbr-zone.is-drop').forEach(function (z) { z.classList.remove('is-drop'); });
      if (drag.marker.parentNode) drag.marker.parentNode.removeChild(drag.marker);
      drag.target = t;
      if (t) {
        t.zone.classList.add('is-drop');
        if (t.index < t.kids.length) t.zone.insertBefore(drag.marker, t.kids[t.index]); else t.zone.appendChild(drag.marker);
      }
    }
    function endDrag() {
      if (drag.timer) clearInterval(drag.timer);
      if (drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
      if (drag.marker && drag.marker.parentNode) drag.marker.parentNode.removeChild(drag.marker);
      document.querySelectorAll('.cbr-zone.is-drop, .is-dragging').forEach(function (z) { z.classList.remove('is-drop'); z.classList.remove('is-dragging'); });
      document.body.classList.remove('cbr-dragging');
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var d = drag; drag = null;
      if (!d.started) return;               // plain tap/click: the click handler selects
      drag = d; endDrag(); drag = null;
      suppressClick = true; setTimeout(function () { suppressClick = false; }, 0);
      var t = d.target;
      if (!t) { render(); return; }
      state.selected = { type: d.type, id: d.id };
      var before = state.arr; place(t.id, t.index);
      if (state.arr === before) { state.selected = null; render(); }
    }
    function onCancel(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      if (drag.started) endDrag();
      drag = null;
    }

    /* ---------- timers ---------- */
    ['pointerdown', 'keydown', 'click'].forEach(function (ev) { container.addEventListener(ev, function () { tracker.touch(); }, true); });
    var tickTimer = setInterval(function () {
      tracker.tick(!document.hidden);
      var t = els.stats.querySelector('[data-stat="time"] b');
      if (t) t.textContent = fmtTime(tracker.summary().activeSeconds);
    }, 1000);
    var saveTimer = setInterval(function () { tracker.save(); }, 10000);
    function onHide() { tracker.save(); }
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);

    newChallenge(options.difficulty || 'beginner', options.challengeSeed);

    return {
      getState: function () { return state; },
      tracker: tracker,
      newChallenge: function (d, seed) { if (state && state.status === 'playing') tracker.recordSkip(); newChallenge(d || state.difficulty, seed); },
      destroy: function () {
        clearInterval(tickTimer); clearInterval(saveTimer);
        document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onCancel);
        document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', onHide);
        tracker.save();
      }
    };
  }

  return { mount: mount, highlight: highlight };
});
