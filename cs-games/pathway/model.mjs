import {dateOK,meetings} from './calendar.mjs';
export const SCHEMA_VERSION=1;
export const clone=x=>JSON.parse(JSON.stringify(x));
export const provisionalPolicy={id:'policy:provisional',version:1,provisional:true,label:'Practice progress',minimumQuestions:null,accuracy:null,coverage:{},scoreTarget:null};
export function createPathway(graph,{id=crypto.randomUUID(),classId=crypto.randomUUID(),title='My class',courseId=graph.courses[0].id,calendar=null}={}) {
  const byId=new Map(graph.nodes.filter(n=>n.courseId===courseId).map(n=>[n.id,n]));
  const order=prerequisiteOrder([...byId.keys()],id=>byId.get(id).prerequisites);
  const nodes=order.map(id=>byId.get(id));
  return {schemaVersion:1,id,classId,title,courseId,graphVersion:graph.version,revision:0,baseRevision:0,
    calendar:calendar?{timeZone:'America/Los_Angeles',...calendar}:null,examDate:calendar?.end??null,toleranceDays:0,policies:[clone(provisionalPolicy)],customAreas:[],customNodes:[],
    sequence:nodes.map(n=>n.id),checkpoints:nodes.map(n=>({id:'checkpoint:'+id+':'+n.id,pathwayId:id,areaId:n.areaId,nodeId:n.id,
      standardRefs:n.standardRefs,primaryObjectives:n.primaryObjectives,targetDate:null,targetLocked:false,required:true,policyId:provisionalPolicy.id,policyVersion:1,
      expectedMastery:null,practice:n.practice,prerequisites:n.prerequisites,minutes:n.estimatedMinutes,revision:0})),sessions:[],warnings:[]};
}
// Keep authored course order, moving only prerequisite skills that would otherwise appear later.
export function prerequisiteOrder(sequence, prerequisites) {
  const included=new Set(sequence), ordered=new Set(), visiting=new Set();
  function add(id) {
    if(!included.has(id)||ordered.has(id))return;
    if(visiting.has(id))throw new Error('Prerequisite cycle.');
    visiting.add(id);
    prerequisites(id).forEach(add);
    visiting.delete(id);
    ordered.add(id);
  }
  sequence.forEach(add);
  return [...ordered];
}

export function removePacing(pathway) {
  const p=clone(pathway);
  p.calendar=null;
  p.examDate=null;
  delete p.pacingVisibility;
  delete p.capacity;
  p.sessions=[];
  p.warnings=[];
  p.checkpoints=p.checkpoints.map(c=>({...c,targetDate:null,targetLocked:false}));
  return p;
}

export function publicationSnapshot(p,graph,revision) {
  const curriculumSnapshot=p.graphVersion===graph.version
    ? {version:graph.version,nodes:graph.nodes.filter(n=>p.sequence.includes(n.id)),
      areas:graph.areas.filter(a=>p.checkpoints.some(c=>c.areaId===a.id))}
    : p.curriculumSnapshot;
  return {...p,curriculumSnapshot,revision,baseRevision:revision,
    checkpoints:p.checkpoints.map(c=>({...c,revision})),sessions:p.sessions.map(s=>({...s,revision}))};
}

export function validatePathway(p,graph,{validateSessions=true,validateTargets=true}={}) {
  if(!p||p.schemaVersion!==1||typeof p.id!=='string'||p.id.length>150||typeof p.classId!=='string'||p.classId.length>150||!p.title?.trim()||p.title.length>120)throw new Error('Invalid pathway identity.');
  if(!graph.courses.some(c=>c.id===p.courseId)||p.graphVersion!==graph.version&&p.curriculumSnapshot?.version!==p.graphVersion)throw new Error('Unknown course or graph version.');
  if(p.pacingVisibility!==undefined&&!['private','shared'].includes(p.pacingVisibility))throw new Error('Choose who can see the pacing targets.');
  if(p.calendar===null){
    if(p.examDate!==null||p.sessions?.length)throw new Error('Add a calendar before setting a schedule.');
  }else{
    if(!p.calendar)throw new Error('Invalid school calendar.');
    if(p.examDate!==null&&(!dateOK(p.examDate)||p.examDate<p.calendar.start||p.examDate>p.calendar.end))throw new Error('Exam date must fall within the school calendar.');
    try{new Intl.DateTimeFormat('en-CA',{timeZone:p.calendar.timeZone||'America/Los_Angeles'}).format(new Date());}catch{throw new Error('Choose a valid IANA school time zone.');}
    meetings(p.calendar);
  }
  if(!Number.isInteger(p.toleranceDays)||p.toleranceDays<0||p.toleranceDays>365)throw new Error('Invalid pacing tolerance.');
  if(!Array.isArray(p.customNodes)||!Array.isArray(p.customAreas)||p.customNodes.length>500||new Set(p.customNodes.map(n=>n.id)).size!==p.customNodes.length||p.customNodes.some(n=>graph.nodes.some(g=>g.id===n.id)||!n.objective||n.courseId!==p.courseId||!p.customAreas.some(a=>a.id===n.areaId)))throw new Error('Custom skills need unique IDs, objectives and class areas.');
  const nodes=new Map([...(p.curriculumSnapshot?.nodes||graph.nodes),...(p.customNodes||[])].filter(n=>n.courseId===p.courseId).map(n=>[n.id,n]));
  if(!Array.isArray(p.checkpoints)||p.checkpoints.length>1500||new Set(p.checkpoints.map(c=>c.id)).size!==p.checkpoints.length||new Set(p.checkpoints.map(c=>c.nodeId)).size!==p.checkpoints.length)throw new Error('Checkpoints need unique stable IDs and nodes.');
  if(!Array.isArray(p.sequence)||new Set(p.sequence).size!==p.sequence.length||p.sequence.length!==p.checkpoints.length||p.sequence.some(id=>!p.checkpoints.some(c=>c.nodeId===id)))throw new Error('Sequence must contain every checkpoint exactly once.');
  if(!Array.isArray(p.policies)||!p.policies.length)throw new Error('Mastery policies are required.');
  if(new Set(p.policies.map(x=>x.id+'@'+x.version)).size!==p.policies.length)throw new Error('Policy versions must be unique.');
  for(const policy of p.policies){if((policy.practiceGoal!==undefined&&(policy.practiceGoal!==true||!policy.provisional||!policy.minimumQuestions||policy.accuracy===null))||!Number.isInteger(policy.version)||policy.version<1||!policy.id||typeof policy.provisional!=='boolean'||!policy.coverage||Array.isArray(policy.coverage)||Object.values(policy.coverage).some(n=>!Number.isInteger(n)||n<0)||(policy.scoreTarget!==null&&(!Number.isFinite(policy.scoreTarget)||policy.scoreTarget<0||policy.scoreTarget>4))||(policy.minimumQuestions!==null&&(!Number.isInteger(policy.minimumQuestions)||policy.minimumQuestions<1))||(policy.accuracy!==null&&(!Number.isFinite(policy.accuracy)||policy.accuracy<0||policy.accuracy>1)))throw new Error('Invalid mastery policy.');}
  for(const c of p.checkpoints){if(!nodes.has(c.nodeId)||c.pathwayId!==p.id||c.areaId!==nodes.get(c.nodeId).areaId||typeof c.required!=='boolean'||!Number.isFinite(c.minutes)||c.minutes<1||c.minutes>10000||!p.policies.some(x=>x.id===c.policyId&&x.version===c.policyVersion)||c.targetDate!==null&&!dateOK(c.targetDate))throw new Error('Invalid checkpoint.');
    if(c.practiceGoalPolicyId!==undefined||c.practiceGoalPolicyVersion!==undefined){
      if(!p.policies.some(rule=>rule.practiceGoal&&rule.id===c.practiceGoalPolicyId&&rule.version===c.practiceGoalPolicyVersion))throw new Error('Invalid practice goal.');
    }
    if(c.targetDate&&(!p.calendar||(validateTargets&&(c.targetDate<p.calendar.start||c.targetDate>p.calendar.end))))throw new Error('Checkpoint target is outside the planning window.');
    if(c.expectedMastery!==null&&(!Number.isFinite(c.expectedMastery)||c.expectedMastery<0||c.expectedMastery>4))throw new Error('Mastery targets use the 0–4 scale.');
    if(!Array.isArray(c.prerequisites)||c.prerequisites.some(id=>!nodes.has(id)))throw new Error('Unknown prerequisite.');}
  const visiting=new Set(),visited=new Set();function visit(id){if(visiting.has(id))throw new Error('Prerequisite cycle.');if(visited.has(id))return;visiting.add(id);for(const d of p.checkpoints.find(c=>c.nodeId===id)?.prerequisites||[])visit(d);visiting.delete(id);visited.add(id);}p.sequence.forEach(visit);
  if(!Array.isArray(p.sessions))throw new Error('Invalid scheduled sessions.');
  if(!validateSessions||!p.calendar)return true;
  const actual=new Map(meetings(p.calendar).filter(m=>m.meets&&m.date<=(p.examDate??p.calendar.end)).map(m=>[m.date,m]));const usedDates=new Set();
  for(const session of p.sessions){const m=actual.get(session.date);if(!m||usedDates.has(session.date)||session.minutes!==m.minutes||session.dayType!==(session.date===p.examDate?'Semester / Final Exam':m.dayType)||!Array.isArray(session.allocations))throw new Error('Scheduled sessions must match actual class meetings. Recalculate the plan.');
    if(['Study / Review','Mixed Practice','Quiz / Testing','Semester / Final Exam'].includes(session.dayType)&&session.allocations.length)throw new Error('Protected study and testing dates cannot introduce content.');
    if(session.allocations.some(a=>!Number.isFinite(a.minutes)||a.minutes<0)||session.allocations.reduce((n,a)=>n+a.minutes,0)>m.minutes)throw new Error('Instruction exceeds meeting time.');usedDates.add(session.date);}
  return true;
}
export function diffPathways(oldP,newP) {
  if(!oldP)return [{kind:'created',pathwayId:newP.id}];const changes=[];
  for(const key of ['title','examDate','calendar','pacingVisibility','sequence','policies','toleranceDays','customAreas','customNodes'])if(JSON.stringify(oldP[key])!==JSON.stringify(newP[key]))changes.push({kind:key,before:oldP[key],after:newP[key]});
  const old=new Map(oldP.checkpoints.map(c=>[c.id,c]));for(const c of newP.checkpoints){const before=old.get(c.id);if(!before)changes.push({kind:'added',id:c.id,after:c});else for(const k of ['targetDate','required','policyId','policyVersion','practiceGoalPolicyId','practiceGoalPolicyVersion','expectedMastery','minutes','prerequisites'])if(JSON.stringify(before[k])!==JSON.stringify(c[k]))changes.push({kind:k,id:c.id,before:before[k],after:c[k]});old.delete(c.id);}for(const [id,before] of old)changes.push({kind:'removed',id,before});return changes;
}
// Evidence is immutable input supplied by the existing profile/reporting adapter.
// Node completion and the 0–4 score are deliberately independent dimensions.
export function evaluateNode(nodeId,policy,evidence,expectedMastery=null) {
  const ev=[...new Map(evidence.filter(e=>e.nodeIds?.includes(nodeId)&&e.eligible===true).map(e=>[e.id,e])).values()];
  const earned=ev.find(e=>e.kind==='mastery-award'&&e.policyId===policy.id&&e.policyVersion===policy.version);
  const scores=ev.filter(e=>e.kind==='assessment'&&Number.isFinite(e.score)&&e.score>=0&&e.score<=4).sort((a,b)=>b.timestamp.localeCompare(a.timestamp));const score=scores[0]?.score??null;
  if(earned)return {completion:'complete',score,evidenceCount:ev.length,award:earned.id};
  if(policy.provisional)return {completion:score!==null?'incomplete':'needs-assessment',score,evidenceCount:ev.length,historicalAwards:ev.filter(e=>e.kind==='mastery-award').map(e=>e.id)};
  const q=[...new Map(ev.filter(e=>e.kind==='question'&&e.firstAttempt===true&&!e.skipped&&!e.revealed&&e.familyId&&e.questionId).map(e=>[(e.sessionId||'')+':'+e.questionId,e])).values()];
  const accuracy=q.length?q.filter(e=>e.correct===true).length/q.length:0;
  const coverage=Object.entries(policy.coverage||{}).every(([key,min])=>q.filter(e=>e.subskills?.includes(key)&&e.correct===true).length>=min);
  const questionsPass=policy.minimumQuestions!==null&&policy.accuracy!==null&&q.length>=policy.minimumQuestions&&accuracy>=policy.accuracy&&coverage;
  const scorePass=policy.scoreTarget!==null&&score!==null&&score>=policy.scoreTarget;
  const complete=questionsPass||scorePass;
  return {completion:complete?'complete':q.length||score!==null?'incomplete':'needs-assessment',score,evidenceCount:ev.length,accuracy,coverage};
}
export function pacingStatus(p,evidence,{today=new Intl.DateTimeFormat('en-CA',{timeZone:p.calendar?.timeZone||'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),toleranceDays=p.toleranceDays||0}={}) {
  const shared=!!p.calendar&&p.pacingVisibility!=='private';
  const checkpoints=p.checkpoints.map(c=>{const policy=p.policies.find(x=>x.id===c.policyId&&x.version===c.policyVersion);const state=evaluateNode(c.nodeId,policy,evidence,c.expectedMastery);
    const targetMet=state.completion==='complete'&&(c.expectedMastery===null||state.score!==null&&state.score>=c.expectedMastery);
    const needsAssessment=state.completion==='needs-assessment'||c.expectedMastery!==null&&state.score===null;
    const overdue=Boolean(shared&&p.pacingVisibility===undefined&&c.required&&c.targetDate&&Date.parse(c.targetDate)+toleranceDays*86400000<Date.parse(today));return {...c,targetDate:shared?c.targetDate:null,targetLocked:shared&&c.targetLocked,...state,targetMet,needsAssessment,overdue,reason:overdue?(!targetMet?(needsAssessment?'overdue-insufficient-evidence':'overdue-low-proficiency'):'completed'):null};});
  const required=checkpoints.filter(c=>c.required);const late=required.filter(c=>c.overdue&&!c.targetMet);
  const status=!shared?'Self-paced':p.pacingVisibility==='shared'?'Suggested targets':late.some(c=>!c.needsAssessment)?'Behind':late.length?'Insufficient Evidence / Needs Assessment':required.some(c=>c.targetMet&&c.targetDate>today)?'Ahead':required.some(c=>!c.targetDate)?'Insufficient Evidence / Needs Assessment':'On Track';
  return {status,pathwayId:p.id,revision:p.revision,calculatedAt:today,checkpoints};
}
export function studentContract(p,graph,evidence=[],options={}) {
  const state=pacingStatus(p,evidence,options);
  const nodes=new Map([...(p.curriculumSnapshot?.nodes||graph.nodes),...p.customNodes].map(n=>[n.id,n]));
  const areas=new Map([...(p.curriculumSnapshot?.areas||graph.areas),...p.customAreas].map(a=>[a.id,a]));
  const checkpoints=new Map(state.checkpoints.map(c=>[c.nodeId,c]));
  const skills=p.sequence.map(id=>{
    const node=nodes.get(id), checkpoint=checkpoints.get(id);
    const practice=options.practice?.get(id)??{attempted:0,correct:0};
    const policy=p.policies.find(rule=>rule.id===checkpoint.practiceGoalPolicyId&&rule.version===checkpoint.practiceGoalPolicyVersion);
    const practiceGoal=policy?{
      questions:policy.minimumQuestions,accuracy:policy.accuracy,
      met:practice.attempted>=policy.minimumQuestions&&practice.correct/practice.attempted>=policy.accuracy
    }:null;
    return {...node,checkpoint,practiceProgress:practice,practiceGoal};
  });
  const shared=!!p.calendar&&p.pacingVisibility!=='private';
  return {schemaVersion:1,pathwayId:p.id,classId:p.classId,title:p.title,courseId:p.courseId,
    revision:p.revision,graphVersion:p.graphVersion,status:state.status,
    areas:[...new Set(skills.map(n=>n.areaId))].map(id=>areas.get(id)),
    nodes:skills,edges:p.checkpoints.flatMap(c=>c.prerequisites.map(from=>({from,to:c.nodeId,kind:'prerequisite'}))),
    sessions:shared?p.sessions:[],policies:p.policies,examDate:shared?p.examDate:null};
}
