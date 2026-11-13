// List Lab audit: how many execute questions need index-shift reasoning, and what share a common misconception would still answer correctly.
// Reproduce: node cs-games/pathway/audit/csp-proficiency-a/list-misconceptions.mjs
import * as E from '../../../../csp-games/engine.js';
const N = 40000;
// plausible misconceptions the question should be able to catch
const zeroBased = (start, ops) => { let a = [...start]; for (const o of ops) { try {
  if (o.type === 'APPEND') a.push(o.value); else if (o.type === 'INSERT') { const i = o.index; if (i < 0 || i > a.length) return null; a.splice(i, 0, o.value); } else { const i = o.index; if (i < 0 || i >= a.length) return null; a.splice(i, 1); } } catch { return null; } } return a; };
const reversed = (start, ops) => { try { return E.runOperations(start, [...ops].reverse()); } catch { return null; } };
// "ignore the shift": every index refers to the ORIGINAL list positions (earlier inserts/removes do not move later indices)
const ignoreShift = (start, ops) => { let a = start.map((v, i) => ({ v, id: i })); const orig = [...a]; const seen = [];
  try { for (const o of ops) { if (o.type === 'APPEND') a.push({ v: o.value, id: 'n' + a.length }); else if (o.type === 'INSERT') { const ref = orig[o.index - 1]; const at = ref ? a.findIndex(x => x.id === ref.id) : a.length; a.splice(at < 0 ? a.length : at, 0, { v: o.value, id: 'n' + Math.random() }); } else { const ref = orig[o.index - 1]; const at = ref ? a.findIndex(x => x.id === ref.id) : -1; if (at < 0) return null; a.splice(at, 1); } } } catch { return null; } return a.map(x => x.v); };
const eq = (a, b) => a && b && JSON.stringify(a) === JSON.stringify(b);
const nonAppend = c => c.ops.filter(o => o.type !== 'APPEND').length;
let hist = {}, q = 0, nondiag = { zeroBased: 0, reversed: 0, ignoreShift: 0, any: 0 }, byFam = new Map(), l2 = 0;
for (let i = 0; i < N; i++) {
  const c = E.listChallenge(); const n = nonAppend(c); hist[n] = (hist[n] || 0) + 1;
  const fam = 'list-execute:' + c.ops.map(o => o.type.toLowerCase()).join('-');
  if (n >= 2) { q++; byFam.set(fam, (byFam.get(fam) || 0) + 1);
    const z = eq(zeroBased(c.start, c.ops), c.target), r = eq(reversed(c.start, c.ops), c.target), s = eq(ignoreShift(c.start, c.ops), c.target);
    nondiag.zeroBased += z; nondiag.reversed += r; nondiag.ignoreShift += s; nondiag.any += (z || r || s); }
  else l2++;
}
console.log('non-append operations per 4-op program', hist);
console.log('qualify (>=2 non-append):', (100 * q / N).toFixed(1) + '%', ' simple (0-1 non-append):', (100 * l2 / N).toFixed(1) + '%');
console.log('distinct qualifying families seen:', byFam.size, 'of 81 possible; most common share', (100 * Math.max(...byFam.values()) / q).toFixed(1) + '%');
console.log('qualifying questions that a misconception would still answer correctly (non-diagnostic):');
for (const [k, v] of Object.entries(nondiag)) console.log('  ', k.padEnd(12), (100 * v / q).toFixed(1) + '%');
const ex = []; for (let i = 0; ex.length < 3 && i < 2000; i++) { const c = E.listChallenge(); if (nonAppend(c) >= 3) ex.push(c); }
for (const c of ex) console.log('\nexample:', 'numbers ←', JSON.stringify(c.start), '\n  ' + c.ops.map(E.operationText).join('\n  '), '\n  target', JSON.stringify(c.target));
