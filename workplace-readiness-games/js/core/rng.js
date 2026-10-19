/* Workplace Readiness Games - seeded randomness.
 * Deterministic, dependency-free. Works in browsers (window.WRG.rng) and Node (require).
 * No Math.random anywhere in the engine: every choice flows from a seed string.
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var api = factory();
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.rng = api; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // xmur3 string hash -> 32-bit seed generator
  function hashString(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }

  // mulberry32 PRNG
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function create(seedString) {
    var seed = String(seedString);
    var next = mulberry32(hashString(seed));
    var self = {
      seed: seed,
      float: next,
      int: function (n) { return Math.floor(next() * n); },
      range: function (min, max) { return min + Math.floor(next() * (max - min + 1)); },
      chance: function (p) { return next() < p; },
      pick: function (arr) {
        if (!arr || !arr.length) throw new Error('rng.pick on empty array');
        return arr[Math.floor(next() * arr.length)];
      },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(next() * (i + 1));
          var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
      },
      // items: [{ weight, value }]; zero/negative weights are never chosen
      weighted: function (items) {
        var total = 0, i;
        for (i = 0; i < items.length; i++) total += Math.max(0, items[i].weight);
        if (total <= 0) throw new Error('rng.weighted with no positive weights');
        var r = next() * total;
        for (i = 0; i < items.length; i++) {
          var w = Math.max(0, items[i].weight);
          if (r < w) return items[i].value;
          r -= w;
        }
        return items[items.length - 1].value;
      },
      // Independent child stream; adding draws elsewhere never shifts it.
      fork: function (label) { return create(seed + '::' + label); }
    };
    return self;
  }

  return { create: create, hashString: hashString, mulberry32: mulberry32 };
}));
