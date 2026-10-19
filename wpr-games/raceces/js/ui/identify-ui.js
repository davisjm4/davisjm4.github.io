/* Identify the Parts: click or tap sentences. Multi-select only when the prompt asks for every sentence. */
(function (root) {
  'use strict';
  var R = root.RACECES, el = R.dom.el, chip = R.dom.chip;

  function mount(work, ch, api) {
    var selected = [];
    var locked = false;
    work.appendChild(el('p', { class: 'prompt', id: 'prompt', text: ch.prompt }));
    work.appendChild(el('p', { class: 'hint', text: ch.multi ? 'Select every sentence that fits. More than one sentence plays this role.' : 'Select one sentence.' }));
    var list = el('ol', { class: 'resp', role: 'group', 'aria-labelledby': 'prompt' });
    var buttons = {}, margins = {}, lis = {};
    ch.sentences.forEach(function (s) {
      var b = el('button', { type: 'button', class: 'sent', 'aria-pressed': 'false', 'data-id': s.id }, [s.text]);
      b.addEventListener('click', function () {
        if (locked) return;
        var i = selected.indexOf(s.id);
        if (ch.multi) { if (i >= 0) selected.splice(i, 1); else selected.push(s.id); }
        else selected = i >= 0 ? [] : [s.id];
        sync(); api.changed();
        R.dom.announce(selected.length + (selected.length === 1 ? ' sentence selected' : ' sentences selected'));
      });
      var m = el('div', { class: 'margin' });
      var li = el('li', null, [m, b]);
      buttons[s.id] = b; margins[s.id] = m; lis[s.id] = li;
      list.appendChild(li);
    });
    work.appendChild(list);

    function sync() {
      Object.keys(buttons).forEach(function (id) { buttons[id].setAttribute('aria-pressed', selected.indexOf(id) >= 0 ? 'true' : 'false'); });
    }

    return {
      hasAnswer: function () { return selected.length > 0; },
      getAnswer: function () { return { selected: selected.slice() }; },
      reveal: function (result) {
        locked = true;
        list.classList.add('revealed');
        ch.sentences.forEach(function (s) {
          var b = buttons[s.id];
          b.disabled = true;
          margins[s.id].appendChild(chip(ch.info[s.id].role));
          var isTarget = ch.solution.ids.indexOf(s.id) >= 0, isSel = selected.indexOf(s.id) >= 0;
          if (isTarget) { b.classList.add('is-right'); b.insertBefore(el('span', { class: 'tag tag-right', text: 'Correct answer' }), b.firstChild); b.insertBefore(el('br'), b.children[0].nextSibling); }
          else if (isSel) { b.classList.add('is-wrong'); b.insertBefore(el('span', { class: 'tag tag-wrong', text: 'Your choice' }), b.firstChild); b.insertBefore(el('br'), b.children[0].nextSibling); }
        });
        return null;
      }
    };
  }
  R.identifyUI = { mount: mount };
})(typeof self !== 'undefined' ? self : this);
