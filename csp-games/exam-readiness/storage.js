import {SKILLS,SKILL_BY_ID,MAP_VERSION} from './curriculum.js';
import {GAME_BY_ID} from './games.js';
import {summarize} from './model.js';
export const STORAGE_KEY='cspGames.pathway.v1';
export const OLD_KEY='cspGames.pathway.v0';
export const MAX_EVENTS=50000,MAX_BYTES=64*1024*1024;
const clone=x=>JSON.parse(JSON.stringify(x));
const keys=(o,allowed)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>allowed.includes(k));
const token=s=>typeof s==='string'&&s.length>0&&s.length<=220&&/^[\x20-\x7e]+$/.test(s)&&!/[<>]/.test(s);
const iso=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s&&Date.parse(s)>=Date.parse('2020-01-01')&&Date.parse(s)<=Date.now()+86400000;
export function validateEvent(e){
 if(!keys(e,['id','skillId','gameId','timestamp','sessionId','attempts','firstTryCorrect','quality','context'])||!token(e.id)||!token(e.sessionId)||!token(e.context)||!Object.hasOwn(SKILL_BY_ID,e.skillId)||!Object.hasOwn(GAME_BY_ID,e.gameId)||!iso(e.timestamp)||!['direct','estimated'].includes(e.quality)||!Number.isSafeInteger(e.attempts)||e.attempts<1||e.attempts>100000||!Number.isSafeInteger(e.firstTryCorrect)||e.firstTryCorrect<0||e.firstTryCorrect>e.attempts||(e.quality==='direct'&&e.attempts!==1))throw Error('Invalid practice record. Check skill IDs, dates and question counts.');
 return Object.fromEntries(['id','skillId','gameId','timestamp','sessionId','attempts','firstTryCorrect','quality','context'].map(k=>[k,e[k]]));
}
export function validateEvents(events){if(!Array.isArray(events)||events.length>MAX_EVENTS)throw Error('Practice history exceeds the supported limit.');const ids=new Set();return events.map(e=>{const v=validateEvent(e);if(ids.has(v.id))throw Error('Duplicate practice record in file.');ids.add(v.id);return v;});}
const stable=o=>JSON.stringify(o,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const empty=()=>({schemaVersion:1,curriculumVersion:MAP_VERSION,initialized:false,events:[]});
export function migrate(value){
 if(value?.schemaVersion===0&&Array.isArray(value.events))return {schemaVersion:1,curriculumVersion:MAP_VERSION,initialized:true,events:validateEvents(value.events.map(e=>({...e,attempts:1,firstTryCorrect:Number(e.firstTryCorrect)})))};
 if(!keys(value,['schemaVersion','curriculumVersion','initialized','events'])||value.schemaVersion!==1||value.curriculumVersion!==MAP_VERSION||typeof value.initialized!=='boolean')throw Error('Unsupported pathway storage version.');
 return {...empty(),initialized:value.initialized,events:validateEvents(value.events)};
}
export function createProgressStore({storage,now=()=>new Date().toISOString(),onWarning=()=>{}}={}){
 let state=empty(),volatile=false,warning='',blocked=false;
 const warn=m=>{warning=m;onWarning(m);};
 function read(){if(volatile)return;try{if(!storage)throw Error('unavailable');let raw=storage.getItem(STORAGE_KEY);if(!raw){const old=storage.getItem(OLD_KEY);if(old){state=migrate(JSON.parse(old));save();}return;}state=migrate(JSON.parse(raw));}catch(e){
   if(e.message==='unavailable'||e.name==='SecurityError'){volatile=true;warn('Browser storage is unavailable. Progress is temporary; export before leaving this page.');}
   else {blocked=true;volatile=true;warn('Saved pathway data could not be read. It has been preserved. This page is using temporary progress; export it before closing, or reset pathway progress to start fresh.');}
 }}
 function save(){if(volatile)return;try{storage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{volatile=true;warn('Browser storage is unavailable or full. Progress is temporary; export before leaving this page.');}}
 read();
 return {
  snapshot(){read();return clone(state);},
  add(event){const e=validateEvent(event);read();if(state.events.some(x=>x.id===e.id))return false;if(state.events.length>=MAX_EVENTS){warn('Practice history is full. Export a backup before resetting pathway progress. No existing evidence was erased.');return false;}state.events.push(e);save();return true;},
  initialize(events=[]){read();if(state.initialized)return;for(const e of validateEvents(events))if(!state.events.some(x=>x.id===e.id))state.events.push(e);state.initialized=true;save();},
  export(){read();const exportedAt=now();return {schemaVersion:1,curriculumVersion:MAP_VERSION,exportedAt,events:clone(state.events),progress:SKILLS.map(s=>({...summarize(s.id,state.events,exportedAt),recommendedGameId:s.games[0]}))};},
  import(value,{mode='merge',confirmed=false}={}){
   const incoming=validateExport(value);if(!['merge','replace'].includes(mode))throw Error('Choose merge or replace.');if(mode==='replace'&&!confirmed)return false;
   read();const byId=new Map(state.events.map(e=>[e.id,e]));
   if(mode==='merge')for(const e of incoming.events){const old=byId.get(e.id);if(old&&JSON.stringify(old)!==JSON.stringify(e))throw Error('Conflicting duplicate record. Your existing progress has been kept.');byId.set(e.id,e);}
   const events=mode==='replace'?incoming.events:[...byId.values()];if(events.length>MAX_EVENTS)throw Error('Merged progress exceeds the supported history limit.');
   if(blocked)throw Error('Reset unreadable pathway storage before importing. Export temporary work first.');
   state={...empty(),initialized:true,events};save();return true;
  },
  reset(confirmed){if(!confirmed)return false;state={...empty(),initialized:true};blocked=false;volatile=false;warning='';save();return true;},
  get warning(){return warning;},get temporary(){return volatile;}
 };
}
export function validateExport(value){
 if(!keys(value,['schemaVersion','curriculumVersion','exportedAt','events','progress'])||value.schemaVersion!==1||value.curriculumVersion!==MAP_VERSION||!iso(value.exportedAt))throw Error('This is not a supported pathway export.');
 const events=validateEvents(value.events);
 if(!Array.isArray(value.progress)||value.progress.length!==SKILLS.length)throw Error('Missing skill progress summary.');
 const ids=new Set();for(const p of value.progress){if(!p||!Object.hasOwn(SKILL_BY_ID,p.skillId)||ids.has(p.skillId))throw Error('Invalid or duplicate skill summary.');ids.add(p.skillId);const expected={...summarize(p.skillId,events,value.exportedAt),recommendedGameId:SKILL_BY_ID[p.skillId].games[0]};if(stable(p)!==stable(expected))throw Error('Progress summary does not match its practice history.');}
 return {events};
}
