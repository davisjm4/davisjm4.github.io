import {createProgressStore} from './storage.js';
import {mappedRecord} from './mapping.js';
let shared;
export function progressStore(){if(!shared){let storage;try{storage=globalThis.localStorage;}catch{}shared=createProgressStore({storage,onWarning:message=>{
 if(typeof document==='undefined')return;let p=document.getElementById('pathway-storage-warning');if(!p){p=document.createElement('p');p.id='pathway-storage-warning';p.setAttribute('role','status');(document.querySelector('main')||document.body)?.prepend(p);}p.textContent=message;
 }});}return shared;}
// Do not copy optional Session Summary names, periods, answers or student-entered text.
export function recordFirstSubmission(store,record,session,correct,timestamp){
 const mapped=mappedRecord(record);if(!mapped)return false;
 return store.add({id:`round:${session.id}:${record.id}`,skillId:mapped.skillId,gameId:record.game,timestamp,sessionId:session.id,attempts:1,firstTryCorrect:Number(!!correct),quality:mapped.quality,context:[record.game,record.topic,record.mode||'',record.details?.familyId||record.details?.family||''].join(':').slice(0,220)});
}
// Legacy aggregate counts stay aggregate: no invented question events, timestamps or skill details.
export function legacyEvidence(session){
 const events=[];for(const [gameId,game]of Object.entries(session.games||{}))for(const [topic,b]of Object.entries(game.topics||{})){
  const mapped=mappedRecord({game:gameId,topic});if(!mapped||!b.attempted)continue;
  events.push({id:`legacy:${session.id}:${gameId}:${topic}`.slice(0,220),skillId:mapped.skillId,gameId,timestamp:session.lastActivityAt,sessionId:session.id,attempts:b.attempted,firstTryCorrect:b.firstTry,quality:'estimated',context:`${gameId}:legacy:${topic}`.slice(0,220)});
 }return events;
}
export function initializeFromSession(session,store=progressStore()){store.initialize(legacyEvidence(session));}
// Optional explicit interface for future narrowly tagged rounds. Use the same session/record
// IDs as the shared tracker: the automatic adapter then deduplicates the event.
export function recordSkillEvidence({id,gameId,skillId,timestamp=new Date().toISOString(),sessionId,firstTryCorrect,mode='default',topic='default'},store=progressStore()){
 if(typeof firstTryCorrect!=='boolean')throw Error('firstTryCorrect must be Boolean.');
 return store.add({id:`round:${sessionId}:${id}`,gameId,skillId,timestamp,sessionId,attempts:1,firstTryCorrect:Number(firstTryCorrect),quality:'direct',context:`${gameId}:${topic}:${mode}`.slice(0,220)});
}
