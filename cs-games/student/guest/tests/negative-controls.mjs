// Mutation checks: each entry breaks one rule in the real source, runs the suite, and expects the suite to fail. Files are restored afterwards.
//   node cs-games/student/guest/tests/negative-controls.mjs [--browser]   (browser mutations need the static server on :8123)
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const root = new URL('../', import.meta.url).pathname;
const repo = new URL('../../../../', import.meta.url).pathname;
const M = [
  ['store.mjs', 'a visitor who has not opted in gets a record written', "if (!current.tracking || current.events.some(e => e.id === event.id)) return false;", "if (current.events.some(e => e.id === event.id)) return false;"],
  ['store.mjs', 'the same attempt can be stored twice', ".events.some(e => e.id === event.id)", ".events.some(e => false)", true],
  ['store.mjs', 'imported files can assign skill credit', "cleanState(doc.data, { keepCredit: false })", "cleanState(doc.data, { keepCredit: true })"],
  ['store.mjs', 'any self-assessment value is accepted from a file', "!MARK_STATES.includes(m.state) ||", ""],
  ['store.mjs', 'archive totals lose counts when compacting', "state.archiveTotals.answered++; state.archiveTotals.correct += e.correct ? 1 : 0;", "state.archiveTotals.correct += e.correct ? 1 : 0;"],
  ['store.mjs', 'clear wipes the whole browser storage', "storage?.removeItem(GUEST_KEY); storage?.removeItem(GUEST_KEY + ':corrupt');", "storage?.clear?.(); for (const k of Object.keys(storage || {})) storage.removeItem(k);"],
  ['store.mjs', 'guest key collides with class profile storage', "export const GUEST_KEY = 'cs-games:guest:v1';", "export const GUEST_KEY = 'wrg.profile.guest.v1';"],
  ['evidence.mjs', 'a correct retry counts as another first-attempt success', "if (record.submissions !== 1) return null;", ""],
  ['evidence.mjs', 'assisted answers count', "if (details.assisted === true) return null;", ""],
  ['evidence.mjs', 'Mixed Practice credits the requested mode, not the question shown', "meta(details.practiceMode) || meta(details.format) || meta(details.mode) || meta(record.mode)", "meta(record.mode) || meta(details.practiceMode)"],
  ['evidence.mjs', 'an activity from another course earns credit', "if (!activityCourses(graph).get(event.activityId)?.has(event.courseId)) return [];", ""],
  ['evidence.mjs', 'a default family is invented when none was sent', "details.modelId || details.componentId),", "details.modelId || details.componentId) || 'modulus:larger',"],
  ['progress.mjs', 'self-reported familiarity becomes practice', "p.practiceStatus === 'not-started' && p.mark === 'familiar' ? 'familiar' : p.practiceStatus", "p.practiceStatus === 'not-started' && p.mark === 'familiar' ? 'practiced' : p.practiceStatus"],
  ['suggest.mjs', 'familiar skills are suggested as next', "const unvisited = open.filter(n => stat(n).answered === 0 && stat(n).mark !== 'familiar');", "const unvisited = open.filter(n => stat(n).answered === 0);"],
  ['suggest.mjs', 'needs-practice marks are ignored', "marked.forEach(n => add(n, 'marked', stat(n)));", ""],
  ['suggest.mjs', 'low accuracy is ignored', "open.filter(n => stat(n).lowAccuracy).sort(", "open.filter(n => false).sort("],
  ['pathway.mjs', 'a calendar or due dates leak into guest pathways', "classId: 'guest', title: course.title + ' pathway', courseId, calendar: null", "classId: 'guest', title: course.title + ' pathway', courseId, calendar: { start: '2026-09-01', end: '2027-06-01', timeZone: 'America/Los_Angeles', weekdays: [1,2,3,4,5] }"],
  ['app.mjs', 'the page sends data over the network', "fetch(new URL('../../pathway/curriculum-graph.json', import.meta.url))", "fetch(new URL('../../pathway/curriculum-graph.json', import.meta.url), { method: 'POST', body: '{}' })"],
  ['hook.mjs', 'the hook imports class profile sync', "import { createGuestStore } from './store.mjs';", "import { createGuestStore } from './store.mjs';\nimport '../../../wpr-games/workplace-readiness/online/profile-sync.mjs';"],
];
const B = [
  ['app.mjs', 'the pathway is rendered outside the shared panel (unstyled controls)', "el('section', { class: 'student-panel guest-pathway', 'aria-label': 'Learning pathway' }, pathwayEl)", "pathwayEl"],
  ['app.mjs', 'a null child prints "null" on the page', "].filter(Boolean)); // replaceChildren(null)", "]); // replaceChildren(null)"],
  ['app.mjs', 'merely visiting writes to the browser', "if (reconcileEvents(probe, graph)) store.update(", "if (true) store.update("],
];
const unit = () => spawnSync('node', ['--test', ...fs.readdirSync(root + 'tests').filter(f => f.endsWith('.test.mjs')).map(f => root + 'tests/' + f)], { encoding: 'utf8', cwd: repo });
const browser = () => spawnSync('node', [root + 'tests/browser-tests.mjs'], { encoding: 'utf8', cwd: repo });
const baseline = unit();
if (baseline.status !== 0) { console.log('Baseline unit suite is not green; aborting.'); process.exit(2); }
let caught = 0, total = 0; const missed = [];
let active = null; // the file currently mutated; restored even if this process is interrupted
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { if (active) fs.writeFileSync(active.p, active.original); process.exit(130); });
function run(list, runner, label) {
  for (const [file, name, from, to, all] of list) {
    const p = root + file, original = fs.readFileSync(p, 'utf8');
    if (!original.includes(from)) { console.log('SKIP (pattern not found)', file, name); missed.push('pattern missing: ' + name); total++; continue; }
    active = { p, original };
    try { fs.writeFileSync(p, all ? original.replaceAll(from, to) : original.replace(from, to)); total++; const r = runner(); if (r.status !== 0) { caught++; console.log(`CAUGHT  [${label}] ${name}`); } else { missed.push(name); console.log(`MISSED  [${label}] ${name}`); } }
    finally { fs.writeFileSync(p, original); active = null; }
  }
}
run(M, unit, 'unit');
if (process.argv.includes('--browser')) {
  const base = browser(); // a mutation only counts as caught if the browser suite was green before it, so a dead server cannot fake a catch
  if (base.status !== 0) { console.log('Browser baseline is not green; aborting browser mutations.\n' + base.stdout.split('\n').filter(l => /FAIL|CHECKS/.test(l)).join('\n')); process.exit(2); }
  run(B, browser, 'browser');
}
console.log(`\nNEGATIVE CONTROLS: ${caught} of ${total} caught`);
if (missed.length) { console.log('Not caught:\n' + missed.join('\n')); process.exit(1); }
