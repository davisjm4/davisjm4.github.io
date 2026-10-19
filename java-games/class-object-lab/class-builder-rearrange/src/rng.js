/* Seeded random number helpers (mulberry32). Browser global: CBR.rng; Node: require('./rng.js') */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CBR = root.CBR || {}; root.CBR.rng = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function hashSeed(seed) {
    var s = String(seed), h = 1779033703 ^ s.length;
    for (var i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function Rng(seed) {
    this.state = hashSeed(seed) || 1;
  }
  Rng.prototype.next = function () {
    var t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /** integer in [min, max] inclusive */
  Rng.prototype.int = function (min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  };
  Rng.prototype.chance = function (p) { return this.next() < p; };
  Rng.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  /** returns a shuffled copy (Fisher-Yates) */
  Rng.prototype.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(this.next() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  Rng.prototype.sample = function (arr, n) { return this.shuffle(arr).slice(0, n); };

  return { Rng: Rng, hashSeed: hashSeed, create: function (seed) { return new Rng(seed); } };
});
