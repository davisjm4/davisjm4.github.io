/* Standalone bootstrap. In Class & Object Lab, call CBR.ui.mount(el, { adapter }) from the lab's mode switcher instead. */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var diff = params.get('level');
  if (['beginner', 'intermediate', 'advanced'].indexOf(diff) === -1) diff = 'beginner';
  var root = document.getElementById('cbr-root');
  window.CBR_APP = window.CBR.ui.mount(root, {
    seed: params.get('seed') || undefined,          // ?seed=abc makes the whole sequence reproducible
    challengeSeed: params.get('challenge') || undefined,   // ?challenge=abc&level=advanced loads one specific challenge
    difficulty: diff,
    adapter: window.CBR_SESSION_ADAPTER || undefined  // optional: host page may define this before loading
  });
})();
