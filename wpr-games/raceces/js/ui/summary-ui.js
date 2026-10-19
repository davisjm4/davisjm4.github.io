/* Session Summary: student-friendly, screenshot-ready. */
(function (root) {
  'use strict';
  var R = root.RACECES, el = R.dom.el, chip = R.dom.chip, S = R.Structure;

  function fmtTime(ms) {
    var s = Math.round(ms / 1000), m = Math.floor(s / 60);
    if (m >= 60) return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
    return m > 0 ? m + ' min ' + (s % 60) + ' s' : s + ' s';
  }
  function bar(labelNode, x) {
    var pct = x.pct === null ? 0 : x.pct;
    var li = el('li', null, [
      el('span', { class: 'lab' }, [labelNode]),
      el('div', { class: 'track', role: 'img', 'aria-label': x.n ? pct + ' percent correct' : 'No attempts yet' }, [el('div', { class: 'fill' + (x.n && pct < 70 ? ' low' : ''), style: 'width:' + (x.n ? pct : 0) + '%' })]),
      el('span', { class: 'val', text: x.n ? pct + '% (' + x.ok + '/' + x.n + ')' : 'none yet' })
    ]);
    return li;
  }
  function panel(title, body) { return el('section', { class: 'panel' }, [el('h2', { text: title }), body]); }

  function render(stage, session, handlers) {
    var st = session.stats();
    var wrap = el('div', { class: 'summary', id: 'summary-root' });
    wrap.appendChild(el('h2', { text: 'Session summary' }));

    if (!st.done) {
      wrap.appendChild(el('p', { class: 'empty', text: 'No challenges completed yet. Check an answer in any practice mode and your results will show up here.' }));
      wrap.appendChild(el('div', { class: 'actions' }, [el('button', { type: 'button', class: 'btn', onclick: handlers.start }, ['Start practicing'])]));
      stage.appendChild(wrap);
      return;
    }

    wrap.appendChild(el('div', { class: 'big' }, [
      el('div', { class: 'stat' }, [el('b', { text: String(st.done) }), el('span', { text: 'Challenges completed' })]),
      el('div', { class: 'stat' }, [el('b', { text: st.firstAttemptCorrect + ' of ' + st.done }), el('span', { text: 'Correct on the first try' })]),
      el('div', { class: 'stat' }, [el('b', { text: st.accuracy + '%' }), el('span', { text: 'Overall accuracy' })]),
      el('div', { class: 'stat' }, [el('b', { text: fmtTime(st.activeMs) }), el('span', { text: 'Active practice time' })])
    ]));

    var modeList = el('ul', { class: 'bars' });
    S.MODES.forEach(function (m) { modeList.appendChild(bar(el('span', { text: S.MODE_LABEL[m] }), st.modes[m])); });
    wrap.appendChild(panel('Accuracy by practice mode', modeList));

    var roleList = el('ul', { class: 'bars' });
    S.ROLES.forEach(function (r) { roleList.appendChild(bar(el('span', { class: 'lab' }, [chip(r), el('span', { text: S.LABEL[r] })]), st.roles[r])); });
    wrap.appendChild(panel('Accuracy by RACECES part', roleList));

    var focusKeys = ['evidence-vs-explanation', 'restate-vs-answer', 'summary-vs-evidence'];
    var counts = {}; st.errors.forEach(function (e) { counts[e.key] = e.n; });
    var errList = el('ul', { class: 'bars' });
    focusKeys.forEach(function (k) {
      errList.appendChild(el('li', null, [el('span', { text: S.CATEGORY_LABEL[k] }), el('span'), el('span', { class: 'val', text: (counts[k] || 0) + (counts[k] === 1 ? ' slip' : ' slips') })]));
    });
    st.errors.filter(function (e) { return focusKeys.indexOf(e.key) < 0; }).forEach(function (e) {
      errList.appendChild(el('li', null, [el('span', { text: e.label }), el('span'), el('span', { class: 'val', text: e.n + (e.n === 1 ? ' slip' : ' slips') })]));
    });
    wrap.appendChild(panel('Where slips happened', errList));

    var next = el('ul', { class: 'mini', style: 'gap:.5rem' });
    if (!st.focus.length) next.appendChild(el('li', null, [el('span'), el('span', { text: st.done < 6 ? 'Complete a few more challenges to see where to focus.' : 'Nothing stands out. Try a harder difficulty or a different mode.' })]));
    st.focus.forEach(function (f) {
      var t = f.type === 'role' ? 'Practice ' + f.label + ' sentences (' + f.pct + '% correct).'
        : f.type === 'mode' ? 'Spend more time in ' + f.label + ' (' + f.pct + '% correct).'
        : 'Watch for: ' + f.label + ' (' + f.n + ' slips).';
      next.appendChild(el('li', null, [el('span', { text: '\u2022' }), el('span', { text: t })]));
    });
    wrap.appendChild(panel('Areas needing more practice', next));

    var reset = el('div', { class: 'actions' });
    var resetBtn = el('button', { type: 'button', class: 'btn secondary', id: 'reset-btn' }, ['Reset Session']);
    var confirmBox = null;
    resetBtn.addEventListener('click', function () {
      if (confirmBox) return;
      confirmBox = el('div', { class: 'confirm', role: 'alertdialog', 'aria-labelledby': 'confirm-h' }, [
        el('p', { id: 'confirm-h', text: 'Clear all results from this session? This cannot be undone.' }),
        el('div', { class: 'actions' }, [
          el('button', { type: 'button', class: 'btn danger', id: 'reset-yes', onclick: function () { handlers.reset(); } }, ['Yes, reset']),
          el('button', { type: 'button', class: 'btn secondary', id: 'reset-no', onclick: function () { confirmBox.remove(); confirmBox = null; resetBtn.focus(); } }, ['Cancel'])
        ])
      ]);
      wrap.appendChild(confirmBox);
      confirmBox.querySelector('#reset-no').focus();
    });
    reset.appendChild(resetBtn);
    wrap.appendChild(reset);
    wrap.appendChild(el('p', { class: 'hint', text: 'Results stay on this device only. No names or accounts are collected.' }));
    stage.appendChild(wrap);
  }
  R.summaryUI = { render: render, fmtTime: fmtTime };
})(typeof self !== 'undefined' ? self : this);
