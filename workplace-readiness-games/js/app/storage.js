/* Workplace Readiness Games - local storage wrapper.
 * Stores only practice statistics and the generator seed for this device. It never stores
 * names, accounts or any student-identifying information. If localStorage is blocked
 * (private mode, locked-down Chromebook policy) it falls back to memory for the page's life. */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var api = factory();
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.storage = api; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var KEY = 'wrg.v1';

  function create(backend) {
    var mem = null, usable = false;
    try {
      if (backend) { backend.setItem('wrg.__t', '1'); backend.removeItem('wrg.__t'); usable = true; }
    } catch (e) { usable = false; }
    return {
      persistent: usable,
      load: function () {
        try {
          var raw = usable ? backend.getItem(KEY) : (mem && JSON.stringify(mem));
          if (!raw) return null;
          var d = JSON.parse(raw);
          return d && d.version === 1 ? d : null;
        } catch (e) { return null; }
      },
      save: function (data) {
        try {
          if (usable) backend.setItem(KEY, JSON.stringify(data)); else mem = JSON.parse(JSON.stringify(data));
          return true;
        } catch (e) { mem = JSON.parse(JSON.stringify(data)); return false; }
      },
      clear: function () {
        mem = null;
        try { if (usable) backend.removeItem(KEY); } catch (e) { /* ignore */ }
      }
    };
  }
  return { create: create, KEY: KEY };
}));
