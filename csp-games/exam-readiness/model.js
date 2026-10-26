import {SKILLS} from './curriculum.js';
export const LEVELS=['','Not Yet Demonstrated','Developing','Proficient','Strong'];
// Local instructional policy, not College Board classifications or a validated exam predictor.
export const RULES=Object.freeze({minimum:5,proficient:{questions:20,accuracy:.8,recent:.8,days:2,contexts:2},strong:{questions:40,accuracy:.9,recent:.9,days:3,contexts:2,perDay:5},recent:20,reviewDays:{1:1,2:3,3:7,4:14}});
export function summarize(skillId,events,now=new Date().toISOString()){
 const list=events.filter(e=>e.skillId===skillId).sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.id.localeCompare(b.id));
 const attempts=list.reduce((n,e)=>n+e.attempts,0),firstTryCorrect=list.reduce((n,e)=>n+e.firstTryCorrect,0),direct=list.filter(e=>e.quality==='direct');
 const directAttempts=direct.length,directCorrect=direct.reduce((n,e)=>n+e.firstTryCorrect,0),recent=direct.slice(-RULES.recent),recentAccuracy=recent.length?recent.reduce((n,e)=>n+e.firstTryCorrect,0)/recent.length:null;
 const byDay={};for(const e of direct){const day=e.timestamp.slice(0,10);byDay[day]=(byDay[day]||0)+1;}
 const days=Object.keys(byDay).length,sessions=new Set(list.map(e=>e.sessionId)).size,contexts=new Set(direct.map(e=>e.context)).size;
 const accuracy=attempts?firstTryCorrect/attempts:null,directAccuracy=directAttempts?directCorrect/directAttempts:null;
 let level=attempts>=RULES.minimum?2:1;
 const passes=r=>directAttempts>=r.questions&&directAccuracy>=r.accuracy&&recentAccuracy>=r.recent&&days>=r.days&&contexts>=r.contexts&&new Set(direct.map(e=>e.sessionId)).size>=r.days;
 if(passes(RULES.proficient))level=3;
 if(passes(RULES.strong)&&Object.values(byDay).filter(n=>n>=RULES.strong.perDay).length>=RULES.strong.days)level=4;
 const lastPracticed=list.at(-1)?.timestamp||null;
 const reviewDue=lastPracticed?new Date(Date.parse(lastPracticed)+RULES.reviewDays[level]*86400000).toISOString():null;
 const recentSessions=[...new Set(direct.map(e=>e.sessionId))].slice(-3).map(id=>{const a=direct.filter(e=>e.sessionId===id);return a.reduce((n,e)=>n+e.firstTryCorrect,0)/a.length;});
 return {skillId,attempts,firstTryCorrect,accuracy,recentAccuracy,directAttempts,sessions,practiceDates:[...new Set(list.map(e=>e.timestamp.slice(0,10)))],lastPracticed,level,reviewDue,due:!!reviewDue&&reviewDue<=now,estimated:attempts>directAttempts,insufficient:directAttempts<RULES.minimum,contexts,inconsistent:recentSessions.length>1&&Math.max(...recentSessions)-Math.min(...recentSessions)>=.25};
}
export function recommendations(events,now=new Date().toISOString()){
 const states=SKILLS.map((s,index)=>({...summarize(s.id,events,now),skill:s,index}));
 // Balanced starting order interleaves Big Ideas, rather than flooding the list with Idea 1.
 const queues=Array.from({length:5},(_,i)=>states.filter(s=>s.skill.bigIdea===i+1)),order=[];
 while(queues.some(q=>q.length))for(const q of queues)if(q.length)order.push(q.shift().skillId);
 const rank=new Map(order.map((id,i)=>[id,i]));
 function priority(s){return s.insufficient&&!(s.skill.evidenceSupport==='estimated'&&s.attempts>=RULES.minimum)?0:s.recentAccuracy!==null&&s.recentAccuracy<.8?1:s.due?2:s.inconsistent?3:4;}
 return states.sort((a,b)=>priority(a)-priority(b)||(priority(a)===1?a.recentAccuracy-b.recentAccuracy:0)||(a.attempts===0&&b.attempts===0?rank.get(a.skillId)-rank.get(b.skillId):0)||(a.lastPracticed||'').localeCompare(b.lastPracticed||'')||a.index-b.index).map(s=>{
  const evidence=s.attempts?`${s.firstTryCorrect}/${s.attempts} first-try correct (${Math.round(100*s.accuracy)}%). `:'';
  const reason=s.attempts===0?'No recorded evidence yet. This is a balanced starting suggestion, not a diagnosed weakness.':s.skill.evidenceSupport==='estimated'?`${evidence}Available games provide recognition or broad-topic estimates for this skill. Practice supports review; original work and teacher feedback are needed to demonstrate it more fully.`:s.insufficient?`${evidence}${s.directAttempts} directly mapped questions; more direct evidence is needed. Estimated topic or vocabulary evidence cannot establish proficiency.`:s.recentAccuracy!==null&&s.recentAccuracy<.8?`${evidence}Recent direct accuracy is ${Math.round(100*s.recentAccuracy)}%; practice may improve consistency.`:s.due?`${evidence}Review was due ${s.reviewDue.slice(0,10)}. Your level has not been lowered.`:s.inconsistent?`${evidence}Results differ by at least 25 percentage points across recent sessions.`:`${evidence}Continue with varied practice; last practiced ${s.lastPracticed.slice(0,10)}.`;
  return {...s,reason,gameId:s.skill.games[0]};
 });
}
