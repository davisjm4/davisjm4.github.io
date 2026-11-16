import './profile-device.js?v=guest-map-v1';
import { profilesAvailable, request } from './config.mjs';
import { BATCH_LIMIT, PROFILE_ID, PROFILE_VERSION } from './profile-model.mjs';
import { advisoryActivity } from '../../../cs-games/student/advisory-practice.mjs';

export const device=globalThis.CSGamesProfileDevice;
// Guest map links explicitly select local practice for this tab, even on a shared browser.
const query=new URLSearchParams(globalThis.location?.search);
const guestPractice=query.get('learner')==='guest';
export const activeProfile=profilesAvailable&&!guestPractice ? device.identity : null;
const prefix=device.key('outbox.');
let sending, timer, retryDelay=2000;
const assignment=advisoryActivity(activeProfile,query);
const listeners=new Set();
function status(message) { for (const listener of listeners) listener(message); }
export function observeSync(listener) {
  listeners.add(listener);
  return ()=>listeners.delete(listener);
}
export function retainedPractice() {
  if (!activeProfile || !device.isCurrent()) return [];
  const retained=device.key('unverified.');
  try {
    return Object.keys(localStorage).filter(key=>key.startsWith(retained))
      .flatMap(key=>{try{return [JSON.parse(localStorage.getItem(key))];}catch{return [];}});
  }catch{return [];}
}
export function queueKeys() {
  if (!activeProfile) return [];
  try { return Object.keys(localStorage).filter(key=>key.startsWith(prefix)); }
  catch { return []; }
}
export function scopedStorage(storage) {
  if (!storage || !activeProfile) return storage;
  return {
    getItem:key=>storage.getItem(device.key(key)),
    setItem:(key,value)=>storage.setItem(device.key(key),value),
    removeItem:key=>storage.removeItem(device.key(key)),
  };
}
function schedule(delay=1500) {
  clearTimeout(timer);
  timer=setTimeout(syncQueuedPractice,delay);
}
export function queueProfileEvent(event) {
  if (!activeProfile || !device.isCurrent()) return;
  const payload={...event,...(assignment?.receipt && event.format!=='wpr-issued-v1' ? {assignmentReceipt:assignment.receipt} : {})};
  try {
    localStorage.setItem(prefix+event.id,JSON.stringify(payload));
    status('Practice saved on this device. Sync pending.');
    schedule();
    return true;
  } catch { status('This browser could not queue this attempt for sync.'); }
}
// Submit once now for feedback and leave a durable outbox copy on network failure.
export async function submitIssuedResponse(event) {
  if (!activeProfile || !device.isCurrent()) return {error:'Restore your class profile to continue.'};
  const storageKey=prefix+event.id;
  let saved;
  try { saved=JSON.parse(localStorage.getItem(storageKey)); } catch { /* storage may be unavailable */ }
  if (saved && saved.response!==event.response) return {pending:true};
  const queued=saved || queueProfileEvent(event);
  try {
    const {accepted,rejected,scored}=await request('/profile/sync',{token:activeProfile.token,body:{events:[event]}});
    if (accepted?.includes(event.id) && scored?.[event.id]) {
      try { localStorage.removeItem(storageKey); } catch { /* accepted on the server */ }
      return {feedback:scored[event.id]};
    }
    if (rejected?.some(entry=>entry.id===event.id)) {
      if (queued) {
        try {
          localStorage.setItem(device.key('unverified.'+event.id),JSON.stringify({event,code:rejected[0].code}));
          localStorage.removeItem(storageKey);
        } catch { /* retain the original outbox entry */ }
      }
      return {error:'This response cannot earn credit. An expired question or an earlier submission may prevent scoring.'};
    }
  } catch { /* the shared outbox retries after the connection returns */ }
  return queued ? {pending:true} : {error:'Could not save this response. Try again when connected.'};
}
export async function syncQueuedPractice() {
  if (!activeProfile || !device.isCurrent()) return false;
  if (sending) return sending;
  sending=(async()=>{
    try {
      let anyRejected=false;
      while (device.isCurrent()) {
        const keys=queueKeys().slice(0,BATCH_LIMIT);
        const events=keys.map(key=>JSON.parse(localStorage.getItem(key))).filter(Boolean);
        if (!events.length) { retryDelay=2000; if(!anyRejected)status(retainedPractice().length?'Some responses are saved on this device for recovery.':'Practice synced.'); return true; }
        const {accepted,rejected=[]}=await request('/profile/sync',{token:activeProfile.token,body:{events}});
        const submitted=new Set(events.map(event=>event.id));
        if (!Array.isArray(accepted) || !Array.isArray(rejected) || !accepted.length&&!rejected.length ||
          [...accepted,...rejected.map(row=>row.id)].some(id=>!submitted.has(id))) {
          throw new Error('Incomplete acknowledgement.');
        }
        for (const id of accepted) localStorage.removeItem(prefix+id);
        for(const rejection of rejected){
          const key=prefix+rejection.id;
          const saved=localStorage.getItem(key);
          if(saved!==null)localStorage.setItem(device.key('unverified.'+rejection.id),JSON.stringify({code:rejection.code,event:JSON.parse(saved)}));
          localStorage.removeItem(key);
        }
        if(rejected.length){anyRejected=true;status('Some responses were kept on this device because their profile or evidence could not be verified. They did not earn class credit.');}
      }
      return false;
    } catch (error) {
      status(error.status===401 ? 'Restore this profile to sync the practice saved on this device.' :
        'Practice is saved on this device and waiting to sync. '+(error.status ? error.message : ''));
      if (!error.status || error.status===429 || error.status>=500) {
        retryDelay=Math.min(retryDelay*2,60000);
        schedule(retryDelay);
      }
      return false;
    }
  })().finally(()=>{sending=null;});
  return sending;
}
function metadata(value) {
  return typeof value==='string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:/|%-]{0,119}$/.test(value) ? value : null;
}
export function recordGameAttempt(courseId,record,sessionId,correct,occurred) {
  if (!activeProfile || !PROFILE_ID.test(record.id) || !PROFILE_ID.test(sessionId)) return;
  const details=record.details || {};
  const questionId=record.id;
  queueProfileEvent({version:PROFILE_VERSION,format:'game-attempt',kind:'practice',
    id:questionId+':'+record.submissions, questionId, sessionId, courseId,
    activity:record.game, attempt:record.submissions, correct:Boolean(correct), occurred:Date.parse(occurred),
    mode:metadata(details.practiceSetting || details.selectedMode || record.mode),
    assessedMode:metadata(details.practiceMode) || metadata(details.format) || metadata(details.mode) || metadata(record.mode),
    topic:metadata(details.profileTopic) || metadata(record.topic), difficulty:metadata(details.difficulty),
    evidenceRevision:metadata(details.evidenceRevision),
    familyId:metadata(details.reasoningFamily || details.generatorFamily || details.familyId || details.family ||
      details.modelId || details.componentId), assisted:details.assisted===true});
}
if (activeProfile) {
  globalThis.addEventListener?.('online',syncQueuedPractice);
  globalThis.addEventListener?.('focus',()=>{if(queueKeys().length)syncQueuedPractice();});
  if (queueKeys().length) schedule();
}
