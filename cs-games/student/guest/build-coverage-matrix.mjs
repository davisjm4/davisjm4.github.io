// Generates ACTIVITY_COVERAGE.md and activity-coverage.csv: which activities can contribute local, question-level progress.
//   node cs-games/student/guest/build-coverage-matrix.mjs           write files
//   node cs-games/student/guest/build-coverage-matrix.mjs --check   fail if the committed files are stale
// Everything is derived from the repository: the curriculum graph, the Java evidence registry, a static scan of each activity page for
// the shared tracker it imports (resolved to a real path), and the browser test source (which activities were exercised in real Chromium).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const graph = JSON.parse(fs.readFileSync(path.join(repo, 'cs-games/pathway/curriculum-graph.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(repo, 'cs-games/pathway/evidence-gap-registry.json'), 'utf8'));
const browserSource = fs.readFileSync(path.join(here, 'tests/browser-tests.mjs'), 'utf8');
const hooked = new Set(['java-games/session.js', 'csp-games/session.js', 'cs-games/robotics/parts-sprint/session.js']
  .filter(f => /recordGuestAttempt\(/.test(fs.readFileSync(path.join(repo, f), 'utf8'))));
import { resolveEventNodes } from './evidence.mjs';
const SHARED = new Set(['java-games/session.js', 'csp-games/session.js', 'cs-games/robotics/parts-sprint/session.js']);
const courseTitle = Object.fromEntries(graph.courses.map(c => [c.id, c.title]));
const COURSE_ORDER = ['advanced', 'csp', 'robotics', 'workplace'];

function files(dir, depth = 3) {
  if (!fs.existsSync(dir) || depth < 0) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name.startsWith('.') || e.name === 'node_modules' || /^(tests?|reports?|samples?)$/.test(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p, depth - 1) : /\.(m?js|html)$/.test(e.name) && !/(test|tests)\./.test(e.name) ? [p] : [];
  });
}
// Follow local imports transitively (pages usually reach the tracker through a shared script such as csp-games/app.js).
function specifiers(src) {
  const esm = [...src.matchAll(/(?:from\s*|import\s*\(\s*|import\s+)['"]([^'"\n]+)['"]/g)].map(m => m[1]).filter(x => /^(\.|\/)/.test(x));
  const tags = [...src.matchAll(/\bsrc\s*=\s*['"]([^'"\n]+)['"]/g)].map(m => m[1]).filter(x => !/^(https?:|data:|\/\/|#)/.test(x)); // HTML paths may be bare-relative
  return [...esm, ...tags].map(x => x.replace(/[?#].*$/, ''));
}
function reachable(entry, seen = new Set(), depth = 6) {
  if (seen.has(entry) || depth < 0 || !fs.existsSync(entry) || !/\.(m?js|html)$/.test(entry)) return seen;
  seen.add(entry);
  for (const spec of specifiers(fs.readFileSync(entry, 'utf8'))) reachable(path.resolve(spec.startsWith('/') ? path.join(repo, spec) : path.dirname(entry), spec), seen, depth - 1);
  return seen;
}
function trackerFor(activityUrl) {
  const dir = path.join(repo, activityUrl.replace(/^\//, ''));
  const entries = [...new Set([...(fs.existsSync(path.join(dir, 'index.html')) ? [path.join(dir, 'index.html')] : []), ...files(dir)])];
  const found = new Set(); let scored = false;
  for (const entry of entries) for (const f of reachable(entry)) {
    const rel = path.relative(repo, f), src = fs.readFileSync(f, 'utf8');
    const isTracker = SHARED.has(rel); // lab-specific files that happen to be named session.js are activity code, not the shared tracker
    if (isTracker) found.add(rel);
    if (/queuePractice\(|profile-student/.test(src) && /wpr-games/.test(rel + dir)) found.add('wpr-games/workplace-readiness/online/profile-student.mjs');
    if (!isTracker && /\.begin\(/.test(src) && /\.submit\(/.test(src)) scored = true; // the page opens and submits scored questions through a tracker
  }
  return { trackers: [...found], scored };
}


// Skills that can receive credit at all, measured through the guest adapter's real mapping. CSP credit depends on the question topic, so the
// topic list below is a sample and the CSP figure is a LOWER BOUND, not a claim that the other skills can never be credited.
const TOPIC_SAMPLE = [null, 'representation/pixels', 'capacity', 'overflow', 'rerouting', 'state', 'procedures/parameter', 'procedures/call', 'variables/assignment', 'selection', 'iteration', 'lists', 'quick.bugs', 'quick.predict', 'algorithms', 'abstraction/x', 'io', 'behavior', 'metadata', 'cleaning', 'limitations', 'graph/x', 'visualization/x', 'history', 'privacy', 'consent', 'measurement', 'criteria'];
function reach(course, allowed) {
  const nodes = graph.nodes.filter(n => n.courseId === course), hit = new Set();
  for (const n of nodes) for (const p of n.practice) {
    if (!allowed.has(course + '|' + p.activityId)) continue; // only activities whose answers really reach the guest store

    const modes = new Set([null]);
    for (const sel of n.familySelectors) for (const m of [sel.modeId, ...(sel.modeIds || []), ...(sel.modes || [])]) if (m) modes.add(m);
    const families = graph.questionFamilies.filter(f => f.nodeIds.includes(n.id) && f.activityId === p.activityId).map(f => f.sourceFamilyId);
    for (const mode of modes) for (const topic of course === 'csp' ? TOPIC_SAMPLE : [null, ...n.familySelectors.map(x => x.category).filter(Boolean)]) for (const familyId of [null, ...families.slice(0, 2)])
      resolveEventNodes(graph, { id: 'x:1', questionId: 'x', courseId: course, activityId: p.activityId, assessedMode: mode, mode, topic, familyId, correct: true, occurred: 1 }).forEach(i => hit.add(i));
  }
  return { reachable: hit.size, total: nodes.length, ids: [...hit].sort() };
}

const rows = [];
const byActivity = new Map();
for (const node of graph.nodes) for (const p of node.practice) {
  const key = node.courseId + '|' + p.activityId;
  const row = byActivity.get(key) ?? { course: node.courseId, activityId: p.activityId, url: p.url, nodes: 0 };
  row.nodes++; byActivity.set(key, row);
}
for (const row of byActivity.values()) {
  const { trackers, scored } = trackerFor(row.url);
  const wired = trackers.filter(t => hooked.has(t));
  const regEntries = registry.entries.filter(e => e.game === row.activityId);
  let basis, limits;
  if (row.course === 'workplace') { basis = 'None for guests'; limits = 'Reports through the Workplace Readiness profile queue (queuePractice), which is class-only. A guest adapter for that path is follow-up work.'; }
  else if (regEntries.length) {
    const c = {}; for (const e of regEntries) c[e.status] = (c[e.status] || 0) + 1;
    const full = c['fully-supported'] || 0;
    basis = `${full} of ${regEntries.length} modes fully supported (mode and family bound to one skill)`;
    limits = Object.entries(c).filter(([s]) => s !== 'fully-supported').map(([s, n]) => `${n} mode${n > 1 ? 's' : ''} ${s}`).join('; ') || 'None recorded in the registry';
  } else if (row.course === 'csp') { basis = 'Question topic mapped to a CSP skill (exam-readiness mapping)'; limits = 'Credit depends on the mapping resolving a skill for each question; questions it cannot map count as answered but credit no skill.'; }
  else if (row.activityId === 'parts-sprint') { basis = 'Part category and mode selector'; limits = 'Credits the node whose category the question belongs to.'; }
  else { basis = 'Generic mode selector'; limits = 'Credit only if the activity reports a mode that matches a node selector.'; }
  const reports = trackers.length > 0;
  const status = wired.length && scored ? 'Local question-level progress' : wired.length ? 'Follow-up: tracker imported but no scored-question calls found' : reports ? 'Follow-up: tracker not hooked for guests' : 'Practice only: no shared tracker';
  rows.push({ ...row, trackers, scored, wired: wired.length > 0, reports, basis, limits, status, browser: browserSource.includes(row.activityId) });
}
for (const r of rows) if (r.browser && r.status.startsWith('Practice only')) throw new Error(`Self-check failed: ${r.activityId} is exercised in real Chromium but the scan found no tracker. Fix the scan.`);
rows.sort((a, b) => COURSE_ORDER.indexOf(a.course) - COURSE_ORDER.indexOf(b.course) || (a.status < b.status ? -1 : a.status > b.status ? 1 : 0) || (a.activityId < b.activityId ? -1 : 1));

const allowed = new Set(rows.filter(r => r.status === 'Local question-level progress').map(r => r.course + '|' + r.activityId));
const esc = s => String(s).replace(/\|/g, '\\|');
let md = `# Activity coverage for independent learners\n\nGenerated by \`build-coverage-matrix.mjs\` from graph version ${graph.version}, the Java evidence registry, and a static scan of each activity page. Do not edit by hand.\n\n` +
  'An activity contributes local progress only when (1) its page imports a shared session tracker and (2) that tracker is one of the three that route first-attempt answers to the guest store. Everything else stays open for practice and says so on the page.\n\n' +
  '"Verified in real Chromium" means this activity is exercised in `tests/browser-tests.mjs`. The parity test (`tests/parity.test.mjs`) separately checks guest credit against the Worker for every skill selector in the graph.\n';
const summary = [];
for (const course of COURSE_ORDER) {
  const list = rows.filter(r => r.course === course);
  const counts = list.reduce((m, r) => (m[r.status] = (m[r.status] || 0) + 1, m), {});
  summary.push({ course, activities: list.length, skills: graph.nodes.filter(n => n.courseId === course).length, reach: reach(course, allowed), ...counts });
  md += `\n## ${courseTitle[course]}\n\n${list.length} activities, ${graph.nodes.filter(n => n.courseId === course).length} skills. ` + Object.entries(counts).map(([k, v]) => `${v} × ${k.toLowerCase()}`).join(', ') + '.\n\n';
  md += '| Activity | Skills | Guest progress | Credit basis | Verified in real Chromium | Limits |\n| --- | ---: | --- | --- | --- | --- |\n';
  for (const r of list) md += `| ${r.activityId} | ${r.nodes} | ${esc(r.status)} | ${esc(r.basis)} | ${r.browser ? 'Yes' : 'No'} | ${esc(r.limits)} |\n`;
}
md += '\n## Summary\n\n| Course | Activities | Skills | Activities with local progress | Follow-up | Practice only | Skills whose practice updates the guest page (measured) |\n| --- | ---: | ---: | ---: | ---: | ---: | --- |\n' +
  summary.map(s => `| ${courseTitle[s.course]} | ${s.activities} | ${s.skills} | ${s['Local question-level progress'] || 0} | ${(s['Follow-up: tracker not hooked for guests'] || 0) + (s['Follow-up: tracker imported but no scored-question calls found'] || 0)} | ${s['Practice only: no shared tracker'] || 0} | ${s.reach.reachable} of ${s.reach.total}${s.course === 'csp' ? ' (lower bound)' : ''} |`).join('\n') + '\n\n"Skills that can receive credit" is measured through the guest adapter\'s real mapping with synthetic events. It is not the same as an activity emitting events: an activity with no tracker can still map to skills, but it will not report them. For AP CSP the figure is a lower bound because credit depends on question topics and only a sample of topics is probed.\n';
const csv = ['course,activity,skills,guest_progress,tracker_imports,credit_basis,verified_in_chromium,limits',
  ...rows.map(r => [r.course, r.activityId, r.nodes, r.status, r.trackers.join(' + '), r.basis, r.browser ? 'yes' : 'no', r.limits].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n') + '\n';

const tracked = [...new Set(summary.flatMap(x => x.reach.ids))].sort();
const dataModule = `// Generated by build-coverage-matrix.mjs. Do not edit by hand.\n// Skills whose practice updates the guest page: an activity that scores through a hooked tracker can credit them (measured, see ACTIVITY_COVERAGE.md).\nexport const TRACKED_GRAPH_VERSION = ${JSON.stringify(graph.version)};\nexport const TRACKED_NODE_IDS = new Set(${JSON.stringify(tracked)});\n`;
const out = [[path.join(here, 'ACTIVITY_COVERAGE.md'), md], [path.join(here, 'activity-coverage.csv'), csv], [path.join(here, 'coverage-data.mjs'), dataModule]];
if (process.argv.includes('--check')) {
  const stale = out.filter(([f, c]) => !fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== c);
  if (stale.length) { console.log('Stale: ' + stale.map(([f]) => path.basename(f)).join(', ')); process.exit(1); }
  console.log('Coverage matrix is current.');
} else { for (const [f, c] of out) fs.writeFileSync(f, c); console.log(summary.map(s => JSON.stringify({ ...s, reach: `${s.reach.reachable}/${s.reach.total}` })).join('\n')); }
