/* String Lab — seeded random number generator (mulberry32 + xmur3 string hashing).
 * Pure JS, no DOM. Attaches to StringLab.Rng. */
(function (root) {
  'use strict';
  var SL = (root.StringLab = root.StringLab || {});

  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function Rng(seed) {
    this.seed = seed;
    var s = typeof seed === 'number' ? seed >>> 0 : xmur3(String(seed));
    this.state = s || 0x9e3779b9;
  }
  Rng.prototype.next = function () {
    var t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  /** Integer in [lo, hi] inclusive. */
  Rng.prototype.int = function (lo, hi) {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  };
  Rng.prototype.chance = function (p) { return this.next() < p; };
  Rng.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  Rng.prototype.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(this.next() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  /** Weighted pick: items array, weightFn(item) -> number >= 0. */
  Rng.prototype.weighted = function (items, weightFn) {
    var total = 0, i, w = [];
    for (i = 0; i < items.length; i++) { w[i] = Math.max(0, weightFn(items[i])); total += w[i]; }
    if (total <= 0) return items[Math.floor(this.next() * items.length)];
    var r = this.next() * total;
    for (i = 0; i < items.length; i++) { r -= w[i]; if (r < 0) return items[i]; }
    return items[items.length - 1];
  };
  /** Independent sub-stream derived from this stream's seed and a label. */
  Rng.prototype.fork = function (label) {
    return new Rng(xmur3(String(this.seed) + '|' + label));
  };

  Rng.hash = xmur3;
  SL.Rng = Rng;
})(typeof globalThis !== 'undefined' ? globalThis : this);
