import {WPR_AUTOMATIC} from '../../../cs-games/pathway/mastery/wpr-automatic.mjs';
import graph from '../../../cs-games/pathway/curriculum-graph.json' with {type:'json'};
import {PROFILE_VERSION, DAY} from '../online/profile-model.mjs';
import {items} from './issued-practice-bank.mjs';

const REVISION = 'wpr-issued-v1';
const LIFETIME = 7 * DAY;
const encoder = new TextEncoder();
const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode = value => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
const digest = async value => encode(await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(value))));
const sign = (key,value) => crypto.subtle.sign('HMAC',key,encoder.encode(REVISION + ':' + value));
export const practiceItems=items.map(({id})=>id);
const index = new Map(items.map(item => [item.id,item]));
const optionIds=(key,nonce) => Promise.all([0,1,2,3].map(async i =>
  encode(await sign(key,'option:'+nonce+':'+i)).slice(0,16)));
const nodeByConcept = new Map(graph.nodes.filter(node => node.courseId==='workplace')
  .map(node => [node.familySelectors[0]?.conceptId,node.id]));

async function signingKey(secret) {
  if (typeof secret!=='string' || secret.length<32) return null;
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}

export async function issuePractice(secret, profile, itemId, now) {
  const item = index.get(itemId);
  const key = await signingKey(secret);
  if (!item || !key || profile.course_id!=='workplace') return null;
  const version = await digest(item);
  // One first response per reviewed reasoning family, including across refresh, reissue and credential reset.
  const id = 'wpr-issued:' + await digest([profile.id,profile.class_id,item.family]);
  const nonce=crypto.randomUUID();
  const ids=await optionIds(key,nonce);
  const order = item.choices.map((_,i) => i);
  const randomness = crypto.getRandomValues(new Uint8Array(3));
  for(let i=order.length-1;i>0;i--) {
    const j=randomness[i-1]%(i+1);
    [order[i],order[j]]=[order[j],order[i]];
  }
  const question = {
    scenario:item.scenario, prompt:item.prompt, mode:'decision',
    skill:item.concept.split(':')[0], difficulty:'intermediate', context:item.context,
    options:order.map(i => ({id:ids[i],text:item.choices[i]})),
  };
  const presented = await digest(question);
  const encoded = encode(encoder.encode(JSON.stringify({
    id, itemId, nonce, version, presented, profile:profile.id, classId:profile.class_id,
    generation:profile.generation, issued:now, expires:now+LIFETIME,
  })));
  return {id,version,presented,question,permit:encoded+'.'+encode(await sign(key,encoded))};
}

export async function scoreIssuedPractice(secret, profile, event, now) {
  const {permit, id, response, version, presented} = event;
  const permitted = new Set(['format','kind','id','version','presented','permit','response','classId','profileId','learner']);
  if (profile.course_id!=='workplace' || event.kind!=='practice' ||
      Object.keys(event).some(field => !permitted.has(field)) ||
      typeof permit!=='string' || !/^[\w-]{1,2048}\.[\w-]{43}$/.test(permit) ||
      typeof response!=='string' || !/^[\w-]{16}$/.test(response)) return null;
  const key = await signingKey(secret);
  if (!key) return null;
  const [encoded, signature] = permit.split('.');
  let claim;
  try {
    if (!await crypto.subtle.verify('HMAC',key,decode(signature),encoder.encode(REVISION + ':' + encoded))) return null;
    claim = JSON.parse(new TextDecoder().decode(decode(encoded)));
  } catch {
    return null;
  }
  if (claim.id!==id || claim.profile!==profile.id || claim.classId!==profile.class_id ||
      claim.generation!==profile.generation || claim.version!==version || claim.presented!==presented ||
      claim.issued>now || claim.expires<=now) return null;
  const item = index.get(claim.itemId);
  if (!item || await digest(item)!==claim.version) return null;
  const ids=await optionIds(key,claim.nonce);
  const selection=ids.indexOf(response);
  if (selection<0) return null;
  const correct = selection===item.best;
  const node = nodeByConcept.get(item.concept);
  const eligible = Boolean(node && Object.hasOwn(WPR_AUTOMATIC,item.concept));
  return {
    id, occurred:claim.issued, pathway:'workplace', activity:'workplace-readiness',
    data:{
      format:REVISION, version:PROFILE_VERSION, contentVersion:version, response:String(selection),
      mode:'decision', assessedMode:'decision', topic:item.concept, familyId:item.family,
      questionId:id, sessionId:id, attempt:1, firstAttempt:true, correct,n:1,c:Number(correct),
      dimensions:eligible ? [{scope:'node',id:node,n:1,c:Number(correct)}] : [],
    },
    feedback:{
      bestId:ids[item.best], correct, masteryEligible:eligible,
      headline:correct ? 'Best professional response' : 'There is a stronger response',
      lines:[{kind:'why',text:item.why},...item.comparison.map((text,i)=>({
        kind:'contrast', text:item.choices[i]+' — '+text,
      }))],
    },
  };
}
