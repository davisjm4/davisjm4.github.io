// Deterministic server execution of the existing generator; no client correctness claims.
import content from './procedural-content.mjs';
import composeContent from './procedural-compose-content.mjs';
import selector from '../js/compose/selector.js';
import composeCheck from '../js/compose/check.js';
import library from '../js/core/library.js';
import generator from '../js/core/generator.js';
import rng from '../js/core/rng.js';
import grader from '../js/core/grader.js';
import validator from '../js/core/validator.js';
import {reviewedPrimary,primaryForKey} from '../../../cs-games/pathway/wpr-primary-concepts.mjs';
import {items} from './issued-practice-bank.mjs';
import audit from '../../../cs-games/pathway/reports/wpr-mastery/RELEASE_AUDIT.json' with {type:'json'};
const lib=library.create(content);
const hybrid=selector.createHybrid(lib,composeContent);
const composedUnits=new Map(hybrid.catalog.units.map(unit=>['compose:'+unit.id,unit]));
export const proceduralKitIds=composeContent.kits.map(kit=>kit.id);
const reasoning=unit=>unit.engine==='state'?'cx:'+((unit.signature.match(/first:([^|]+)/)||[])[1]??'clear:'+unit.kitId):unit.engine==='process'?'cx:process:'+unit.kitId:'cx:'+unit.signature;
const excluded=new Set(audit.families.filter(f=>f.disposition!=='retained-for-ordinary-practice').map(f=>f.key));
const REV='wpr-procedural-v2',DAY=86400000,enc=new TextEncoder();
const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const hash=async x=>encode(await crypto.subtle.digest('SHA-256',enc.encode(JSON.stringify(x))));
const revision=hash([REV,lib.templates,lib.contexts,lib.people,items]);
const composedRevision=hash([REV,composeContent,lib.contexts,lib.people]);
const revisionFor=source=>source?.startsWith('compose:')?composedRevision:revision;
const keyFor=secret=>typeof secret==='string'&&secret.length>=32?crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']):null;
const sign=(key,s)=>crypto.subtle.sign('HMAC',key,enc.encode(REV+':'+s));
export const proceduralSkills=lib.skills.map(s=>s.id);
export function proceduralSources(skill){
 if(!proceduralSkills.includes(skill))return [];
 return [...lib.templates.filter(t=>t.skill===skill&&!excluded.has('a:'+t.id)).map(t=>({id:'a:'+t.id,reasoning:t.family+':'+t.pattern,concept:primaryForKey('a:'+t.id)?.conceptId??null})),
  ...items.filter(item=>item.concept.split(':')[0]===skill).map(item=>({id:'bank:'+item.id,reasoning:item.family,concept:item.concept})),
  ...[...composedUnits].filter(([,unit])=>unit.skill===skill).map(([id,unit])=>({id,reasoning:reasoning(unit),concept:composeContent.kits.find(k=>k.id===unit.kitId).concepts[0],kitId:unit.kitId}))];
}
export function chooseProceduralSource(skill,recent=[],seed='selection'){
 const sources=proceduralSources(skill);if(!sources.length)return null;
 const distinct=new Set(sources.map(s=>s.reasoning)).size;
 const blocked=new Set(recent.slice(-Math.min(3,distinct-1)).map(r=>r.reasoning??sources.find(s=>s.id===r.sourceId)?.reasoning));
 const pool=sources.filter(s=>!blocked.has(s.reasoning));
 // Choose semantic patterns before surface variants; large kits do not get extra weight for cosmetics.
 const groups=new Map();for(const source of pool){const group=groups.get(source.reasoning)??[];group.push(source);groups.set(source.reasoning,group);}
 const weights=[...groups.values()].map(variants=>{const unseen=variants.filter(s=>!recent.some(r=>r.sourceId===s.id)),concept=variants[0].concept;
  return {variants:unseen.length?unseen:variants,weight:(unseen.length?20:5)+recent.filter(r=>concept&&r.concept===concept&&!r.correct).length*3};});
 const random=rng.create(seed);let pick=random.float()*weights.reduce((sum,x)=>sum+x.weight,0);
 for(const row of weights){pick-=row.weight;if(pick<0)return row.variants[Math.floor(random.float()*row.variants.length)].id;}return weights.at(-1).variants[0].id;
}
export function proceduralQuestion(sourceId,seed){
 if(sourceId.startsWith('compose:')){
  const unit=composedUnits.get(sourceId);if(!unit)return null;
  const q=selector.renderUnit(hybrid,unit,{seed});
  if(!validator.validateChallenge(q,hybrid).ok||composeCheck.checkInstance(q,hybrid).length)return null;
  return q;
 }
 if(sourceId.startsWith('a:')){
  const t=lib.templatesById[sourceId.slice(2)];if(!t||excluded.has(sourceId))return null;
  const q=generator.renderTemplate(t,lib,{seed});
  if(!validator.validateChallenge(q,lib).ok)return null;
  return q;
 }
 const item=items.find(i=>'bank:'+i.id===sourceId);if(!item)return null;
 const order=rng.create(seed).shuffle(item.choices.map((_,i)=>i)),options={},display=[];let bestId;
 order.forEach((index,i)=>{const id='o'+i;display.push({id,text:item.choices[index]});options[id]={role:index===item.best?'best':'weaker',why:index===item.best?item.why:item.comparison[index]};if(index===item.best)bestId=id;});
 return {mode:'decision',skill:item.concept.split(':')[0],family:item.family,reasoning:item.family,concepts:[item.concept],context:item.context,difficulty:'intermediate',scenario:item.scenario,prompt:item.prompt,principle:item.why,options:display,key:{bestId,options}};
}
function publicQuestion(q){const {scenario,prompt,mode,skill,difficulty,context,options,steps,doc}=q;return {scenario,prompt,mode,skill,difficulty,context,...(options?{options}:{}),...(steps?{steps}:{}),...(doc?{doc}:{} )};}
export async function issueProceduralPractice(secret,profile,skill,recent=[],now=Date.now()){
 const key=await keyFor(secret);if(!key||profile.course_id!=='workplace')return null;
 const seed=crypto.randomUUID(),sourceId=chooseProceduralSource(skill,recent,seed);if(!sourceId)return null;
 const q=proceduralQuestion(sourceId,seed);if(!q)return null;
 const question=publicQuestion(q),id='wpr-proc:'+crypto.randomUUID(),version=await revisionFor(sourceId),presented=await hash(question);
 const claim={id,sourceId,seed,profile:profile.id,classId:profile.class_id,generation:profile.generation,issued:now,expires:now+7*DAY,version,presented,evaluation:await hash(q)};
 const encoded=encode(enc.encode(JSON.stringify(claim)));
 return {id,version,presented,question,format:REV,permit:encoded+'.'+encode(await sign(key,encoded))};
}
export async function scoreProceduralPractice(secret,profile,event,now=Date.now()){
 const allowed=new Set(['format','kind','id','version','presented','permit','response','classId','profileId','learner','assignmentReceipt']);
 if(profile.course_id!=='workplace'||event.format!==REV||event.kind!=='practice'||Object.keys(event).some(k=>!allowed.has(k))||typeof event.permit!=='string'||!/^[\w-]{1,2048}\.[\w-]{43}$/.test(event.permit))return null;
 const key=await keyFor(secret);if(!key)return null;const [encoded,signature]=event.permit.split('.');let claim;
 try{if(!await crypto.subtle.verify('HMAC',key,decode(signature),enc.encode(REV+':'+encoded)))return null;claim=JSON.parse(new TextDecoder().decode(decode(encoded)));}catch{return null;}
 if(claim.id!==event.id||claim.profile!==profile.id||claim.classId!==profile.class_id||claim.generation!==profile.generation||claim.issued>now||claim.expires<=now||claim.version!==event.version||claim.version!==await revisionFor(claim.sourceId)||claim.presented!==event.presented)return null;
 const q=proceduralQuestion(claim.sourceId,claim.seed);if(!q||await hash(publicQuestion(q))!==claim.presented||await hash(q)!==claim.evaluation)return null;
 const response=event.response;
 if(!response||typeof response!=='object'||Array.isArray(response)||Object.keys(response).length!==1||!['optionId','segmentId','order'].includes(Object.keys(response)[0]))return null;
 const result=grader.grade(q,response);if(!result.ok)return null;
 const primary=claim.sourceId.startsWith('compose:')?composeContent.kits.find(k=>k.id===q.cx.kit).concepts[0]:reviewedPrimary(q)?.conceptId??(claim.sourceId.startsWith('bank:')?q.concepts[0]:null);
 const pattern=claim.sourceId.startsWith('compose:')?reasoning(composedUnits.get(claim.sourceId)):q.reasoning??q.family;
 return {id:event.id,occurred:claim.issued,pathway:'workplace',activity:'workplace-readiness',data:{format:REV,version:1,sourceId:claim.sourceId,contentVersion:claim.version,response:JSON.stringify(response),questionId:event.id,sessionId:event.id,attempt:1,firstAttempt:true,correct:result.correct,mode:q.mode,assessedMode:q.mode,topic:primary??q.skill,familyId:pattern,n:1,c:Number(result.correct),dimensions:[{scope:'skill',id:q.skill,n:1,c:Number(result.correct)}]},
  feedback:{...result,reasoningFamily:pattern,masteryEligible:false,primaryConcept:primary,practiceOnly:true}};
}
