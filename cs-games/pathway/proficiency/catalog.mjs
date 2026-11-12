import { phase2Difficulty, phase2Rubric } from './coverage-phase2.mjs';

// Pilot rubric. Entries are reviewed activity/mode/family combinations.
// A graph node or a difficulty label alone does not authorize proficiency credit.
export const PROFICIENCY_VERSION = 2;
const traceId = 'node:advanced:variable-lab:trace';
const divideId = 'node:csp:digital-divide-lab:CSP-DIVIDE';
const numberId = 'node:csp:roundoff-overflow-lab:CSP-NUMERIC';
const traceFamilies = [
  'ASSIGN_COPY','COPY_INDEPENDENCE','SEQUENTIAL_UPDATE','REASSIGN_OVERWRITE',
  'OPERATOR_PRECEDENCE','PARENTHESES','INTEGER_DIVISION','REMAINDER',
  'COMPOUND_ASSIGNMENT','INCREMENT_DECREMENT','MIXED_NUMERIC','DOUBLE_ARITHMETIC',
  'BOOLEAN_NEGATION','BOOLEAN_COMBINATION','STRING_CONCAT','STRING_NUMBER_CONCAT','PRINT_VS_STORED'
];
const divideFamilies={
  barrier:new Set(["unserved-last-link","recurring-cost","shared-device-window","phone-task-mismatch","session-drops","upstream-capacity","task-guidance","input-method-barrier","instructions-language","repair-and-recovery","reachable-terminal","data-budget","training-without-hardware","router-not-service","captions-remaining","usable-service-hours"]),
  impact:new Set(["lesson-live-capacity","outage-application","unreached-warnings","assessment-on-phone","subscription-work-window","shared-equipment-practice","portal-help-gap","inaccessible-payment","language-service-message","business-repair-delay","digital-ticket-only","far-shared-access","offline-study-option","community-partner-reach","maintenance-after-gift","channels-for-participation"]),
  solution:new Set(["build-unserved-path","repair-unreliable-link","fit-task-to-capacity","sustainable-home-plan","loans-at-needed-time","supported-public-workstation","guided-specific-task","repair-required-interface","usable-language-help","restore-existing-access","reachable-partner-sites","warnings-without-internet","equivalent-service-channels","initial-transfer-access","home-goal-not-center","remote-support-channel"])
};
const numericFamilies=new Set(["u-increment","u-add","u-product","u-double","u-power","u-decrement","u-subtract","u-zero-product","u-narrow","u-inclusive","s-increment","s-decrement","s-negative-add","s-sub-positive","s-negate-min","s-absolute","s-product","s-cancel","s-unsigned-transfer","s-narrow-negative","decimal-input","decimal-sum","decimal-product","decimal-division","decimal-negative","decimal-trailing-zero","decimal-third","decimal-seventh","decimal-mean","decimal-percent","binary-tenth","binary-dyadic","binary-sum","binary-product","binary-third","float-decimal-large","float-decimal-small","float-add-small","float-binary-integer","float-binary-fraction","sensor-step","money-cents","bank-interest","timer-ticks","pixel-channel","robot-position","science-ratio","archive-quantity","distance-unit","battery-average","network-duration","game-health","audio-sample","map-height","cloud-cost","storage-counter","lab-dilution","power-display","simulation-step","rate-change"]);
const divideData = ['counts-and-rates','input-method-results','language-format-results'];
const divideLimits = ['online-survey-scope','before-after-not-cause','joint-needs-information','attendance-versus-demonstration'];
const variableRecognition = new Set([
  'type','name','operator','value','declaration','initialization','assignment-operator',
  'assignment','declaration-only','stored','conversion','compatibility'
]);
const outcomes = (id,label,match) => ({id,label,match,minExposure:1,minCorrect:1});
const tiers = ['beginner','intermediate','advanced'];
const traceTopics = (tier,types) => types.map(type=>`variable-trace/${tier}/${type}`);
const traceOutcomes = tier => [
  outcomes('numeric','Numeric state and expressions',{topics:traceTopics(tier,['int','double'])}),
  outcomes('non-numeric','Boolean, character, or string state',{topics:traceTopics(tier,['boolean','char','String'])})
];

export function rubricFor(node) {
  return phase2Rubric(node)??pilotRubric(node);
}

export function pilotRubric(node) {
  if(node.id===traceId) return {role:'core',tiers:{
    beginner:{minimum:5,distinct:2},
    intermediate:{minimum:8,distinct:3,outcomes:traceOutcomes('intermediate')},
    advanced:{minimum:10,distinct:3,outcomes:traceOutcomes('advanced')}
  }};
  if(node.id===divideId) return {role:'core',tiers:{
    beginner:{minimum:5,distinct:3,mode:'barrier'},
    intermediate:{minimum:8,distinct:3,outcomes:[
      outcomes('impact','Apply the access barrier to an outcome',{assessedModes:['impact']}),
      outcomes('solution','Choose a solution that addresses the barrier',{assessedModes:['solution']})
    ]},
    advanced:{minimum:8,distinct:3,mode:'evidence',outcomes:[
      outcomes('rates','Interpret counts and rates',{familyIds:divideData}),
      outcomes('limits','Evaluate the limits of the evidence',{familyIds:divideLimits})
    ]}
  }};
  if(node.id===numberId) return {role:'foundational',tiers:{beginner:{minimum:6,distinct:3,outcomes:[
    outcomes('range','Identify a range limitation',{assessedModes:['overflow']}),
    outcomes('precision','Identify a precision limitation',{assessedModes:['roundoff']})
  ]}}};
  if(node.id==='node:advanced:variable-lab:assemble')return {role:'foundational',tiers:{beginner:{minimum:5,distinct:3}}};
  if(node.id.startsWith('node:advanced:variable-lab:identify/')&&variableRecognition.has(node.id.split('/').at(-1)))
    return {role:'foundational',supplemental:true,tiers:{beginner:{minimum:4,distinct:1}}};
  return {role:'unreviewed',tiers:{}};
}

export function auditedDifficulty(node,event) {
  const {activityId,assessedMode,topic,familyId,difficulty}=event;
  if(!familyId)return null;
  if(phase2Rubric(node))return phase2Difficulty(node,event);
  if(node.id===traceId&&activityId==='variable-lab'&&assessedMode==='trace'){
    return tiers.includes(difficulty)&&traceFamilies.includes(familyId)&&
      traceTopics(difficulty,['int','double','boolean','char','String']).includes(topic)?difficulty:null;
  }
  if(node.id===divideId&&activityId==='digital-divide-lab'){
    if(!topic?.startsWith('bi5:divide:'))return null;
    if(assessedMode==='barrier'&&divideFamilies.barrier.has(familyId))return 'beginner';
    if(['impact','solution'].includes(assessedMode)&&divideFamilies[assessedMode].has(familyId))return 'intermediate';
    if(assessedMode==='evidence'&&[...divideData,...divideLimits].includes(familyId))return 'advanced';
  }
  if(node.id===numberId&&activityId==='roundoff-overflow-lab'&&
      numericFamilies.has(familyId)&&['overflow','roundoff','neither'].includes(assessedMode)&&topic?.toLowerCase()===assessedMode)return 'beginner';
  if(activityId==='variable-lab'&&node.id===`node:advanced:variable-lab:${assessedMode}`&&
      (variableRecognition.has(topic)&&assessedMode===`identify/${topic}`&&familyId===assessedMode||
        assessedMode==='assemble'&&/^assemble\/(int|double|boolean|char|String)$/.test(familyId)))return 'beginner';
  return null;
}

export function proficiencyPractice(node,tier) {
  const expanded=phase2Rubric(node);
  if(expanded)return expanded.tiers[tier]?.practice??null;
  if(node.id===traceId)return {activityId:'variable-lab',mode:'trace',difficulty:tier};
  if(node.id===divideId)return {activityId:'digital-divide-lab',mode:rubricFor(node).tiers[tier]?.mode??'mixed'};
  if(node.id===numberId)return {activityId:'roundoff-overflow-lab'};
  return null;
}
