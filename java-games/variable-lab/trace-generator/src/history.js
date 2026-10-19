// Signatures and bounded repetition control.
//  * exact signature    : the question exactly as the student sees it (code + target + answer)
//  * semantic signature : reasoning structure independent of names and literal values
//  * pattern key        : a coarser structural key used to keep any one pattern from dominating
// No student-identifying information is ever stored: histories hold only hashes and family codes.

import { renderProgram, defOf } from './model.js';
import { hashString } from './rng.js';
import { FAMILY_IDS } from './analysis.js';

const FAM_CODE = Object.fromEntries(FAMILY_IDS.map((f, i) => [f, i.toString(36)]));
const CODE_FAM = Object.fromEntries(FAMILY_IDS.map((f, i) => [i.toString(36), f]));
export const familyCodes = (fams) => fams.map((f) => FAM_CODE[f]).join('');
export const codesToFamilies = (codes) => [...(codes || '')].map((c) => CODE_FAM[c]).filter(Boolean);

function shape(e, names) {
  switch (e.k) {
    case 'lit': return 'L' + e.t[0];
    case 'var': {
      if (!(e.name in names)) names[e.name] = 'v' + Object.keys(names).length;
      return names[e.name];
    }
    case 'not': return `(! ${shape(e.e, names)})`;
    case 'bin': return `(${e.op}${e.paren ? 'p' : ''} ${shape(e.l, names)} ${shape(e.r, names)})`;
    default: return '?';
  }
}

export function exactSignature(program, target, answerText) {
  const code = renderProgram(program).map((l) => l.replace(/\s+/g, ' ').trim()).join('\n');
  const tgt = `${target.format}:${target.varName || ''}:${target.index}`;
  return { hash: hashString(`${code}␟${tgt}␟${answerText}`), source: `${code}\n@${tgt}\n=${answerText}` };
}

export function semanticSignature(program, target, analysis, difficulty) {
  const names = {};
  const rel = analysis.relevantLines.map((l) => l - 1);
  const parts = rel.map((i) => {
    const s = program[i];
    switch (s.k) {
      case 'decl': return `D:${s.t}:${(names[s.name] = names[s.name] || 'v' + Object.keys(names).length, names[s.name])}=${shape(s.expr, names)}`;
      case 'assign': { const sh = shape(s.expr, names); return `A:${names[s.name] ?? (names[s.name] = 'v' + Object.keys(names).length)}=${sh}`; }
      case 'compound': { const sh = shape(s.expr, names); return `C${s.op}:${names[s.name] ?? (names[s.name] = 'v' + Object.keys(names).length)}=${sh}`; }
      case 'incdec': return `I${s.op}:${names[s.name] ?? (names[s.name] = 'v' + Object.keys(names).length)}`;
      case 'print': return `P:${shape(s.expr, names)}`;
      default: return '?';
    }
  });
  const ord = new Map(rel.map((l, k) => [l + 1, k]));
  const deps = analysis.edges.filter((e) => ord.has(e.from) && ord.has(e.to)).map((e) => `${ord.get(e.from)}>${ord.get(e.to)}`).sort().join(',');
  const tgt = `${target.format}:${target.varName ? names[target.varName] ?? 'v?' : ''}`;
  const fam = analysis.families.join(',');
  const src = `${difficulty[0]}|F:${fam}|S:${parts.join(';')}|E:${deps}|T:${tgt}`;
  // pattern key: families + the operator skeleton of each relevant statement (shapes without tree detail)
  const skeleton = rel.map((i) => {
    const s = program[i];
    return s.k + (s.op || '') + (s.expr && s.expr.k === 'bin' ? s.expr.op : '');
  }).join(',');
  const pattern = hashString(`${difficulty[0]}|${fam}|${skeleton}|${target.format}`);
  return { hash: hashString(src), pattern, source: src };
}

// ---- recent-history store -------------------------------------------------------
export const HISTORY_DEFAULTS = Object.freeze({
  exactWindow: 200,        // never repeat an exact question inside this many recent challenges
  semanticWindow: { beginner: 8, intermediate: 25, advanced: 60 },
  patternWindow: 40,
  patternCap: { beginner: 40, intermediate: 5, advanced: 3 },
  maxEntries: 256,         // storage bound (>= exactWindow)
});

export function normalizeEntry(x) {
  if (!x) return null;
  if (typeof x === 'string') return { e: x, s: x, p: '', f: '' };
  if (Array.isArray(x)) return { e: x[0], s: x[1], p: x[2] || '', f: x[3] || '' };
  const e = x.exact ?? x.e, s = x.semantic ?? x.s;
  if (!e && !s) return null;
  return { e: e || '', s: s || '', p: x.pattern ?? x.p ?? '', f: Array.isArray(x.families) ? familyCodes(x.families) : (x.f || '') };
}

export class RecentHistory {
  constructor(opts = {}) {
    this.opts = { ...HISTORY_DEFAULTS, ...opts, semanticWindow: { ...HISTORY_DEFAULTS.semanticWindow, ...(opts.semanticWindow || {}) }, patternCap: { ...HISTORY_DEFAULTS.patternCap, ...(opts.patternCap || {}) } };
    this.entries = [];
  }
  static from(recent, opts) {
    if (recent instanceof RecentHistory) return recent;
    const h = new RecentHistory(opts);
    for (const x of Array.isArray(recent) ? recent : []) { const n = normalizeEntry(x); if (n) h.entries.push(n); }
    h._trim();
    return h;
  }
  _trim() { if (this.entries.length > this.opts.maxEntries) this.entries.splice(0, this.entries.length - this.opts.maxEntries); }
  record(challengeOrSigs) {
    const sg = challengeOrSigs.signatures || challengeOrSigs;
    const fam = challengeOrSigs.reasoningFamilies || challengeOrSigs.families || [];
    const n = normalizeEntry({ exact: sg.exact, semantic: sg.semantic, pattern: sg.pattern, families: fam });
    if (n) { this.entries.push(n); this._trim(); }
    return this;
  }
  recent(n) { return this.entries.slice(-n); }
  hasExact(sig) { return this.recent(this.opts.exactWindow).some((x) => x.e === sig); }
  semanticDistance(sig) { // 1 = most recent entry; Infinity if absent
    for (let i = this.entries.length - 1, d = 1; i >= 0; i--, d++) if (this.entries[i].s === sig) return d;
    return Infinity;
  }
  patternCount(p, win = this.opts.patternWindow) { return this.recent(win).filter((x) => x.p && x.p === p).length; }
  familyCounts(win = this.opts.patternWindow) {
    const c = {};
    for (const x of this.recent(win)) for (const f of codesToFamilies(x.f)) c[f] = (c[f] || 0) + 1;
    return c;
  }
  // verdict for a candidate. `penalty` ranks rejected candidates when nothing acceptable is found.
  judge(sigs, difficulty) {
    const reasons = [];
    let penalty = 0;
    if (this.hasExact(sigs.exact)) { reasons.push('exact'); penalty += 1000; }
    const sd = this.semanticDistance(sigs.semantic);
    const sw = this.opts.semanticWindow[difficulty];
    if (sd <= sw) { reasons.push('semantic'); penalty += 100 + (sw - sd); }
    const pc = this.patternCount(sigs.pattern);
    const cap = this.opts.patternCap[difficulty];
    if (pc >= cap) { reasons.push('pattern'); penalty += 10 + pc; }
    return { accept: reasons.length === 0, reasons, penalty };
  }
  toJSON() { return { v: 1, entries: this.entries.map((x) => [x.e, x.s, x.p, x.f]) }; }
  static fromJSON(j, opts) {
    const h = new RecentHistory(opts);
    if (j && j.v === 1 && Array.isArray(j.entries)) for (const x of j.entries) { const n = normalizeEntry(x); if (n) h.entries.push(n); }
    h._trim();
    return h;
  }
  // Optional persistence adapters (any object with getItem/setItem, e.g. window.localStorage).
  save(storage, key = 'variableLab.traceHistory.v1') {
    try { storage.setItem(key, JSON.stringify(this.toJSON())); return true; } catch { return false; }
  }
  static load(storage, key = 'variableLab.traceHistory.v1', opts) {
    try { const raw = storage.getItem(key); return raw ? RecentHistory.fromJSON(JSON.parse(raw), opts) : new RecentHistory(opts); } catch { return new RecentHistory(opts); }
  }
}
export { defOf };
