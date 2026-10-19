/* String Lab — user interface. Renders challenges produced by the generator and grades with one scored
 * attempt per challenge. No typing and no dragging: every task is completed by choosing an answer. */
(function (root) {
  'use strict';
  var doc = root.document;
  if (!doc || !root.StringLab || !root.StringLab.Generator) return;
  var SL = root.StringLab, G = SL.Generator, F = SL.Feedback;

  function $(id) { return doc.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /** Escape, then turn `backtick` spans into <code>. */
  function rich(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function modeLabel(id) { return id === 'mixed' ? 'Mixed Practice' : G.MODES.filter(function (m) { return m.id === id; })[0].label; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---- light Java syntax highlighting (display only)
  var TOKEN = /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)')|(\?\?\?)|\b(String|int|char)\b|\b(\d+)\b|(System\.out\.println)|(\.[a-zA-Z]+)(?=\()/g;
  function highlight(line) {
    var out = '', last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(line))) {
      out += esc(line.slice(last, m.index));
      var cls = m[1] || m[2] ? 'tk-str' : m[3] ? 'tk-blank' : m[4] ? 'tk-kw' : m[5] ? 'tk-num' : m[6] ? 'tk-kw' : 'tk-m';
      out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(line.slice(last));
  }

  // ---- state
  var params = new URLSearchParams(root.location ? root.location.search : '');
  function randomSeed() {
    try { var a = new Uint32Array(1); root.crypto.getRandomValues(a); return (a[0] % 2147483646) + 1; } catch (e) { return Math.floor(Math.random() * 2147483645) + 1; }
  }
  var validModes = ['predict', 'index', 'expr', 'trace', 'mixed'];
  var settings = {
    mode: validModes.indexOf(params.get('mode')) >= 0 ? params.get('mode') : 'predict',
    difficulty: G.LEVELS.indexOf(params.get('difficulty')) >= 0 ? params.get('difficulty') : 'beginner'
  };
  var seedParam = parseInt(params.get('seed'), 10);
  var seed = seedParam > 0 ? seedParam : randomSeed();
  var gen = G.createSession({ seed: seed, mode: settings.mode, difficulty: settings.difficulty });
  var tracker = SL.Session.create({ settings: Object.assign({ seed: seed }, settings), postMessage: params.get('postMessage') === '1' });
  var ch = null, selected = null, answered = false, count = 0;

  var el = {
    meta: $('meta'), code: $('code'), prompt: $('promptText'), choices: $('choices'), form: $('answerForm'),
    check: $('checkBtn'), reveal: $('revealBtn'), actions: $('actions'), feedback: $('feedback'), live: $('liveStatus'),
    dlg: $('summaryDlg'), summaryBody: $('summaryBody')
  };

  function announce(msg) { el.live.textContent = ''; setTimeout(function () { el.live.textContent = msg; }, 30); }

  function resultText(c) {
    if (c.result === undefined) return '';
    var kind = ch.meta && (ch.meta.resultType || ch.meta.resultKind), r = c.result;
    if (kind === 'String' || kind === 'substring') r = '"' + r + '"';
    else if (kind === 'char') r = "'" + r + "'";
    return r;
  }

  function render() {
    count++;
    selected = null; answered = false;
    var chips = [
      '<span class="chip teal">' + esc(modeLabel(ch.mode)) + '</span>',
      '<span class="chip gold">' + esc(cap(ch.difficulty)) + '</span>',
      '<span class="chip">Skill: ' + esc(ch.skill) + '</span>',
      '<span class="chip">Challenge ' + count + '</span>'
    ];
    el.meta.innerHTML = chips.join('');
    el.code.innerHTML = ch.code.map(function (l) { return '<li><span>' + highlight(l) + '</span></li>'; }).join('');
    el.prompt.innerHTML = rich(ch.prompt);
    el.choices.classList.remove('locked');
    el.choices.innerHTML = '<legend class="sr-only">Answer choices. Choose one, then check your answer.</legend>' + ch.choices.map(function (c, i) {
      return '<label class="choice" data-i="' + i + '"><input type="radio" name="answer" value="' + i + '" id="choice' + i + '">' +
        '<span class="key" aria-hidden="true">' + 'ABCD'[i] + '</span><span class="ctext">' + esc(c.text) + '</span></label>';
    }).join('');
    el.feedback.hidden = true; el.feedback.className = 'feedback'; el.feedback.innerHTML = '';
    el.check.disabled = true; el.actions.hidden = false;
    var hint = $('keyHint'); if (hint) hint.hidden = false;
  }

  function loadNext(userInitiated) {
    ch = gen.next();
    tracker.present(ch);
    render();
    if (userInitiated) { el.prompt.focus({ preventScroll: false }); announce('New challenge. ' + modeLabel(ch.mode) + ', ' + cap(ch.difficulty) + '.'); }
  }

  function select(i) {
    if (answered) return;
    selected = i;
    var labels = el.choices.querySelectorAll('.choice');
    for (var k = 0; k < labels.length; k++) labels[k].classList.toggle('selected', k === i);
    var input = $('choice' + i); if (input) input.checked = true;
    el.check.disabled = false;
    tracker.activity();
  }

  function lock(selIdx) {
    el.choices.classList.add('locked');
    var labels = el.choices.querySelectorAll('.choice');
    for (var k = 0; k < labels.length; k++) {
      var lab = labels[k], c = ch.choices[k], input = lab.querySelector('input');
      input.disabled = true; lab.classList.remove('selected');
      var tag = '';
      if (k === ch.correctIndex) { lab.classList.add('is-correct'); tag = '<span class="tag">Correct answer</span>'; }
      else if (k === selIdx) { lab.classList.add('is-wrong'); tag = '<span class="tag">Your answer</span>'; }
      var rt = resultText(c);
      if (rt !== '') lab.querySelector('.ctext').insertAdjacentHTML('beforeend', '<span class="result">gives <code>' + esc(rt) + '</code></span>');
      if (tag) lab.insertAdjacentHTML('beforeend', tag);
    }
  }

  function viewHtml(v) {
    var cells = v.text.split('').map(function (chr, i) {
      var hl = v.highlights.indexOf(i) >= 0;
      return '<div class="idx-cell' + (hl ? ' hl' : '') + '" aria-hidden="true"><span class="i">' + i + '</span><span class="c">' + (chr === ' ' ? '&#9251;' : esc(chr)) + '</span></div>';
    }).join('');
    var desc = v.text.split('').map(function (chr, i) { return 'index ' + i + ' ' + (chr === ' ' ? 'space' : chr); }).join(', ');
    return '<div class="view"><div class="idxrow" role="group" aria-label="Index map of ' + esc(v.text) + ': ' + esc(desc) + '">' + cells + '</div><p class="cap">' + rich(v.caption) + '</p></div>';
  }

  function showFeedback(selIdx) {
    var fb = F.build(ch, selIdx);
    lock(selIdx);
    var cls = fb.revealed ? 'rev' : fb.correct ? 'ok' : 'no';
    var h = '<h2 tabindex="-1" id="fbHeading">' + (fb.correct ? '&#10003; ' : fb.revealed ? '' : '&#10007; ') + esc(fb.verdict) + '</h2>';
    h += '<p>The answer is <code>' + esc(fb.answerText) + '</code>.' + (!fb.correct && !fb.revealed ? ' You chose <code>' + esc(fb.selectedText) + '</code>.' : '') + '</p>';
    if (fb.misconception) h += '<p class="fb-why"><strong>Why that answer is tempting:</strong> ' + rich(fb.misconception) + '</p>';
    if (fb.rule) h += '<p class="fb-rule"><strong>Key idea:</strong> ' + rich(fb.rule) + '</p>';
    if (fb.trace) {
      h += '<h3>Step-by-step trace</h3><ol class="trace">' + fb.trace.map(function (t) {
        return '<li><div class="tline">' + esc(t.code) + '</div><ul>' + t.notes.map(function (n) { return '<li>' + rich(n) + '</li>'; }).join('') + '</ul></li>';
      }).join('') + '</ol>';
    }
    if (fb.views.length) h += '<h3>Index map</h3><div class="views">' + fb.views.map(viewHtml).join('') + '</div>';
    h += '<div class="fb-actions"><button type="button" class="btn primary" id="nextBtn">Next Challenge</button></div>';
    el.feedback.className = 'feedback ' + cls; el.feedback.innerHTML = h; el.feedback.hidden = false;
    el.actions.hidden = true;
    $('nextBtn').addEventListener('click', function () { loadNext(true); });
    var heading = $('fbHeading'); heading.focus();
  }

  function check() {
    if (answered || selected === null) return;
    answered = true;
    tracker.answer(selected);
    showFeedback(selected);
  }
  function revealAnswer() {
    if (answered) return;
    answered = true;
    tracker.reveal();
    showFeedback(null);
  }

  // ---- summary dialog
  function fmtTime(ms) { var s = Math.round(ms / 1000), m = Math.floor(s / 60); return m + ':' + ('0' + (s % 60)).slice(-2); }
  function renderSummary() {
    tracker.heartbeat();
    var s = tracker.summary();
    var pct = s.accuracy === null ? '—' : Math.round(s.accuracy * 100) + '%';
    var html = '<div class="stat-grid">' +
      '<div class="stat"><b>' + s.completed + '</b><span>Challenges completed</span></div>' +
      '<div class="stat"><b>' + s.firstAttemptCorrect + '</b><span>Correct on first attempt (' + pct + ')</span></div>' +
      '<div class="stat"><b>' + s.incorrect + '</b><span>Incorrect answers</span></div>' +
      '<div class="stat"><b>' + s.revealed + '</b><span>Answers revealed</span></div>' +
      '<div class="stat"><b>' + fmtTime(s.activeMs) + '</b><span>Active practice time</span></div>' +
      '<div class="stat"><b>' + s.skipped + '</b><span>Skipped with New Challenge</span></div></div>';
    function table(title, rows, label) {
      return '<h3 style="margin:14px 0 4px;font-size:.95rem">' + esc(title) + '</h3><table class="skills"><thead><tr><th>' + esc(label) + '</th><th class="n">Done</th><th class="n">First try</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td class="n">' + r[1].completed + '</td><td class="n">' + r[1].firstAttemptCorrect + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    var empty = { completed: 0, firstAttemptCorrect: 0 };
    html += table('By skill', G.SKILLS.map(function (k) { return [k, s.bySkill[k] || empty]; }), 'Skill');
    html += table('By practice mode', G.MODES.map(function (m) { return [m.label, s.byMode[m.id] || empty]; }), 'Mode');
    html += table('By difficulty', G.LEVELS.map(function (l) { return [cap(l), s.byDifficulty[l] || empty]; }), 'Difficulty');
    el.summaryBody.innerHTML = html;
  }
  function openSummary() {
    renderSummary();
    if (typeof el.dlg.showModal === 'function') el.dlg.showModal(); else el.dlg.setAttribute('open', '');
  }
  function copySummary() {
    var text = JSON.stringify(tracker.summary(), null, 2), btn = $('copyBtn');
    function done(ok) { btn.textContent = ok ? 'Copied' : 'Copy failed'; setTimeout(function () { btn.textContent = 'Copy summary data'; }, 1600); }
    if (root.navigator && root.navigator.clipboard) root.navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else done(false);
  }

  // ---- wiring
  function syncRadios() {
    Array.prototype.forEach.call(doc.querySelectorAll('input[name=mode]'), function (r) { r.checked = r.value === settings.mode; });
    Array.prototype.forEach.call(doc.querySelectorAll('input[name=difficulty]'), function (r) { r.checked = r.value === settings.difficulty; });
  }
  doc.querySelectorAll('input[name=mode]').forEach(function (r) {
    r.addEventListener('change', function () { settings.mode = r.value; gen.setMode(r.value); loadNext(true); });
  });
  doc.querySelectorAll('input[name=difficulty]').forEach(function (r) {
    r.addEventListener('change', function () { settings.difficulty = r.value; gen.setDifficulty(r.value); loadNext(true); });
  });
  el.choices.addEventListener('change', function (e) { if (e.target && e.target.name === 'answer') select(parseInt(e.target.value, 10)); });
  el.form.addEventListener('submit', function (e) { e.preventDefault(); check(); });
  el.reveal.addEventListener('click', revealAnswer);
  $('newBtn').addEventListener('click', function () { loadNext(true); });
  $('summaryBtn').addEventListener('click', openSummary);
  $('copyBtn').addEventListener('click', copySummary);

  doc.addEventListener('keydown', function (e) {
    tracker.activity();
    if (el.dlg.open || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = e.target && e.target.tagName;
    if (!answered && /^[1-4]$/.test(e.key)) {
      var i = parseInt(e.key, 10) - 1;
      if (i < ch.choices.length) { select(i); var inp = $('choice' + i); if (inp) inp.focus(); e.preventDefault(); }
    } else if (answered && e.key === 'Enter' && tag !== 'BUTTON' && tag !== 'A' && tag !== 'SUMMARY') {
      e.preventDefault(); loadNext(true);
    }
  });
  ['pointerdown', 'touchstart', 'input'].forEach(function (evt) { doc.addEventListener(evt, function () { tracker.activity(); }, { passive: true }); });
  doc.addEventListener('visibilitychange', function () { tracker.setVisible(doc.visibilityState === 'visible'); });
  root.addEventListener('pagehide', function () { tracker.end(); });
  setInterval(function () { tracker.heartbeat(); }, 1000);

  // Test/integration hooks (read-only views of state)
  root.StringLabApp = {
    tracker: tracker, seed: seed,
    challenge: function () { return ch; },
    state: function () { return { mode: settings.mode, difficulty: settings.difficulty, selected: selected, answered: answered, count: count }; }
  };

  syncRadios();
  loadNext(false);
})(typeof window !== 'undefined' ? window : this);
