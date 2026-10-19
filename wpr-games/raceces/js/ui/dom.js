/* Tiny DOM helpers shared by the UI modules. */
(function (root) {
  'use strict';
  var R = root.RACECES = root.RACECES || {};

  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }

  function announce(msg) {
    var live = document.getElementById('live');
    if (!live) return;
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 30);
  }

  // Margin chip showing the RACECES letter (C and E, never C1/E1).
  function chip(role) {
    var S = R.Structure;
    return el('span', { class: 'chip chip-' + role, role: 'img', 'aria-label': S.LABEL[role], title: S.LABEL[role], text: role });
  }

  R.dom = { el: el, announce: announce, chip: chip };
})(typeof self !== 'undefined' ? self : this);
