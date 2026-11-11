// Regression tests for the plain-language Teacher Tools mapping layer.
// Run: node --test cs-games/teacher/ui-model-tests.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPathway, clone } from '../pathway/model.mjs';
import { generatePacing } from '../pathway/pacing.mjs';
import { meetings } from '../pathway/calendar.mjs';
import {
  courseLabel, describeWeekdays, scheduleModeFromCalendar, classLabelsFromCalendar, calendarFromSchedule,
  offsetForKnownDay, rotationLabelOn, scheduleSummary, formatDate, publicationStatus, draftStatus, filterSkills
} from './ui-model.mjs';

const graph = JSON.parse(readFileSync(new URL('../pathway/curriculum-graph.json', import.meta.url), 'utf8'));
const base = { start: '2026-08-10', end: '2027-05-28', weekdays: [1, 2, 3, 4, 5], minutes: 80, rotation: ['A', 'B'], classRotations: [], rotationOffset: 0, overrides: [] };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test('course names are teacher-readable, never ids', () => {
  assert.equal(courseLabel('advanced'), 'Advanced Computer Science');
  assert.equal(courseLabel('csp'), 'AP Computer Science Principles');
  assert.equal(courseLabel('something-unknown'), 'Course');
});

test('the editor default (A/B, meets every school day) is recognised without being rewritten', () => {
  assert.equal(scheduleModeFromCalendar(base), 'ab');
  assert.deepEqual(classLabelsFromCalendar(base), ['A', 'B']);
  const rebuilt = calendarFromSchedule(base, { mode: 'ab', weekdays: base.weekdays, classLabels: ['A', 'B'], offset: base.rotationOffset });
  assert.ok(same(rebuilt, base), 'saving untouched settings must reproduce the stored calendar exactly');
});

test('mode detection covers every schedule type', () => {
  assert.equal(scheduleModeFromCalendar({ ...base, rotation: [], classRotations: [] }), 'every');
  assert.equal(scheduleModeFromCalendar({ ...base, rotation: [], weekdays: [1, 3, 5] }), 'weekdays');
  assert.equal(scheduleModeFromCalendar({ ...base, rotation: ['A', 'B'], classRotations: ['A'] }), 'ab');
  assert.equal(scheduleModeFromCalendar({ ...base, rotation: ['1', '2', '3'] }), 'custom');
});

test('weekday checkboxes become the stored weekday numbers (Sunday = 0)', () => {
  const out = calendarFromSchedule(base, { mode: 'weekdays', weekdays: [5, 1, 3] });
  assert.deepEqual(out.weekdays, [1, 3, 5]);
  assert.deepEqual(out.rotation, []);
  assert.equal(describeWeekdays([1, 3, 5]), 'Mon, Wed, Fri');
  assert.equal(describeWeekdays([1, 2, 3, 4, 5]), 'Monday–Friday');
  assert.deepEqual(calendarFromSchedule(base, { mode: 'weekdays', weekdays: [0, 6] }).weekdays, [6, 0]);
  assert.throws(() => calendarFromSchedule(base, { mode: 'weekdays', weekdays: [] }), /at least one day/);
});

test('A-day-only classes store the class rotation; both labels store an empty list', () => {
  assert.deepEqual(calendarFromSchedule(base, { mode: 'ab', weekdays: [1, 2, 3, 4, 5], classLabels: ['A'] }).classRotations, ['A']);
  assert.deepEqual(calendarFromSchedule(base, { mode: 'ab', weekdays: [1, 2, 3, 4, 5], classLabels: ['A', 'B'] }).classRotations, []);
  assert.throws(() => calendarFromSchedule(base, { mode: 'ab', weekdays: [1], classLabels: [] }), /A days, B days, or both/);
});

test('every school day clears rotation and uses Monday–Friday', () => {
  const out = calendarFromSchedule({ ...base, weekdays: [1, 2], classRotations: ['A'], rotationOffset: 1 }, { mode: 'every', weekdays: [] });
  assert.deepEqual([out.weekdays, out.rotation, out.classRotations, out.rotationOffset], [[1, 2, 3, 4, 5], [], [], 0]);
});

test('custom rotations validate their labels', () => {
  const out = calendarFromSchedule(base, { mode: 'custom', weekdays: [1, 2, 3, 4, 5], customRotation: ['Day 1', ' Day 2 ', 'Day 3'], customClassLabels: ['Day 2'] });
  assert.deepEqual(out.rotation, ['Day 1', 'Day 2', 'Day 3']);
  assert.deepEqual(out.classRotations, ['Day 2']);
  assert.throws(() => calendarFromSchedule(base, { mode: 'custom', weekdays: [1], customRotation: ['Only'] }), /at least two/);
  assert.throws(() => calendarFromSchedule(base, { mode: 'custom', weekdays: [1], customRotation: ['A', 'A'] }), /different/);
});

test('a known A-day or B-day date sets the existing rotation offset correctly', () => {
  // With offset 0 the first school day (Mon Aug 10) is an A day; Aug 11 is a B day.
  assert.equal(rotationLabelOn(base, '2026-08-11'), 'B');
  const offset = offsetForKnownDay(base, '2026-08-11', 'A');
  assert.equal(offset, 1);
  assert.equal(rotationLabelOn({ ...base, rotationOffset: offset }, '2026-08-11'), 'A');
  // Every following school day alternates from that anchor, skipping weekends.
  const rows = meetings({ ...base, rotationOffset: offset });
  const byDate = Object.fromEntries(rows.map(r => [r.date, r.rotation]));
  assert.deepEqual(['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-17'].map(d => byDate[d]), ['B', 'A', 'B', 'A', 'B', 'A']);
});

test('known-day anchoring respects closures and rejects impossible dates', () => {
  assert.throws(() => offsetForKnownDay(base, '2026-08-15', 'A'), /not a school day/);       // Saturday
  assert.throws(() => offsetForKnownDay(base, '2025-01-01', 'A'), /outside the school calendar/);
  assert.throws(() => offsetForKnownDay(base, '2026-08-11', 'C'), /rotation labels/);
  const withClosure = { ...base, overrides: [{ date: '2026-08-12', dayType: 'No Class', schoolDay: false }] };
  const offset = offsetForKnownDay(withClosure, '2026-08-13', 'A');
  assert.equal(rotationLabelOn({ ...withClosure, rotationOffset: offset }, '2026-08-13'), 'A');
});

test('an A/B class that meets only on A days actually meets half the school days', () => {
  const all = meetings(base).filter(m => m.meets).length;
  const aOnly = meetings(calendarFromSchedule(base, { mode: 'ab', weekdays: [1, 2, 3, 4, 5], classLabels: ['A'] })).filter(m => m.meets).length;
  assert.ok(aOnly > all * 0.4 && aOnly < all * 0.6, `${aOnly} of ${all}`);
});

test('schedule summaries use words, not field names', () => {
  assert.equal(scheduleSummary(base), 'A/B block · meets on A and B days · 80 minutes per meeting');
  assert.equal(scheduleSummary({ ...base, rotation: [], weekdays: [1, 2, 3, 4, 5] }), 'Meets every school day · 80 minutes per meeting');
});

test('date-only formatting never shifts the day', () => {
  assert.equal(formatDate('2026-08-10'), 'Aug 10, 2026');
  assert.equal(formatDate('2027-01-01'), 'Jan 1, 2027');
  assert.equal(formatDate('nonsense'), '');
});

function pathway() {
  let p = createPathway(graph, { title: 'Class', courseId: 'advanced', calendar: base });
  p.examDate = '2027-05-21';
  return generatePacing(p, graph);
}

test('publication status distinguishes never published, unpublished changes, and published', () => {
  const p = pathway();
  assert.equal(publicationStatus({ published: null, draft: p }).key, 'never');
  const published = { ...clone(p), revision: 3 };
  const clean = publicationStatus({ published, draft: clone(published) });
  assert.equal(clean.key, 'published');
  assert.match(clean.detail, /Students see the published pathway/);
  const edited = clone(published);
  edited.checkpoints[0].minutes += 10;
  const changed = publicationStatus({ published, draft: edited });
  assert.equal(changed.key, 'changes');
  assert.equal(changed.changeCount, 1);
  assert.match(changed.detail, /Students still see the published pathway/);
});

test('draft status says where the working copy lives', () => {
  assert.equal(draftStatus({ connected: false, remote: false, dirty: true }).key, 'browser');
  assert.equal(draftStatus({ connected: true, remote: false, dirty: false }).key, 'browser');
  assert.equal(draftStatus({ connected: true, remote: true, dirty: true }).key, 'unsaved');
  assert.equal(draftStatus({ connected: true, remote: true, dirty: false }).key, 'saved');
});

test('skill search matches title, area or standard code across words', () => {
  const skills = [
    { title: 'Trace variable state', area: 'Variable Lab', standards: 'CS.1.A' },
    { title: 'Choose a loop type', area: 'Loop Lab', standards: '' }
  ];
  assert.equal(filterSkills(skills, '').length, 2);
  assert.deepEqual(filterSkills(skills, 'loop').map(s => s.area), ['Loop Lab']);
  assert.deepEqual(filterSkills(skills, 'variable cs.1').map(s => s.title), ['Trace variable state']);
  assert.equal(filterSkills(skills, 'zzz').length, 0);
});

test('stored pathway data shapes are untouched by the interface layer', () => {
  const p = pathway();
  const before = JSON.stringify(p);
  publicationStatus({ published: p, draft: p });
  offsetForKnownDay(p.calendar, '2026-08-11', 'A');
  assert.equal(JSON.stringify(p), before);
});
