import '../../teacher/test-runtime.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { startDev } from '../../../wpr-games/workplace-readiness/service/dev.mjs';
import { emptyLevelHistory, recordLevel } from '../proficiency/independent.mjs';

test('the proposed independent-proficiency migration is additive, idempotent and reversible in real SQLite', async t=>{
  const {server,db}=await startDev({teacherTokens:{teacher:'synthetic-migration-teacher-token'}});
  t.after(()=>{server.close();db.close();});
  const objects=()=>db.prepare("SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
  db.exec("INSERT INTO profile_classes(id,owner,title,invite,created,expires) VALUES('c1','teacher','Period 3','INVITE1',1,9999999999999)");
  db.exec("INSERT INTO student_profiles(id,class_id,recovery,created) VALUES('p1','c1','r',1)");
  db.exec("INSERT INTO performance_events(profile,id,version,pathway,activity,kind,occurred,data) VALUES('p1','a1',1,'advanced','teacher-assessment','assessment',1,'{\"score\":4}')");
  const before=objects(),existing=db.prepare('SELECT * FROM performance_events').all();
  const sql=fs.readFileSync(new URL('../proficiency/migration/0009_formative_level_history.proposed.sql',import.meta.url),'utf8');
  db.exec(sql);db.exec(sql);
  const added=objects().filter(o=>!before.some(b=>b.name===o.name));
  assert.deepEqual(added.map(o=>o.name).sort(),['formative_level_history','formative_level_history_immutable','formative_level_history_profile']);
  assert.deepEqual(objects().filter(o=>before.some(b=>b.name===o.name)),before);
  assert.deepEqual(db.prepare('SELECT * FROM performance_events').all(),existing);
  const nodeId='node:advanced:variable-lab:trace';
  const history=recordLevel(emptyLevelHistory({profileId:'p1',classId:'c1'}),{
    nodeId,skill:{nodeId,level:3,goalMet:true},evaluator:'legacy-coupled',
    policy:{id:'policy:req:class',version:1},pathwayRevision:3,recordedAt:'2026-11-16T00:00:00.000Z'});
  const entry=history.entries[0];
  const put=db.prepare('INSERT OR IGNORE INTO formative_level_history(profile_id,node_id,entry_key,evaluator,level,body,recorded) VALUES(?,?,?,?,?,?,?)');
  for(let i=0;i<3;i++)put.run('p1',nodeId,'synthetic-key',entry.evaluator,entry.level,JSON.stringify(entry),1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM formative_level_history').get().n,1);
  assert.deepEqual(JSON.parse(db.prepare('SELECT body FROM formative_level_history').get().body),entry);
  assert.throws(()=>db.exec('UPDATE formative_level_history SET level=4'),/append-only/);
  assert.throws(()=>db.exec("INSERT INTO formative_level_history VALUES('p1','n','invented','guessed',3,'{}',1)"),/CHECK/);
  db.exec('DROP TRIGGER formative_level_history_immutable; DROP INDEX formative_level_history_profile; DROP TABLE formative_level_history;');
  assert.deepEqual(objects(),before);
});
