/* Seeded random number generator (mulberry32). The engine never uses the browser's unseeded generator. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.RACECES = root.RACECES || {}; root.RACECES.RNG = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function hashSeed(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function create(seed) {
    var s = typeof seed === 'string' ? hashSeed(seed) : (Number(seed) >>> 0);
    var next = mulberry32(s);
    var api = {
      seed: s,
      next: next,
      int: function (n) { return Math.floor(next() * n); },
      range: function (lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
      chance: function (p) { return next() < p; },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(next() * (i + 1));
          var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
      },
      sample: function (arr, k) { return api.shuffle(arr).slice(0, k); },
      fork: function (label) { return create(s + ':' + label); }
    };
    return api;
  }

  return { create: create, hashSeed: hashSeed };
});
