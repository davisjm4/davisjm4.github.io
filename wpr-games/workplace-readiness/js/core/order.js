/* Workplace Readiness Games - ordering challenge logic.
 * Ordering is graded by precedence relationships, not a single answer sequence.
 * A response is valid when every "before -> after" relation holds. Any other
 * arrangement that respects those relations is accepted.
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var api = factory();
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.order = api; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function isPermutationOf(order, ids) {
    if (!Array.isArray(order) || order.length !== ids.length) return false;
    var seen = Object.create(null);
    for (var i = 0; i < order.length; i++) {
      if (seen[order[i]] || ids.indexOf(order[i]) === -1) return false;
      seen[order[i]] = true;
    }
    return true;
  }

  /* Returns the relations broken by `order` (empty array => valid sequence). */
  function violations(order, precedence) {
    var pos = Object.create(null);
    order.forEach(function (id, i) { pos[id] = i; });
    return precedence.filter(function (p) { return pos[p.before] > pos[p.after]; });
  }

  function isValid(order, ids, precedence) {
    return isPermutationOf(order, ids) && violations(order, precedence).length === 0;
  }

  function permutations(arr) {
    if (arr.length <= 1) return [arr.slice()];
    var out = [];
    arr.forEach(function (x, i) {
      var rest = arr.slice(0, i).concat(arr.slice(i + 1));
      permutations(rest).forEach(function (p) { out.push([x].concat(p)); });
    });
    return out;
  }

  function enumerateValid(ids, precedence) {
    return permutations(ids).filter(function (p) { return violations(p, precedence).length === 0; });
  }

  /* True when the relations contain a cycle (no order could satisfy them). */
  function hasCycle(ids, precedence) {
    return enumerateValid(ids, precedence).length === 0;
  }

  /* Deterministic example solution: topological order, ties broken by authored order. */
  function solution(ids, precedence) {
    var remaining = ids.slice(), out = [];
    while (remaining.length) {
      var pick = null;
      for (var i = 0; i < remaining.length; i++) {
        var id = remaining[i];
        var blocked = precedence.some(function (p) { return p.after === id && remaining.indexOf(p.before) !== -1; });
        if (!blocked) { pick = id; break; }
      }
      if (pick === null) return null;
      out.push(pick);
      remaining.splice(remaining.indexOf(pick), 1);
    }
    return out;
  }

  /* Fraction of relations a response satisfies (used only to word feedback). */
  function satisfiedFraction(order, precedence) {
    if (!precedence.length) return 1;
    return (precedence.length - violations(order, precedence).length) / precedence.length;
  }

  return { isPermutationOf: isPermutationOf, violations: violations, isValid: isValid,
           permutations: permutations, enumerateValid: enumerateValid, hasCycle: hasCycle,
           solution: solution, satisfiedFraction: satisfiedFraction };
}));
