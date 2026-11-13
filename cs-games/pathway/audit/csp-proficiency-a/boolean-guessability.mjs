// Boolean Gatekeeper audit: how often a make-it-TRUE question needs both inputs, and how likely a random pair is to open the gate.
// Reproduce: node cs-games/pathway/audit/csp-proficiency-a/boolean-guessability.mjs
import * as E from '../../../../csp-games/engine.js';
const N = 40000;
const leaves = e => e.a ? leaves(e.a) + (e.b ? leaves(e.b) : 0) : 1;
const nots = e => (e.op === 'NOT' ? 1 : 0) + (e.a ? nots(e.a) + (e.b ? nots(e.b) : 0) : 0);
const depthOps = e => e.a ? new Set([e.op, ...depthOps(e.a), ...(e.b ? depthOps(e.b) : [])]) : new Set();
const solutionsOf = e => { let s = []; for (let x = 0; x <= 12; x++) for (let y = 0; y <= 12; y++) if (E.evaluate(e, { x, y })) s.push({ x, y }); return s; };
// same test the game now applies in make mode (csp-games/app.js)
const needsBoth = sol => ['x', 'y'].every(i => Array.from({ length: 13 }, (_, v) => sol.filter(p => p[i] === v).length).every(c => c < 13));
let qual = 0, byOp = { AND: 0, OR: 0, NOT: 0 }, dens = [], all = [], leafCount = {}, evalTrue = 0;
for (let i = 0; i < N; i++) {
  const c = E.booleanChallenge(); const d = c.solutions.length / 169; all.push(d);
  if (needsBoth(c.solutions)) { qual++; byOp[c.e.op]++; dens.push(d); }
  const l = leaves(c.e); leafCount[l] = (leafCount[l] || 0) + 1; if (E.evaluate(c.e, c.values)) evalTrue++;
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
console.log('make-mode questions sampled', N);
console.log('qualify as both-inputs:', (100 * qual / N).toFixed(1) + '%', 'by root op', byOp);
console.log('solution density (chance a random pair opens the gate) among qualifying: median', q(dens, .5).toFixed(2), 'p25', q(dens, .25).toFixed(2), 'p75', q(dens, .75).toFixed(2), 'mean', (dens.reduce((a, b) => a + b, 0) / dens.length).toFixed(2));
for (const t of [0.15, 0.25, 0.4, 0.5, 0.7]) console.log(`  density <= ${t}:`, (100 * dens.filter(d => d <= t).length / dens.length).toFixed(1) + '% of qualifying', '=', (100 * dens.filter(d => d <= t).length / N).toFixed(1) + '% of all');
// chance that guessing a uniformly random pair earns Level 3 (rule: >=8 answered, >=85% => 7 of 8)
const binom = (n, k, p) => { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c * p ** k * (1 - p) ** (n - k); };
const reach = p => [7, 8].reduce((s, k) => s + binom(8, k, p), 0);
const avgGuess = dens.reduce((s, d) => s + reach(d), 0) / dens.length;
console.log('P(random-pair guessing reaches 7 of 8) averaging over qualifying questions as drawn:', (100 * avgGuess).toFixed(1) + '%');
for (const t of [0.15, 0.25, 0.4]) { const sub = dens.filter(d => d <= t); console.log(`  if only density <= ${t} counted:`, (100 * sub.reduce((s, d) => s + reach(d), 0) / sub.length).toFixed(3) + '%'); }
console.log('leaf comparisons per expression', leafCount, ' evaluate answer is TRUE', (100 * evalTrue / N).toFixed(1) + '%');
