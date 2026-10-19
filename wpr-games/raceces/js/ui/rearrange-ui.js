/* Rearrange the Response. Four equivalent ways to reorder:
   1. pointer drag on the grip   2. Move up / Move down buttons
   3. tap a sentence, then tap "Place here"   4. keyboard: select a sentence, then arrow keys. */
(function (root) {
  'use strict';
  var R = root.RACECES, el = R.dom.el, chip = R.dom.chip, announce = R.dom.announce;

  function firstWords(t) { return t.split(/\s+/).slice(0, 6).join(' ') + '…'; }

  function mount(work, ch, api) {
    var order = ch.items.map(function (i) { return i.id; });
    var selected = null, locked = false, focusKey = null;
    var N = order.length;

    work.appendChild(el('p', { class: 'prompt', text: ch.prompt }));
    work.appendChild(el('p', { class: 'hint', text: 'Drag the handle, use the Move buttons, or tap a sentence and then tap Place here. With a keyboard, press Enter on a sentence, then use the arrow keys.' }));
    var list = el('ol', { class: 'sortable', 'aria-label': 'Response sentences in your current order' });
    work.appendChild(list);

    function moveTo(id, finalIndex) {
      var cur = order.indexOf(id);
      if (finalIndex < 0) finalIndex = 0;
      if (finalIndex > N - 1) finalIndex = N - 1;
      if (finalIndex === cur) return;
      order.splice(cur, 1); order.splice(finalIndex, 0, id);
      announce('Moved to position ' + (finalIndex + 1) + ' of ' + N + '.');
      api.changed();
    }

    function slotLi(j) {
      var b = el('button', { type: 'button', 'data-slot': String(j), 'aria-label': 'Place the selected sentence at position ' + (j + 1) + (j === N ? ' (end)' : '') }, ['Place here']);
      b.addEventListener('click', function () {
        var id = selected, cur = order.indexOf(id);
        selected = null;
        moveTo(id, j > cur ? j - 1 : j);
        focusKey = id + ':main'; render();
      });
      return el('li', { class: 'slot' }, [b]);
    }

    function itemLi(id, i) {
      var li = el('li', { class: 'item', 'data-id': id });
      var margin = el('div', { class: 'margin' });
      var main = el('button', { type: 'button', class: 'sent', 'aria-pressed': selected === id ? 'true' : 'false', 'data-key': id + ':main' }, [
        el('span', { class: 'sr-only', text: 'Position ' + (i + 1) + ' of ' + N + '. ' }), ch.info[id].text
      ]);
      main.addEventListener('click', function () {
        if (locked) return;
        selected = selected === id ? null : id;
        focusKey = id + ':main'; render();
        announce(selected ? 'Selected. Choose Place here, or press an arrow key to move it.' : 'Selection cleared.');
      });
      main.addEventListener('keydown', function (e) {
        if (locked) return;
        var idx = order.indexOf(id);
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          var d = e.key === 'ArrowUp' ? -1 : 1;
          if (selected === id) { moveTo(id, idx + d); focusKey = id + ':main'; render(); }
          else { var n = order[idx + d]; if (n) { var t = list.querySelector('[data-key="' + n + ':main"]'); if (t) t.focus(); } }
        } else if (e.key === 'Escape' && selected) { selected = null; focusKey = id + ':main'; render(); announce('Selection cleared.'); }
      });
      var grip = el('button', { type: 'button', class: 'grip', tabindex: '-1', 'aria-hidden': 'true', title: 'Drag to reorder', 'data-grip': id }, ['\u2807\u2807']);
      grip.addEventListener('pointerdown', function (e) { if (!locked) startDrag(id, li, e); });
      margin.appendChild(grip);

      var up = el('button', { type: 'button', 'aria-label': 'Move up: ' + firstWords(ch.info[id].text), 'data-key': id + ':up' }, ['\u25B2']);
      var down = el('button', { type: 'button', 'aria-label': 'Move down: ' + firstWords(ch.info[id].text), 'data-key': id + ':down' }, ['\u25BC']);
      if (i === 0) up.disabled = true;
      if (i === N - 1) down.disabled = true;
      up.addEventListener('click', function () { moveTo(id, order.indexOf(id) - 1); focusKey = id + ':up'; render(); });
      down.addEventListener('click', function () { moveTo(id, order.indexOf(id) + 1); focusKey = id + ':down'; render(); });
      var mover = el('div', { class: 'mover' }, [up, down]);
      li.appendChild(margin); li.appendChild(main); li.appendChild(mover);
      return li;
    }

    function startDrag(id, li, ev) {
      ev.preventDefault();
      selected = null;
      li.classList.add('dragging');
      var lastY = ev.clientY, raf = null;
      function reposition(y) {
        var target = null;
        var items = Array.prototype.slice.call(list.querySelectorAll('li.item'));
        for (var k = 0; k < items.length; k++) {
          if (items[k] === li) continue;
          var r = items[k].getBoundingClientRect();
          if (y < r.top + r.height / 2) { target = items[k]; break; }
        }
        if (target) { if (li.nextSibling !== target) list.insertBefore(li, target); }
        else if (list.lastElementChild !== li) list.appendChild(li);
      }
      // Auto-scroll when the pointer is near the top or bottom edge, so long lists can be dragged end to end.
      function loop() {
        var edge = 70, dy = 0, h = root.innerHeight;
        if (lastY < edge) dy = -Math.ceil((edge - lastY) / 5);
        else if (lastY > h - edge) dy = Math.ceil((lastY - (h - edge)) / 5);
        if (dy) { root.scrollBy(0, dy); reposition(lastY); }
        raf = root.requestAnimationFrame(loop);
      }
      function onMove(e) { lastY = e.clientY; reposition(lastY); }
      function onUp() {
        // Listeners live on the document: moving the dragged element mid-drag would release pointer capture.
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        if (raf) root.cancelAnimationFrame(raf);
        li.classList.remove('dragging');
        var before = order.indexOf(id);
        order = Array.prototype.slice.call(list.querySelectorAll('li.item')).map(function (x) { return x.getAttribute('data-id'); });
        var after = order.indexOf(id);
        if (after !== before) { announce('Moved to position ' + (after + 1) + ' of ' + N + '.'); api.changed(); }
        focusKey = id + ':main'; render();
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
      raf = root.requestAnimationFrame(loop);
    }

    function render() {
      list.textContent = '';
      var cur = selected ? order.indexOf(selected) : -1;
      order.forEach(function (id, i) {
        if (selected && !locked && i !== cur && i !== cur + 1) list.appendChild(slotLi(i));
        list.appendChild(itemLi(id, i));
      });
      if (selected && !locked && cur !== N - 1) list.appendChild(slotLi(N));
      if (focusKey) {
        var t = list.querySelector('[data-key="' + focusKey + '"]');
        if (t && !t.disabled) t.focus(); else {
          var fallback = list.querySelector('[data-key="' + focusKey.split(':')[0] + ':main"]'); if (fallback) fallback.focus();
        }
        focusKey = null;
      }
    }
    render();

    return {
      hasAnswer: function () { return true; },
      getAnswer: function () { return { order: order.slice() }; },
      getOrder: function () { return order.slice(); },
      reveal: function (result) {
        locked = true; selected = null; focusKey = null;
        list.textContent = '';
        list.classList.add('revealed');
        order.forEach(function (id) {
          var li = el('li', { class: 'item', 'data-id': id });
          li.appendChild(el('div', { class: 'margin' }, [chip(ch.info[id].role)]));
          li.appendChild(el('div', { class: 'sent', style: 'cursor:default' }, [ch.info[id].text]));
          li.appendChild(el('div'));
          li.style.gridTemplateColumns = '2.4rem minmax(0,1fr)';
          list.appendChild(li);
        });
        if (result.correct) return null;
        var box = el('div', { class: 'valid' }, [el('h4', { text: 'One valid arrangement' })]);
        var mini = el('ol', { class: 'mini' });
        ch.solution.order.forEach(function (id) {
          mini.appendChild(el('li', null, [chip(ch.info[id].role), el('span', { text: ch.info[id].text })]));
        });
        box.appendChild(mini);
        box.appendChild(el('p', { class: 'hint', text: 'The two evidence and explanation pairs can also be swapped.' }));
        return box;
      }
    };
  }
  R.rearrangeUI = { mount: mount };
})(typeof self !== 'undefined' ? self : this);
