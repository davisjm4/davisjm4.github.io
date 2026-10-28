// Reuse the established daily/first-try session engine without mixing courses.
import {createSessionTracker,SESSION_KEY as JAVA_KEY} from '../../../java-games/session.js';
import {beatsBest} from './engine.js?v=parts-1';
export const SESSION_KEY='roboticsGames.session.v1',HISTORY_KEY='roboticsGames.partsSprint.history.v1',BEST_KEY='roboticsGames.partsSprint.best.v1';
export function createRoboticsSession({storage,now,id,onWarning=()=>{}}={}){
 const facade={getItem:key=>storage?.getItem(key===JAVA_KEY?SESSION_KEY:key),setItem:(key,value)=>storage?.setItem(key===JAVA_KEY?SESSION_KEY:key,value)};
 const tracker=createSessionTracker({storage:facade,now,id,onWarning});let history=[],sessionId='';
 function ensure(){const next=tracker.snapshot().id;if(next!==sessionId){sessionId=next;history=[];}try{const saved=JSON.parse(storage?.getItem(HISTORY_KEY)||'null');if(saved?.sessionId===sessionId&&Array.isArray(saved.history))history=saved.history.filter(h=>h&&typeof h.id==='string'&&typeof h.part==='string').slice(-100);}catch{}return sessionId;}
 function remember(record){ensure();history.push(record);history=history.slice(-100);try{storage?.setItem(HISTORY_KEY,JSON.stringify({sessionId,history}));}catch{} }
 function best(key,candidate){let saved={};try{saved=JSON.parse(storage?.getItem(BEST_KEY)||'{}')||{};}catch{}const prior=saved[key];if(candidate&&beatsBest(candidate,prior)){saved[key]={accuracy:candidate.accuracy,firstTry:candidate.firstTry,longest:candidate.longest,averageResponse:candidate.averageResponse};try{storage?.setItem(BEST_KEY,JSON.stringify(saved));}catch{}return{...saved[key],improved:true};}return prior||null;}
 return{tracker,ensure,remember,history:()=>{ensure();return[...history];},best,
  reset(confirmed){if(!confirmed)return false;tracker.reset(true);sessionId='';history=[];try{storage?.removeItem(HISTORY_KEY);storage?.removeItem(BEST_KEY);}catch{}ensure();return true;}};
}
