import * as E from '../generator.js';

export const FILTERS = ['mixed', ...Object.keys(E.TOPICS)];

// Measures one delivered sequence. `seq` items are generator outputs in order.
export function measure(seq) {
  let exactViolations = 0, familyViolations = 0, situationRepeats50 = 0, exactRelaxed = 0, cooldownRelaxed = 0, maxStreak = 0, streak = 0;
  const answers = { TCP: 0, UDP: 0 }, lastSeenSituation = new Map();
  let minSituationGap = Infinity;
  seq.forEach((q, i) => {
    const window = seq.slice(Math.max(0, i - E.HISTORY_LIMIT), i);
    if (window.some(p => p.id === q.id)) exactViolations++;
    if (seq.slice(Math.max(0, i - E.FAMILY_COOLDOWN), i).some(p => p.family === q.family)) familyViolations++;
    if (lastSeenSituation.has(q.situationId)) { const g = i - lastSeenSituation.get(q.situationId); minSituationGap = Math.min(minSituationGap, g); if (g <= 50) situationRepeats50++; }
    lastSeenSituation.set(q.situationId, i);
    if (q.exactRelaxed) exactRelaxed++; if (q.cooldownRelaxed) cooldownRelaxed++;
    answers[q.answer]++;
    streak = i && seq[i - 1].answer === q.answer ? streak + 1 : 1; maxStreak = Math.max(maxStreak, streak);
  });
  return { rounds: seq.length, exactViolations, familyViolations, situationRepeats50, minSituationGap, exactRelaxed, cooldownRelaxed, answers, tcpShare: answers.TCP / seq.length, maxStreak, predictability: predictability(seq.map(q => q.answer)) };
}

// Accuracy of simple strategies a student could use to guess from answer patterns
// alone (without reading). 0.5 is chance; the best one is reported.
export function predictability(ans) {
  const other = a => a === 'TCP' ? 'UDP' : 'TCP', results = {};
  const run = (name, guess) => { let ok = 0; for (let i = 1; i < ans.length; i++) if (guess(i) === ans[i]) ok++; results[name] = ok / (ans.length - 1); };
  run('repeat-last', i => ans[i - 1]);
  run('alternate', i => other(ans[i - 1]));
  for (let k = 2; k <= 4; k++) run(`switch-after-${k}`, i => { let s = 1; while (i - s - 1 >= 0 && ans[i - s - 1] === ans[i - 1]) s++; return s >= k ? other(ans[i - 1]) : ans[i - 1]; });
  run('fewer-so-far', i => { let t = 0; for (let j = 0; j < i; j++) t += ans[j] === 'TCP' ? 1 : -1; return t > 0 ? 'UDP' : 'TCP'; });
  const best = Object.entries(results).sort((a, b) => b[1] - a[1])[0];
  return { best: best[0], accuracy: best[1], all: results };
}

export function runFilter(seed, filter, rounds) {
  const g = E.createGenerator({ seed }), seq = [];
  for (let i = 0; i < rounds; i++) seq.push(g.next(filter));
  return seq;
}

// Random filter switches every 1–10 rounds; one generator, one shared history.
export function runSwitching(seed, rounds) {
  const g = E.createGenerator({ seed }), seq = []; let s = seed >>> 0, filter = 'mixed', left = 0;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < rounds; i++) {
    if (left-- <= 0) { filter = FILTERS[Math.floor(rnd() * FILTERS.length)]; left = 1 + Math.floor(rnd() * 10); }
    const q = g.next(filter); q.filter = filter; seq.push(q);
  }
  return seq;
}

// Simulated page reloads: rebuild the generator from saved history every `every` rounds.
export function runReloads(seed, rounds, every = 37, filter = 'mixed') {
  let g = E.createGenerator({ seed }); const seq = [];
  for (let i = 0; i < rounds; i++) {
    if (i && i % every === 0) g = E.createGenerator({ seed: seed + i, history: g.history() });
    seq.push(g.next(filter));
  }
  return seq;
}
