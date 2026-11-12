// Scored sources and cognitive boundaries reviewed for the formative rubric.
const coverage = new Map();
const rule = (activityId, mode, minimum, distinct, difficulty, accuracy=0.85) =>
  ({minimum,distinct,accuracy,practice:{activityId,mode,difficulty}});
const core = tiers => ({role:'core',tiers});
const foundation = (beginner,supplemental=false) => ({role:'foundational',supplemental,tiers:{beginner}});
const add = (id,rubric,classify) => coverage.set(id,{rubric,classify});
const bound = (node,event) => node.familyIds?.includes(`family:${node.id}:${event.familyId}`);
const difficulty = value => ['beginner','intermediate','advanced'].includes(value);
function java(activity,mode,rubric,classify){
  add(`node:advanced:${activity}:${mode}`,rubric,(node,event)=>
    event.activityId===activity&&event.assessedMode===mode?classify(node,event):null);
}
const basic = (activity,mode,distinct=2) => rule(activity,mode,5,distinct,'beginner',0.8);
const applied = (activity,mode,distinct=3) => rule(activity,mode,8,distinct,'intermediate');
const deep = (activity,mode) => rule(activity,mode,10,3,'advanced');

for(const mode of ['element','predict-update','perform-update','search','traversal','access-2d',
  'update-2d','nested','reverse','create-references','in-place','trace-2d']){
  const activity='array-lab';
  java(activity,mode,core({
    beginner:basic(activity,mode,3),intermediate:applied(activity,mode),advanced:deep(activity,mode)
  }),(node,event)=>event.evidenceRevision==='array-compose-v1'&&bound(node,event)&&difficulty(event.difficulty)
    ?event.difficulty:null);
}

for(const mode of ['predict','trace','index','expr']){
  const activity='string-lab';
  java(activity,mode,core({
    beginner:basic(activity,mode),intermediate:applied(activity,mode),advanced:deep(activity,mode)
  }),(node,event)=>bound(node,event)&&difficulty(event.difficulty)?event.difficulty:null);
}

java('loop-lab','looptype',core({
  beginner:basic('loop-lab','looptype',3),intermediate:applied('loop-lab','looptype'),
  advanced:deep('loop-lab','looptype')
}),(node,event)=>bound(node,event)&&difficulty(event.difficulty)?event.difficulty:null);
java('loop-lab','components',foundation(basic('loop-lab','components',3),true),
  (node,event)=>bound(node,event)?'beginner':null);
const loopApplication = {
  final:['product','count-even','continue-sum'],
  conditional:['odd-count','greater-sum','continue-even','break-target','else-count'],
  nested:['diagonal','triangular','inner-step','break-inner'],
};
for(const [mode,variants] of Object.entries(loopApplication)){
  java('loop-lab',mode,core({
    beginner:basic('loop-lab',mode),intermediate:applied('loop-lab',mode,2)
  }),(node,event)=>{
    if(!bound(node,event))return null;
    if(event.difficulty==='beginner')return 'beginner';
    return difficulty(event.difficulty)&&variants.includes(event.familyId.slice(mode.length+1))?'intermediate':null;
  });
}

for(const mode of ['modulus','division','casting','expressions','reverse']){
  const beginner=rule('math-lab',mode,5,2,undefined,0.8),intermediate=rule('math-lab',mode,8,3);
  const rubric=['modulus','division'].includes(mode)?foundation(beginner):
    core(mode==='casting'?{beginner,intermediate}:{intermediate});
  java('math-lab',mode,rubric,(node,event)=>{
    if(!bound(node,event))return null;
    if(['modulus','division'].includes(mode))return 'beginner';
    if(['expressions','reverse'].includes(mode))return 'intermediate';
    if(/^casting:(positive|negative)-cast$/.test(event.familyId))return 'beginner';
    return /^casting:(after-division|before-division|denominator-cast|cast-quotient)$/.test(event.familyId)
      ?'intermediate':null;
  });
}

const booleanFamilies = {
  identify:[/^identify-/,null],
  evaluate:[/^evaluate-(and|or|not)-2$/,/^evaluate-(and|or|not)-[3-5]$/],
  equivalent:[/^equivalent-2$/,/^equivalent-[3-5]$/],
  conditions:[/^conditions-(threshold|range)$/,/^conditions-(outside|rangeFlag)$/],
  construct:[/^construct-(threshold|denial)$/,/^construct-(eitherBut|groupAnd|rangeFlag)$/],
  branch:[/^branch-(boundary|else-if-order)$/,/^branch-(overlapping|nested|compound)$/],
  truthTable:[/^eval-row$/,/^(eval-trace|find-error-row|inputs-make-true|count-true-rows|count-false-rows)$/],
  switchIf:[/^(simple-select|default-behavior|multi-label)$/,/^(fall-through|missing-break-fix|convert-to-if|conversion-counterexample|combined-conditional)$/],
};
for(const [mode,[recognition,application]] of Object.entries(booleanFamilies)){
  const activity='boolean-conditional-lab';
  const beginner=basic(activity,mode,['truthTable','equivalent'].includes(mode)?1:2);
  const intermediate=applied(activity,mode,mode==='equivalent'?1:2);
  java(activity,mode,application?core({beginner,intermediate}):foundation(beginner,true),
    (_node,event)=>{
      if(!difficulty(event.difficulty))return null;
      if(recognition.test(event.familyId))return 'beginner';
      return event.difficulty!=='beginner'&&application?.test(event.familyId)?'intermediate':null;
    });
}

const concepts = {
  VARIABLES:['variables','variable value assignment'],
  BOOLEAN:['variables','comparison boolean-expression boolean-value boolean-result'],
  SELECTION:['selection','statement condition true-body false-body compound boolean-condition'],
  ITERATION:['iteration','statement body repeat-count until-condition until-unknown item traversal-count'],
  LISTS:['lists','name list index insert-value element append insert remove location'],
  PARAMETERS:['procedures','parameter parameters argument arguments match'],
  PROCEDURES:['procedures','definition name call return-value return-instruction same-procedure'],
};
const cspAreas = {
  VARIABLES:'code-concepts', BOOLEAN:'boolean-gatekeeper', SELECTION:'algorithm-architect',
  ITERATION:'algorithm-architect', SEQUENCE:'algorithm-architect', ALGORITHMS:'trivial-nontrivial',
  LISTS:'list-lab', PARAMETERS:'code-concepts', PROCEDURES:'code-concepts',
  BINARY:'binary-builder', CAPACITY:'binary-builder', REPRESENTATION:'binary-builder',
};
const cspId = key => `node:csp:${cspAreas[key]}:CSP-${key}`;
function conceptDifficulty(key,event){
  if(event.activityId!=='code-concepts'||event.familyId!==event.topic||!concepts[key])return null;
  const [category,variants]=concepts[key];
  return event.assessedMode===category&&variants.split(' ').some(variant=>event.topic===`${category}/${variant}`)
    ?'beginner':null;
}
const conceptTier = key => rule('code-concepts',concepts[key][0],5,2,undefined,0.8);
for(const key of ['VARIABLES','PARAMETERS']){
  add(cspId(key),foundation(conceptTier(key)),(_node,event)=>conceptDifficulty(key,event));
}

const architectModes = {
  SELECTION:['nested-selection','selection'], ITERATION:['nested','iteration','counter','accumulator'],
  SEQUENCE:['sequence'], ALGORITHMS:['search'], PROCEDURES:['procedure']
};
for(const [key,modes] of Object.entries(architectModes)){
  const intermediate=rule('algorithm-architect',modes[0],6,3,undefined,0.8);
  const tiers=concepts[key]?{beginner:conceptTier(key),intermediate}:{intermediate};
  add(cspId(key),core(tiers),(_node,event)=>{
    if(event.activityId!=='algorithm-architect')return conceptDifficulty(key,event);
    const {assessedMode,topic,familyId}=event;
    if(topic!==assessedMode||!modes.includes(assessedMode)||!familyId.startsWith(`${assessedMode}:`))return null;
    const [,variant,component,extra]=familyId.split(':');
    if(extra!==undefined||!(/^[0-4]$/).test(variant))return null;
    // Isolate application from simple return or initialization questions.
    if(component==='arrange')return ['SEQUENCE','PROCEDURES'].includes(key)?'intermediate':null;
    return ['condition','loop-boundary','update','procedure-call'].includes(component)?'intermediate':null;
  });
}

add(cspId('LISTS'),core({beginner:conceptTier('LISTS'),intermediate:rule('list-lab','execute',8,3)}),
  (_node,event)=>{
    if(event.activityId!=='list-lab')return conceptDifficulty('LISTS',event);
    const {assessedMode,topic,familyId}=event;
    if(assessedMode!=='execute'||topic!=='execute'||!/^list-execute:(?:(?:append|insert|remove)-){3}(?:append|insert|remove)$/.test(familyId))return null;
    return familyId.split(':')[1].split('-').filter(op=>op!=='append').length>=2?'intermediate':null;
  });

add(cspId('BOOLEAN'),core({beginner:conceptTier('BOOLEAN'),intermediate:rule('boolean-gatekeeper','make',8,2)}),
  (_node,event)=>{
    if(event.activityId!=='boolean-gatekeeper')return conceptDifficulty('BOOLEAN',event);
    return event.assessedMode==='make'&&event.topic==='make'&&
      /^both-inputs:(?:and|or|not)$/.test(event.familyId)?'intermediate':null;
  });

for(const [key,mode] of Object.entries({BINARY:'representation',CAPACITY:'capacity',REPRESENTATION:'pixels'})){
  add(cspId(key),foundation(rule('binary-builder',mode,5,1,undefined,0.8)),
    (_node,event)=>event.activityId==='binary-builder'&&event.assessedMode===mode&&event.topic===mode&&event.familyId===mode
      ?'beginner':null);
}

export const phase2Rubric = node => coverage.get(node.id)?.rubric;
export const phase2Difficulty = (node,event) => coverage.get(node.id)?.classify(node,event)??null;
export function formativeFamily(event){
  return event.activityId==='algorithm-architect'?event.familyId.split(':').slice(0,2).join(':'):event.familyId;
}
