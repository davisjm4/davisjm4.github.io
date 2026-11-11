// Presentation-only helpers for the Teacher Tools and Class Learning Pathway screens.
// Nothing here changes a stored data shape: every function maps between the existing
// calendar/pathway contract and the plain-language controls teachers see.
import { meetings } from '../pathway/calendar.mjs';
import { diffPathways } from '../pathway/model.mjs';

export const COURSE_LABELS = {
  workplace: 'Workplace Readiness',
  csp: 'AP Computer Science Principles',
  advanced: 'Advanced Computer Science',
  robotics: 'Robotics 1'
};
export const courseLabel = id => COURSE_LABELS[id] || 'Course';

// Display order Monday → Sunday; `n` is the stored value (Sun = 0).
export const WEEKDAYS = [
  { n: 1, short: 'Mon', long: 'Monday' }, { n: 2, short: 'Tue', long: 'Tuesday' },
  { n: 3, short: 'Wed', long: 'Wednesday' }, { n: 4, short: 'Thu', long: 'Thursday' },
  { n: 5, short: 'Fri', long: 'Friday' }, { n: 6, short: 'Sat', long: 'Saturday' },
  { n: 0, short: 'Sun', long: 'Sunday' }
];
const SCHOOL_WEEK = [1, 2, 3, 4, 5];
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

export function describeWeekdays(weekdays) {
  const picked = WEEKDAYS.filter(d => weekdays.includes(d.n));
  if (!picked.length) return 'no days selected';
  if (sameSet(weekdays, SCHOOL_WEEK)) return 'Monday–Friday';
  return picked.map(d => d.short).join(', ');
}

export const SCHEDULE_MODES = [
  { id: 'every', label: 'Every school day', help: 'The class meets on every instructional day, Monday through Friday.' },
  { id: 'ab', label: 'A/B block schedule', help: 'The school alternates A days and B days. Choose which days this class meets.' },
  { id: 'weekdays', label: 'Selected weekdays', help: 'The class meets on the weekdays you check, with no rotation.' },
  { id: 'custom', label: 'Custom rotation', help: 'Use your own rotation labels, such as a 3- or 6-day cycle.' }
];

// Existing data decides the mode, so opening a class never silently rewrites it.
export function scheduleModeFromCalendar(calendar) {
  const rotation = calendar.rotation || [];
  if (!rotation.length) return sameSet(calendar.weekdays || [], SCHOOL_WEEK) ? 'every' : 'weekdays';
  return rotation.length === 2 && rotation[0] === 'A' && rotation[1] === 'B' ? 'ab' : 'custom';
}

// Which rotation labels the class attends, as checkbox state. Empty classRotations = every label.
export const classLabelsFromCalendar = calendar =>
  calendar.classRotations?.length ? calendar.classRotations.slice() : (calendar.rotation || []).slice();

// Translates plain-language choices into the existing calendar fields.
export function calendarFromSchedule(calendar, { mode, weekdays, classLabels = [], customRotation = [], customClassLabels = [], offset }) {
  const next = { ...calendar };
  if (!SCHEDULE_MODES.some(m => m.id === mode)) throw new Error('Choose a schedule type.');
  if (mode === 'every') {
    next.weekdays = SCHOOL_WEEK.slice(); next.rotation = []; next.classRotations = []; next.rotationOffset = 0;
    return next;
  }
  const days = WEEKDAYS.map(d => d.n).filter(n => weekdays.includes(n));
  if (!days.length) throw new Error('Check at least one day the class meets.');
  next.weekdays = days;
  if (mode === 'weekdays') { next.rotation = []; next.classRotations = []; next.rotationOffset = 0; return next; }
  const rotation = mode === 'ab' ? ['A', 'B'] : customRotation.map(s => s.trim()).filter(Boolean);
  if (mode === 'custom' && rotation.length < 2) throw new Error('A custom rotation needs at least two labels, separated by commas.');
  if (new Set(rotation).size !== rotation.length) throw new Error('Rotation labels must be different from each other.');
  const chosen = (mode === 'ab' ? classLabels : customClassLabels).filter(l => rotation.includes(l));
  if (mode === 'ab' && !chosen.length) throw new Error('Choose A days, B days, or both for this class.');
  if (mode === 'custom' && customClassLabels.length && !chosen.length) throw new Error('The rotation labels this class meets on must come from your rotation list.');
  next.rotation = rotation;
  // Attending every label is stored the way the editor always has: an empty list.
  next.classRotations = chosen.length === rotation.length ? [] : rotation.filter(l => chosen.includes(l));
  if (offset !== undefined) next.rotationOffset = offset;
  return next;
}

// "March 3 is a B day" → the rotation offset that makes the existing calculation agree.
export function offsetForKnownDay(calendar, date, label) {
  const rotation = calendar.rotation || [];
  const index = rotation.indexOf(label);
  if (index < 0) throw new Error('Choose one of the rotation labels.');
  const trial = meetings({ ...calendar, rotationOffset: 0 });
  const row = trial.find(m => m.date === date);
  if (!row) throw new Error('That date is outside the school calendar.');
  if (!row.schoolDay) throw new Error('That date is not a school day. Choose a day when school is in session.');
  const current = rotation.indexOf(row.rotation);
  const offset = (((index - current) % rotation.length) + rotation.length) % rotation.length;
  const check = meetings({ ...calendar, rotationOffset: offset }).find(m => m.date === date);
  if (check?.rotation !== label) throw new Error('A date override changes the rotation before that day. Pick an earlier school day or clear the rotation override first.');
  return offset;
}

export function rotationLabelOn(calendar, date) {
  return meetings(calendar).find(m => m.date === date)?.rotation || null;
}

export function scheduleSummary(calendar) {
  if(!calendar)return 'Self-paced';
  const mode = scheduleModeFromCalendar(calendar);
  const days = describeWeekdays(calendar.weekdays || []);
  const parts = [];
  if (mode === 'every') parts.push('Meets every school day');
  else if (mode === 'weekdays') parts.push('Meets ' + days);
  else {
    const attends = calendar.classRotations?.length ? calendar.classRotations.join(' and ') : (calendar.rotation || []).join(' and ');
    parts.push((mode === 'ab' ? 'A/B block' : 'Custom rotation') + ' · meets on ' + attends + ' days');
  }
  parts.push((calendar.minutes || 0) + ' minutes per meeting');
  return parts.join(' · ');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Date-only strings never pass through UTC conversion, so a school date cannot slip a day.
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : '';
}
export function formatWhen(ms) {
  if (!Number.isFinite(ms)) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
}

// What students currently see versus what the teacher has edited.
export function publicationStatus({ published, draft }) {
  if (!published) return { key: 'never', label: 'Not published yet', tone: 'warn', changeCount: 0,
    detail: 'Students do not see this pathway until you publish it.' };
  let changeCount = 0;
  try { changeCount = draft ? diffPathways(published, draft).length : 0; } catch { changeCount = 0; }
  if (changeCount) return { key: 'changes', label: 'Unpublished changes', tone: 'warn', changeCount,
    detail: `Students still see the published pathway. ${changeCount} ${changeCount === 1 ? 'change is' : 'changes are'} waiting to be published.` };
  return { key: 'published', label: 'Published', tone: 'good', changeCount: 0,
    detail: `Students see the published pathway. Nothing is waiting to be published.` };
}

// Where the working draft lives.
export function draftStatus({ connected, remote, dirty }) {
  if (connected && remote) return dirty
    ? { key: 'unsaved', label: 'Draft not saved yet', tone: 'warn', detail: 'You have edits that are not saved to your shared draft. Choose Save draft.' }
    : { key: 'saved', label: 'Draft saved', tone: 'good', detail: 'Your shared draft is saved. Students are not affected until you publish.' };
  return { key: 'browser', label: 'Saved in this browser', tone: 'info',
    detail: connected ? 'This class has not been saved as a shared draft yet.' : 'Sign in to save a shared draft that students can receive once published.' };
}

// Case-insensitive match across the words teachers search for: skill, area and standard code.
export function filterSkills(skills, query) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return skills;
  return skills.filter(s => {
    const hay = (s.title + ' ' + (s.area || '') + ' ' + (s.standards || '')).toLowerCase();
    return words.every(w => hay.includes(w));
  });
}
