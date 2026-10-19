/* Choose the Missing Piece: four options in a native radio group; the choice previews in the gap. */
(function (root) {
  'use strict';
  var R = root.RACECES, el = R.dom.el, chip = R.dom.chip;

  function mount(work, ch, api) {
    var chosen = null, locked = false;
    work.appendChild(el('p', { class: 'prompt', text: ch.prompt }));
    var list = el('ol', { class: 'resp', 'aria-label': 'Response with one missing sentence' });
    var margins = {}, gapEl = null;
    ch.shown.forEach(function (s) {
      var m = el('div', { class: 'margin' });
      margins[s.id] = m;
      var body;
      if (s.gap) {
        gapEl = el('div', { class: 'gap', 'aria-live': 'polite' }, ['Missing sentence']);
        body = gapEl;
      } else body = el('div', { class: 'sent', style: 'cursor:default' }, [s.text]);
      list.appendChild(el('li', null, [m, body]));
    });
    work.appendChild(list);

    var fs = el('fieldset', { class: 'options' }, [el('legend', { text: 'Choose the best sentence' })]);
    var inputs = {}, labels = {};
    ch.options.forEach(function (o) {
      var inp = el('input', { type: 'radio', name: 'missing-option', id: 'opt-' + o.id, value: o.id });
      var lab = el('label', { class: 'opt-label', for: 'opt-' + o.id }, [o.text]);
      inp.addEventListener('change', function () {
        if (locked) return;
        chosen = o.id;
        gapEl.textContent = o.text; gapEl.classList.add('filled');
        api.changed();
      });
      inputs[o.id] = inp; labels[o.id] = lab;
      fs.appendChild(el('div', { class: 'opt' }, [inp, lab]));
    });
    work.appendChild(fs);

    return {
      hasAnswer: function () { return !!chosen; },
      getAnswer: function () { return { optionId: chosen }; },
      reveal: function (result) {
        locked = true;
        list.classList.add('revealed');
        ch.shown.forEach(function (s) { margins[s.id].appendChild(chip(ch.info[s.id].role)); });
        var right = ch.options.filter(function (o) { return o.id === ch.correctId; })[0];
        gapEl.textContent = right.text; gapEl.classList.add('filled', 'is-right');
        ch.options.forEach(function (o) {
          inputs[o.id].disabled = true;
          if (o.id === ch.correctId) { labels[o.id].classList.add('is-right'); labels[o.id].insertBefore(el('span', { class: 'tag tag-right', text: 'Best answer' }), labels[o.id].firstChild); }
          else if (o.id === chosen) { labels[o.id].classList.add('is-wrong'); labels[o.id].insertBefore(el('span', { class: 'tag tag-wrong', text: 'Your choice' }), labels[o.id].firstChild); }
        });
        return null;
      }
    };
  }
  R.missingUI = { mount: mount };
})(typeof self !== 'undefined' ? self : this);
