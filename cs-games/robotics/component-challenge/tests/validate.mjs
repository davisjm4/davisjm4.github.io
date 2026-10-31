import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCENARIOS,MODES,generate,grade} from '../engine.mjs';
import {PARTS} from '../../parts-sprint/catalog.js';
import {createRoboticsSession} from '../../parts-sprint/session.js';

let checks=0;
const ok=(v,m)=>{checks++;assert.ok(v,m);};
const eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);};
const ids=new Set(),parts=new Set(PARTS.map(p=>p.id));
const levels=['Beginner','Intermediate','Advanced'];
const modeKeys=['choose','fix','solution','tools'];
const modeCounts={},difficultyCounts={},categoryCounts={},familyCounts={};
const technicalFlags=[];
function subsetMatch(selected,solutions){const a=[...selected].sort();return solutions.some(s=>JSON.stringify([...s].sort())===JSON.stringify(a));}
for(const q of SCENARIOS){
 ok(!ids.has(q.id),'Duplicate instance '+q.id);ids.add(q.id);
 for(const field of ['id','family','mode','difficulty','category','concept','problem','context','constraints','explanation','source','verification'])ok(typeof q[field]==='string'&&q[field].trim().length>0,`${q.id}: missing ${field}`);
 ok(PARTS.some(p=>p.category===q.category),q.id+': catalog category');ok(modeKeys.includes(q.mode),q.id+': mode');ok(levels.includes(q.difficulty),q.id+': difficulty');
 ok(/^https:\/\/(kb|education)\.vex\.com\//.test(q.source),q.id+': official source');
 ok(q.options.length>=4&&q.options.length<=8,q.id+': options');if(q.mode!=='solution')eq(q.options.length,4,q.id+': four choices');
 eq(new Set(q.options.map(o=>o.id)).size,q.options.length,q.id+': unique option IDs');
 eq(new Set(q.options.map(o=>o.label.toLowerCase().trim())).size,q.options.length,q.id+': unique option labels');
 const optionIDs=new Set(q.options.map(o=>o.id));
 for(const o of q.options){ok(typeof o.label==='string'&&o.label.length>0,q.id+': label');ok(typeof o.explanation==='string'&&o.explanation.length>15,q.id+': option-specific explanation');ok(Array.isArray(o.componentIds)&&o.componentIds.length>0,q.id+': catalog component links');for(const id of o.componentIds)ok(parts.has(id),q.id+': unknown component '+id);}
 ok(Array.isArray(q.solutions)&&q.solutions.length>0,q.id+': valid solution combinations');
 for(const solution of q.solutions){ok(solution.length>0,q.id+': empty solution');eq(new Set(solution).size,solution.length);for(const id of solution)ok(optionIDs.has(id),q.id+': answer absent');if(q.mode==='solution')ok(solution.length>=2&&solution.length<=4,q.id+': beginner solution role count');else eq(solution.length,1,q.id+': one answer');}
 if(q.mode!=='solution')eq(q.solutions.length,1,q.id+': one defensible best choice');
 // Enumerate every possible candidate set; expected correctness is independently calculated as exact-set membership.
 for(let mask=0;mask<(1<<q.options.length);mask++){
  const selected=q.options.filter((_,i)=>mask&(1<<i)).map(o=>o.id),answer=grade(q,selected);
  eq(answer.correct,subsetMatch(selected,q.solutions),q.id+': set '+mask);
  ok(typeof answer.text==='string'&&answer.text.length>15,q.id+': meaningful feedback');
  ok(Array.isArray(answer.missing)&&Array.isArray(answer.extra),q.id+': missing/extra structured');
  if(answer.correct){eq(answer.missing,[]);eq(answer.extra,[]);}
 }
 ok(!grade(q,['__unknown_component_choice__']).correct,q.id+': unknown selection must fail');
 // Rules from the official V5 tools reference, separate from generator answer keys.
 // Enforce only clear tool-selection stems; contexts that discuss other faults are manually flagged rather than misdiagnosed.
 const text=[q.problem,q.context,q.constraints].join(' '),correctComponents=q.solutions.flatMap(s=>s.flatMap(id=>q.options.find(o=>o.id===id).componentIds));
 if(q.mode==='tools'&&/T15/i.test(q.problem)&&!/T8/i.test(q.problem)&&/which.*tool|select.*tool|driver|key/i.test(q.problem)){ok(correctComponents.some(id=>['t15-key','t15-driver'].includes(id)),q.id+': stated T15 interface requires T15 tool');}
 if(q.mode==='tools'&&/T8/i.test(q.problem)&&!/T15/i.test(q.problem)&&/which.*tool|select.*tool|driver|key/i.test(q.problem)){ok(correctComponents.includes('t8-key'),q.id+': stated T8 interface requires T8 tool');}
 if(q.mode==='tools'&&/T15/i.test(text)&&/T8/i.test(text))technicalFlags.push({id:q.id,review:'Both named tool sizes supplied; inspect contextual best-choice reasoning.'});
 modeCounts[q.mode]=(modeCounts[q.mode]||0)+1;difficultyCounts[q.difficulty]=(difficultyCounts[q.difficulty]||0)+1;categoryCounts[q.category]=(categoryCounts[q.category]||0)+1;(familyCounts[q.mode]??=new Set()).add(q.family);
}
// Independent source-backed tool and dimensional oracles, separate from scenario answer keys.
const toolRules={
 't15-structural-screw':o=>o.componentIds.includes('t15-key'),
 't8-collar-setscrew':o=>o.componentIds.includes('t8-key'),
 'universal-joint-set-screw':o=>o.componentIds.includes('t8-key'),
 'wrench-small-standoff':o=>/smaller/i.test(o.label),
 'wrench-large-nylock':o=>/larger/i.test(o.label),
 'standoff-wrench-length':o=>/smaller/i.test(o.label),
 'wrench-two-side-task':o=>o.componentIds.includes('t15-driver')&&o.componentIds.includes('wrench'),
 'driver-access-constraint':o=>o.componentIds.includes('t15-key'),
 'hex-socket-separation':o=>/correctly sized hex key/i.test(o.label)
};
for(const [id,rule]of Object.entries(toolRules)){const q=SCENARIOS.find(q=>q.id===id);ok(q,'Required independent tool fixture '+id);for(const o of q.options)eq(grade(q,[o.id]).correct,rule(o),id+': official tool interface oracle');}
for(const [id,minimum,maximum]of [['blind-hole-length-choice',4+5,4+8],['through-joint-protrusion',6+4,12]]){const q=SCENARIOS.find(q=>q.id===id);ok(q,id);for(const o of q.options){const match=o.label.match(/(\d+(?:\.\d+)?)\s*mm/);ok(match,id+': candidate measurement');const length=Number(match[1]);eq(grade(q,[o.id]).correct,length>=minimum&&length<=maximum,id+': independent length/clearance arithmetic');}}
for(const mode of modeKeys)ok(modeCounts[mode]>0,'Missing mode '+mode);
for(const level of levels)ok(difficultyCounts[level]>0,'Missing difficulty '+level);
// Avoid labeling the total number of variants as independent reasoning families.
const distinctFamilies=new Set(SCENARIOS.map(q=>q.family)).size;

const simulations=20000;let actualExactRepeats=0,avoidableExactRepeats=0,immediateFamilyRepeats=0,avoidableFamilyRepeats=0,positionRepeats=0,emptyFilters=0,fallbacks=0;
const seen=new Set(),distribution={mode:{},difficulty:{},category:{},answerPosition:{}},filterRows=[];
const categories=[...new Set(SCENARIOS.map(q=>q.category))];
const requestedSettings=[{mode:'mixed',difficulty:'mixed',category:'all'},...modeKeys.map(mode=>({mode,difficulty:'mixed',category:'all'})),...levels.map(difficulty=>({mode:'mixed',difficulty,category:'all'})),...categories.map(category=>({mode:'mixed',difficulty:'mixed',category})),...modeKeys.flatMap(mode=>levels.map(difficulty=>({mode,difficulty,category:'all'}))),...modeKeys.flatMap(mode=>levels.flatMap(difficulty=>categories.map(category=>({mode,difficulty,category}))))];
const settings=requestedSettings.filter(config=>{const available=SCENARIOS.some(q=>(config.mode==='mixed'||q.mode===config.mode)&&(config.difficulty==='mixed'||q.difficulty===config.difficulty)&&(config.category==='all'||q.category===config.category));if(!available){ok(generate({...config}).error,'Empty constrained pool reports unavailable');emptyFilters++;filterRows.push({...config,pool:0,rounds:0,status:'Explicitly unavailable'});}return available;});
let completed=0;
for(let cell=0;cell<settings.length;cell++){
 const config=settings[cell],pool=SCENARIOS.filter(q=>(config.mode==='mixed'||q.mode===config.mode)&&(config.difficulty==='mixed'||q.difficulty===config.difficulty)&&(config.category==='all'||q.category===config.category));
 let history=[];const rounds=Math.floor(simulations/settings.length)+(cell<simulations%settings.length?1:0),row={...config,pool:pool.length,rounds,exactRepeats:0,immediateFamilies:0,positionRepeats:0,fallbacks:0,modes:{}};
 for(let i=0;i<rounds;i++){
  const seed=(912711+completed*7919)>>>0,q=generate({...config,history,seed});completed++;
  if(!pool.length){ok(q.error,'Empty filter must explicitly report unavailable');emptyFilters++;continue;}
  ok(!q.error,q.error);ok(ids.has(q.id),'Generator invented an instance');ok(config.mode==='mixed'||q.mode===config.mode,'Mode filter retained');ok(config.difficulty==='mixed'||q.difficulty===config.difficulty,'Difficulty filter retained');ok(config.category==='all'||q.category===config.category,'Category filter retained');
  eq(generate({...config,history,seed}),q,'Seeded deterministic selection');
  const recent=history.slice(-50),prior=history.at(-1),exact=recent.some(h=>h.id===q.id),fresh=pool.filter(item=>!recent.some(h=>h.id===item.id));
  if(exact){actualExactRepeats++;row.exactRepeats++;if(fresh.some(item=>item.family!==prior?.family))avoidableExactRepeats++;}
  if(q.family===prior?.family){immediateFamilyRepeats++;row.immediateFamilies++;if(pool.some(p=>p.family!==prior.family))avoidableFamilyRepeats++;}
  if(q.mode!=='solution'){
   const correctId=q.solutions[0][0],position=q.options.findIndex(o=>o.id===correctId);eq(q.correctPosition,position,'Correct position follows shuffled options');eq(q.historyRecord.position,position,'History retains answer position');
   if(prior?.position===position){positionRepeats++;row.positionRepeats++;}
   distribution.answerPosition[position]=(distribution.answerPosition[position]||0)+1;
  }
  ok(q.historyRecord.id===q.id&&q.historyRecord.family===q.family&&q.historyRecord.mode===q.mode,'History schema');
  if(q.notice){fallbacks++;row.fallbacks++;}
  if(pool.length<=50)ok(q.notice?.length>0,'Narrow pool must disclose unavoidable repeat policy');
  row.modes[q.mode]=(row.modes[q.mode]||0)+1;seen.add(q.id);for(const key of ['mode','difficulty','category'])distribution[key][q[key]]=(distribution[key][q[key]]||0)+1;
  history.push(q.historyRecord);history=history.slice(-100);
 }
 filterRows.push(row);
}
eq(completed,simulations);eq(avoidableExactRepeats,0,'Avoidable exact50 repeats');eq(avoidableFamilyRepeats,0,'Avoidable immediate reasoning-family repeats');eq(positionRepeats,0,'Consecutive single-answer positions');
// Day rollover, first-try versus retry, game/mode/category isolation and local persistence use the production shared engine.
const memory=()=>{const values=new Map();return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k),values};};
const storage=memory();storage.setItem('javaGames.session.v1','java-sentinel');storage.setItem('cspGames.session.v1','csp-sentinel');storage.setItem('roboticsGames.courseArchitect.v1','architect-sentinel');let date='2026-10-30T12:00:00Z',counter=0;
const session=createRoboticsSession({storage,now:()=>date,id:()=>String(++counter)}),tracker=session.tracker;
let record=tracker.begin('component-challenge','VEX Component Challenge','shafts','Shafts','fix:Beginner','Fix the Build · Beginner');tracker.annotate(record,{practiceSetting:'mixed',family:'shaft-retention',difficulty:'Beginner'});eq(tracker.submit(record,false).firstTry,false);eq(tracker.submit(record,true).firstTry,false);eq(tracker.submit(record,true).accepted,false);
record=tracker.begin('component-challenge','VEX Component Challenge','tools','Tools','tools:Intermediate','Tool and Fastener Match · Intermediate');eq(tracker.submit(record,true).firstTry,true);
const snapshot=tracker.snapshot(),game=snapshot.games['component-challenge'];eq(game.attempted,2);eq(game.firstTry,1);eq(game.afterRetry,1);eq(game.modes['fix:Beginner'].attempted,1);eq(game.modes['fix:Beginner'].firstTry,0);eq(game.modes['tools:Intermediate'].firstTry,1);eq(game.topics.shafts.afterRetry,1);tracker.addActiveSeconds(7);eq(tracker.snapshot().activeSeconds,7);
record=tracker.begin('parts-sprint','VEX Parts Sprint','tools','Tools','learn:Beginner','Learn');tracker.submit(record,true);eq(tracker.snapshot().games['component-challenge'].attempted,2);eq(tracker.snapshot().games['parts-sprint'].attempted,1);
const reloaded=createRoboticsSession({storage,now:()=>date,id:()=>String(++counter)});eq(reloaded.tracker.snapshot().games['component-challenge'].firstTry,1);eq(storage.getItem('javaGames.session.v1'),'java-sentinel');eq(storage.getItem('cspGames.session.v1'),'csp-sentinel');eq(storage.getItem('roboticsGames.courseArchitect.v1'),'architect-sentinel');const old=session.ensure();date='2026-10-31T12:00:00Z';ok(session.ensure()!==old);eq(tracker.snapshot().totals.attempted,0);eq(storage.getItem('roboticsGames.courseArchitect.v1'),'architect-sentinel');eq(session.reset(false),false);
let warning='';const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};const temporary=createRoboticsSession({storage:blocked,onWarning:s=>warning=s});ok(warning);record=temporary.tracker.begin('component-challenge','VEX Component Challenge','tools','Tools','tools:Beginner','Tools');ok(temporary.tracker.submit(record,true).firstTry);eq(temporary.tracker.snapshot().totals.firstTry,1);
const result={status:'PASS',assertions:checks,reasoningFamilies:distinctFamilies,playableInstances:SCENARIOS.length,familiesByMode:Object.fromEntries(Object.entries(familyCounts).map(([k,v])=>[k,v.size])),modeCounts,difficultyCounts,categoryCounts,simulatedSelections:completed,distinctInstancesSelected:seen.size,distribution,unfilteredMixedModeDistribution:filterRows.find(r=>r.mode==='mixed'&&r.difficulty==='mixed'&&r.category==='all')?.modes,actualExactRepeats,avoidableExactRepeats,immediateFamilyRepeats,avoidableFamilyRepeats,consecutiveAnswerPositions:positionRepeats,narrowPoolNotices:fallbacks,emptyFilterSelections:emptyFilters,invalidSchemaChallenges:0,technicalCertification:'Automated structural and grading checks only; no claim of human-certified engineering correctness.',technicalFlags,physicalTouch:'Not performed',physicalChromebook:'Not performed',nativeScreenReader:'Not performed',browserWorkflows:'Separate UI evidence required'};
const evidence=process.env.COMPONENT_EVIDENCE||new URL('../reports/evidence/',import.meta.url).pathname;fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(evidence+'/generator-validation.json',JSON.stringify(result,null,2));fs.writeFileSync(evidence+'/filter-matrix.json',JSON.stringify(filterRows,null,2));console.log(JSON.stringify(result,null,2));
