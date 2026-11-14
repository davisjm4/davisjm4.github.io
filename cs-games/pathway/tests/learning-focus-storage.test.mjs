import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { startDev } from '../../../wpr-games/workplace-readiness/service/dev.mjs';

const migration = readFileSync(new URL('../../../wpr-games/workplace-readiness/service/migrations/0008_learning_focus.sql', import.meta.url), 'utf8');
const teacher = 'synthetic-focus-storage-teacher';

test('learning focus storage is additive, immutable and tied to the existing class lifecycle', async t => {
  const dev = await startDev({ teacherTokens: { teacher } });
  t.after(async () => { await new Promise(resolve => dev.server.close(resolve)); dev.db.close(); });
  async function create(path, body) {
    const response = await fetch(dev.url + '/api/wpr/teacher/profiles' + path, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + teacher, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  const classroom = await create('', { title: 'Synthetic focus storage', courseId: 'advanced' });
  const profile = await create('/' + classroom.id + '/students', {});
  const plan = dev.db.prepare('SELECT id,head,draft FROM class_pathways WHERE class_id=?').get(classroom.id);
  const now = Date.now();
  const evidenceId = crypto.randomUUID();
  dev.db.prepare(`INSERT INTO performance_events(profile,id,version,pathway,activity,kind,occurred,data)
    VALUES (?,?,1,'advanced','teacher-assessment','assessment',?,?)`)
    .run(profile.id, evidenceId, now, JSON.stringify({ evidence: [{ score: 4 }] }));
  const evidence = dev.db.prepare('SELECT * FROM performance_events WHERE profile=?').all(profile.id);

  dev.db.exec(migration);
  dev.db.exec(migration);
  const graph = JSON.parse(plan.draft);
  const focusId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const nodeId = graph.sequence[0];
  const target = JSON.stringify({ kind: 'skill', id: nodeId });
  const destinations = JSON.stringify([{ nodeId, activityId: 'loop-lab' }]);
  dev.db.prepare('INSERT INTO learning_focus(id,class_id,created) VALUES (?,?,?)').run(focusId, classroom.id, now);
  const insertRevision = dev.db.prepare(`INSERT INTO learning_focus_revisions(
    focus_id,revision,pathway_id,pathway_revision,actor,recorded,request_id,request_digest,state,start_at,scope,target,destinations,restricted)
    VALUES (?,?,?,?,'teacher',?,?,'synthetic-digest','published',?,'individual',?,?,1)`);
  insertRevision.run(focusId, 1, plan.id, plan.head, now, requestId, now, target, destinations);
  assert.throws(() => insertRevision.run(focusId, 2, plan.id, plan.head, now, requestId, now, target, destinations), /UNIQUE/);
  assert.throws(() => dev.db.prepare("UPDATE learning_focus_revisions SET state='ended' WHERE focus_id=?").run(focusId), /immutable/);

  dev.db.prepare('INSERT INTO learning_focus_recipients VALUES (?,1,?)').run(focusId, profile.id);
  dev.db.prepare("INSERT INTO learning_focus_progress VALUES (?,1,?,'complete',?)").run(focusId, profile.id, now);
  dev.db.prepare("INSERT INTO learning_focus_releases VALUES (?,1,?,'teacher',?,?)").run(focusId, profile.id, now, crypto.randomUUID());
  assert.deepEqual(dev.db.prepare('SELECT * FROM performance_events WHERE profile=?').all(profile.id), evidence);

  dev.db.prepare('DELETE FROM profile_classes WHERE id=?').run(classroom.id);
  for (const table of ['learning_focus', 'learning_focus_revisions', 'learning_focus_recipients', 'learning_focus_progress', 'learning_focus_releases']) {
    assert.equal(dev.db.prepare('SELECT COUNT(*) count FROM ' + table).get().count, 0, table);
  }
  assert.deepEqual(dev.db.prepare('PRAGMA foreign_key_check').all(), []);
});
