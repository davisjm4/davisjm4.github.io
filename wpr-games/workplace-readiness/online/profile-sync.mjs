import './profile-device.js';
import { profilesAvailable, request } from './config.mjs';
import { BATCH_LIMIT, PROFILE_ID, PROFILE_VERSION } from './profile-model.mjs';

export const device=globalThis.CSGamesProfileDevice;
export const activeProfile=profilesAvailable ? device.identity : null;
const prefix=device.key('outbox.');
let sending, timer, retryDelay=2000;
const listeners=new Set();
function status(message) { for (const listener of listeners) listener(message); }
export function observeSync(listener) {
  listeners.add(listener);
  return ()=>listeners.delete(listener);
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
  try {
    localStorage.setItem(prefix+event.id,JSON.stringify(event));
    status('Practice saved on this device. Sync pending.');
    schedule();
  } catch { status('This browser could not queue this attempt for sync.'); }
}
export async function syncQueuedPractice() {
  if (!activeProfile || !device.isCurrent()) return false;
  if (sending) return sending;
  sending=(async()=>{
    try {
      while (device.isCurrent()) {
        const keys=queueKeys().slice(0,BATCH_LIMIT);
        const events=keys.map(key=>JSON.parse(localStorage.getItem(key))).filter(Boolean);
        if (!events.length) { retryDelay=2000; status('Practice synced.'); return true; }
        const {accepted}=await request('/profile/sync',{token:activeProfile.token,body:{events}});
        const submitted=new Set(events.map(event=>event.id));
        if (!Array.isArray(accepted) || !accepted.length || accepted.some(id=>!submitted.has(id))) {
          throw new Error('Incomplete acknowledgement.');
        }
        for (const id of accepted) localStorage.removeItem(prefix+id);
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
  queueProfileEvent({version:PROFILE_VERSION,format:'game-attempt',kind:'practice',
    id:record.id+':'+record.submissions, questionId:record.id, sessionId, courseId,
    activity:record.game, attempt:record.submissions, correct:Boolean(correct), occurred:Date.parse(occurred),
    mode:metadata(details.practiceSetting || details.selectedMode || record.mode),
    assessedMode:metadata(details.practiceMode) || metadata(details.format) || metadata(details.mode) || metadata(record.mode),
    topic:metadata(record.topic), difficulty:metadata(details.difficulty),
    familyId:metadata(details.reasoningFamily || details.generatorFamily || details.familyId || details.family ||
      details.modelId || details.componentId), assisted:details.assisted===true});
}
if (activeProfile) {
  globalThis.addEventListener?.('online',syncQueuedPractice);
  globalThis.addEventListener?.('focus',()=>{if(queueKeys().length)syncQueuedPractice();});
  if (queueKeys().length) schedule();
}
