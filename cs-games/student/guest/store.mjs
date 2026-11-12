/* Independent-learner progress store.
 *
 * Browser-local only: nothing here reads or writes the network, a profile, a name, an email or a credential.
 * Separate from the daily Session Summary (which resets every day) and from class-backed profile storage
 * (profile data lives under the "wrg.profile.<id>." prefix; this store has its own key and is never merged into it).
 *
 * Stored events are RAW sanitized attempts (activity, assessed mode, topic, family, difficulty, correctness).
 * Skill credit (nodeIds) is resolved against the curriculum graph by the guest page, never by the game page,
 * so a game page needs no copy of the graph and a graph release can only add credit, never erase history.
 * Self-reported marks (familiar / needs practice / start here) are a separate field and never become evidence.
 */
export const GUEST_KEY = 'cs-games:guest:v1';
export const GUEST_SCHEMA = 1;
export const BACKUP_FORMAT = 'cs-games-guest-progress';
export const LIMITS = Object.freeze({ events: 2500, hardEvents: 5000, compactBatch: 800, importBytes: 2_000_000, marks: 2000 });
export const MARK_STATES = Object.freeze(['familiar', 'needs-practice', 'start-here']);
export const COURSE_IDS = Object.freeze(['csp', 'advanced', 'robotics', 'workplace']);
export const MESSAGES = Object.freeze({
  scope: 'Your progress is saved in this browser. It may not appear on another device and may be lost if browser data is cleared.',
  unavailable: 'This browser is not allowing saved progress. Your practice still works, but it will be forgotten when you close or leave this page.',
  corrupt: 'Saved progress in this browser could not be read, so you are starting fresh. The unreadable copy was kept aside and has not been deleted.',
  full: 'This browser has no space left for saved progress. Older detail was trimmed, and anything that still does not fit will be forgotten when you leave this page.',
});

const ID = /^[a-zA-Z0-9][a-zA-Z0-9_.:/|%-]{0,159}$/;
const META = /^[a-zA-Z0-9][a-zA-Z0-9_.:/|%-]{0,119}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced', 'easy', 'medium', 'hard', 'mixed']);
const iso = ms => new Date(ms).toISOString();
export const localDate = ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const isoOk = v => typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v));
const int = v => Number.isSafeInteger(v) && v >= 0;
const meta = v => (typeof v === 'string' && META.test(v) ? v : null);
const fail = why => { throw new Error('Invalid guest progress: ' + why); };

export const emptyState = ms => ({ schema: GUEST_SCHEMA, created: iso(ms), updated: iso(ms), tracking: false, course: null,
  position: {}, marks: {}, events: [], archive: {}, archiveTotals: { answered: 0, correct: 0, byCourse: {} }, dropped: 0 });

// Allowlist sanitizer: builds a new object from known fields only. Unknown fields (including anything that looks like
// an award, score, verification or eligibility flag) are never copied. Returns null for an unusable event.
export function cleanEvent(e, { keepCredit = true } = {}) {
  if (!e || typeof e !== 'object') return null;
  if (typeof e.id !== 'string' || !ID.test(e.id) || typeof e.questionId !== 'string' || !ID.test(e.questionId)) return null;
  if (e.attempt !== 1 || typeof e.correct !== 'boolean' || !COURSE_IDS.includes(e.courseId)) return null;
  const activityId = meta(e.activityId);
  if (!activityId || !Number.isSafeInteger(e.occurred) || e.occurred < 0 || e.occurred > 8.64e15 || !DATE.test(e.date)) return null;
  const difficulty = typeof e.difficulty === 'string' && DIFFICULTIES.has(e.difficulty.toLowerCase()) ? e.difficulty.toLowerCase() : null;
  const out = { id: e.id, questionId: e.questionId, courseId: e.courseId, activityId, attempt: 1, correct: e.correct,
    mode: meta(e.mode), assessedMode: meta(e.assessedMode), topic: meta(e.topic), familyId: meta(e.familyId), difficulty,
    occurred: e.occurred, date: e.date };
  if (meta(e.evidenceRevision)) out.evidenceRevision = meta(e.evidenceRevision);
  if (keepCredit && Array.isArray(e.nodeIds) && e.nodeIds.length <= 12 && e.nodeIds.every(id => typeof id === 'string' && ID.test(id)) &&
      typeof e.graphVersion === 'string' && e.graphVersion.length <= 40) {
    out.nodeIds = [...new Set(e.nodeIds)];
    out.graphVersion = e.graphVersion;
  }
  return out;
}

export function cleanState(x, { keepCredit = true } = {}) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) fail('not an object');
  if (x.schema !== GUEST_SCHEMA) fail('unsupported version');
  if (!isoOk(x.created) || !isoOk(x.updated)) fail('dates');
  const marks = {};
  const markEntries = x.marks && typeof x.marks === 'object' && !Array.isArray(x.marks) ? Object.entries(x.marks) : fail('marks');
  if (markEntries.length > LIMITS.marks) fail('too many marks');
  for (const [id, m] of markEntries) {
    if (!/^(node|area):/.test(id) || !ID.test(id) || !m || !MARK_STATES.includes(m.state) || !isoOk(m.at) || !COURSE_IDS.includes(m.courseId)) fail('mark ' + String(id).slice(0, 40));
    marks[id] = { state: m.state, at: m.at, courseId: m.courseId };
  }
  const position = {};
  for (const [course, p] of Object.entries(x.position && typeof x.position === 'object' && !Array.isArray(x.position) ? x.position : fail('position'))) {
    if (!COURSE_IDS.includes(course) || !p || !isoOk(p.at)) fail('position');
    position[course] = { areaId: typeof p.areaId === 'string' && ID.test(p.areaId) ? p.areaId : null, nodeId: typeof p.nodeId === 'string' && ID.test(p.nodeId) ? p.nodeId : null, at: p.at };
  }
  if (!Array.isArray(x.events) || x.events.length > LIMITS.hardEvents) fail('events');
  const seen = new Set(), events = [];
  for (const raw of x.events) { const e = cleanEvent(raw, { keepCredit }); if (e && !seen.has(e.id)) { seen.add(e.id); events.push(e); } }
  const archive = {};
  for (const [id, a] of Object.entries(x.archive && typeof x.archive === 'object' && !Array.isArray(x.archive) ? x.archive : fail('archive'))) {
    if (!ID.test(id) || !a || !int(a.answered) || !int(a.correct) || a.correct > a.answered || !DATE.test(a.first) || !DATE.test(a.last)) fail('archive');
    archive[id] = { answered: a.answered, correct: a.correct, first: a.first, last: a.last };
  }
  const t = x.archiveTotals;
  if (!t || !int(t.answered) || !int(t.correct) || t.correct > t.answered) fail('archive totals');
  const byCourse = {};
  for (const [c, v] of Object.entries(t.byCourse && typeof t.byCourse === 'object' ? t.byCourse : {})) {
    if (COURSE_IDS.includes(c) && v && int(v.answered) && int(v.correct) && v.correct <= v.answered) byCourse[c] = { answered: v.answered, correct: v.correct };
  }
  return { schema: GUEST_SCHEMA, created: x.created, updated: x.updated, tracking: x.tracking === true,
    course: COURSE_IDS.includes(x.course) ? x.course : null, position, marks, events, archive,
    archiveTotals: { answered: t.answered, correct: t.correct, byCourse }, dropped: int(x.dropped) ? x.dropped : 0 };
}

// Fold the oldest resolved events into per-skill totals. Events that were never resolved against the graph keep their raw detail.
function compact(state, count) {
  const keep = [], fold = [];
  for (const e of state.events) (fold.length < count && e.nodeIds ? fold : keep).push(e);
  for (const e of fold) {
    for (const id of e.nodeIds) {
      const a = state.archive[id] ??= { answered: 0, correct: 0, first: e.date, last: e.date };
      a.answered++; a.correct += e.correct ? 1 : 0;
      if (e.date < a.first) a.first = e.date;
      if (e.date > a.last) a.last = e.date;
    }
    state.archiveTotals.answered++; state.archiveTotals.correct += e.correct ? 1 : 0;
    const c = state.archiveTotals.byCourse[e.courseId] ??= { answered: 0, correct: 0 };
    c.answered++; c.correct += e.correct ? 1 : 0;
  }
  state.events = keep;
  return fold.length;
}

export function mergeStates(current, incoming, ms) {
  const out = JSON.parse(JSON.stringify(current));
  const byId = new Map(out.events.map(e => [e.id, e]));
  let added = 0;
  for (const e of incoming.events) if (!byId.has(e.id)) { byId.set(e.id, e); added++; }
  out.events = [...byId.values()].sort((a, b) => a.occurred - b.occurred || (a.id < b.id ? -1 : 1)).slice(-LIMITS.hardEvents);
  for (const [id, m] of Object.entries(incoming.marks)) if (!out.marks[id] || m.at > out.marks[id].at) out.marks[id] = m;
  for (const [c, p] of Object.entries(incoming.position)) if (!out.position[c] || p.at > out.position[c].at) out.position[c] = p;
  for (const [id, a] of Object.entries(incoming.archive)) {
    const mine = out.archive[id];
    // Never add two histories together: they may describe the same practice. Keep the larger record.
    if (!mine) out.archive[id] = a; else if (a.answered > mine.answered) out.archive[id] = { ...a, first: a.first < mine.first ? a.first : mine.first };
  }
  if (incoming.archiveTotals.answered > out.archiveTotals.answered) out.archiveTotals = incoming.archiveTotals;
  out.course ??= incoming.course;
  out.updated = iso(ms);
  return { state: out, added };
}

export function parseBackup(text) {
  if (typeof text !== 'string' || text.length === 0) throw new Error('That file is empty.');
  if (text.length > LIMITS.importBytes) throw new Error('That file is too large to be a progress backup.');
  let doc;
  try { doc = JSON.parse(text); } catch { throw new Error('That file is not a CS Games progress backup.'); }
  if (!doc || doc.format !== BACKUP_FORMAT) throw new Error('That file is not a CS Games progress backup.');
  if (doc.version !== 1) throw new Error('That backup was made by a newer version of CS Games and cannot be read here.');
  let state;
  try { state = cleanState(doc.data, { keepCredit: false }); } catch (error) { throw new Error('That backup is damaged or incomplete. ' + error.message.replace('Invalid guest progress: ', '')); }
  // Credit is always re-derived from the practice details on this device; a file cannot assign skills, awards or verification.
  const ignored = Object.keys(doc.data).filter(k => !(k in state));
  const archiveKept = Object.keys(state.archive).length;
  return { state, ignored, archiveKept };
}

export function createGuestStore({ storage, now = () => Date.now(), onWarning = () => {} } = {}) {
  let memory = null, volatile = !storage, warning = '', recovered = false;
  const warn = message => { warning = message; onWarning(message); };
  if (volatile) warning = MESSAGES.unavailable;
  function load() {
    if (volatile) return memory ??= emptyState(now());
    let raw;
    try { raw = storage.getItem(GUEST_KEY); } catch { volatile = true; memory = emptyState(now()); warn(MESSAGES.unavailable); return memory; }
    if (raw == null) return emptyState(now());
    try { return cleanState(JSON.parse(raw)); } catch {
      try { storage.setItem(GUEST_KEY + ':corrupt', String(raw).slice(0, 200000)); } catch { /* keeping a copy is best effort */ }
      recovered = true; warn(MESSAGES.corrupt);
      return emptyState(now());
    }
  }
  function persist(state) {
    state.updated = iso(now());
    if (state.events.length > LIMITS.events) compact(state, state.events.length - LIMITS.events + LIMITS.compactBatch);
    if (state.events.length > LIMITS.hardEvents) { state.dropped += state.events.length - LIMITS.hardEvents; state.events = state.events.slice(-LIMITS.hardEvents); }
    if (volatile) { memory = state; return false; }
    for (let attempt = 0; attempt < 4; attempt++) {
      try { storage.setItem(GUEST_KEY, JSON.stringify(state)); return true; } catch {
        if (attempt === 3 || state.events.length === 0) break;
        if (!compact(state, Math.ceil(state.events.length / 3))) { // nothing resolved to fold: drop the oldest unresolved detail
          const drop = Math.ceil(state.events.length / 4); state.events = state.events.slice(drop); state.dropped += drop;
        }
        warn(MESSAGES.full);
      }
    }
    volatile = true; memory = state; warn(MESSAGES.full);
    return false;
  }
  function update(fn) {
    const draft = JSON.parse(JSON.stringify(load()));
    const result = fn(draft);
    const clean = cleanState(draft);
    const saved = persist(clean);
    return { result, saved, state: clean };
  }
  const api = {
    get info() { return { volatile, warning, recovered }; },
    state: () => JSON.parse(JSON.stringify(load())),
    update,
    setTracking: on => update(s => { s.tracking = !!on; }).state,
    setCourse(courseId) { if (!COURSE_IDS.includes(courseId)) throw new Error('Unknown course.'); return update(s => { s.course = courseId; s.tracking = true; }).state; },
    setPosition(courseId, { areaId = null, nodeId = null } = {}) {
      return update(s => { s.position[courseId] = { areaId, nodeId, at: iso(now()) }; }).state;
    },
    setMark(id, state, courseId, { nodeId = null, areaId = null } = {}) {
      if (!MARK_STATES.includes(state)) throw new Error('Unknown self-assessment.');
      return update(s => {
        if (state === 'start-here') for (const [other, m] of Object.entries(s.marks)) if (m.state === 'start-here' && m.courseId === courseId && other !== id) delete s.marks[other];
        s.marks[id] = { state, at: iso(now()), courseId };
        if (state === 'start-here') s.position[courseId] = { areaId, nodeId, at: iso(now()) };
        s.tracking = true;
      }).state;
    },
    clearMark: id => update(s => { delete s.marks[id]; }).state,
    // Called from practice pages. Never throws into the game; returns whether the attempt was recorded.
    addEvent(raw) {
      const event = cleanEvent(raw, { keepCredit: false });
      if (!event) return false;
      const current = load(); // read first: a visitor who has not opted in must not get a record written
      if (!current.tracking || current.events.some(e => e.id === event.id)) return false;
      let added = false;
      update(s => {
        if (!s.tracking || s.events.some(e => e.id === event.id)) return;
        s.events.push(event); added = true;
      });
      return added;
    },
    clear() {
      memory = null;
      try { storage?.removeItem(GUEST_KEY); storage?.removeItem(GUEST_KEY + ':corrupt'); } catch { /* ignore */ }
      recovered = false; warning = volatile && !storage ? MESSAGES.unavailable : '';
      return emptyState(now());
    },
    exportBackup() {
      return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: iso(now()), note: 'Self-reported local practice. Not verified and never an award.', data: load() }, null, 1);
    },
    importBackup(text) {
      const { state: incoming, ignored } = parseBackup(text);
      const { result } = update(s => {
        const merged = mergeStates(s, incoming, now());
        Object.keys(s).forEach(k => delete s[k]); Object.assign(s, merged.state);
        return merged.added;
      });
      return { addedEvents: result, ignored };
    },
  };
  return api;
}
