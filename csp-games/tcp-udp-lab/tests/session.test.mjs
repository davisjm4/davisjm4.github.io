// Session adapter tests. Run: node csp-games/tcp-udp-lab/tests/session.test.mjs
import assert from 'node:assert/strict';
import * as E from '../generator.js';
import { createLabSession, STORAGE_KEY, SLUG, percent } from '../session.js';
import { createSessionTracker } from '../../session.js';

let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const tcpQ = E.QUESTIONS.find(q => q.answer === 'TCP' && q.topic === 'reliability');
const udpQ = E.QUESTIONS.find(q => q.answer === 'UDP' && q.topic === 'protocols');

// ── 1. Local stub implementing only the tracker interface the adapter uses ──
function stubTracker() {
  let id = 'day-1'; const records = {}, games = {}; let n = 0;
  const bucket = () => ({ attempted: 0, firstTry: 0 });
  return {
    snapshot: () => ({ id, games: JSON.parse(JSON.stringify(games)), activeSeconds: 12 }),
    begin(game, title, topic, topicTitle, mode) { const r = `r${++n}`; records[r] = { game, topic, mode, status: 'active', subs: 0 }; return r; },
    annotate(r, d) { records[r].details = d; return true; },
    submit(r, correct) {
      const rec = records[r]; if (rec.status !== 'active') return { accepted: false };
      rec.subs++; const g = games[rec.game] ??= { ...bucket(), topics: {}, modes: {} };
      for (const b of [g, g.topics[rec.topic] ??= bucket(), g.modes[rec.mode] ??= bucket()]) { b.attempted++; if (correct) b.firstTry++; }
      if (correct) rec.status = 'solved'; return { accepted: true };
    },
    closeIncorrect(r) { records[r].status = 'solved'; },
    newDay() { id = 'day-2'; for (const k of Object.keys(games)) delete games[k]; },
    records,
  };
}
{
  const t = stubTracker(), store = memory(), lab = createLabSession({ tracker: t, storage: store, topics: E.TOPICS, skills: E.SKILLS });
  eq(lab.ensure(), true, 'first ensure starts a session'); eq(lab.ensure(), false, 'same day');
  eq(lab.stats().attempted, 0, 'no attempts before answering');
  const r1 = lab.record(tcpQ, 'UDP', 'mixed');
  ok(r1.accepted && !r1.correct, 'incorrect recorded');
  eq(t.records[r1.recordId].status, 'solved', 'incorrect round closed: no second scored try');
  eq(t.records[r1.recordId].subs, 1, 'exactly one submission');
  const d = t.records[r1.recordId].details;
  for (const k of ['questionId', 'familyId', 'topic', 'correctProtocol', 'learningObjective', 'practiceMode', 'situationId', 'selectedProtocol', 'cedLearningObjective'])
    ok(d[k] !== undefined && d[k] !== '', `metadata ${k}`);
  eq([d.questionId, d.familyId, d.correctProtocol, d.selectedProtocol, d.practiceMode], [tcpQ.id, tcpQ.family, 'TCP', 'UDP', 'tcp-udp-decision']);
  eq(t.records[r1.recordId].mode, 'mixed', 'selected filter is the mode bucket');
  eq(t.records[r1.recordId].topic, 'reliability', 'scenario topic is the topic bucket');
  ok(lab.record(udpQ, 'UDP', 'protocols').correct);
  const s = lab.stats();
  eq([s.attempted, s.firstTry], [2, 1]);
  eq(s.protocols, { TCP: { attempted: 1, firstTry: 0 }, UDP: { attempted: 1, firstTry: 1 } }, 'accuracy by protocol');
  eq(s.topics.reliability, { attempted: 1, firstTry: 0 }); eq(s.topics.protocols, { attempted: 1, firstTry: 1 });
  eq(percent(s.protocols.UDP), '100% (1/1)'); eq(percent({ attempted: 0, firstTry: 0 }), '— (0/0)');
  lab.rememberHistory(['a', 'b']); eq(JSON.parse(store.getItem(STORAGE_KEY)).history, ['a', 'b'], 'history persisted');
  // Reload: a new adapter on the same day restores history and protocol stats.
  const again = createLabSession({ tracker: t, storage: store, topics: E.TOPICS }); again.ensure();
  eq(again.history(), ['a', 'b']); eq(again.stats().protocols.TCP.attempted, 1, 'protocol stats survive reload');
  // Daily reset: a new tracker session clears history and protocol stats.
  t.newDay(); eq(again.ensure(), true, 'new day detected');
  eq(again.history(), [], 'history reset'); eq(again.stats().protocols, { TCP: { attempted: 0, firstTry: 0 }, UDP: { attempted: 0, firstTry: 0 } }, 'protocol stats reset');
  // Corrupted storage and unavailable storage do not break practice.
  store.setItem(STORAGE_KEY, '{not json'); const c = createLabSession({ tracker: t, storage: store, topics: E.TOPICS }); c.ensure(); eq(c.history(), []);
  store.setItem(STORAGE_KEY, JSON.stringify({ sessionId: 'day-2', history: [1, 'ok'], protocols: { TCP: { attempted: -4, firstTry: 'x' } } }));
  const c2 = createLabSession({ tracker: t, storage: store }); c2.ensure(); eq(c2.history(), ['ok']); eq(c2.stats().protocols.TCP.attempted, 0, 'invalid counts rejected');
  const broken = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  const b = createLabSession({ tracker: t, storage: broken, topics: E.TOPICS }); b.ensure(); ok(b.record(tcpQ, 'TCP', 'mixed').correct, 'works without storage');
  assert.throws(() => createLabSession({})); checks++;
}

// ── 2. The real shared CSP tracker ──
{
  let clock = new Date(2026, 9, 26, 9, 0, 0); const store = memory();
  const tracker = createSessionTracker({ storage: store, now: () => clock.toISOString() });
  const lab = createLabSession({ tracker, storage: store, topics: E.TOPICS, skills: E.SKILLS });
  lab.ensure();
  lab.record(tcpQ, 'TCP', 'reliability'); lab.record(udpQ, 'TCP', 'mixed'); lab.record(udpQ, 'UDP', 'mixed');
  const snap = tracker.snapshot(), g = snap.games[SLUG];
  eq([g.attempted, g.firstTry, g.incorrect, g.submissions], [3, 2, 1, 3], 'shared tracker totals');
  eq(g.afterRetry, 0, 'no retry credit after an incorrect first answer');
  eq(g.generated, 3, 'records exist only for answered rounds');
  eq(Object.keys(g.modes).sort(), ['mixed', 'reliability'], 'mode buckets = selected filters');
  eq(g.modes.mixed.title, 'Mixed');
  eq(g.topics.protocols.title, E.TOPICS.protocols, 'topic bucket titles');
  const rec = Object.values(snap.records).find(r => r.details?.questionId === udpQ.id);
  eq(rec.details.correctProtocol, 'UDP'); eq(rec.details.learningObjective, udpQ.objective);
  eq(lab.stats().protocols.UDP, { attempted: 2, firstTry: 1 });
  // Next local day: shared tracker starts a new session, and the adapter follows.
  clock = new Date(2026, 9, 27, 8, 0, 0);
  eq(lab.ensure(), true, 'daily reset detected through the shared tracker');
  eq(lab.stats().attempted, 0, 'daily totals reset'); eq(lab.stats().protocols.TCP.attempted, 0, 'protocol stats reset');
  lab.record(tcpQ, 'UDP', 'mixed'); eq(lab.stats().attempted, 1, 'new day counts from zero');
}
console.log(`TCP/UDP session: ${checks} assertions passed (local stub tracker and real shared CSP tracker; one scored attempt, metadata, topic/protocol accuracy, reload persistence, daily reset, storage failure).`);
