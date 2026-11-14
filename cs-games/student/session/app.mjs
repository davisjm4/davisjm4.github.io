import { activeProfile } from '../../../wpr-games/workplace-readiness/online/profile-sync.mjs?v=guest-map-v1';
import { button, el } from '../../../wpr-games/workplace-readiness/online/dom.mjs';
import { classProfileActive } from '../guest/class-state.mjs';
import { GUEST_KEY, localDate } from '../guest/store.mjs';
import { firstTry, reportRows, reports, scopedReportUrl } from './reports.mjs';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const independent = !activeProfile;
let savedCourse, hasClass;
try {
  savedCourse = JSON.parse(localStorage.getItem(GUEST_KEY))?.course;
  hasClass = classProfileActive(localStorage);
} catch { /* Use the default course. */ }
const requested = params.get('course');
const courseId = Object.hasOwn(reports, requested) ? requested
  : activeProfile && Object.hasOwn(reports, activeProfile.courseId) ? activeProfile.courseId
  : Object.hasOwn(reports, savedCourse) ? savedCourse : 'advanced';
const course = reports[courseId];
const tracker = course.tracker?.();
const showPrint = Boolean(tracker || course.localSession);
const localOnly = courseId === 'raceces';
let lastRender = '';

$('session-scope').textContent = localOnly ? 'RACECES practice saved in this browser.' : independent
  ? 'Independent practice saved in this browser.'
  : 'Practice on this device for your class profile. Open Class Progress for synced evidence and teacher-reviewed results.';
$('independent-history').href = ['csp', 'advanced', 'robotics', 'workplace'].includes(courseId)
  ? '../guest/?course=' + courseId + '#my-session' : '../guest/#my-session';
if (activeProfile) {
  $('session-scope').append(' ', el('a', { href: '?course=' + courseId + '&learner=guest', text: 'View independent practice' }));
} else if (hasClass) {
  $('session-scope').append(' ', el('a', { href: './', text: 'View class profile practice' }));
}
function chooseCourse(id) {
  const url = new URL(location.href);
  url.searchParams.set('course', id);
  url.hash = 'today';
  location.assign(url);
}
$('course-choice').append(el('label', {}, 'Course or activity',
  el('select', { id: 'course-filter', onchange: event => chooseCourse(event.target.value) },
    Object.entries(reports).map(([id, item]) => el('option', { value: id, selected: id === courseId, text: item.title })))));

const legacyLink = (url, label) => el('a', { href: scopedReportUrl(url, independent), text: label });
const supplemental = courseId === 'robotics'
  ? [legacyLink('/cs-games/robotics/component-challenge/#summary', 'Component Challenge report')]
  : courseId === 'advanced'
    ? [legacyLink('/java-games/string-lab/', 'String Lab report and copy controls'), legacyLink('/java-games/search-sort-lab/', 'Search & Sort Lab results')]
    : [];
$('activity-reports').append(el('h3', { text: 'Activity reports' }),
  el('ul', {}, [legacyLink(course.url, course.label), ...supplemental].map(link => el('li', {}, link))));

function breakdown(rows, caption) {
  const text = ['Activity or mode', 'Attempted', 'First-try correct', 'Accuracy'];
  return el('table', { class: 'session-table' }, el('caption', { text: caption }),
    el('thead', {}, el('tr', {}, text.map(value => el('th', { scope: 'col', text: value })))),
    el('tbody', {}, rows.map(item => el('tr', {}, el('th', { scope: 'row', text: item.title }),
      el('td', { text: String(item.attempted) }), el('td', { text: String(item.firstTry) }),
      el('td', { text: firstTry(item) })))));
}

const name = el('input', { id: 'print-name', type: 'text', maxlength: 100, autocomplete: 'off' });
const period = el('input', { id: 'print-period', type: 'text', maxlength: 40, autocomplete: 'off' });
const identity = el('p', { class: 'print-only', id: 'print-identity' });
const printFields = el('div', { class: 'session-print-fields screen-only' },
  el('label', {}, 'Student name (optional)', name), el('label', {}, 'Class period (optional)', period));
function preparePrint() {
  identity.textContent = [name.value.trim(), period.value.trim() && 'Period ' + period.value.trim()].filter(Boolean).join(' · ');
}
for (const input of [name, period]) input.addEventListener('input', preparePrint);

const reset = el('dialog', { class: 'session-dialog', 'aria-labelledby': 'reset-heading' });
const cancel = button('Cancel', () => reset.close(), 'button');
const resetButton = button("Reset today's report", () => { reset.showModal(); cancel.focus(); }, 'button');
resetButton.id = 'reset-session';
reset.append(el('h3', { id: 'reset-heading', text: "Reset today's " + course.title + ' report?' }),
  el('p', { text: 'This clears the daily counts for this report. Your independent learning history and synced class evidence remain available.' }),
  el('div', { class: 'session-actions' }, cancel, button('Reset report', () => {
    tracker.reset(true);
    reset.close();
    render(true);
    resetButton.focus();
  }, 'button')));

function metric(label, value) {
  return el('div', {}, el('dt', { text: label }), el('dd', { text: String(value) }));
}
const printable = el('div');
const status = el('p', { role: 'status', class: 'screen-only' });
let copyText = '';
const card = el('div', { class: 'session-card' }, el('h3', { text: course.title }), identity, printable, status);
$('daily-report').append(card);
if (showPrint) {
  const print = button('Print / Save as PDF', () => { preparePrint(); window.print(); }, 'button');
  const copy = button('Copy summary', async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      status.textContent = 'Summary copied.';
    } catch {
      status.textContent = 'This browser did not allow copying. You can print or save the report as a PDF.';
    }
  }, 'button');
  card.insertBefore(el('div', { class: 'screen-only' }, independent || localOnly ? printFields : null,
    el('div', { class: 'session-actions' }, print, copy, tracker ? resetButton : null), tracker ? reset : null), printable);
}
function render(confirmed = false) {
  const snapshot = tracker?.snapshot() ?? course.localSession?.();
  if (!snapshot) {
    lastRender = '';
    printable.replaceChildren(el('p', { text: 'No saved practice for this activity.' }));
    copyText = course.title + ' · No saved practice';
    return;
  }
  const { totals } = snapshot;
  const sessionDate = snapshot.sessionDate ?? localDate(snapshot.started);
  const rows = reportRows(snapshot.games);
  const signature = JSON.stringify([sessionDate, totals, rows, snapshot.activeSeconds, tracker?.warning]);
  if (!confirmed && signature === lastRender) return;
  lastRender = signature;
  copyText = [
    course.title + ' · ' + sessionDate,
    independent || localOnly ? 'Independent practice' : 'Class profile practice on this device',
    'First-try correct: ' + totals.firstTry + ' of ' + totals.attempted + ' (' + firstTry(totals) + ')',
    ...rows.flatMap(item => [item, ...item.modes.map(mode => ({ ...mode, title: item.title + ' · ' + mode.title }))])
      .map(item => item.title + ': ' + item.firstTry + ' of ' + item.attempted + ' (' + firstTry(item) + ')'),
  ].join('\n');
  const duration = Math.floor((snapshot.activeSeconds || 0) / 60);
  printable.replaceChildren(
    el('p', { text: (tracker ? 'Session date · ' : 'Activity session started · ') + sessionDate }),
    ...(!tracker ? [el('p', { text: 'These totals cover the current activity session. Use the activity report for its full breakdown and reset options.' })] : []),
    el('dl', { class: 'session-metrics' }, metric('Attempted', totals.attempted),
      metric('First-try correct', totals.firstTry), metric('First-try accuracy', firstTry(totals)), metric('Active practice', duration + ' min ' + ((snapshot.activeSeconds || 0) % 60) + ' sec')),
    el('p', { text: 'First-try accuracy uses the first submitted answer for each challenge. Active practice excludes idle and away time.' }),
    rows.length ? breakdown(rows, 'By activity') : el('p', { text: 'No practice recorded for this course today.' }),
    ...rows.filter(row => row.modes.length).map(row => breakdown(row.modes, row.title + ' by practice mode')));
  status.textContent = confirmed ? 'Daily report reset.' : tracker?.warning ?? '';
}
render();
if (showPrint) {
  window.addEventListener('beforeprint', preparePrint);
  window.addEventListener('storage', () => render());
  window.addEventListener('pageshow', () => render());
  setInterval(() => { if (!document.hidden) render(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
}
