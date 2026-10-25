// Session adapter for TCP vs. UDP Decision Lab.
// The shared CSP tracker (../session.js) owns the daily session, first-try totals,
// topic/mode buckets, active time and Session Summary. This adapter adds what the
// shared tracker has no place for — repeat history and accuracy by correct
// protocol — in local storage keyed to the tracker's session ID, so both reset
// together when a new daily session starts.
//
// A result record is created only when an answer is submitted. An unanswered
// scenario therefore never appears in Session Summary, which keeps the Summary from
// revealing anything about the current round. Learn-panel use, filter changes and
// Next Question skips are not attempts.

export const SLUG = 'tcp-udp-lab';
export const TITLE = 'TCP vs. UDP Decision Lab';
export const STORAGE_KEY = 'cspGames.tcpUdpLab.v1';

const emptyProtocols = () => ({ TCP: { attempted: 0, firstTry: 0 }, UDP: { attempted: 0, firstTry: 0 } });

export function createLabSession({ tracker, storage = globalThis.localStorage, topics = {}, skills = [], practiceMode = 'tcp-udp-decision' } = {}) {
  if (!tracker || typeof tracker.begin !== 'function') throw Error('A session tracker is required.');
  let sessionId = null, state = { history: [], protocols: emptyProtocols() };

  function load(id) {
    let saved = null;
    try { saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null'); } catch { saved = null; }
    if (saved && saved.sessionId === id && Array.isArray(saved.history)) {
      const p = saved.protocols || {};
      state = { history: saved.history.filter(h => typeof h === 'string').slice(-50), protocols: emptyProtocols() };
      for (const a of ['TCP', 'UDP']) for (const k of ['attempted', 'firstTry']) {
        const v = Number(p?.[a]?.[k]); if (Number.isInteger(v) && v >= 0) state.protocols[a][k] = v;
      }
    } else state = { history: [], protocols: emptyProtocols() };
  }
  function save() {
    try { storage?.setItem(STORAGE_KEY, JSON.stringify({ sessionId, history: state.history, protocols: state.protocols })); } catch { /* storage unavailable: keep in memory */ }
  }
  return {
    // Returns true when the daily session changed (including the first call).
    ensure() {
      const id = tracker.snapshot().id;
      if (id === sessionId) return false;
      sessionId = id; load(id); return true;
    },
    get sessionId() { return sessionId; },
    history: () => [...state.history],
    rememberHistory(ids) { state.history = ids.slice(-50); save(); },
    // Records exactly one scored attempt for question q.
    record(q, selected, filter) {
      const correct = selected === q.answer;
      const filterTitle = filter === 'mixed' ? 'Mixed' : topics[filter] || filter;
      const id = tracker.begin(SLUG, TITLE, q.topic, topics[q.topic] || q.topic, filter, filterTitle);
      tracker.annotate(id, {
        skills, questionId: q.id, familyId: q.family, situationId: q.situationId, topic: q.topic,
        correctProtocol: q.answer, selectedProtocol: selected, learningObjective: q.objective,
        cedLearningObjective: q.ced, essentialKnowledge: q.essentialKnowledge,
        practiceMode, filter, condition: q.condition,
      });
      const submitted = tracker.submit(id, correct);
      if (!submitted.accepted) return { accepted: false, correct, recordId: id };
      if (!correct) tracker.closeIncorrect(id);
      state.protocols[q.answer].attempted++;
      if (correct) state.protocols[q.answer].firstTry++;
      save();
      return { accepted: true, correct, recordId: id };
    },
    stats() {
      const s = tracker.snapshot(), g = s.games?.[SLUG];
      return {
        attempted: g?.attempted || 0, firstTry: g?.firstTry || 0,
        topics: Object.fromEntries(Object.keys(topics).map(t => [t, { attempted: g?.topics?.[t]?.attempted || 0, firstTry: g?.topics?.[t]?.firstTry || 0 }])),
        protocols: JSON.parse(JSON.stringify(state.protocols)),
        activeSeconds: s.activeSeconds || 0,
      };
    },
  };
}

export const percent = m => m && m.attempted ? `${Math.round(100 * m.firstTry / m.attempted)}% (${m.firstTry}/${m.attempted})` : '— (0/0)';
