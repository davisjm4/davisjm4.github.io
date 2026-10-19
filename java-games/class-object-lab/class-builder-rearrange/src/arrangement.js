/* Arrangement operations: the only ways a student can change the layout.
   Indices are "slot" indices in the list as currently displayed (0..length). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.CBR = root.CBR || {}; root.CBR.arrangement = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clone(arr) { return JSON.parse(JSON.stringify(arr)); }

  function findBlock(arr, id) {
    for (var s = 0; s < arr.sections.length; s++) {
      var i = arr.sections[s].findIndex(function (b) { return b.id === id; });
      if (i >= 0) return { block: arr.sections[s][i], section: s, index: i };
    }
    return null;
  }
  function findStmt(arr, id) {
    for (var s = 0; s < arr.sections.length; s++) {
      for (var bi = 0; bi < arr.sections[s].length; bi++) {
        var b = arr.sections[s][bi];
        if (!b.body) continue;
        var i = b.body.findIndex(function (st) { return st.id === id; });
        if (i >= 0) return { stmt: b.body[i], block: b, section: s, blockIndex: bi, index: i };
      }
    }
    return null;
  }

  /** Move a class-level block to a section slot. Returns a new arrangement, or null if invalid. */
  function moveBlock(arr, blockId, toSection, toIndex) {
    if (toSection < 0 || toSection > 2) return null;
    var next = clone(arr);
    var loc = findBlock(next, blockId);
    if (!loc) return null;
    var list = next.sections[toSection];
    if (toIndex < 0 || toIndex > list.length) return null;
    next.sections[loc.section].splice(loc.index, 1);
    if (loc.section === toSection && loc.index < toIndex) toIndex--;
    list = next.sections[toSection];
    list.splice(toIndex, 0, loc.block);
    return next;
  }

  /** Move a statement into a method body slot. Returns a new arrangement, or null if invalid. */
  function moveStmt(arr, stmtId, toBlockId, toIndex) {
    var next = clone(arr);
    var loc = findStmt(next, stmtId);
    var dest = findBlock(next, toBlockId);
    if (!loc || !dest || !dest.block.body) return null;
    var body = dest.block.body;
    if (toIndex < 0 || toIndex > body.length) return null;
    loc.block.body.splice(loc.index, 1);
    if (loc.block.id === toBlockId && loc.index < toIndex) toIndex--;
    dest.block.body.splice(toIndex, 0, loc.stmt);
    return next;
  }

  function allBlocks(arr) { return [].concat.apply([], arr.sections); }
  function allStmts(arr) {
    var out = [];
    allBlocks(arr).forEach(function (b) { (b.body || []).forEach(function (s) { out.push(s); }); });
    return out;
  }
  /** Layout signature that ignores ids: used to compare layouts / dedupe */
  function signature(arr) {
    return arr.sections.map(function (sec) {
      return sec.map(function (b) {
        return b.kind + (b.field ? '(' + b.field + ')' : '') + (b.body ? '[' + b.body.map(function (s) { return s.sem; }).join(',') + ']' : '');
      }).join('|');
    }).join('//');
  }

  return { clone: clone, findBlock: findBlock, findStmt: findStmt, moveBlock: moveBlock, moveStmt: moveStmt, allBlocks: allBlocks, allStmts: allStmts, signature: signature };
});
