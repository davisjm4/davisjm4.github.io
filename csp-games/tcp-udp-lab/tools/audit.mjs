// Shortcut audits computed only from student-visible scenario text (scene + prompt).
// A "stump" predicts one answer when a feature is present and the other otherwise.
export const STOP = new Set('a an the and or of to in on for is are be it its it’s that this with as at by from so if each every one not no can must but has have their they them than then when while into over per about which what who also only just more most any all was were will would should could may might do does did'.split(' '));
export const words = s => [...new Set(s.toLowerCase().replace(/[’']/g, '').match(/[a-z0-9/.-]+/g).map(w => w.replace(/[.]+$/, '')).filter(w => w && !STOP.has(w)))];
export function stump(items, present) {
  let best = { acc: 0 };
  for (const yes of ['TCP', 'UDP']) {
    const no = yes === 'TCP' ? 'UDP' : 'TCP';
    const ok = items.filter(q => (present(q) ? yes : no) === q.answer).length;
    if (ok / items.length > best.acc) best = { acc: ok / items.length, yes };
  }
  return best;
}
export function lengthShortcut(items) {
  const lens = [...new Set(items.map(q => q.scene.split(/\s+/).length))].sort((a, b) => a - b);
  let best = { acc: 0 };
  for (const t of lens) { const r = stump(items, q => q.scene.split(/\s+/).length > t); if (r.acc > best.acc) best = { ...r, threshold: t }; }
  return best;
}
export function wordCues(items, minCount = 8) {
  const counts = new Map();
  for (const q of items) for (const w of words(q.scene)) { const c = counts.get(w) || { TCP: 0, UDP: 0 }; c[q.answer]++; counts.set(w, c); }
  return [...counts].filter(([, c]) => c.TCP + c.UDP >= minCount).map(([w, c]) => {
    const n = c.TCP + c.UDP, major = c.TCP >= c.UDP ? 'TCP' : 'UDP';
    return { word: w, n, TCP: c.TCP, UDP: c.UDP, purity: Math.max(c.TCP, c.UDP) / n, major, stumpAcc: stump(items, q => words(q.scene).includes(w)).acc };
  }).sort((a, b) => b.stumpAcc - a.stumpAcc);
}
export function appBalance(items) {
  const m = {};
  for (const q of items) { m[q.app] ??= { TCP: 0, UDP: 0 }; m[q.app][q.answer]++; }
  return Object.entries(m).map(([app, c]) => ({ app, ...c, n: c.TCP + c.UDP, majorShare: Math.max(c.TCP, c.UDP) / (c.TCP + c.UDP) })).sort((a, b) => b.n - a.n);
}
