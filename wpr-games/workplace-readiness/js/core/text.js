/* Workplace Readiness Games - template text resolution.
 *
 * Token syntax:  {name}  {name.prop}  {name|filter}  {name.prop|filter}
 *   {coworker}            -> person's first name
 *   {coworker.subj}       -> he / she / they      ({coworker.Subj} capitalizes)
 *   {role|a}              -> "a dental assistant" ("an" chosen automatically)
 *   {record|the}          -> "the sterilization log"
 *   {client.plural}       -> "patients"
 *   {net|money}           -> "$412.50"
 * A token whose name starts with a capital letter capitalizes its output ({Lead|the}).
 * Unresolved tokens throw, so a broken template can never reach a student.
 */
(function (root, factory) {
  var isNode = typeof module === 'object' && module.exports;
  var api = factory();
  if (isNode) { module.exports = api; }
  else { root.WRG = root.WRG || {}; root.WRG.text = api; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TOKEN_RE = /\{([A-Za-z][A-Za-z0-9_]*)(?:\.([A-Za-z]+))?(?:\|([a-z0-9]+))?\}/g;
  var FILTERS = ['a', 'the', 'cap', 'money', 'money0', 'int', 'pct', 'dec1'];

  function capitalize(s) { return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  var AN_EXCEPTIONS_A = /^(uni|use|usu|eu|one|once|ubiq)/i;
  var AN_EXCEPTIONS_AN = /^(hour|honest|honor|heir|mba|x-ray|xray)/i;
  function article(word) {
    if (AN_EXCEPTIONS_AN.test(word)) return 'an';
    if (AN_EXCEPTIONS_A.test(word)) return 'a';
    return /^[aeiou]/i.test(word) ? 'an' : 'a';
  }

  function commas(n, decimals) {
    var fixed = Number(n).toFixed(decimals);
    var parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function applyFilter(value, filter) {
    switch (filter) {
      case 'a': return article(String(value)) + ' ' + value;
      case 'the': return 'the ' + value;
      case 'cap': return capitalize(String(value));
      case 'money': return '$' + commas(value, 2);
      case 'money0': return '$' + commas(value, 0);
      case 'int': return commas(Math.round(value), 0);
      case 'pct': return commas(value, Number.isInteger(value) ? 0 : 1) + '%';
      case 'dec1': return commas(value, 1);
      default: throw new Error('Unknown filter "' + filter + '"');
    }
  }

  /* Returns every token in a string as {raw,name,prop,filter}. */
  function tokens(str) {
    var out = [], m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(str)) !== null) {
      out.push({ raw: m[0], name: m[1], prop: m[2] || null, filter: m[3] || null });
    }
    return out;
  }

  /* scope: name -> string | number | object{text, ...props}.
   * used: optional array that collects inserted slot strings (for leak masking). */
  function render(str, scope, used) {
    return str.replace(TOKEN_RE, function (raw, name, prop, filter) {
      var upper = /^[A-Z]/.test(name) || (prop && /^[A-Z]/.test(prop));
      var key = name;
      if (!Object.prototype.hasOwnProperty.call(scope, key)) key = lowerFirst(name);
      if (!Object.prototype.hasOwnProperty.call(scope, key)) throw new Error('Unresolved token ' + raw);
      var val = scope[key], out;
      if (prop) {
        var p = lowerFirst(prop);
        if (val === null || typeof val !== 'object' || !(p in val)) throw new Error('Unresolved property in token ' + raw);
        out = val[p];
      } else if (val !== null && typeof val === 'object') {
        out = val.text !== undefined ? val.text : val.name;
        if (out === undefined) throw new Error('Object has no text for token ' + raw);
      } else {
        out = val;
      }
      if (typeof out === 'number' && !Number.isFinite(out)) throw new Error('Non-finite number in token ' + raw);
      if (filter) {
        if (FILTERS.indexOf(filter) === -1) throw new Error('Unknown filter in token ' + raw);
        out = applyFilter(out, filter);
      }
      out = String(out);
      if (used && typeof val === 'object' && (!prop || prop === 'plural' || prop === 'text')) used.push(out);
      return upper ? capitalize(out) : out;
    });
  }

  function words(str) {
    var m = String(str).toLowerCase().match(/[a-z0-9$%'\-]+/g);
    return m || [];
  }
  function wordCount(str) { return words(str).length; }
  function normalize(str) { return words(str).join(' '); }

  return { tokens: tokens, render: render, words: words, wordCount: wordCount, normalize: normalize,
           capitalize: capitalize, FILTERS: FILTERS, TOKEN_RE: TOKEN_RE };
}));
