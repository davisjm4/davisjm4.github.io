// Workplace Readiness node evidence through the real profile service (dev server + SQLite adapter, synthetic accounts only).
// Events are produced by the real client queue in a child process (stubbed storage, no network) and then posted to /profile/sync.
import '../../teacher/test-runtime.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { startDev } from '../../../wpr-games/workplace-readiness/service/dev.mjs';
import { practiceEvent, DAY } from '../../../wpr-games/workplace-readiness/online/profile-model.mjs';
import * as P from '../wpr-primary-concepts.mjs';

const require = createRequire(import.meta.url);
const root = new URL('../../../', import.meta.url);
const wprDir = new URL('wpr-games/workplace-readiness/', root).pathname;
const SEL = require(wprDir + 'js/compose/selector.js');
const { loadHybrid } = require(wprDir + 'tools/compose-load.js');
const graph = JSON.parse(fs.readFileSync(new URL('cs-games/pathway/curriculum-graph.json', root), 'utf8'));
const nodeOfConcept = new Map(graph.nodes.filter(n => n.courseId === 'workplace').map(n => [n.familySelectors[0].conceptId, n.id]));
const QUESTIONS = SEL.generateMany(loadHybrid(), 800, { seed: 'wpr-service', filters: {} }).challenges;
const pick = pred => QUESTIONS.find(pred);
const teacher = 'wpr-evidence-teacher-secret', other = 'wpr-evidence-other-secret';

/** Produce the events the real page would queue, using the real client modules in a child process. */
function clientEvents(items, seed) {
  const slim = items.map(({ q, right, occurred }) => ({ q: { id: q.id, templateId: q.templateId, cx: q.cx && { kit: q.cx.kit, rule: q.cx.rule }, mode: q.mode, difficulty: q.difficulty, concepts: q.concepts }, right, occurred }));
  const script = `
    class M { getItem(k){return Object.hasOwn(this,k)?this[k]:null} setItem(k,v){this[k]=String(v)} removeItem(k){delete this[k]} }
    globalThis.localStorage=new M(); globalThis.fetch=async()=>{throw new Error('offline')};
    const st=globalThis.setTimeout; globalThis.setTimeout=(f,m,...r)=>{const t=st(f,m,...r);t.unref?.();return t};
    localStorage.setItem('wrg.profile.active.v1',JSON.stringify({id:'3b9d8a5e-1c2f-4a6b-8d7e-0f1a2b3c4d5e',token:'a'.repeat(64),expires:Date.now()+1e10}));
    const NE=await import(${JSON.stringify(new URL('wpr-games/workplace-readiness/online/node-evidence.mjs', root).href)});
    const items=JSON.parse(process.argv[1]);
    for (const it of items) NE.queueNodeAttempt(it.q,it.right,{seed:${JSON.stringify(seed)},occurred:it.occurred});
    const out=Object.keys(localStorage).filter(k=>k.includes('outbox')).map(k=>JSON.parse(localStorage.getItem(k)));
    process.stdout.write('\\n@@'+JSON.stringify(out));`;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script, JSON.stringify(slim)], { encoding: 'utf8' });
  return JSON.parse(out.split('\n@@').pop());
}

async function fixture(t) {
  const { server, db, url } = await startDev({ teacherTokens: { teacher, other } });
  t.after(() => { server.close(); db.close(); });
  async function api(path, key, body, method = body ? 'POST' : 'GET') {
    const headers = {};
    if (key) headers.Authorization = 'Bearer ' + key;
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(url + '/api/wpr' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  }
  const create = async key => { const r = await api('/teacher/profiles', key, { title: 'Period 3' }); assert.equal(r.status, 200, JSON.stringify(r.data)); return { ...r.data, path: '/teacher/profiles/' + r.data.id }; };
  const enroll = async c => { const r = await api('/profile/enroll', null, { invite: c.invite }); assert.equal(r.status, 200, JSON.stringify(r.data)); return r.data; };
  return { api, db, create, enroll };
}
const nodeRows = report => report.measures.filter(m => m.kind === 'practice' && m.scope === 'node');
const rowsOf = (db, profile) => db.prepare('SELECT id,pathway,activity,kind,occurred,data FROM performance_events WHERE profile=? ORDER BY id').all(profile);

test('node events are accepted, credited once on replay, scoped to the student and class, and leave other records untouched', async t => {
  const { api, db, create, enroll } = await fixture(t);
  const c = await create(teacher), otherClass = await create(other);
  const a = await enroll(c), b = await enroll(c), outsider = await enroll(otherClass);

  const q1 = pick(x => P.primaryAttribution(x)?.conceptId === 'information-security:cyber-threats');
  const q2 = pick(x => P.primaryAttribution(x)?.conceptId === 'teamwork:team-communication');
  const generic = pick(x => !P.primaryAttribution(x));
  const now = Date.now();
  const events = clientEvents([{ q: q1, right: true, occurred: now - 5 * 3600e3 }, { q: q2, right: false, occurred: now - 60e3 }, { q: generic, right: true, occurred: now }], 'svc-seed');
  assert.equal(events.length, 2, 'the generic question sends no node event');

  // Teacher-verified assessment evidence and a legacy practice event exist before any node event arrives.
  const legacy = practiceEvent(q1, true, now - DAY);
  assert.equal((await api('/profile/sync', a.token, { events: [legacy] })).status, 200);
  db.prepare("INSERT INTO performance_events(profile,id,version,pathway,activity,kind,occurred,data) VALUES(?,?,?,?,?,?,?,?)")
    .run(a.id, 'assessment-fixture', 1, 'workplace-readiness', 'workplace-readiness-games', 'assessment', now - 2 * DAY,
      JSON.stringify({ assignmentId: 'fixture', assignmentKind: 'assessment', n: 4, c: 3, dimensions: [], evidence: [{ nodeId: 'node:workplace:integrity:honesty-and-fairness', score: 3 }] }));
  const before = rowsOf(db, a.id).filter(r => r.id === legacy.id || r.id === 'assessment-fixture');
  const legacyMeasuresBefore = (await api('/profile/me', a.token)).data.measures.filter(m => m.activity === 'workplace-readiness-games');

  const first = await api('/profile/sync', a.token, { events });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.deepEqual(first.data.accepted.sort(), events.map(e => e.id).sort());
  for (let i = 0; i < 3; i++) assert.deepEqual((await api('/profile/sync', a.token, { events })).data.accepted.sort(), events.map(e => e.id).sort());

  const me = (await api('/profile/me', a.token)).data;
  const rows = nodeRows(me);
  const cyber = rows.find(r => r.id === nodeOfConcept.get('information-security:cyber-threats'));
  const acct = rows.find(r => r.id === nodeOfConcept.get('teamwork:team-communication'));
  assert.deepEqual([cyber.n, cyber.c], [1, 1], 'replaying the same event four times credits once');
  assert.deepEqual([acct.n, acct.c], [1, 0], 'an incorrect first attempt counts in the denominator');
  assert.equal(rows.length, 2, 'no other node and no secondary concept is credited');
  assert.equal(db.prepare("SELECT COUNT(*) n FROM performance_events WHERE profile=? AND activity='workplace-readiness' AND kind='practice'").get(a.id).n, 2);

  // Earlier records are byte-identical; legacy reporting totals are unchanged.
  assert.deepEqual(rowsOf(db, a.id).filter(r => r.id === legacy.id || r.id === 'assessment-fixture'), before);
  assert.deepEqual(me.measures.filter(m => m.activity === 'workplace-readiness-games'), legacyMeasuresBefore);

  // Isolation: other students and other classes see nothing, and the teacher view shows node evidence only for the student who earned it.
  assert.equal(nodeRows((await api('/profile/me', b.token)).data).length, 0);
  assert.equal(nodeRows((await api('/profile/me', outsider.token)).data).length, 0);
  const progress = (await api(c.path + '/progress', teacher)).data.reports;
  assert.equal(progress.find(r => r.id === a.id).measures.filter(m => m.scope === 'node').length, 2);
  assert.equal(progress.find(r => r.id === b.id).measures.filter(m => m.scope === 'node').length, 0);
  assert.equal((await api(c.path + '/progress', other)).status, 404);
});

test('a forged topic or unit is stored as practice but earns no node credit; a client cannot post into another profile', async t => {
  const { api, db, create, enroll } = await fixture(t);
  const c = await create(teacher), a = await enroll(c), b = await enroll(c);
  const q = pick(x => P.primaryAttribution(x) && x.concepts.length > 1);
  const secondary = q.concepts.find(x => x !== P.primaryAttribution(q).conceptId);
  const [event] = clientEvents([{ q, right: true, occurred: Date.now() - 1000 }], 'forge');
  const forgedTopic = { ...event, id: randomUUID() + ':1', topic: secondary };
  forgedTopic.questionId = forgedTopic.id.split(':')[0];
  const forgedUnit = { ...event, id: randomUUID() + ':1', familyId: 'c:invented/rule' };
  forgedUnit.questionId = forgedUnit.id.split(':')[0];
  const sent = await api('/profile/sync', a.token, { events: [forgedTopic, forgedUnit] });
  assert.equal(sent.status, 200, JSON.stringify(sent.data));
  assert.equal(nodeRows((await api('/profile/me', a.token)).data).length, 0, 'forged claims credit nothing');
  for (const row of rowsOf(db, a.id)) assert.deepEqual(JSON.parse(row.data).dimensions, []);
  const attempt = { ...event, id: randomUUID() + ':2', attempt: 2 };
  assert.equal((await api('/profile/sync', a.token, { events: [attempt] })).status, 400, 'an attempt number that does not match the id is invalid');
  assert.equal((await api('/profile/sync', b.token, { id: a.id, events: [event] })).status, 200);
  assert.equal(nodeRows((await api('/profile/me', a.token)).data).length, 0, 'the token, not a claimed id, decides which profile receives evidence');
  assert.equal(nodeRows((await api('/profile/me', b.token)).data).length, 1);
});

test('delayed and offline submissions keep their identity; evidence older than the class window is refused', async t => {
  const { api, create, enroll } = await fixture(t);
  const c = await create(teacher), a = await enroll(c);
  const q = pick(x => P.primaryAttribution(x));
  const [late] = clientEvents([{ q, right: true, occurred: Date.now() - 20 * 3600e3 }], 'late');
  assert.equal((await api('/profile/sync', a.token, { events: [late] })).status, 200);
  assert.equal(nodeRows((await api('/profile/me', a.token)).data)[0].n, 1);
  const [ancient] = clientEvents([{ q, right: true, occurred: Date.now() - 400 * DAY }], 'ancient');
  assert.equal((await api('/profile/sync', a.token, { events: [ancient] })).status, 400);
  assert.deepEqual((await api('/profile/sync', a.token, { events: [late] })).data.accepted, [late.id], 'replay after a delay is acknowledged, not duplicated');
  assert.equal(nodeRows((await api('/profile/me', a.token)).data)[0].n, 1);
});
