import {families,TOPICS,MODES} from './catalog.js';
import {scenario} from './scenarios.js';
import {render,execute,patch,find,walk,clone,shape,L,List} from './model.js';
export {families,TOPICS,MODES};
export const VERSION='create-task-v1';
export function random(seed=1){let x=(seed>>>0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
export function shuffle(items,rng){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
const normal=x=>JSON.stringify(x);
const behavior=r=>normal({outputs:r.outputs,error:r.error,lists:Object.fromEntries(Object.entries(r.env).filter(([,v])=>Array.isArray(v)))});
function distractors(p,answer) {
  let params=0,calls=0,defs=0,ifs=0,loops=0,displays=0;const statements=[];
  walk(p,n=>{if(n.k==='procedure'){defs++;params+=n.params.length;}if(n.k==='call')calls++;if(n.k==='if')ifs++;if(['each','repeat','until'].includes(n.k))loops++;if(n.k==='display')displays++;});
  if(defs)statements.push('The student-developed procedure has no definition.');
  if(calls)statements.push('The code contains no call to the student-developed procedure.');
  if(params)statements.push('The procedure header declares no parameter.');
  if(ifs)statements.push('The program contains no IF statement for selection.');
  if(loops)statements.push('The program contains no iteration statement.');
  if(displays)statements.push('The code contains no instruction for displaying a value.');
  // These are explicit common misconceptions, not optional practices described as requirements.
  statements.push('Every procedure must return a value, so a missing RETURN is the problem.','An argument belongs in the definition rather than the call.');
  return statements.filter(x=>x!==answer).slice(0,2);
}
export function buildChallenge(familyId,variant=0,seed=1,{valid=false,phrasing=0}={}) {
  const family=families.find(f=>f.id===familyId);if(!family)throw Error('Unknown family '+familyId);
  const s=scenario(family.scenario,variant,seed),baseline=clone(s.program),program=clone(baseline);
  let mutation=null;
  if(family.mode==='missing'&&!valid){const before=clone(find(program,family.target));const after=family.replacement(s);patch(program,family.target,after);mutation={id:family.id,target:family.target,before,after};}
  const displayed=render(program),corrected=render(baseline),rng=random(seed^variant^familyId.length);
  let target=null,candidates=[],choices=[],correct;
  if(family.mode==='identify'){
    const targets=displayed.regions.filter(x=>x.id===family.target);if(targets.length!==1)throw Error(family.id+': expected one region '+family.target+', got '+targets.length);
    target=targets[0];correct=target.id;
    // All regions of a given granularity are selectable; nested and repeated valid
    // component roles are disambiguated by the authored prompt's location/context.
    candidates=displayed.regions.filter(r=>r.kind===target.kind);
    if(family.topic==='parameters')candidates=displayed.regions.filter(r=>r.kind===target.kind||['parameter','argument','parameter-use'].includes(r.id));
    if(candidates.length<2)candidates=displayed.regions.filter(r=>r.id===target.id||['procedure-header','parameter','argument','call','invoke-call','return','output','condition','loop-header'].includes(r.id));
  }else{
    correct=valid?'No missing component — the program is correct.':family.answer;
    choices=shuffle([family.answer,...distractors(program,family.answer),'No missing component — the program is correct.'],rng);
    // Correct controls keep the same plausible diagnosis choices as defective rounds.
  }
  const prompt=family.mode==='identify'?family.prompts[phrasing%family.prompts.length]:['Which component is missing, incorrect, or ineffective for the stated task?','Which statement accurately evaluates the program for the stated behavior and focus?'][phrasing%2];
  const explanation=family.mode==='identify'?family.explanation:valid?'No component is missing for the stated task and focus. '+(family.requirement||'The program implements the stated behavior. This does not claim that this short example satisfies every Create requirement.'):family.explanation;
  return {version:VERSION,id:`${family.id}:${variant}:${seed}:${valid?1:0}:${phrasing%2}`,familyId:family.id,scenarioId:s.id,mode:family.mode,topic:family.topic,variant,seed,phrasing:phrasing%2,valid:family.mode==='missing'&&valid,mutation,prompt,scenario:s.description+(s.id==='input'?' The supplied user response for this run is '+s.sample+'.':s.id==='event'?'':' The intended argument for this task is '+JSON.stringify(s.originalValue)+'.'),requirement:family.requirement,program,baseline,code:displayed.code,regions:displayed.regions,correctedCode:corrected.code,correctedRegions:corrected.regions,target,candidates,choices,correct,explanation,structuralSignature:shape(program),repeatSignature:normal({family:family.id,code:displayed.code,valid:!!valid}),semanticMetadata:{inputInstructions:displayed.regions.filter(r=>r.id==='input-statement'||r.id==='event-header'),outputInstructions:displayed.regions.filter(r=>r.id==='output'),parameters:displayed.regions.filter(r=>r.id==='parameter'),arguments:displayed.regions.filter(r=>r.id==='argument')},probes:s.probes};
}
export function assess(q,answer){return answer===q.correct;}
export function validate(q) {
  const errors=[],s=scenario(q.scenarioId,q.variant,q.seed),base=execute(q.baseline,s.probes[0]),actual=execute(q.program,s.probes[0]);
  if(base.error)errors.push('Baseline execution: '+base.error);
  if(normal(base.outputs)!==normal(s.probes[0].expected))errors.push('Baseline disagrees with independent scenario oracle: '+normal(base.outputs)+' vs '+normal(s.probes[0].expected));
  const ids=q.regions.map(r=>r.id);if(new Set(ids).size!==ids.length)errors.push('Duplicate source IDs');
  if(q.mode==='identify'){
    if(q.regions.filter(r=>r.id===q.correct).length!==1)errors.push('Answer not uniquely located');
    if(!q.candidates.some(r=>r.id===q.correct))errors.push('Target not selectable');
    if(q.code.slice(q.target.start,q.target.end)!==q.target.text)errors.push('Source span mismatch');
    if(q.candidates.length<2)errors.push('No plausible alternative source region');
    if(actual.error)errors.push('Identify program execution: '+actual.error);
  }else{
    if(q.choices.length!==4||new Set(q.choices).size!==4||q.choices.filter(x=>x===q.correct).length!==1)errors.push('Answer choices not unique');
    if(q.valid){if(q.mutation||normal(q.program)!==normal(q.baseline))errors.push('Control mutated');}
    else{
      if(!q.mutation)errors.push('No controlled mutation');
      const reproduced=patch(clone(q.baseline),q.mutation.target,q.mutation.after);
      if(normal(reproduced)!==normal(q.program))errors.push('More than one controlled mutation');
      if(normal(q.program)===normal(q.baseline))errors.push('Mutation has no effect');
    }
  }
  // Counterfactual calls expose hard-coded parameters even when this particular call
  // happens to agree. These are bounded checks, not a universal equivalence proof.
  let behaviorChanged=behavior(base)!==behavior(actual),counterfactuals=0;
  if(q.mutation&&!['argument','invoke'].includes(q.mutation.target)){
    const alternatives=typeof s.sample==='number'?[0,1,2,3,9,10,20,21,25,30,s.cut-1,s.cut,s.cut+1]:typeof s.sample==='boolean'?[true,false]:Array.isArray(s.sample)?[[1,2],[2,3,4,5]]:['Ari','Bo','Zed'];
    for(const a of alternatives){
      if(['access','remove'].includes(s.id)&&(!Number.isInteger(a)||a<1||a>3))continue;
      try{
        const b=patch(clone(q.baseline),'argument',Array.isArray(a)?List(a,'argument'):L(a,'argument'));
        const p=patch(clone(q.program),'argument',Array.isArray(a)?List(a,'argument'):L(a,'argument'));
        const rb=execute(b,s.probes[0]),rp=execute(p,s.probes[0]);counterfactuals++;
        if(!rb.error&&behavior(rb)!==behavior(rp))behaviorChanged=true;
      }catch{/* A deleted call legitimately has no argument span. */}
    }
  }
  // Structural obligations independently checked for behavior-preserving defects.
  let structuralDefect=false;
  if(q.familyId==='missing-parameter-unused')structuralDefect=!q.program.find(n=>n.k==='procedure')?.body.some(n=>n.value?.k==='var'&&n.value.name===s.param);
  if(q.familyId==='missing-declared-list-unused')structuralDefect=find(q.program,'list-use')?.k==='list';
  if(q.familyId==='missing-algorithm-selection-absent'){let present=false;walk(find(q.program,'procedure')?.body,n=>{if(n.k==='if')present=true;});structuralDefect=!present;}
  if(q.familyId==='missing-algorithm-iteration-absent'){let present=false;walk(find(q.program,'procedure')?.body,n=>{if(['each','repeat','until'].includes(n.k))present=true;});structuralDefect=!present;}
  if(q.familyId==='missing-append-wrong-value')structuralDefect=find(q.program,'append')?.args[1]?.k==='lit';
  if(q.familyId==='missing-count-versus-sum')structuralDefect=find(q.program,'append')?.args[1]?.k==='lit';
  if(q.mode==='missing'&&!q.valid&&!behaviorChanged&&!structuralDefect)errors.push('Defect not exposed by behavioral probes or explicit structural obligation');
  if(q.code.split('\n').length>38)errors.push('Program exceeds beginner size bound');
  return {ok:!errors.length,errors,baselineExecuted:true,behaviorChanged,structuralDefect,counterfactuals,baselineOutput:base.outputs,actualOutput:actual.outputs,actualError:actual.error};
}
// Balanced per-mode/topic/family deck. Exact code cannot recur in the last 50
// rounds, including after filter changes. Families may recur in narrow filters.
export function createSampler(seed=1,{history=[]}={}) {
  const rng=random(seed),seen=[...history].slice(-50),counts=new Map(),groupCounts=new Map();let turn=0,missingTurns=0;
  return {next({mode='mixed',topic='all'}={}){
    const modes=mode==='mixed'?['missing','identify']:[mode];
    const selectedMode=modes.sort((a,b)=>(groupCounts.get(a)||0)-(groupCounts.get(b)||0)||rng()-.5)[0];
    const eligible=families.filter(f=>f.mode===selectedMode&&(topic==='all'||f.topic===topic));if(!eligible.length)throw Error('No matching families');
    const topics=[...new Set(eligible.map(f=>f.topic))];
    const selectedTopic=topics.sort((a,b)=>(groupCounts.get(selectedMode+':'+a)||0)-(groupCounts.get(selectedMode+':'+b)||0)||rng()-.5)[0];
    const pool=eligible.filter(f=>f.topic===selectedTopic);
    let family=pool.sort((a,b)=>(counts.get(a.id)||0)-(counts.get(b.id)||0)||rng()-.5)[0];
    const valid=selectedMode==='missing'&&missingTurns%6===5;
    let challenge,available=false;
    for(const candidate of pool){
      family=candidate;
      for(let attempt=0;attempt<100;attempt++){
        const v=Math.floor(rng()*3),s=Math.floor(rng()*1000000000)+1;
        const built=buildChallenge(family.id,v,s,{valid,phrasing:Math.floor(rng()*2)});
        if(!seen.includes(built.repeatSignature)){challenge=built;available=true;break;}
      }
      if(available)break;
    }
    if(!available)throw Error('Repeat avoidance exhausted for the selected topic');
    const check=validate(challenge);if(!check.ok)throw Error(challenge.id+' '+check.errors.join('; '));
    seen.push(challenge.repeatSignature);while(seen.length>50)seen.shift();
    counts.set(family.id,(counts.get(family.id)||0)+1);groupCounts.set(selectedMode,(groupCounts.get(selectedMode)||0)+1);groupCounts.set(selectedMode+':'+selectedTopic,(groupCounts.get(selectedMode+':'+selectedTopic)||0)+1);if(selectedMode==='missing')missingTurns++;turn++;
    return challenge;
  },history:()=>[...seen],get turns(){return turn;}};
}
