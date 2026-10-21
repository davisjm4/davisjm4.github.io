/* Grammar helpers for the compositional generator: agreement, articles, capitalization,
   sentence finishing, and a lint pass that rejects malformed generated sentences. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.RACECES = root.RACECES || {}; root.RACECES.Grammar = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Third-person singular forms that the suffix rules below would get wrong.
  var IRREGULAR_3SG = { have: 'has', be: 'is', do: 'does', go: 'goes', can: 'can', will: 'will', may: 'may', must: 'must', might: 'might', could: 'could', would: 'would', should: 'should' };

  /* Conjugate the first word of a base-form verb phrase for a singular subject.
     "slow water loss" -> "slows water loss"; "carry pollen" -> "carries pollen". */
  function s3(vp) {
    var m = /^(\S+)(.*)$/.exec(vp);
    if (!m) return vp;
    var w = m[1], rest = m[2], out;
    if (IRREGULAR_3SG[w]) out = IRREGULAR_3SG[w];
    else if (/(s|sh|ch|x|z|o)$/.test(w)) out = w + 'es';
    else if (/[^aeiou]y$/.test(w)) out = w.slice(0, -1) + 'ies';
    else out = w + 's';
    return out + rest;
  }
  /* Verb phrase that agrees with a subject: plural subjects keep the base form. */
  function agree(vp, plural) { return plural ? vp : s3(vp); }
  function be(plural) { return plural ? 'are' : 'is'; }
  function has(plural) { return plural ? 'have' : 'has'; }
  function it(f) { return f && f.pl ? 'they' : 'it'; }
  function them(f) { return f && f.pl ? 'them' : 'it'; }
  function its(f) { return f && f.pl ? 'their' : 'its'; }
  function dem(plural) { return plural ? 'These' : 'This'; }
  function demLower(plural) { return plural ? 'these' : 'this'; }

  // Words starting with a vowel letter but a consonant sound, and the reverse.
  var AN_EXCEPT = /^(uni|use|usu|uti|eu|one|once|ura)/i;
  var AN_SILENT_H = /^(hour|honest|honor|heir)/i;
  function article(np) {
    var w = String(np).trim();
    if (AN_SILENT_H.test(w)) return 'an';
    if (/^[aeiou]/i.test(w) && !AN_EXCEPT.test(w)) return 'an';
    return 'a';
  }
  function withArticle(np) { return article(np) + ' ' + np; }

  function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }

  // Lowercase the first letter only when the sentence opens with an ordinary word, so proper
  // nouns ("Brindle Lake") keep their capital when a clause is embedded after "that".
  var COMMON_OPENERS = ['the', 'a', 'an', 'in', 'its', 'their', 'during', 'when', 'after', 'each', 'some', 'both', 'this', 'these',
    'on', 'at', 'by', 'one', 'two', 'researchers', 'scientists', 'students', 'engineers', 'over', 'every', 'while', 'without', 'with',
    'because', 'as', 'once', 'where', 'although', 'though', 'if', 'for', 'over', 'unlike', 'like', 'whenever', 'there', 'adding', 'using', 'they', 'it', 'that', 'those', 'for', 'before', 'most', 'many', 'only', 'near', 'inside', 'later', 'then', 'at', 'from', 'under', 'all', 'no', 'more', 'less', 'at'];
  /* Lowercase the first letter when a sentence is embedded after "that" or an opener, unless it
     begins with a proper noun from the current scenario (e.g. "Brindle Lake", "Mars"). */
  function lowerFirst(s, proper) {
    s = String(s);
    var first = (/^([A-Za-z]+)/.exec(s) || [])[1] || '';
    if (first === 'I') return s;
    if (proper && proper.some(function (p) { return p && s.indexOf(p) === 0; })) return s;
    if (!proper && COMMON_OPENERS.indexOf(first.toLowerCase()) < 0) return s;
    return s.charAt(0).toLowerCase() + s.slice(1);
  }
  function stripEnd(s) { return String(s).trim().replace(/[.?!]+$/, ''); }

  /* Finish a sentence: collapse spacing, capitalize, ensure exactly one terminal mark. */
  function finish(s, mark) {
    s = String(s).replace(/\s+/g, ' ').replace(/\s+([,.;:?!])/g, '$1').trim();
    s = stripEnd(s);
    return cap(s) + (mark || '.');
  }

  function list(items, conj) {
    conj = conj || 'and';
    if (items.length <= 1) return items.join('');
    if (items.length === 2) return items[0] + ' ' + conj + ' ' + items[1];
    return items.slice(0, -1).join(', ') + ', ' + conj + ' ' + items[items.length - 1];
  }

  var SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  function numWord(n) { return n >= 0 && n < SMALL.length ? SMALL[n] : String(n); }
  function plural(n, one, many) { return n === 1 ? one : many; }

  /* Lint: returns a list of problems. An empty list means the sentence passed every rule. */
  var DOUBLE_OK = { that: true, had: true };
  function lint(s) {
    var issues = [];
    if (typeof s !== 'string' || !s.trim()) return ['empty sentence'];
    if (/[{}<>\[\]]/.test(s)) issues.push('unresolved placeholder');
    if (/\b(undefined|null|NaN|\[object)\b/.test(s)) issues.push('unresolved value');
    if (!/^[A-Z0-9“"]/.test(s)) issues.push('does not start with a capital');
    if (!/[.?!]$/.test(s)) issues.push('missing terminal punctuation');
    if (/\s{2,}/.test(s)) issues.push('double space');
    if (/\s[,.;:?!]/.test(s)) issues.push('space before punctuation');
    if (/[,.;:]{2,}|\.\s*\./.test(s.replace(/\.\.\./g, ''))) issues.push('repeated punctuation');
    if (/,\s*[.?!]$/.test(s)) issues.push('comma before end');
    // Truly adjacent duplicate words ("the the"); a comma between them is legitimate.
    var dup = /\b([A-Za-z']+)\s+\1\b/i.exec(s);
    if (dup && !DOUBLE_OK[dup[1].toLowerCase()]) issues.push('repeated word "' + dup[1] + '"');
    // Article agreement ("a apple", "an tool").
    var re = /\b(a|an)\s+([A-Za-z][\w-]*)/g, m;
    while ((m = re.exec(s))) {
      if (m[1].toLowerCase() === 'a' && m[2].length === 1) continue;
      if (/^[A-Z]{2,}/.test(m[2])) continue; // acronyms
      var want = article(m[2]);
      if (want !== m[1].toLowerCase()) { issues.push('article "' + m[1] + ' ' + m[2] + '"'); break; }
    }
    // Common agreement slips that template substitution could produce.
    var LEAD = "(?:^|[,;:] |\\b(?:because|since|so|and|but|when|if|while) )";
    var AGREE = [new RegExp(LEAD + '(it|this) (have|are|were)\\b', 'i'), new RegExp(LEAD + '(they|these) (has|is|was|does)\\b', 'i'),
      /\bto (\w+s) \w+ing\b/];
    AGREE.forEach(function (r) { var mm = r.exec(s); if (mm) issues.push('agreement: "' + mm[0].trim() + '"'); });
    // A function word capitalized in mid-sentence means an embedded clause kept its capital.
    var midCap = /[a-z,] (Where|The|In|A|An|One|Some|All|During|When|Each|Both|This|These|It|Its|Their|They|After|Before|While|Because|Since|On|At|Most|Many|Researchers|Scientists|Students|Engineers|Without|With|If|Over|Every)\b/.exec(s);
    if (midCap) issues.push('capital inside sentence: "' + midCap[0] + '"');
    if (/\b(without|with|for|to|of|from|than) (they|we|he|she)\b/i.test(s)) issues.push('subject pronoun used as object');
    if (/\b(\w+) (\w+) \1 \2\b/i.test(s)) issues.push('repeated phrase');
    return issues;
  }

  return {
    s3: s3, agree: agree, it: it, its: its, them: them, be: be, has: has, dem: dem, demLower: demLower, article: article, withArticle: withArticle,
    cap: cap, lowerFirst: lowerFirst, stripEnd: stripEnd, finish: finish, list: list, numWord: numWord, plural: plural, lint: lint
  };
});
