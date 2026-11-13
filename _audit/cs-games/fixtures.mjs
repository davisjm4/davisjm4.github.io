import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import '../../cs-games/teacher/test-runtime.mjs';
import graph from '../../cs-games/pathway/curriculum-graph.json' with {type:'json'};
import registry from '../../cs-games/pathway/evidence-gap-registry.json' with {type:'json'};
import { applyToSkills, buildContentFacts, createContext } from '../../cs-games/pathway/requirements/index.mjs';
import { generatePacing } from '../../cs-games/pathway/pacing.mjs';
import { generateChallenge } from '../../java-games/loop-lab/loop-engine.js';
import { PARTS } from '../../cs-games/robotics/parts-sprint/catalog.js';
import { getHybrid } from '../../cs-games/teacher/workplace-adapter.js';
import { generateDiagnostic } from '../../cs-games/teacher/wpr-online-builder.mjs';
import { BATCH_LIMIT, DAY, PROFILE_VERSION, practiceEvent } from '../../wpr-games/workplace-readiness/online/profile-model.mjs';

export const courses = [
  {id:'csp', title:'AP CSP', node:'node:csp:binary-builder:CSP-CAPACITY'},
  {id:'advanced', title:'Advanced Computer Science', node:'node:advanced:loop-lab:looptype'},
  {id:'robotics', title:'Robotics 1', node:'node:robotics:parts-sprint:structure'},
  {id:'workplace', title:'Workplace Readiness', node:'node:workplace:creativity-and-innovation:contribute-ideas'}
];
export const scenarios = [
  ['Never practiced',0,0],
  ['Just started',3,2],
  ['High activity, low accuracy',36,10],
  ['High Beginner accuracy only',22,22],
  ['Level 3',0,0],
  ['Level 4',0,0],
  ['Level 4 through alternative evidence',12,10],
  ['Missing required evidence',7,5],
  ['Intervention needed',25,7],
  ['Practiced out of sequence',12,9],
  ['Returning after a gap',14,11],
  ['Interrupted session',6,4],
  ['Completed an assigned area',14,12],
  ['Teacher modified the requirement',18,16],
  ['Practiced once',1,1],
  ['Developing accuracy',10,7],
  ['Mostly correct',20,18],
  ['Practiced over several days',24,20],
  ['Near the accuracy target',20,17],
  ['Starting again',4,2],
  ['No activity this week',9,8],
  ['Growing consistency',15,12],
  ['High accuracy, short history',5,5],
  ['Ready for a teacher check',25,24]
];

export function createClient(origin) {
  const api = new URL('/api/wpr/',origin);
  assert.equal(api.hostname,'127.0.0.1');
  assert.equal(api.protocol,'http:');
  return async (path,{token,body,method,status=200}={}) => {
    assert.match(path,/^\/[a-z]/);
    const url = new URL(api.pathname.slice(0,-1)+path,api);
    assert.equal(url.origin,api.origin);
    const response = await fetch(url,{
      redirect:'error', method:method??(body===undefined?'GET':'POST'),
      headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},
      body:body===undefined?undefined:JSON.stringify(body)
    });
    const result = await response.json();
    assert.equal(response.status,status,path.split('?')[0]+': '+(result.error??'unexpected status'));
    return result;
  };
}

const facts = buildContentFacts({graph,registry});
const workplaceContent = getHybrid();
const cspModes = ['capacity','representation','overflow','pixels'];
const partCategories = ['structure','fasteners','spacing','motion','transmission','wheels','tools','electronics'];
const loopModes = ['looptype','executions','components','algorithms'];
const today = offset => new Date(Date.now()+offset*DAY).toISOString().slice(0,10);
const executionNode = 'node:advanced:loop-lab:executions';

function practice(course,scenarioIndex,slot,count,correctCount,difficulty,now,sessionIds,wpr) {
  const onChangedSkill = course.id==='advanced' && [7,11,13].includes(scenarioIndex);
  const daysAgo = scenarioIndex===20 ? 16 : scenarioIndex===10 && slot<count-2 ? 25 : Math.floor((count-slot-1)/8);
  const occurred = onChangedSkill ? now-count+slot : now-daysAgo*DAY-(count-slot)*60000;
  const correct = slot < correctCount;
  if (course.id==='workplace') return practiceEvent(wpr.next(),correct,occurred);
  const questionId = randomUUID();
  const event = {version:PROFILE_VERSION,format:'game-attempt',kind:'practice',questionId,
    id:questionId+':1',sessionId:sessionIds[Math.floor(slot/8)],courseId:course.id,attempt:1,occurred,correct,difficulty};
  if (course.id==='advanced') {
    const mode = onChangedSkill ? 'executions' : scenarioIndex===9 ? 'algorithms' :
      scenarioIndex>=14 ? loopModes[scenarioIndex%loopModes.length] : 'looptype';
    const q = generateChallenge({mode,difficulty,seed:1000+scenarioIndex*191+slot*7});
    return {...event,activity:'loop-lab',mode,assessedMode:mode,topic:q.topic,familyId:q.reasoningFamily,difficulty:q.difficulty};
  }
  if (course.id==='robotics') {
    const category = scenarioIndex===9 ? 'electronics' : scenarioIndex>=14 ? partCategories[scenarioIndex%partCategories.length] : 'structure';
    const parts = PARTS.filter(part=>part.category===category);
    const part = parts[slot%parts.length];
    return {...event,activity:'parts-sprint',mode:'learn',assessedMode:'learn',topic:category,familyId:part.id,difficulty:part.difficulty};
  }
  const mode = scenarioIndex===9 ? 'overflow' : scenarioIndex>=14 ? cspModes[scenarioIndex%cspModes.length] : 'capacity';
  return {...event,activity:'binary-builder',mode,assessedMode:mode,topic:mode,familyId:mode,difficulty:null};
}

async function configureAdvancedPathway(teacher,path) {
  const {draft,published,draftVersion} = await teacher(path);
  // Leave Loop Type at its standard formative thresholds so auditors can compare
  // genuine Beginner/Intermediate/Advanced results. Seed the changed rule on another skill.
  const requirement = applyToSkills(draft,[executionNode],{minimumQuestions:20,accuracy:0.85},
    createContext({graph,published,facts}));
  assert.ok(requirement.ok,JSON.stringify(requirement.errors));
  const scheduled = generatePacing({...requirement.pathway,calendar:{
    start:today(-18),end:today(105),weekdays:[1,2,3,4,5],minutes:80,rotation:['A','B'],
    classRotations:['A'],rotationOffset:0,overrides:[],timeZone:'America/Los_Angeles'
  },examDate:today(104),pacingVisibility:'shared'},graph);
  await teacher(path+'/draft',{body:{pathway:scheduled,draftVersion}});
  const preview = await teacher(path+'/preview',{body:{}});
  const {previewToken,expectedRevision} = preview;
  return (await teacher(path+'/publish',{body:{previewToken,expectedRevision,draftVersion:preview.draftVersion,acknowledged:true}})).published;
}

async function diagnostic(teacher,api,classroom,students) {
  const questions = generateDiagnostic({skills:[],contexts:[],modes:[],difficulty:'mixed'},
    ['attire-ppe','workplace-relationships'].map(id=>({scope:'topic',id,name:id,count:3})),'audit-fixture');
  assert.equal(questions.length,6);
  const {id} = await teacher('/teacher/assignments',{body:{
    title:'Synthetic WPR diagnostic · Attire and workplace relationships',version:1,kind:'diagnostic',
    reporting:true,feedbackTiming:'after',retakes:'once',shuffle:false,closes:null,questions,profileClassId:classroom.id
  }});
  const path = '/student/'+id;
  for (const [index,student] of students.slice(14,22).entries()) {
    const {token} = await api('/profile/restore',{body:{id:student.id,recovery:student.recovery}});
    const receipt = await api(path+'/start',{token,body:{}});
    if (index===7) break; // A started assessment can be resumed from the same profile.
    const answers = questions.map((q,i)=>i<index%4+2?q.correctIndex:(q.correctIndex+1)%4);
    await api(path+'/submit',{token,body:{token:receipt.token,answers}});
  }
  return id;
}

export async function seedFixtures(api,teacherToken) {
  const teacher = (path,options) => api(path,{...options,token:teacherToken});
  const result = [];
  for (const course of courses) {
    const classInfo = await teacher('/teacher/profiles',{body:{title:'Synthetic · '+course.title,courseId:course.id}});
    const path = '/teacher/profiles/'+classInfo.id;
    const {pathways} = await teacher('/pathways/teacher');
    const pathwayPath = '/pathways/teacher/'+pathways.find(p=>p.classId===classInfo.id).id;
    const plan = course.id==='advanced' ? await configureAdvancedPathway(teacher,pathwayPath) :
      (await teacher(pathwayPath)).published;
    const students = [];
    for (const [index,[label,count,correct]] of scenarios.entries()) {
      const credentials = await teacher(path+'/students',{body:{}});
      const student = {...credentials,label};
      students.push(student);
      const now = Date.now();
      const wpr = course.id==='workplace' ? globalThis.WRG.selector.createSession(workplaceContent,{seed:'audit-'+index,
        filters:{topics:[index===9?'computer-technology':index%2?'attire-ppe':'workplace-relationships']}}) : null;
      const {token} = count || [4,5].includes(index) ? await api('/profile/restore',{body:credentials}) : {};
      const sessions = Array.from({length:16},()=>randomUUID());
      const sync = async events => {
        for (let i=0;i<events.length;i+=BATCH_LIMIT) {
          const batch=events.slice(i,i+BATCH_LIMIT);
          const result=await api('/profile/sync',{token,body:{events:batch}});
          assert.equal(result.accepted.length,batch.length);
        }
      };
      const batch = (size,right,difficulty,time=now) => Array.from({length:size},(_,i)=>
        practice(course,index,i,size,right,difficulty,time,sessions,wpr));
      await sync(batch(count,correct,index===3?'beginner':'intermediate'));
      if (course.id==='advanced' && [4,5].includes(index)) {
        await sync(batch(45,44,'intermediate'));
        if (index===5) await sync(batch(50,48,'advanced'));
        const view = await api('/pathways/student/'+classInfo.id,{token});
        assert.equal(view.pathway.proficiency.skills[course.node].level,index===4?3:4);
      } else if ([4,5,6,12].includes(index)) {
        const nodes = index===12 ? plan.checkpoints.filter(c=>c.areaId===plan.checkpoints.find(c=>c.nodeId===course.node).areaId).map(c=>c.nodeId) : [course.node];
        for (const nodeId of nodes) await teacher(path+'/students/'+student.id+'/evidence',{body:{
          id:randomUUID(),nodeId,score:index===4||index===12?3:4,award:true,revision:plan.revision,
          demonstrationType:index===6?'project':index===5?'performance':'assessment'
        }});
      }
      if (course.id==='advanced' && index===11) {
        const view = await api('/pathways/student/'+classInfo.id,{token});
        const challenge = view.pathway.nodes.find(n=>n.id===executionNode).masteryChallenge;
        await api('/pathways/student/'+classInfo.id+'/restart',{token,body:{nodeId:executionNode,requestId:randomUUID(),
          expectedAttemptId:challenge.activeAttemptId}});
        await sync(batch(2,1,'beginner',Date.now()+10));
      }
    }
    const item = {...course,courseId:course.id,...classInfo,students};
    if (course.id==='workplace') item.diagnosticId = await diagnostic(teacher,api,item,students);
    result.push(item);
  }
  return result;
}
