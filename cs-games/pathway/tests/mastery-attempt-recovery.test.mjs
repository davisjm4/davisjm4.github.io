import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createRequire} from 'node:module';
import graph from '../curriculum-graph.json' with {type:'json'};
import {generateTrace} from '../../../java-games/variable-lab/trace-adapter.js';
import {guestEventFromAttempt,guestEvidenceByNode} from '../../student/guest/evidence.mjs';
import {createGuestStore,GUEST_KEY} from '../../student/guest/store.mjs';
import {evaluateSkillProficiency} from '../proficiency/index.mjs';
import {skillTarget} from '../../student/map/skill-target.mjs';
import {buildGuestView} from '../../student/guest/pathway.mjs';
import {memoryStorage,javaTracker} from '../../student/guest/tests/lib.mjs';
const strings=createRequire(import.meta.url)('../string-lab-source.cjs');
const node=id=>graph.nodes.find(n=>n.id===id);
const trace=node('node:advanced:variable-lab:trace');
const string=node('node:advanced:string-lab:predict');
const base=Date.parse('2026-11-18T12:00:00Z');
function raw(n,i,{difficulty='intermediate',correct=true,mixed=false,at=base+i}={}){
 const q=n===trace?generateTrace({difficulty,seed:i+1}):strings.generateChallenge({mode:'predict',difficulty,seed:i+1});
 return guestEventFromAttempt('advanced',{id:'recovery-'+i,game:n===trace?'variable-lab':'string-lab',submissions:1,
  mode:mixed?'mixed':n===trace?'trace':'predict',topic:q.topic??'predict',details:{difficulty:q.difficulty,practiceMode:n===trace?'trace':'predict',family:q.traceFamily??q.family}},correct,new Date(at).toISOString());
}
const evalState=(n,s)=>evaluateSkillProficiency(n,guestEvidenceByNode(graph,s.events,'advanced').get(n.id)??[],{attemptStarts:s.formativeAttempts});
function fixture(){let now=base+10000;const storage=memoryStorage();const store=createGuestStore({storage,now:()=>now});store.setCourse('advanced');return {store,storage,tick:()=>now+=10000};}
test('26/50 reproduces 110-answer recovery; new mastery attempt preserves evidence and earns L3 afresh',()=>{
 const {store,tick}=fixture();for(let i=0;i<50;i++)store.addEvent(raw(trace,i,{correct:i>=24,mixed:i%2===0}));
 const before=store.state(), result=evalState(trace,before);
 assert.equal(result.tiers.intermediate.answered,50);assert.equal(result.tiers.intermediate.correct,26);
 assert.equal(result.tiers.intermediate.recovery.additionalCorrectForAccuracy,110);
 store.startMasteryAttempt({nodeId:trace.id,courseId:'advanced',requestId:'restart-1'});
 assert.deepEqual(store.state().events,before.events);
 let fresh=evalState(trace,store.state());assert.equal(fresh.tiers.intermediate.answered,0);assert.equal(fresh.attempt.number,2);
 assert.equal(fresh.attemptHistory[0].answered,50);assert.equal(fresh.attemptHistory[0].correct,26);
 assert.throws(()=>store.startMasteryAttempt({nodeId:trace.id,courseId:'advanced',requestId:'restart-stale'}),/changed/);
 store.startMasteryAttempt({nodeId:trace.id,courseId:'advanced',requestId:'restart-1'});assert.equal(store.state().formativeAttempts.length,1);
 const at=tick();for(let i=0;i<10;i++)store.addEvent(raw(trace,100+i,{at:at+i}));
 fresh=evalState(trace,store.state());assert.equal(fresh.goalMet,true);assert.equal(fresh.level,3);
 assert.equal(store.state().events.length,60);
 const restored=createGuestStore({storage:memoryStorage({[GUEST_KEY]:JSON.stringify(store.state())})});
 assert.equal(evalState(trace,restored.state()).goalMet,true);
});
test('String 6/7 meets accuracy, needs eighth Intermediate answer and family coverage; Beginner never fills L3 count',()=>{
 const {store}=fixture();for(let i=0;i<7;i++)store.addEvent(raw(string,i,{correct:i!==0,mixed:i%2===0}));
 let r=evalState(string,store.state());let t=skillTarget({proficiency:r});
 assert.equal(r.tiers.intermediate.answered,7);assert.equal(r.tiers.intermediate.correct,6);assert.equal(r.tiers.intermediate.accuracyPercent,85.7);
 assert.equal(t.qualification.find(c=>c.kind==='accuracy').met,true);
 assert.match(t.qualification[0].text,/1 more qualifying Intermediate question needed/);assert.equal(t.complete,false);
 store.addEvent(raw(string,50,{difficulty:'beginner'}));r=evalState(string,store.state());assert.equal(r.tiers.intermediate.answered,7);
 store.addEvent(raw(string,8));r=evalState(string,store.state());assert.equal(r.tiers.intermediate.answered,8);assert.equal(r.tiers.intermediate.correct,7);assert.equal(r.goalMet,true);
 const records=guestEvidenceByNode(graph,store.state().events,'advanced').get(string.id).filter(e=>e.difficulty==='intermediate');
 const sameFamily=records.map(e=>({...e,familyId:records[0].familyId}));
 assert.equal(evaluateSkillProficiency(string,sameFamily).goalMet,false,'count and accuracy cannot replace family coverage');
});
test('an incorrect eighth answer loses accuracy; retries and unreviewed families cannot produce credit',()=>{
 const {store}=fixture();for(let i=0;i<7;i++)store.addEvent(raw(string,i,{correct:i!==0}));store.addEvent(raw(string,8,{correct:false}));
 let r=evalState(string,store.state());assert.equal(r.tiers.intermediate.answered,8);assert.equal(r.tiers.intermediate.correct,6);assert.equal(r.goalMet,false);
 const retry={...raw(string,0),attempt:2};assert.equal(store.addEvent(retry),false);
 assert.equal(store.addEvent({...raw(string,0),correct:true}),false);assert.equal(evalState(string,store.state()).tiers.intermediate.correct,6);
});
test('earlier demonstrated levels and official scores survive separate attempts; class/guest stores stay isolated',()=>{
 const {store,tick,storage}=fixture();for(let i=0;i<10;i++)store.addEvent(raw(string,i,{difficulty:'beginner'}));
 assert.equal(evalState(string,store.state()).level,2);const prior=store.state();
 storage.setItem('wrg.profile.synthetic.official',JSON.stringify({score:4}));
 store.startMasteryAttempt({nodeId:string.id,courseId:'advanced',requestId:'new-string'});
 const now=tick();store.addEvent(raw(string,101,{correct:false,at:now}));
 const result=evalState(string,store.state());assert.equal(result.level,2);assert.equal(result.tiers.beginner.retained,true);assert.equal(result.tiers.intermediate.answered,1);
 assert.equal(storage.getItem('wrg.profile.synthetic.official'),'{"score":4}');assert.deepEqual(store.state().events.slice(0,10),prior.events);
 assert.equal(evaluateSkillProficiency({...string,checkpoint:{score:3}},guestEvidenceByNode(graph,store.state().events,'advanced').get(string.id),{attemptStarts:store.state().formativeAttempts}).standardsScore,3);
 const other=createGuestStore({storage:memoryStorage()});assert.equal(other.state().formativeAttempts.length,0);
 const view=buildGuestView(graph,'advanced',store.state());assert.equal(view.proficiency.skills[string.id].level,2);
 assert.equal(view.proficiency.skills[trace.id].attempt,undefined);
 const backup=store.exportBackup();other.importBackup(backup);assert.equal(evalState(string,other.state()).level,2);other.importBackup(backup);assert.equal(other.state().formativeAttempts.length,1);
});
test('late offline evidence stays before its attempt boundary, repeated restarts remain distinct',()=>{
 const {store,tick}=fixture();store.addEvent(raw(trace,0,{correct:false}));store.startMasteryAttempt({nodeId:trace.id,courseId:'advanced',requestId:'first'});
 store.addEvent(raw(trace,3,{correct:false,at:base+3}));assert.equal(evalState(trace,store.state()).tiers.intermediate.answered,0);
 const now=tick();store.addEvent(raw(trace,5,{correct:false,at:now}));
 store.startMasteryAttempt({nodeId:trace.id,courseId:'advanced',requestId:'second',expectedAttemptId:'first'});
 const r=evalState(trace,store.state());assert.equal(r.attempt.number,3);assert.equal(r.tiers.intermediate.answered,0);assert.equal(r.attemptHistory.length,2);assert.equal(store.state().events.length,3);
});

test('daily Reset Session cannot reset mastery, while a storage failure cannot trim closed attempt evidence',()=>{
 const {store,storage,tick}=fixture();for(let i=0;i<50;i++)store.addEvent(raw(trace,i,{correct:i>=24}));
 store.startMasteryAttempt({nodeId:trace.id,courseId:'advanced',requestId:'saved-boundary'});
 const before=store.state();const tracker=javaTracker({store,storage,now:()=>base+20000});tracker.reset(true);
 assert.deepEqual(store.state().events,before.events);assert.deepEqual(store.state().formativeAttempts,before.formativeAttempts);
 const originalSet=storage.setItem;storage.setItem=()=>{throw new Error('quota');};
 store.addEvent(raw(trace,70,{at:tick()}));assert.equal(store.info.volatile,true);
 assert.deepEqual(store.state().events.slice(0,50),before.events);assert.equal(store.state().events.length,51);
 storage.setItem=originalSet;
});

test('a legacy game tab cannot erase the separately retained mastery-attempt boundary',()=>{
 const {store,storage}=fixture();store.addEvent(raw(trace,0,{correct:false}));
 store.startMasteryAttempt({nodeId:trace.id,courseId:'advanced',requestId:'keep-boundary'});
 const legacy=store.state();delete legacy.formativeAttempts;storage.setItem(GUEST_KEY,JSON.stringify(legacy));
 const fresh=createGuestStore({storage});assert.equal(fresh.state().formativeAttempts.length,1);
 assert.equal(evalState(trace,fresh.state()).tiers.intermediate.answered,0);
 fresh.clear();assert.equal(fresh.state().formativeAttempts.length,0);
});
