/* Java class model + Java source rendering/formatting.
   A "model" describes the class to build: { className, fields:[{name,type,Name,sampleA,sampleB}] }.
   Arrangement shape (used everywhere):
     { sections: [ [block...], [block...], [block...] ] }
   block: { id, kind:'field'|'ctor'|'getter'|'setter'|'tostring', field?, header?, lines?, body?:[stmt...] }
   stmt : { id, kind:'assign'|'return'|'tostring', field?, sem, lines:[...] }
   `sem` is the semantic key used by the grader ("assign:name", "return:name", "tostring"). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CBR = root.CBR || {}; root.CBR.javaModel = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEYWORDS = ('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null var record yield sealed permits').split(' ');
  var IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
  var SECTION_COMMENTS = ['// 1. Instance Variables', '// 2. Constructor', '// 3. Methods'];
  var IND = '    ';

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function isValidIdentifier(s) { return IDENT.test(s) && KEYWORDS.indexOf(s) === -1; }

  function buildModel(className, fieldDefs, rng) {
    var fields = fieldDefs.map(function (f) {
      var a = rng ? rng.int(0, f.samples.length - 1) : 0;
      var b = rng ? rng.int(0, f.samples.length - 2) : 1;
      if (b >= a) b++;
      if (b >= f.samples.length) b = (a + 1) % f.samples.length;
      return { name: f.name, type: f.type, Name: cap(f.name), sampleA: f.samples[a], sampleB: f.samples[b] };
    });
    return { className: className, fields: fields };
  }

  /* ---------- Java text for individual pieces ---------- */
  function fieldDecl(f) { return 'private ' + f.type + ' ' + f.name + ';'; }
  function ctorHeader(m) {
    return 'public ' + m.className + '(' + m.fields.map(function (f) { return f.type + ' ' + f.name; }).join(', ') + ') {';
  }
  function getterHeader(f) { return 'public ' + f.type + ' get' + f.Name + '() {'; }
  function setterHeader(f) { return 'public void set' + f.Name + '(' + f.type + ' ' + f.name + ') {'; }
  var TOSTRING_HEADER = 'public String toString() {';
  function assignLine(f) { return 'this.' + f.name + ' = ' + f.name + ';'; }
  function returnLine(f) { return 'return this.' + f.name + ';'; }

  /** toString return statement as an array of visual lines (one logical statement). */
  function toStringLines(m) {
    return m.fields.map(function (f, i) {
      var label = (i === 0 ? '' : '\\n') + f.name + ': ';
      var expr = '"' + label + '" + this.' + f.name;
      if (i === 0) return 'return ' + expr;
      return '     + ' + '"' + label + '" + this.' + f.name;
    }).map(function (line, i, arr) { return i === arr.length - 1 ? line + ';' : line; });
  }

  /* ---------- Block factories ---------- */
  function makeBlocks(m, nextId) {
    var fieldBlocks = [], getters = [], setters = [];
    var ctor = {
      id: nextId('b'), kind: 'ctor', header: ctorHeader(m),
      body: m.fields.map(function (f) {
        return { id: nextId('s'), kind: 'assign', field: f.name, sem: 'assign:' + f.name, lines: [assignLine(f)] };
      })
    };
    m.fields.forEach(function (f) {
      fieldBlocks.push({ id: nextId('b'), kind: 'field', field: f.name, lines: [fieldDecl(f)] });
      getters.push({
        id: nextId('b'), kind: 'getter', field: f.name, header: getterHeader(f),
        body: [{ id: nextId('s'), kind: 'return', field: f.name, sem: 'return:' + f.name, lines: [returnLine(f)] }]
      });
      setters.push({
        id: nextId('b'), kind: 'setter', field: f.name, header: setterHeader(f),
        body: [{ id: nextId('s'), kind: 'assign', field: f.name, sem: 'assign:' + f.name, lines: [assignLine(f)] }]
      });
    });
    var ts = {
      id: nextId('b'), kind: 'tostring', header: TOSTRING_HEADER,
      body: [{ id: nextId('s'), kind: 'tostring', sem: 'tostring', lines: toStringLines(m) }]
    };
    return { fields: fieldBlocks, ctor: ctor, getters: getters, setters: setters, toString: ts };
  }

  /** The canonical arrangement: getter/setter pairs, toString last. */
  function canonicalArrangement(m, nextId) {
    var b = makeBlocks(m, nextId);
    var methods = [];
    b.getters.forEach(function (g, i) { methods.push(g); methods.push(b.setters[i]); });
    methods.push(b.toString);
    return { sections: [b.fields, [b.ctor], methods] };
  }

  /* ---------- Rendering assembled Java ---------- */
  function renderBlock(block, indent) {
    var out = [];
    if (block.kind === 'field') { out.push(indent + block.lines[0]); return out; }
    out.push(indent + block.header);
    block.body.forEach(function (st) {
      st.lines.forEach(function (ln, i) { out.push(indent + IND + (i === 0 ? '' : '') + ln); });
    });
    out.push(indent + '}');
    return out;
  }

  /** Render the current arrangement as Java text (valid Java when the arrangement is correct). */
  function renderArrangement(m, arr) {
    var lines = ['public class ' + m.className + ' {'];
    arr.sections.forEach(function (sec, i) {
      if (i > 0) lines.push('');
      lines.push(IND + SECTION_COMMENTS[i]);
      sec.forEach(function (bl) { renderBlock(bl, IND).forEach(function (l) { lines.push(l); }); });
    });
    lines.push('}');
    return lines.join('\n') + '\n';
  }

  /** Literal for a sample value, for the "new X(...)" example and test drivers. */
  function literal(type, sample) {
    if (type === 'String') return '"' + sample + '"';
    if (type === 'char') return "'" + sample + "'";
    return sample;
  }
  function sampleConstruction(m, which) {
    return 'new ' + m.className + '(' + m.fields.map(function (f) { return literal(f.type, which === 'B' ? f.sampleB : f.sampleA); }).join(', ') + ')';
  }
  /** Expected output of toString() for the A (or B) samples, with real newlines. */
  function expectedToString(m, which) {
    return m.fields.map(function (f) { return f.name + ': ' + (which === 'B' ? f.sampleB : f.sampleA); }).join('\n');
  }

  return {
    KEYWORDS: KEYWORDS, SECTION_COMMENTS: SECTION_COMMENTS, IND: IND,
    cap: cap, isValidIdentifier: isValidIdentifier, buildModel: buildModel,
    fieldDecl: fieldDecl, ctorHeader: ctorHeader, getterHeader: getterHeader, setterHeader: setterHeader,
    TOSTRING_HEADER: TOSTRING_HEADER, assignLine: assignLine, returnLine: returnLine, toStringLines: toStringLines,
    makeBlocks: makeBlocks, canonicalArrangement: canonicalArrangement,
    renderArrangement: renderArrangement, renderBlock: renderBlock,
    literal: literal, sampleConstruction: sampleConstruction, expectedToString: expectedToString
  };
});
